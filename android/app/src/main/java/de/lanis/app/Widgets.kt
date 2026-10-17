package de.lanis.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.TimeUnit

/** Native widgets consume the same resolved API model as the React timetable. */
object WidgetModel {
    val zone: ZoneId = ZoneId.of("Europe/Berlin")
    data class Lesson(val date: LocalDate, val start: String, val end: String, val subject: String,
        val room: String, val teacher: String, val cancelled: Boolean, val changed: Boolean, val info: String, val period: String) {
        fun endInstant(): Instant? = try { date.atTime(LocalTime.parse(end)).atZone(zone).toInstant() } catch (_: Exception) { null }
        fun startInstant(): Instant? = try { date.atTime(LocalTime.parse(start)).atZone(zone).toInstant() } catch (_: Exception) { null }
    }
    fun lessons(data: JSONObject?): List<Lesson> {
        val result = mutableListOf<Lesson>()
        val days = data?.optJSONArray("days") ?: return result
        val slots = data.optJSONArray("time_slots")
        for (dayIndex in 0 until days.length()) {
            val day = days.optJSONObject(dayIndex) ?: continue
            val date = try { LocalDate.parse(day.getString("date")) } catch (_: Exception) { continue }
            val lessons = day.optJSONArray("lessons") ?: continue
            for (index in 0 until lessons.length()) {
                val lesson = lessons.optJSONObject(index) ?: continue
                val period = lesson.optString("period")
                val periods = Regex("\\d+").findAll(period).map { it.value.toInt() }.toList()
                fun slotTime(periodNumber: Int?, field: String): String {
                    if (periodNumber == null || slots == null) return ""
                    for (i in 0 until slots.length()) {
                        val slot = slots.optJSONObject(i) ?: continue
                        if (slot.optInt("period") == periodNumber) return slot.optString(field)
                    }
                    return ""
                }
                result += Lesson(date, lesson.optString("start_time").ifEmpty { slotTime(periods.firstOrNull(), "start_time") },
                    lesson.optString("end_time").ifEmpty { slotTime(periods.lastOrNull(), "end_time") },
                    lesson.optString("subject", "Unterricht"), lesson.optString("room"), lesson.optString("teacher"),
                    lesson.optBoolean("cancelled"), lesson.optJSONObject("substitution") != null,
                    lesson.optString("info").ifEmpty { lesson.optJSONObject("substitution")?.optString("info") ?: "" }, period)
            }
        }
        return result.sortedWith(compareBy<Lesson> { it.date }.thenBy { it.start.ifEmpty { "99:99" } }.thenBy { Regex("\\d+").find(it.period)?.value?.toInt() ?: 999 })
    }
    fun next(lessons: List<Lesson>, now: Instant): Lesson? {
        val today = now.atZone(zone).toLocalDate()
        return lessons.firstOrNull { !it.cancelled && it.date >= today && (it.date > today || it.endInstant()?.isAfter(now) == true) }
    }
    fun notices(data: JSONObject?, today: LocalDate): List<Pair<String, String>> {
        val result = mutableListOf<Pair<String, String>>()
        val days = data?.optJSONArray("days") ?: return result
        for (i in 0 until days.length()) {
            val day = days.optJSONObject(i) ?: continue
            val date = try { LocalDate.parse(day.getString("date")) } catch (_: Exception) { continue }
            if (date < today) continue
            val notices = day.optJSONArray("substitutionNotices") ?: continue
            for (j in 0 until notices.length()) {
                val notice = notices.optJSONObject(j) ?: continue
                result += Pair(notice.optString("subject").ifEmpty { notice.optString("kind", "Hinweis") },
                    "${date.format(DateTimeFormatter.ofPattern("EEE d.M.", Locale.GERMAN))} · ${notice.optString("info").ifEmpty { notice.optString("kind") }}")
            }
        }
        return result
    }
}

object Widgets {
    private val providers = listOf(NextLessonWidget::class.java, TodayWidget::class.java, ChangesWidget::class.java)
    fun updateAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        for (provider in providers) for (id in manager.getAppWidgetIds(ComponentName(context, provider))) update(context, manager, id, provider)
    }
    private fun open(context: Context, path: String, id: Int) = PendingIntent.getActivity(context, id,
        Intent(context, MainActivity::class.java).setAction(Intent.ACTION_VIEW).setData(Uri.parse("https://lanis.arg-server.de$path"))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun update(context: Context, manager: AppWidgetManager, id: Int, provider: Class<out AppWidgetProvider>) {
        val state = try { NativeStore.read(context) } catch (_: Exception) { JSONObject() }
        val next = provider == NextLessonWidget::class.java
        val changes = provider == ChangesWidget::class.java
        val title = if (next) "Nächste Stunde" else if (changes) "Vertretungen" else "Dein Schultag"
        val dark = state.optBoolean("dark")
        val foreground = Color.parseColor(if (dark) "#f5f5f5" else "#171717")
        val muted = Color.parseColor(if (dark) "#a3a3a3" else "#737373")
        val accent = try { Color.parseColor(state.optString("accent", "#e11d48")) } catch (_: Exception) { Color.parseColor("#e11d48") }
        val views = RemoteViews(context.packageName, R.layout.lanis_widget)
        views.setInt(R.id.widget_root, "setBackgroundResource", if (state.optBoolean("oled")) R.drawable.widget_background_oled else if (dark) R.drawable.widget_background_dark else R.drawable.widget_background)
        views.setTextViewText(R.id.widget_title, title)
        val icon = when (state.optString("theme", "ruby")) {
            "coral" -> R.drawable.ic_lanis_coral
            "blush" -> R.drawable.ic_lanis_blush
            "moss" -> R.drawable.ic_lanis_moss
            "cyan" -> R.drawable.ic_lanis_cyan
            "emerald" -> R.drawable.ic_lanis_emerald
            "sapphire" -> R.drawable.ic_lanis_sapphire
            "amethyst" -> R.drawable.ic_lanis_amethyst
            "amber" -> R.drawable.ic_lanis_amber
            else -> R.drawable.ic_lanis_ruby
        }
        views.setImageViewResource(R.id.widget_logo, icon)
        views.setTextColor(R.id.widget_title, accent)
        views.setTextColor(R.id.widget_headline, foreground)
        views.setTextColor(R.id.widget_detail, muted)
        views.setTextColor(R.id.widget_updated, muted)
        views.setInt(R.id.widget_refresh, "setColorFilter", muted)
        views.setOnClickPendingIntent(R.id.widget_root, open(context, "/timetable", id))
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, id,
            Intent(context, provider).setAction("de.lanis.app.REFRESH"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        views.removeAllViews(R.id.widget_rows)
        val now = Instant.now()
        val today = now.atZone(WidgetModel.zone).toLocalDate()
        val signedIn = !state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()
        val data = state.optJSONObject("timetable")
        val lessons = WidgetModel.lessons(data)
        val updated = state.optLong("lastUpdated")
        val sourceError = data?.optJSONArray("substitution_sources")?.let { sources ->
            (0 until sources.length()).any { sources.optJSONObject(it)?.optBoolean("error") == true }
        } ?: false
        val age = if (updated > 0) "Stand ${Instant.ofEpochMilli(updated).atZone(WidgetModel.zone).format(DateTimeFormatter.ofPattern("dd.MM. HH:mm"))}" else "Noch nicht aktualisiert"
        views.setTextViewText(R.id.widget_updated, if (state.optString("syncError").isNotEmpty() || sourceError) "$age · Änderungen können fehlen" else age)
        views.setViewVisibility(R.id.widget_refresh, if (signedIn) View.VISIBLE else View.GONE)
        when {
            !signedIn -> {
                views.setTextViewText(R.id.widget_headline, "Noch nicht angemeldet")
                views.setTextViewText(R.id.widget_detail, "Zum Anmelden tippen")
                views.setTextViewText(R.id.widget_updated, "")
            }
            data == null -> {
                views.setTextViewText(R.id.widget_headline, "Stundenplan wird geladen")
                views.setTextViewText(R.id.widget_detail, "Zum Öffnen tippen oder aktualisieren.")
            }
            next -> {
                val lesson = WidgetModel.next(lessons, now)
                views.setTextViewText(R.id.widget_headline, lesson?.subject?.take(80) ?: "Keine weitere Stunde")
                views.setTextViewText(R.id.widget_detail, if (lesson == null) "Im gespeicherten Zeitraum ist kein weiterer Unterricht eingetragen." else detail(lesson, today))
            }
            else -> {
                val selected = if (changes) lessons.filter { it.date >= today && (it.cancelled || it.changed) }
                    else lessons.filter { it.date == today }
                val notices = if (changes) WidgetModel.notices(data, today) else emptyList()
                val count = selected.size + notices.size
                views.setTextViewText(R.id.widget_headline, if (changes) (if (count == 0) "Keine Änderungen" else "$count ${if (count == 1) "Änderung" else "Änderungen"}")
                    else today.format(DateTimeFormatter.ofPattern("EEEE, d. MMM", Locale.GERMAN)))
                views.setTextViewText(R.id.widget_detail, if (count == 0) (if (changes) "Im gespeicherten Plan liegen keine Änderungen vor." else "Heute sind keine Stunden eingetragen.") else if (changes) "In deinem persönlichen Stundenplan" else "${selected.size} Stunden · für dich geplant")
                val height = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180)
                val maxRows = ((height - 130) / 44).coerceIn(1, 6)
                val rows = selected.map { Pair(it.subject + if (it.cancelled) " · entfällt" else "", detail(it, today)) } + notices
                for ((subject, description) in rows.take(maxRows)) {
                    val row = RemoteViews(context.packageName, R.layout.widget_lesson)
                    row.setTextViewText(R.id.lesson_subject, subject.take(80)); row.setTextColor(R.id.lesson_subject, foreground)
                    row.setTextViewText(R.id.lesson_detail, description.take(130)); row.setTextColor(R.id.lesson_detail, muted)
                    views.addView(R.id.widget_rows, row)
                }
                if (rows.size > maxRows) views.setTextViewText(R.id.widget_updated, "$age · +${rows.size - maxRows} weitere in LANIS${if (sourceError) " · Änderungen können fehlen" else ""}")
            }
        }
        manager.updateAppWidget(id, views)
    }
    private fun detail(lesson: WidgetModel.Lesson, today: LocalDate): String = listOfNotNull(
        if (lesson.date != today) lesson.date.format(DateTimeFormatter.ofPattern("EEE d.M.", Locale.GERMAN)) else null,
        if (lesson.start.isNotEmpty()) lesson.start + if (lesson.end.isNotEmpty()) "–${lesson.end}" else "" else "${lesson.period}. Stunde",
        lesson.room.takeIf { it.isNotBlank() }?.let { "Raum $it" },
        lesson.teacher.takeIf { it.isNotBlank() },
        if (lesson.cancelled) "Entfällt" else lesson.info.takeIf { it.isNotBlank() }
    ).joinToString(" · ").take(200)
}

open class LanisWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) Widgets.update(context, manager, id, javaClass)
        DeviceSync.enqueue(context)
        WidgetTickWorker.schedule(context)
    }
    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        Widgets.update(context, manager, id, javaClass)
    }
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "de.lanis.app.REFRESH") DeviceSync.enqueue(context)
    }
}
class NextLessonWidget : LanisWidgetProvider()
class TodayWidget : LanisWidgetProvider()
class ChangesWidget : LanisWidgetProvider()

/** Re-project cached lessons at their boundaries; no network or exact-alarm permission needed. */
class WidgetTickWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result { Widgets.updateAll(applicationContext); schedule(applicationContext); return Result.success() }
    companion object {
        fun schedule(context: Context) {
            val state = try { NativeStore.read(context) } catch (_: Exception) { return }
            if (state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()) return
            val now = Instant.now()
            val midnight = now.atZone(WidgetModel.zone).toLocalDate().plusDays(1).atStartOfDay(WidgetModel.zone).toInstant()
            val next = (WidgetModel.lessons(state.optJSONObject("timetable")).flatMap { listOfNotNull(it.startInstant(), it.endInstant()) } + midnight)
                .filter { it.isAfter(now.plusSeconds(10)) }.minOrNull() ?: midnight
            val request = OneTimeWorkRequestBuilder<WidgetTickWorker>().setInitialDelay(Duration.between(now, next).seconds + 2, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork("lanis-widget-tick", ExistingWorkPolicy.REPLACE, request)
        }
    }
}
