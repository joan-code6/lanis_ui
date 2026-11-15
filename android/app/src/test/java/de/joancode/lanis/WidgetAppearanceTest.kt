package de.joancode.lanis

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class WidgetAppearanceTest {
    private fun account(color: String = "#123456", mode: String = "dark") = JSONObject("""{
        "success":true,"stored":true,"preferences":{
            "appearance":{"theme_color":"$color","theme_mode":"$mode"},
            "timetable":{"show_substitutions":false,"class_colors":{"course:1":"#19a987"}}
        }}""")
    @Test fun storedPreferencesOverrideAnUnrelatedStartupAccentAndMode() {
        val state = JSONObject("""{"accent":"#f43f5e","themeMode":"light"}""")
        assertTrue(WidgetAppearance.fromAccount(state, account()))
        val palette = WidgetAppearance.palette(state, false)
        assertEquals("#123456", palette.accent)
        assertTrue(palette.dark)
        assertEquals("#171717", palette.surface)
        assertEquals("#f5f5f5", palette.foreground)
        assertEquals("#94a4b3", palette.emphasis)
        assertEquals("#040b13", palette.highlight)
        assertEquals("#19a987", state.getJSONObject("widgetPreferences").getJSONObject("classColors").getString("course:1"))
    }
    @Test fun lightColoursMatchTheAppTokensWithoutPinkSurfaceTint() {
        val state = JSONObject(); WidgetAppearance.fromAccount(state, account(mode = "light"))
        val palette = WidgetAppearance.palette(state, true)
        assertFalse(palette.dark)
        assertEquals("#ffffff", palette.surface)
        assertEquals("#171717", palette.foreground)
        assertEquals("#737373", palette.muted)
        assertEquals("#e5e5e5", palette.line)
        assertEquals("#0e2741", palette.emphasis)
        assertEquals("#f6f7f8", palette.highlight)
    }
    @Test fun systemAndOledUseTheSavedModeWhenAppIsClosed() {
        val state = JSONObject(); WidgetAppearance.fromAccount(state, account(mode = "system"))
        assertFalse(WidgetAppearance.palette(state, false).dark)
        assertTrue(WidgetAppearance.palette(state, true).dark)
        WidgetAppearance.fromAccount(state, account(mode = "oled"))
        assertEquals("#000000", WidgetAppearance.palette(state, false).surface)
        assertEquals("#f2f2f2", WidgetAppearance.palette(state, false).foreground)
    }
    @Test fun customColoursArePreservedAndInvalidOrUnstoredResponsesKeepTheLastSnapshot() {
        val state = JSONObject(); WidgetAppearance.fromAccount(state, account("#19a987"))
        assertEquals("#19a987", WidgetAppearance.palette(state, false).accent)
        assertFalse(WidgetAppearance.fromAccount(state, account("invalid")))
        assertFalse(WidgetAppearance.fromAccount(state, account("#f43f5e").put("stored", false)))
        assertEquals("#19a987", WidgetAppearance.palette(state, false).accent)
        assertEquals("#aabbcc", WidgetAppearance.normalizeColor("#aBc"))
    }
    @Test fun legacyBridgeCannotDiscardStoredAccountAppearance() {
        val state = JSONObject(); WidgetAppearance.fromAccount(state, account())
        assertTrue(WidgetAppearance.save(state, null, true, JSONObject()))
        assertEquals("#123456", WidgetAppearance.palette(state, false).accent)
    }
}
