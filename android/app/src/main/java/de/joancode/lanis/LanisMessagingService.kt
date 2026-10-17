package de.joancode.lanis

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class LanisMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        synchronized(NativeStore.lock) {
            val state = NativeStore.read(this)
            // Never recreate signed-out account state because an old token callback arrives.
            if (state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()) return
            NativeStore.write(this, state.put("fcmToken", token))
        }
        DeviceSync.enqueue(this)
    }
    override fun onMessageReceived(message: RemoteMessage) {
        synchronized(NativeStore.lock) {
            val state = try { NativeStore.read(this) } catch (_: Exception) { return }
            if (!state.optBoolean("notificationsEnabled") || state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()) return
            val data = message.data
            if (data["binding"] != state.optString("pushBinding") || state.optString("pushBinding").isEmpty()) return
            val isChange = data["tag"]?.contains("vertretungsplan") == true
            val channel = if (isChange) "lanis-changes" else "lanis-messages"
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel(channel, if (isChange) "Vertretungen" else "Nachrichten", NotificationManager.IMPORTANCE_DEFAULT))
            if (NotificationManagerCompat.from(this).areNotificationsEnabled()) {
                val path = data["url"]?.takeIf { it.startsWith("/") && !it.startsWith("//") } ?: "/dashboard"
                val intent = Intent(this, MainActivity::class.java).setAction(Intent.ACTION_VIEW)
                    .setData(Uri.parse("https://lanis.arg-server.de$path")).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                val tag = data["tag"] ?: "lanis-update"
                val pending = PendingIntent.getActivity(this, tag.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                val notification = NotificationCompat.Builder(this, channel).setSmallIcon(R.drawable.ic_stat_lanis)
                    .setContentTitle(data["title"] ?: "LANIS").setContentText(data["body"] ?: "Es gibt neue Informationen.")
                    .setStyle(NotificationCompat.BigTextStyle().bigText(data["body"] ?: "Es gibt neue Informationen."))
                    .setContentIntent(pending).setAutoCancel(true).setOnlyAlertOnce(false)
                    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setCategory(NotificationCompat.CATEGORY_EVENT).build()
                try { manager.notify(tag, 1, notification) } catch (_: SecurityException) { /* Permission revoked since the check. */ }
            }
        }
        DeviceSync.enqueue(this)
    }
    override fun onDeletedMessages() { DeviceSync.enqueue(this) }
}
