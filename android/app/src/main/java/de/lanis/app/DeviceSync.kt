package de.lanis.app

import android.content.Context
import androidx.work.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.net.URI
import java.util.concurrent.TimeUnit

class SyncFailure(val status: Int = 0) : Exception()

object DeviceSync {
    private val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false).build()
    private val json = "application/json; charset=utf-8".toMediaType()
    private const val PERIODIC = "lanis-background-sync"

    fun validBackend(value: String): Boolean = try {
        val uri = URI(value)
        uri.scheme == "https" && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null
    } catch (_: Exception) { false }

    private fun request(backend: String, path: String, token: String = "", body: JSONObject? = null, method: String = "GET"): JSONObject {
        require(validBackend(backend))
        val builder = Request.Builder().url(backend.trimEnd('/') + path).header("Accept", "application/json")
        if (token.isNotEmpty()) builder.header("X-Session-Token", token)
        if (method != "GET") builder.method(method, (body ?: JSONObject()).toString().toRequestBody(json))
        client.newCall(builder.build()).execute().use { response ->
            if (!response.isSuccessful) throw SyncFailure(response.code)
            val source = response.body?.source() ?: throw SyncFailure()
            if (source.request(8L * 1024 * 1024 + 1)) throw SyncFailure() // Bound untrusted server responses.
            return JSONObject(source.readUtf8())
        }
    }
    private fun accessToken(context: Context, state: JSONObject): String {
        val session = state.optJSONObject("session") ?: throw SyncFailure(401)
        if (session.optLong("auth_expires_at") > System.currentTimeMillis() + 300_000 && session.optString("auth_access_token").isNotEmpty())
            return session.getString("auth_access_token")
        val refresh = session.optString("auth_refresh_token")
        if (refresh.isEmpty()) throw SyncFailure(401)
        val result = request(state.getString("backend"), "/auth/refresh", body = JSONObject().put("refresh_token", refresh), method = "POST")
        val token = result.getString("access_token")
        session.put("auth_access_token", token).put("auth_expires_at", (System.currentTimeMillis() + result.getLong("expires_in") * 1000).toString())
        NativeStore.write(context, state)
        return token
    }
    fun sync(context: Context): Boolean = synchronized(NativeStore.lock) {
        var state = NativeStore.read(context)
        if (state.optJSONObject("session")?.has("__lanis_account_deletion_recovery") == true) return@synchronized true
        if (state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()) return@synchronized true
        try {
            val backend = state.getString("backend")
            var token = accessToken(context, state)
            val data = try { request(backend, "/stundenplan/view?view_mode=rolling&plan_mode=personal", token) }
            catch (error: SyncFailure) {
                if (error.status != 401) throw error
                state.getJSONObject("session").put("auth_expires_at", "0")
                token = accessToken(context, state)
                request(backend, "/stundenplan/view?view_mode=rolling&plan_mode=personal", token)
            }
            if (!data.optBoolean("success") || data.optJSONArray("days") == null) throw SyncFailure()
            state.put("timetable", data).put("lastUpdated", System.currentTimeMillis()).put("syncError", "")
            NativeStore.write(context, state)
            // Push registration errors do not prevent timetable caching.
            if (state.optBoolean("notificationsEnabled") && state.optString("fcmToken").isNotEmpty()) {
                try {
                    request(backend, "/notifications/android", token, JSONObject().put("token", state.getString("fcmToken")).put("binding", state.getString("pushBinding"))
                        .put("previous_token", state.optString("registeredToken").ifEmpty { null }), "POST")
                    state.put("registeredToken", state.getString("fcmToken")).put("pushError", "")
                } catch (_: Exception) { state.put("pushError", "Benachrichtigungen konnten nicht registriert werden. Prüfe die Server-Einrichtung.") }
                NativeStore.write(context, state)
            }
            Widgets.updateAll(context)
            WidgetTickWorker.schedule(context)
            true
        } catch (error: Exception) {
            if (error is SyncFailure && error.status in listOf(401, 403)) {
                NativeStore.clear(context)
                state = JSONObject().put("syncError", "Bitte melde dich erneut an, um deine Daten zu aktualisieren.")
                cancel(context)
                context.getSystemService(android.app.NotificationManager::class.java).cancelAll()
            } else {
                state.put("syncError", "Aktualisierung nicht möglich. Gespeicherte Daten bleiben verfügbar; neuere Änderungen können fehlen.")
            }
            NativeStore.write(context, state)
            Widgets.updateAll(context)
            false
        }
    }
    fun unregister(context: Context) = synchronized(NativeStore.lock) {
        val state = NativeStore.read(context)
        val registered = state.optString("registeredToken")
        if (registered.isNotEmpty()) {
            val token = accessToken(context, state)
            request(state.getString("backend"), "/notifications/android", token, JSONObject().put("token", registered).put("binding", state.getString("pushBinding")), "DELETE")
        }
    }
    fun schedule(context: Context) {
        val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
        val periodic = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, periodic)
    }
    fun enqueue(context: Context) {
        val request = OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(context).enqueueUniqueWork("lanis-sync-now", ExistingWorkPolicy.KEEP, request)
    }
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
        WorkManager.getInstance(context).cancelUniqueWork("lanis-sync-now")
        WorkManager.getInstance(context).cancelUniqueWork("lanis-widget-tick")
    }
}

class SyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = try {
        if (DeviceSync.sync(applicationContext)) Result.success()
        else if (runAttemptCount < 3) Result.retry() else Result.failure()
    } catch (_: Exception) { if (runAttemptCount < 3) Result.retry() else Result.failure() }
}
