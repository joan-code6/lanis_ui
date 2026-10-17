package de.joancode.lanis

import android.Manifest
import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.net.Uri
import android.webkit.MimeTypeMap
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.util.concurrent.Executors

@CapacitorPlugin(name = "LanisNative", permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])])
class LanisNativePlugin : Plugin() {
    @PluginMethod fun openFile(call: PluginCall) {
        try {
            val source = Uri.parse(call.getString("uri") ?: return call.reject("Datei fehlt."))
            if (source.scheme != "file") return call.reject("Ungültige Datei.")
            val file = java.io.File(source.path ?: "").canonicalFile
            val shared = java.io.File(context.cacheDir, "lanis-share").canonicalFile
            if (!file.toPath().startsWith(shared.toPath()) || !file.isFile) return call.reject("Datei nicht verfügbar.")
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val extension = file.extension.lowercase(java.util.Locale.ROOT)
            val type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
                ?: call.getString("mimeType")?.takeIf { it.contains('/') && it != "application/octet-stream" }
                ?: "*/*"
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, type)
                clipData = ClipData.newRawUri(file.name, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.runOnUiThread {
                try {
                    activity.startActivity(intent)
                    call.resolve()
                } catch (_: ActivityNotFoundException) {
                    call.reject("Keine passende App installiert.", "NO_FILE_VIEWER")
                } catch (_: Exception) {
                    call.reject("Die Datei konnte nicht geöffnet werden.")
                }
            }
        } catch (_: Exception) {
            call.reject("Die Datei konnte nicht geöffnet werden.")
        }
    }
    private val executor = Executors.newSingleThreadExecutor()
    private fun task(call: PluginCall, action: () -> Unit) {
        executor.execute { try { action() } catch (_: Exception) { call.reject("Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.") } }
    }
    private fun status(): JSObject {
        val state = NativeStore.read(context)
        return JSObject().apply {
            put("signedIn", !state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty())
            put("lastUpdated", state.optLong("lastUpdated"))
            put("syncError", state.optString("syncError"))
            put("notificationsAllowed", NotificationManagerCompat.from(context).areNotificationsEnabled())
            put("notificationsEnabled", state.optBoolean("notificationsEnabled"))
            put("pushConfigured", BuildConfig.PUSH_CONFIGURED)
            put("widgetPinSupported", AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported)
            put("version", BuildConfig.VERSION_NAME)
        }
    }
    @PluginMethod fun getSession(call: PluginCall) = task(call) {
        val state = NativeStore.read(context)
        // A custom backend selection must never inherit another server's credentials.
        call.resolve(JSObject().put("values", state.optJSONObject("session") ?: JSONObject()).put("backend", state.optString("backend")))
    }
    @PluginMethod fun saveSession(call: PluginCall) = task(call) {
        synchronized(NativeStore.lock) {
            val backend = call.getString("backend") ?: return@task call.reject("Backend-Adresse fehlt.")
            if (!DeviceSync.validBackend(backend)) return@task call.reject("Die Android-App benötigt eine HTTPS-Backend-Adresse.")
            val values = call.getObject("values") ?: return@task call.reject("Anmeldung fehlt.")
            val state = NativeStore.read(context)
            val old = state.optJSONObject("session")
            if ((state.optString("backend").isNotEmpty() && state.optString("backend") != backend)
                || (!old?.optString("auth_refresh_token").isNullOrEmpty() && old?.optString("auth_refresh_token") != values.optString("auth_refresh_token"))) {
                NativeStore.clear(context)
                DeviceSync.cancel(context)
            }
            val updated = NativeStore.read(context)
            // Keep a token already refreshed by a worker when JS writes profile metadata.
            val current = updated.optJSONObject("session")
            if (current != null && current.optString("auth_refresh_token") == values.optString("auth_refresh_token")
                && current.optLong("auth_expires_at") > values.optLong("auth_expires_at")
                && values.has("auth_access_token")) {
                values.put("auth_access_token", current.optString("auth_access_token")).put("auth_expires_at", current.optString("auth_expires_at"))
            }
            updated.put("session", values).put("backend", backend)
            NativeStore.write(context, updated)
            if (values.has("__lanis_account_deletion_recovery")) DeviceSync.cancel(context)
            else if (values.optString("auth_refresh_token").isNotEmpty()) DeviceSync.schedule(context)
            call.resolve()
        }
    }
    @PluginMethod fun clearSession(call: PluginCall) = task(call) {
        synchronized(NativeStore.lock) {
            DeviceSync.cancel(context)
            NativeStore.clear(context)
            java.io.File(context.cacheDir, "lanis-share").deleteRecursively()
            (context.getSystemService(NotificationManager::class.java)).cancelAll()
            Widgets.updateAll(context)
            if (BuildConfig.PUSH_CONFIGURED) runCatching {
                FirebaseMessaging.getInstance().isAutoInitEnabled = false
                FirebaseMessaging.getInstance().deleteToken()
            }
            call.resolve()
        }
    }
    @PluginMethod fun getStatus(call: PluginCall) = task(call) { call.resolve(status()) }
    @PluginMethod fun saveTimetable(call: PluginCall) = task(call) {
        synchronized(NativeStore.lock) {
            val state = NativeStore.read(context)
            val owner = call.getString("owner")
            val data = call.getObject("data")
            if (owner.isNullOrEmpty() || state.optJSONObject("session")?.optString("auth_refresh_token") != owner) {
                return@task call.resolve()
            }
            if (data == null || !data.optBoolean("success") || data.optJSONArray("days") == null) return@task call.reject("Ungültiger Stundenplan.")
            state.put("timetable", data).put("lastUpdated", System.currentTimeMillis()).put("syncError", "")
            NativeStore.write(context, state)
            Widgets.updateAll(context)
            WidgetTickWorker.schedule(context)
            call.resolve()
        }
    }
    @PluginMethod fun getTimetable(call: PluginCall) = task(call) {
        val state = NativeStore.read(context)
        call.resolve(JSObject().put("data", state.optJSONObject("timetable")).put("updatedAt", state.optLong("lastUpdated")))
    }
    @PluginMethod fun sync(call: PluginCall) = task(call) { DeviceSync.sync(context); call.resolve(status()) }
    @PluginMethod fun pinWidget(call: PluginCall) {
        val receiver = when (call.getString("kind")) {
            "next" -> NextLessonWidget::class.java
            "today" -> TodayWidget::class.java
            "changes" -> ChangesWidget::class.java
            else -> return call.reject("Unbekanntes Widget.")
        }
        val manager = AppWidgetManager.getInstance(context)
        val requested = manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(ComponentName(context, receiver), null, null)
        call.resolve(JSObject().put("requested", requested))
    }
    @PluginMethod fun setAppearance(call: PluginCall) = task(call) {
        val dark = call.getBoolean("dark", false) ?: false
        val oled = call.getBoolean("oled", false) ?: false
        val theme = call.getString("theme", "ruby") ?: "ruby"
        val themes = listOf("ruby", "emerald", "sapphire", "amethyst", "amber", "cyan", "coral", "blush", "moss")
        if (theme !in themes) return@task call.reject("Unbekanntes Design.")
        val accent = call.getString("accent", "#e11d48") ?: "#e11d48"
        if (!accent.matches(Regex("^#[A-Fa-f0-9]{6}$"))) return@task call.reject("Ungültige Farbe.")
        synchronized(NativeStore.lock) {
            val state = NativeStore.read(context).put("dark", dark).put("oled", oled).put("accent", accent).put("theme", theme)
            NativeStore.write(context, state)
            Widgets.updateAll(context)
        }
        // Enable the selected launcher before disabling the others. The actual activity
        // stays enabled, so existing shortcuts and already-running tasks keep working.
        val manager = context.packageManager
        fun select(name: String, enabled: Boolean) {
            val component = ComponentName(context.packageName, "${context.packageName}.Launcher_$name")
            val desired = if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
            if (manager.getComponentEnabledSetting(component) != desired) {
                manager.setComponentEnabledSetting(component, desired, PackageManager.DONT_KILL_APP)
            }
        }
        select(theme, true)
        for (other in themes.filter { it != theme }) select(other, false)
        activity.runOnUiThread {
            WindowInsetsControllerCompat(activity.window, activity.window.decorView).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
            val background = Color.parseColor(if (oled) "#000000" else if (dark) "#0a0a0a" else "#fafafa")
            activity.window.decorView.setBackgroundColor(background)
            bridge.webView.setBackgroundColor(background)
            call.resolve()
        }
    }
    @PluginMethod fun openNotificationSettings(call: PluginCall) {
        activity.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
        call.resolve()
    }
    @PluginMethod fun setNotifications(call: PluginCall) {
        if (call.getBoolean("enabled", false) != true) {
            task(call) {
                // Block local delivery immediately, even if the server is temporarily offline.
                synchronized(NativeStore.lock) {
                    val state = NativeStore.read(context).put("notificationsEnabled", false)
                    NativeStore.write(context, state)
                }
                runCatching {
                    DeviceSync.unregister(context)
                    synchronized(NativeStore.lock) {
                        val state = NativeStore.read(context)
                        state.remove("registeredToken")
                        NativeStore.write(context, state)
                    }
                }
                if (BuildConfig.PUSH_CONFIGURED) runCatching { FirebaseMessaging.getInstance().isAutoInitEnabled = false }
                call.resolve(status())
            }
            return
        }
        if (!BuildConfig.PUSH_CONFIGURED) return call.reject("Benachrichtigungen sind für diese App noch nicht eingerichtet.")
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionResult")
        } else registerNotifications(call)
    }
    @PermissionCallback private fun notificationPermissionResult(call: PluginCall) {
        if (getPermissionState("notifications") != PermissionState.GRANTED) {
            call.reject("Erlaube Benachrichtigungen in den Android-Einstellungen.")
        } else registerNotifications(call)
    }
    private fun registerNotifications(call: PluginCall) {
        val owner = NativeStore.read(context).optJSONObject("session")?.optString("auth_refresh_token")
        if (owner.isNullOrEmpty()) return call.reject("Bitte melde dich zuerst an.")
        FirebaseMessaging.getInstance().isAutoInitEnabled = true
        FirebaseMessaging.getInstance().token.addOnCompleteListener { result ->
            if (!result.isSuccessful) { call.reject("Die Push-Registrierung ist fehlgeschlagen. Prüfe deine Verbindung."); return@addOnCompleteListener }
            task(call) {
                synchronized(NativeStore.lock) {
                    val state = NativeStore.read(context)
                    if (state.optJSONObject("session")?.optString("auth_refresh_token") != owner) return@task call.reject("Die Anmeldung wurde inzwischen beendet.")
                    state.put("fcmToken", result.result).put("notificationsEnabled", true)
                    if (!state.has("pushBinding")) state.put("pushBinding", java.util.UUID.randomUUID().toString())
                    NativeStore.write(context, state)
                }
                DeviceSync.sync(context)
                val state = NativeStore.read(context)
                if (state.optString("registeredToken") != result.result || state.optString("pushError").isNotEmpty()) {
                    call.reject("Benachrichtigungen konnten nicht beim Server registriert werden. Bitte erneut versuchen.")
                } else call.resolve(status())
            }
        }
    }
}
