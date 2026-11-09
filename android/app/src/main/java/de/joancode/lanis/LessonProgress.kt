package de.joancode.lanis

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.*
import java.time.*
import java.util.concurrent.TimeUnit

/** The OS owns Glyph rendering; no private Nothing API or notification listener. */
object LessonProgress {
    private const val ID = 4207
    private const val CHANNEL = "lesson-progress"
    private const val WORK = "lanis-lesson-progress"
    @androidx.annotation.ChecksSdkIntAtLeast(api = 36)
    fun supported() = Build.VERSION.SDK_INT >= 36 && Build.MANUFACTURER.equals("Nothing", true) &&
        Build.MODEL in setOf("A065", "Phone (2)")

    data class Window(val start: Instant, val end: Instant, val title: String, val isBreak: Boolean)
    fun current(lessons: List<WidgetModel.Lesson>, now: Instant, breaks: Boolean): Window? {
        val today = now.atZone(WidgetModel.zone).toLocalDate()
        val windows = lessons.filter { !it.cancelled && it.date == today }.mapNotNull {
            val start = it.startInstant(); val end = it.endInstant()
            if (start == null || end == null || !end.isAfter(start)) null
            else Window(start, end, it.subject, false)
        }.sortedBy { it.start }
        windows.firstOrNull { !now.isBefore(it.start) && now.isBefore(it.end) }?.let { return it }
        if (!breaks) return null
        val previous = windows.filter { !it.end.isAfter(now) }.maxByOrNull { it.end } ?: return null
        val next = windows.firstOrNull { it.start.isAfter(now) } ?: return null
        return Window(previous.end, next.start, "Pause", true)
    }
    fun stop(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(ID)
        WorkManager.getInstance(context).cancelUniqueWork(WORK)
    }
    fun update(context: Context) {
        synchronized(NativeStore.lock) {
            val state = runCatching { NativeStore.read(context) }.getOrNull()
            if (!supported() || state == null || !state.optBoolean("glyphLessonsEnabled") ||
                state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty() ||
                state.optJSONObject("session")?.has("__lanis_account_deletion_recovery") == true) {
                stop(context); return
            }
            val manager = context.getSystemService(NotificationManager::class.java)
            val now = Instant.now()
            val active = current(WidgetModel.lessons(state.optJSONObject("timetable")), now, state.optBoolean("glyphBreaksEnabled"))
            if (active == null || !manager.areNotificationsEnabled() || !manager.canPostPromotedNotifications()) manager.cancel(ID)
            else {
                manager.createNotificationChannel(NotificationChannel(CHANNEL, "Unterrichtsfortschritt", NotificationManager.IMPORTANCE_LOW))
                val total = Duration.between(active.start, active.end).seconds.coerceAtLeast(1)
                val elapsed = Duration.between(active.start, now).seconds
                val progress = (elapsed * 100 / total).toInt().coerceIn(0, 100)
                val open = PendingIntent.getActivity(context, ID, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                val title = if (AppLock.enabled(context)) "Unterrichtsfortschritt" else active.title
                val notification = Notification.Builder(context, CHANNEL)
                    .setSmallIcon(R.drawable.ic_stat_lanis).setContentTitle(title)
                    .setContentText("Verbleibende Zeit").setWhen(active.end.toEpochMilli())
                    .setUsesChronometer(true).setChronometerCountDown(true)
                    .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
                    .setVisibility(Notification.VISIBILITY_PRIVATE).setCategory(Notification.CATEGORY_PROGRESS)
                    .addExtras(android.os.Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
                    .setStyle(Notification.ProgressStyle().setProgressSegments(listOf(Notification.ProgressStyle.Segment(100))).setProgress(progress))
                    .setTimeoutAfter(Duration.between(now, active.end).toMillis()).build()
                manager.notify(ID, notification)
            }
            val nextStart = WidgetModel.lessons(state.optJSONObject("timetable")).filter { !it.cancelled }
                .mapNotNull { it.startInstant() }.filter { it.isAfter(now) }.minOrNull()
            val delay = if (active != null) minOf(60L, Duration.between(now, active.end).seconds.coerceAtLeast(1))
                else nextStart?.let { Duration.between(now, it).seconds.coerceIn(1, 900) } ?: 900L
            val request = OneTimeWorkRequestBuilder<LessonProgressWorker>().setInitialDelay(delay, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork(WORK, ExistingWorkPolicy.REPLACE, request)
        }
    }
}

class LessonProgressWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = try { LessonProgress.update(applicationContext); Result.success() } catch (_: Exception) { Result.retry() }
}
