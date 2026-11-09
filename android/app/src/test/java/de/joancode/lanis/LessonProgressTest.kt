package de.joancode.lanis

import org.junit.Assert.*
import org.junit.Test
import java.time.*

class LessonProgressTest {
    private val date = LocalDate.of(2026, 11, 9)
    private fun at(time: String) = date.atTime(LocalTime.parse(time)).atZone(WidgetModel.zone).toInstant()
    private fun lesson(start: String, end: String, cancelled: Boolean = false) = WidgetModel.Lesson(date, start, end, "Mathematik", "", "", cancelled, false, "", "1")
    private val lessons = listOf(lesson("08:00", "08:45"), lesson("09:00", "09:45"))
    @Test fun lessonAndExactBoundaries() {
        assertFalse(LessonProgress.current(lessons, at("08:00"), false)!!.isBreak)
        assertNull(LessonProgress.current(lessons, at("08:45"), false))
        assertFalse(LessonProgress.current(lessons, at("09:00"), true)!!.isBreak)
    }
    @Test fun breaksAreOptInAndOnlyBetweenLessons() {
        assertNull(LessonProgress.current(lessons, at("08:50"), false))
        val pause = LessonProgress.current(lessons, at("08:50"), true)!!
        assertTrue(pause.isBreak)
        assertEquals(at("08:45"), pause.start)
        assertEquals(at("09:00"), pause.end)
        assertNull(LessonProgress.current(lessons, at("07:59"), true))
        assertNull(LessonProgress.current(lessons, at("09:45"), true))
    }
    @Test fun ignoresCancelledInvalidAndOtherDays() {
        val input = listOf(lesson("08:00", "08:45", true), lesson("bad", "09:45"), lessons[1].copy(date = date.plusDays(1)))
        assertNull(LessonProgress.current(input, at("08:10"), true))
    }
    @Test fun overlappingLessonsDoNotCreatePrematureBreaks() {
        val input = lessons + lesson("08:15", "08:55")
        assertFalse(LessonProgress.current(input, at("08:50"), true)!!.isBreak)
        assertEquals(at("08:55"), LessonProgress.current(input, at("08:56"), true)!!.start)
    }
}
