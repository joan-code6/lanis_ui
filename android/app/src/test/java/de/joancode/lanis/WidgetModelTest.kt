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

    private fun week() = JSONObject("""{"days":[
        {"date":"2026-11-13","lessons":[{"subject":"Mathe","period":1,"start_time":"08:00","end_time":"08:45"}]},
        {"date":"2026-11-14","lessons":[]},
        {"date":"2026-11-15","lessons":[]},
        {"date":"2026-11-16","lessons":[]},
        {"date":"2026-11-17","lessons":[{"subject":"Deutsch","period":1,"start_time":"08:00","end_time":"08:45"}]}
    ]}""")
    @Test fun afterSchoolSelectsNextActualSchoolDayAcrossWeekendAndDayOff() {
        val lessons = WidgetModel.lessons(week())
        assertEquals("2026-11-13", WidgetModel.schoolDay(lessons, Instant.parse("2026-11-13T07:44:59Z")).toString())
        assertEquals("2026-11-17", WidgetModel.schoolDay(lessons, Instant.parse("2026-11-13T07:45:00Z")).toString())
        assertEquals("2026-11-17", WidgetModel.schoolDay(lessons, Instant.parse("2026-11-15T11:00:00Z")).toString())
        assertNull(WidgetModel.schoolDay(lessons, Instant.parse("2026-11-17T07:45:00Z")))
    }
    @Test fun currentHighlightUsesHalfOpenLessonWindowAndNeverCancelledLesson() {
        val lesson = WidgetModel.lessons(week()).first()
        assertFalse(WidgetModel.isCurrent(lesson, Instant.parse("2026-11-13T06:59:59Z")))
        assertTrue(WidgetModel.isCurrent(lesson, Instant.parse("2026-11-13T07:00:00Z")))
        assertFalse(WidgetModel.isCurrent(lesson, Instant.parse("2026-11-13T07:45:00Z")))
        assertFalse(WidgetModel.isCurrent(lesson.copy(cancelled = true), Instant.parse("2026-11-13T07:20:00Z")))
    }
    @Test fun hidingSubstitutionsRestoresBaseLessonWithoutChangingSharedCache() {
        val data = plan("""{"subject":"Vertretung","teacher":"Neu","room":"B112","period":1,"cancelled":true,
            "substitution":{"kind":"Entfall"},"original_lesson":{"subject":"Deutsch","teacher":"Alt","room":"A108"}}""")
        val visible = WidgetModel.lessons(data).single()
        val hidden = WidgetModel.lessons(data, false).single()
        assertEquals("Deutsch", hidden.subject)
        assertEquals("A108", hidden.room)
        assertEquals("Alt", hidden.teacher)
        assertFalse(hidden.cancelled)
        assertFalse(hidden.changed)
        assertTrue(WidgetModel.lessons(data).single().cancelled)
        assertEquals("Entfällt", WidgetModel.changeDetail(visible))
        assertEquals("A108 → B112", WidgetModel.changeDetail(visible.copy(cancelled = false)))
    }
    @Test fun savedClassColoursUseTheSameNormalizedKeysAsTheWebTimetable() {
        val data = plan("""{"subject":"Deutsch","course_id":" AbC ","period":1}""")
        val lesson = WidgetModel.lessons(data).single()
        assertEquals("course:abc", lesson.classKey)
        assertEquals("class:10a:mathematik", WidgetModel.classKey(JSONObject("""{"class_name":"１０A","subject":" Mathematik "}""")))
        assertEquals("#12ab34", WidgetModel.colourOverride(lesson, JSONObject("""{"classColors":{"course:abc":"#12ab34"}}""")))
        assertNull(WidgetModel.colourOverride(lesson, JSONObject("""{"classColors":{"course:abc":"invalid"}}""")))
    }
    @Test fun noticesOnlyBelongToTheDisplayedDate() {
        val data = week()
        data.getJSONArray("days").getJSONObject(0).put("substitutionNotices", org.json.JSONArray("""[{"subject":"Sport","info":"Halle gesperrt"}]"""))
        assertEquals("Halle gesperrt", WidgetModel.notices(data, java.time.LocalDate.parse("2026-11-13")).single().detail)
        assertTrue(WidgetModel.notices(data, java.time.LocalDate.parse("2026-11-17")).isEmpty())
    }

    @Test fun nullableApiFieldsNeverAppearAsLiteralNullInWidgets() {
        val lesson = WidgetModel.lessons(plan("""{"subject":"Deutsch","period":1,"room":null,"teacher":null,"info":null,
            "original_lesson":{"room":null,"teacher":null},"substitution":{"info":null}}""")).single()
        assertEquals("", lesson.room)
        assertEquals("", lesson.teacher)
        assertEquals("", lesson.info)
        assertEquals("", lesson.originalRoom)
        assertEquals("Vertretung", WidgetModel.changeDetail(lesson))
    }
}
