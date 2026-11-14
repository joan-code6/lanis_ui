package de.joancode.lanis

import org.json.JSONObject
import java.time.*
import java.util.Locale

object WidgetModel {
    private fun JSONObject.text(key: String, fallback: String = ""): String = if (isNull(key)) fallback else optString(key, fallback)
    val zone: ZoneId = ZoneId.of("Europe/Berlin")
    data class Lesson(val date: LocalDate, val start: String, val end: String, val subject: String,
        val room: String, val teacher: String, val cancelled: Boolean, val changed: Boolean, val info: String, val period: String,
        val originalRoom: String = "", val originalTeacher: String = "", val originalSubject: String = "",
        val classKey: String = "", val courseId: String = "", val kind: String = "") {
        fun endInstant(): Instant? = try { date.atTime(LocalTime.parse(end)).atZone(zone).toInstant() } catch (_: Exception) { null }
        fun startInstant(): Instant? = try { date.atTime(LocalTime.parse(start)).atZone(zone).toInstant() } catch (_: Exception) { null }
    }
    fun lessons(data: JSONObject?, showSubstitutions: Boolean = true): List<Lesson> {
        val result = mutableListOf<Lesson>()
        val days = data?.optJSONArray("days") ?: return result
        val slots = data.optJSONArray("time_slots")
        for (dayIndex in 0 until days.length()) {
            val day = days.optJSONObject(dayIndex) ?: continue
            val date = try { LocalDate.parse(day.getString("date")) } catch (_: Exception) { continue }
            val lessons = day.optJSONArray("lessons") ?: continue
            for (index in 0 until lessons.length()) {
                val resolved = lessons.optJSONObject(index) ?: continue
                val substitution = resolved.optJSONObject("substitution")
                val original = resolved.optJSONObject("original_lesson")
                val lesson = if (!showSubstitutions && substitution != null && original != null) {
                    JSONObject(resolved.toString()).apply {
                        for (field in listOf("subject", "teacher", "room")) put(field, original.text(field, ""))
                        remove("substitution"); put("cancelled", false); put("info", "")
                    }
                } else resolved
                val period = lesson.text("period")
                val periods = Regex("\\d+").findAll(period).map { it.value.toInt() }.toList()
                fun slotTime(periodNumber: Int?, field: String): String {
                    if (periodNumber == null || slots == null) return ""
                    for (i in 0 until slots.length()) {
                        val slot = slots.optJSONObject(i) ?: continue
                        if (slot.optInt("period") == periodNumber) return slot.text(field)
                    }
                    return ""
                }
                result += Lesson(date, lesson.text("start_time").ifEmpty { slotTime(periods.firstOrNull(), "start_time") },
                    lesson.text("end_time").ifEmpty { slotTime(periods.lastOrNull(), "end_time") },
                    lesson.text("subject", "Unterricht"), lesson.text("room"), lesson.text("teacher"),
                    lesson.optBoolean("cancelled"), lesson.optJSONObject("substitution") != null,
                    lesson.text("info").ifEmpty { lesson.optJSONObject("substitution")?.text("info") ?: "" }, period,
                    original?.text("room", "") ?: "", original?.text("teacher", "") ?: "",
                    original?.text("subject", "") ?: "", classKey(resolved), lesson.text("course_id", ""),
                    if (showSubstitutions) substitution?.text("kind", "") ?: "" else "")
            }
        }
        return result.sortedWith(compareBy<Lesson> { it.date }.thenBy { it.start.ifEmpty { "99:99" } }.thenBy { Regex("\\d+").find(it.period)?.value?.toInt() ?: 999 })
    }
    fun next(lessons: List<Lesson>, now: Instant): Lesson? {
        val today = now.atZone(zone).toLocalDate()
        return lessons.firstOrNull { !it.cancelled && it.date >= today && (it.date > today || it.endInstant()?.isAfter(now) == true) }
    }
    /** Select an actual cached school day, never invent tomorrow or reuse an expired week. */
    fun schoolDay(lessons: List<Lesson>, now: Instant): LocalDate? {
        val today = now.atZone(zone).toLocalDate()
        val todaysLessons = lessons.filter { it.date == today }
        val lastEnd = todaysLessons.filter { !it.cancelled }.mapNotNull { it.endInstant() }.maxOrNull()
            ?: todaysLessons.mapNotNull { it.endInstant() }.maxOrNull()
        if (todaysLessons.isNotEmpty() && (lastEnd == null || now.isBefore(lastEnd))) return today
        return lessons.firstOrNull { it.date > today }?.date
    }
    fun isCurrent(lesson: Lesson, now: Instant): Boolean = !lesson.cancelled &&
        lesson.startInstant()?.let { !now.isBefore(it) } == true && lesson.endInstant()?.isAfter(now) == true

    private fun normalized(value: String) = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFKC)
        .trim().lowercase(Locale.GERMAN)
    fun classKey(lesson: JSONObject): String {
        val subject = normalized(lesson.text("subject", "")).ifEmpty { "unterricht" }
        val course = normalized(lesson.text("course_id", ""))
        val name = normalized(lesson.text("course_name", ""))
        val group = normalized(lesson.text("class_name", ""))
        return when {
            course.isNotEmpty() -> "course:$course"
            name.isNotEmpty() -> "course-name:$name"
            group.isNotEmpty() -> "class:$group:$subject"
            else -> "subject:$subject"
        }
    }
    fun colourOverride(lesson: Lesson, preferences: JSONObject?): String? =
        preferences?.optJSONObject("classColors")?.text(lesson.classKey)?.takeIf { it.matches(Regex("#[a-fA-F0-9]{6}")) }

    fun changeDetail(lesson: Lesson): String = when {
        lesson.cancelled -> "Entfällt"
        lesson.originalRoom.isNotBlank() && lesson.originalRoom != lesson.room -> "${lesson.originalRoom} → ${lesson.room.ifBlank { "Raum offen" }}"
        lesson.originalTeacher.isNotBlank() && lesson.originalTeacher != lesson.teacher -> "${lesson.originalTeacher} → ${lesson.teacher}"
        lesson.originalSubject.isNotBlank() && lesson.originalSubject != lesson.subject -> "${lesson.originalSubject} → ${lesson.subject}"
        else -> lesson.kind.ifBlank { "Vertretung" }
    }
    data class Notice(val subject: String, val detail: String)
    fun notices(data: JSONObject?, date: LocalDate): List<Notice> {
        val result = mutableListOf<Notice>()
        val days = data?.optJSONArray("days") ?: return result
        for (i in 0 until days.length()) {
            val day = days.optJSONObject(i) ?: continue
            if (day.text("date") != date.toString()) continue
            val notices = day.optJSONArray("substitutionNotices") ?: continue
            for (n in 0 until notices.length()) {
                val notice = notices.optJSONObject(n) ?: continue
                result += Notice(notice.text("subject", "").ifBlank { "Hinweis" },
                    notice.text("info", "").ifBlank { notice.text("kind", "Hinweis") })
            }
        }
        return result
    }
}
