package de.joancode.lanis

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

/** Date-led native layouts; all lesson rows share exactly the same column geometry. */
object Widgets {
    // Keep the old provider alive for already-placed widgets; it renders the timetable now.
    private val providers = listOf(NextLessonWidget::class.java, TodayWidget::class.java, ChangesWidget::class.java)
    fun updateAll(context: Context) {
        LessonProgress.update(context)
        val manager = AppWidgetManager.getInstance(context)
        for (provider in providers) for (id in manager.getAppWidgetIds(ComponentName(context, provider))) update(context, manager, id, provider)
    }
    private fun open(context: Context, id: Int) = PendingIntent.getActivity(context, id,
        Intent(context, MainActivity::class.java).setAction(Intent.ACTION_VIEW).setData(Uri.parse("https://lanis.arg-server.de/timetable"))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun blend(base: Int, accent: Int, fraction: Float): Int = androidx.core.graphics.ColorUtils.blendARGB(base, accent, fraction)
    private fun readable(accent: Int, surface: Int): Int {
        if (androidx.core.graphics.ColorUtils.calculateContrast(accent, surface) >= 4.5) return accent
        val target = if (androidx.core.graphics.ColorUtils.calculateLuminance(surface) < .5) Color.WHITE else Color.BLACK
        for (step in 1..20) {
            val adjusted = blend(accent, target, step / 20f)
            if (androidx.core.graphics.ColorUtils.calculateContrast(adjusted, surface) >= 4.5) return adjusted
        }
        return target
    }
    fun update(context: Context, manager: AppWidgetManager, id: Int, provider: Class<out AppWidgetProvider>) {
        val state = runCatching { NativeStore.read(context) }.getOrDefault(JSONObject())
        val preferences = state.optJSONObject("widgetPreferences")
        val changes = provider == ChangesWidget::class.java
        val palette = WidgetAppearance.palette(state,
            context.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK == android.content.res.Configuration.UI_MODE_NIGHT_YES)
        val dark = palette.dark
        val accent = Color.parseColor(palette.accent)
        val surface = Color.parseColor(palette.surface)
        val foreground = Color.parseColor(palette.foreground)
        val muted = Color.parseColor(palette.muted)
        val brand = Color.parseColor(palette.emphasis)
        val line = Color.parseColor(palette.line)
        val views = RemoteViews(context.packageName, R.layout.lanis_widget)
        views.setInt(R.id.widget_background, "setColorFilter", surface)
        views.setTextColor(R.id.widget_headline, foreground)
        views.setTextColor(R.id.widget_detail, muted)
        views.setTextColor(R.id.widget_empty, foreground)
        views.setTextColor(R.id.widget_notice, brand)
        views.setTextColor(R.id.widget_more, muted)
        views.setTextColor(R.id.widget_count, brand)
        views.setInt(R.id.widget_refresh, "setColorFilter", muted)
        views.setOnClickPendingIntent(R.id.widget_root, open(context, id))
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, id,
            Intent(context, provider).setAction("de.joancode.lanis.REFRESH"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        views.removeAllViews(R.id.widget_rows)
        val widgetHeight = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, if (changes) 320 else 360)
        val now = Instant.now()
        val today = now.atZone(WidgetModel.zone).toLocalDate()
        val signedIn = !state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()
        val data = state.optJSONObject("timetable")
        val lessons = WidgetModel.lessons(data, changes || preferences?.optBoolean("showSubstitutions", true) != false)
        val date = WidgetModel.schoolDay(lessons, now)
        val sourceError = data?.optJSONArray("substitution_sources")?.let { sources ->
            (0 until sources.length()).any { sources.optJSONObject(it)?.optBoolean("error") == true }
        } ?: false
        val unavailable = state.optString("syncError").isNotEmpty() || sourceError
        views.setViewVisibility(R.id.widget_count, View.GONE)
        views.setViewVisibility(R.id.widget_detail, View.GONE)
        views.setViewVisibility(R.id.widget_empty, View.GONE)
        views.setViewVisibility(R.id.widget_more, View.GONE)
        views.setViewVisibility(R.id.widget_notice, if (unavailable) View.VISIBLE else View.GONE)
        views.setTextViewText(R.id.widget_notice, "Aktualisierung nicht möglich · Neuere Änderungen können fehlen.")
        views.setViewVisibility(R.id.widget_refresh, if (signedIn && !changes) View.VISIBLE else View.GONE)
        fun message(title: String, detail: String) {
            views.setTextViewText(R.id.widget_headline, title)
            views.setTextViewText(R.id.widget_detail, detail)
            views.setViewVisibility(R.id.widget_detail, View.VISIBLE)
        }
        when {
            AppLock.enabled(context) -> {
                message("LANIS gesperrt", "Zum Entsperren tippen")
                views.setViewVisibility(R.id.widget_refresh, View.GONE)
                views.setViewVisibility(R.id.widget_notice, View.GONE)
            }
            !signedIn -> {
                message("Noch nicht angemeldet", "Zum Anmelden tippen")
                views.setViewVisibility(R.id.widget_notice, View.GONE)
            }
            widgetHeight < 170 -> {
                views.setViewVisibility(R.id.widget_refresh, View.GONE)
                message("Widget vergrößern", "Für den Stundenplan mehr Höhe wählen.")
            }
            data == null -> message("Stundenplan wird geladen", "Zum Öffnen tippen oder aktualisieren.")
            date == null -> message("Kein weiterer Schultag", "Im gespeicherten Plan ist kein weiterer Unterricht eingetragen.")
            else -> {
                val selected = lessons.filter { it.date == date }
                val changed = selected.filter { it.cancelled || it.changed }
                val notices = if (changes) WidgetModel.notices(data, date) else emptyList()
                val count = changed.size + notices.size
                val fontScale = context.resources.configuration.fontScale.coerceAtLeast(1f)
                val rowHeight = (if (changes) 118 else 60) * fontScale
                val totalRows = if (changes) count else selected.size
                val headerHeight = 88 * fontScale
                val warningHeight = if (unavailable) 48 * fontScale else 0f
                val overflowHeight = if (totalRows * rowHeight + warningHeight > widgetHeight - headerHeight) 24 * fontScale else 0f
                val available = widgetHeight - headerHeight - overflowHeight - warningHeight
                val maxRows = (available / rowHeight).toInt().coerceIn(0, 10)
                if (maxRows == 0 && totalRows > 0) {
                    views.setViewVisibility(R.id.widget_refresh, View.GONE)
                    message("Widget vergrößern", "Für deine Schriftgröße wird mehr Höhe benötigt.")
                    manager.updateAppWidget(id, views)
                    return
                }
                if (changes) {
                    views.setTextViewText(R.id.widget_headline, when (date) { today -> "Heute"; today.plusDays(1) -> "Morgen"; else -> date.format(DateTimeFormatter.ofPattern("EEEE", Locale.GERMAN)) })
                    views.setTextViewText(R.id.widget_detail, date.format(DateTimeFormatter.ofPattern("EEEE, d. MMM", Locale.GERMAN)))
                    views.setViewVisibility(R.id.widget_detail, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_count, View.VISIBLE)
                    views.setTextViewText(R.id.widget_count, "$count ${if (count == 1) "Änderung" else "Änderungen"}")
                    if (count == 0 && unavailable) views.setViewVisibility(R.id.widget_count, View.GONE)
                    if (count == 0) {
                        views.setTextViewText(R.id.widget_empty, if (unavailable) "Änderungen nicht verfügbar" else "Keine Änderungen")
                        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                    }
                    for ((index, lesson) in changed.take(maxRows).withIndex()) {
                        val row = RemoteViews(context.packageName, R.layout.widget_change)
                        row.setTextViewText(R.id.change_subject, lesson.subject)
                        row.setTextViewText(R.id.change_time, lesson.start.ifBlank { "${lesson.period}. Std." })
                        row.setTextViewText(R.id.change_kind, if (lesson.originalRoom.isNotBlank() && lesson.originalRoom != lesson.room && !lesson.cancelled) "Raumwechsel" else if (lesson.cancelled) "" else lesson.kind.ifBlank { "Vertretung" })
                        row.setViewVisibility(R.id.change_kind, if (lesson.cancelled) View.GONE else View.VISIBLE)
                        row.setTextViewText(R.id.change_value, WidgetModel.changeDetail(lesson))
                        val extra = lesson.info.ifBlank { if (lesson.cancelled) listOf(lesson.start, lesson.end).filter { it.isNotBlank() }.joinToString("–") else "" }
                        row.setTextViewText(R.id.change_info, extra)
                        row.setViewVisibility(R.id.change_info, if (extra.isBlank()) View.GONE else View.VISIBLE)
                        row.setTextColor(R.id.change_subject, foreground); row.setTextColor(R.id.change_time, muted)
                        row.setTextColor(R.id.change_kind, muted); row.setTextColor(R.id.change_value, brand); row.setTextColor(R.id.change_info, muted)
                        row.setInt(R.id.change_separator, "setBackgroundColor", line)
                        row.setViewVisibility(R.id.change_separator, if (index == 0) View.INVISIBLE else View.VISIBLE)
                        views.addView(R.id.widget_rows, row)
                    }
                    for (notice in notices.take((maxRows - changed.size).coerceAtLeast(0))) {
                        val row = RemoteViews(context.packageName, R.layout.widget_change)
                        row.setTextViewText(R.id.change_subject, notice.subject)
                        row.setTextViewText(R.id.change_value, notice.detail)
                        row.setTextColor(R.id.change_subject, foreground); row.setTextColor(R.id.change_value, brand)
                        row.setViewVisibility(R.id.change_time, View.GONE); row.setViewVisibility(R.id.change_kind, View.GONE); row.setViewVisibility(R.id.change_info, View.GONE)
                        row.setInt(R.id.change_separator, "setBackgroundColor", line)
                        views.addView(R.id.widget_rows, row)
                    }
                } else {
                    views.setTextViewText(R.id.widget_headline, date.format(DateTimeFormatter.ofPattern("EEEE, d. MMM", Locale.GERMAN)))
                    // Keep today's current/upcoming lessons visible when a widget is too short for the full day.
                    val focus = selected.indexOfFirst { !it.cancelled && (it.endInstant()?.isAfter(now) == true) }.coerceAtLeast(0)
                    val first = if (selected.size > maxRows && date == today) focus.coerceAtMost((selected.size - maxRows).coerceAtLeast(0)) else 0
                    for ((index, lesson) in selected.drop(first).take(maxRows).withIndex()) {
                        val row = RemoteViews(context.packageName, R.layout.widget_lesson)
                        val current = WidgetModel.isCurrent(lesson, now)
                        val override = WidgetModel.colourOverride(lesson, preferences)
                        val colour = override?.let { Color.parseColor(it) } ?: accent
                        val tint = Color.parseColor(if (override == null) palette.highlight else
                            if (dark) WidgetAppearance.primary(override, black = .78) else WidgetAppearance.primary(override, white = .96))
                        row.setInt(R.id.lesson_highlight, "setColorFilter", tint)
                        row.setViewVisibility(R.id.lesson_highlight, if (current) View.VISIBLE else View.GONE)
                        row.setTextViewText(R.id.lesson_start, lesson.start.ifBlank { "${lesson.period}." })
                        row.setTextViewText(R.id.lesson_end, lesson.end)
                        row.setTextViewText(R.id.lesson_subject, lesson.subject)
                        row.setTextViewText(R.id.lesson_room, if (lesson.cancelled) "—" else lesson.room)
                        row.setTextViewText(R.id.lesson_detail, when {
                            lesson.cancelled -> "Entfällt"
                            lesson.changed -> if (lesson.originalRoom != lesson.room && lesson.originalRoom.isNotBlank()) "Raum geändert" else lesson.kind.ifBlank { "Vertretung" }
                            else -> listOfNotNull(if (current) "Jetzt" else null, lesson.teacher.takeIf { it.isNotBlank() }).joinToString(" · ")
                        })
                        val rowSurface = if (current) tint else surface
                        val rowBrand = readable(colour, rowSurface)
                        row.setTextColor(R.id.lesson_subject, if (lesson.cancelled) muted else if (override != null) rowBrand else foreground)
                        row.setTextColor(R.id.lesson_detail, if (lesson.changed && !lesson.cancelled) readable(accent, rowSurface) else muted)
                        row.setTextColor(R.id.lesson_room, if (current) rowBrand else if (lesson.cancelled) muted else foreground)
                        row.setTextColor(R.id.lesson_start, muted); row.setTextColor(R.id.lesson_end, muted)
                        row.setInt(R.id.lesson_subject, "setPaintFlags", android.graphics.Paint.ANTI_ALIAS_FLAG or if (lesson.cancelled) android.graphics.Paint.STRIKE_THRU_TEXT_FLAG else 0)
                        row.setInt(R.id.lesson_separator, "setBackgroundColor", line)
                        row.setViewVisibility(R.id.lesson_separator, if (index == 0 || current) View.INVISIBLE else View.VISIBLE)
                        views.addView(R.id.widget_rows, row)
                    }
                }
                val total = totalRows
                if (total > maxRows) {
                    views.setTextViewText(R.id.widget_more, "+${total - maxRows} weitere im Plan")
                    views.setViewVisibility(R.id.widget_more, View.VISIBLE)
                }
            }
        }
        manager.updateAppWidget(id, views)
    }
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
        if (intent.action == "de.joancode.lanis.REFRESH") DeviceSync.enqueue(context)
        if (intent.action == Intent.ACTION_CONFIGURATION_CHANGED) Widgets.updateAll(context)
    }
}
class NextLessonWidget : LanisWidgetProvider()
class TodayWidget : LanisWidgetProvider()
class ChangesWidget : LanisWidgetProvider()

/** Re-project cached lessons at boundaries, including the switch to the next school day. */
class WidgetTickWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result { Widgets.updateAll(applicationContext); schedule(applicationContext); return Result.success() }
    companion object {
        fun schedule(context: Context) {
            val state = runCatching { NativeStore.read(context) }.getOrNull() ?: return
            if (state.optJSONObject("session")?.optString("auth_refresh_token").isNullOrEmpty()) return
            val now = Instant.now()
            val midnight = now.atZone(WidgetModel.zone).toLocalDate().plusDays(1).atStartOfDay(WidgetModel.zone).toInstant()
            val next = (WidgetModel.lessons(state.optJSONObject("timetable")).flatMap { listOfNotNull(it.startInstant(), it.endInstant()) } + midnight)
                .filter { it.isAfter(now) }.minOrNull() ?: midnight
            val request = OneTimeWorkRequestBuilder<WidgetTickWorker>().setInitialDelay(Duration.between(now, next).seconds + 2, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork("lanis-widget-tick", ExistingWorkPolicy.REPLACE, request)
        }
    }
}
