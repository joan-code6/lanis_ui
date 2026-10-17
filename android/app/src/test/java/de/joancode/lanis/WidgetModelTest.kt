package de.joancode.lanis

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class WidgetModelTest {
    private fun plan(lessons: String, date: String = "2026-10-16") = JSONObject("""{
        "days":[{"date":"$date","lessons":[$lessons]}],
        "time_slots":[{"period":1,"start_time":"08:00","end_time":"08:45"},{"period":2,"start_time":"08:45","end_time":"09:30"}]
    }""")
    @Test fun currentLessonStaysUntilItsEnd() {
        val lessons = WidgetModel.lessons(plan("""{"subject":"Mathe","period":1,"start_time":"08:00","end_time":"08:45"},{"subject":"Deutsch","period":2,"start_time":"08:45","end_time":"09:30"}"""))
        assertEquals("Mathe", WidgetModel.next(lessons, Instant.parse("2026-10-16T06:20:00Z"))?.subject)
        assertEquals("Deutsch", WidgetModel.next(lessons, Instant.parse("2026-10-16T06:45:00Z"))?.subject)
    }
    @Test fun cancelledLessonsAreSkipped() {
        val lessons = WidgetModel.lessons(plan("""{"subject":"Mathe","period":1,"cancelled":true},{"subject":"Deutsch","period":2}"""))
        assertEquals("Deutsch", WidgetModel.next(lessons, Instant.parse("2026-10-16T05:00:00Z"))?.subject)
    }
    @Test fun doubleLessonUsesEndOfLastPeriod() {
        val lesson = WidgetModel.lessons(plan("""{"subject":"Mathe","period":"1–2"}""")).single()
        assertEquals("08:00", lesson.start)
        assertEquals("09:30", lesson.end)
    }
    @Test fun unknownTimesDoNotClaimAStillUpcomingLessonToday() {
        val lessons = WidgetModel.lessons(plan("""{"subject":"Unbekannt","period":9}"""))
        assertNull(WidgetModel.next(lessons, Instant.parse("2026-10-16T12:00:00Z")))
    }
    @Test fun completedCachedWeekDoesNotShowOldLessonsAsNext() {
        val lessons = WidgetModel.lessons(plan("""{"subject":"Alt","period":1}"""))
        assertNull(WidgetModel.next(lessons, Instant.parse("2026-10-19T05:00:00Z")))
    }
    @Test fun winterTimesUseBerlinOffset() {
        val lesson = WidgetModel.lessons(plan("""{"subject":"Mathe","period":1}""", "2026-10-26")).single()
        assertEquals(Instant.parse("2026-10-26T07:45:00Z"), lesson.endInstant())
    }
    @Test fun malformedDaysDoNotCrashRendering() {
        assertTrue(WidgetModel.lessons(JSONObject("""{"days":[null,{"date":"invalid","lessons":[]}]}""")).isEmpty())
        assertTrue(WidgetModel.lessons(null).isEmpty())
    }
}
