package de.joancode.lanis

import org.json.JSONObject
import kotlin.math.roundToInt

/** Account preferences are the source of truth, independent of WebView startup defaults. */
object WidgetAppearance {
    private val legacy = mapOf("ruby" to "#f43f5e", "cyan" to "#06b6d4", "emerald" to "#10b981",
        "sapphire" to "#3b82f6", "amethyst" to "#a855f7", "amber" to "#f59e0b",
        "coral" to "#f88379", "blush" to "#fee3ea", "moss" to "#4b573f")
    fun normalizeColor(value: String): String? {
        legacy[value]?.let { return it }
        if (value.matches(Regex("#[a-fA-F0-9]{6}"))) return value.lowercase()
        if (value.matches(Regex("#[a-fA-F0-9]{3}"))) return "#" + value.drop(1).map { "$it$it" }.joinToString("").lowercase()
        return null
    }
    private fun appearance(value: JSONObject?): JSONObject? {
        value ?: return null
        val color = normalizeColor(value.optString("theme_color")) ?: return null
        val mode = value.optString("theme_mode")
        if (mode !in listOf("light", "dark", "system", "oled")) return null
        return JSONObject().put("theme_color", color).put("theme_mode", mode)
    }
    fun save(state: JSONObject, value: JSONObject?, substitutions: Boolean, colors: JSONObject): Boolean {
        val saved = appearance(value)
        if (value != null && saved == null) return false
        val valid = JSONObject()
        for (key in colors.keys()) normalizeColor(colors.optString(key))?.let { if (key.length <= 512) valid.put(key, it) }
        val prefs = JSONObject().put("showSubstitutions", substitutions).put("classColors", valid)
        (saved ?: state.optJSONObject("widgetPreferences")?.optJSONObject("appearance"))?.let { prefs.put("appearance", it) }
        state.put("widgetPreferences", prefs)
        return true
    }
    fun fromAccount(state: JSONObject, response: JSONObject): Boolean {
        if (!response.optBoolean("success") || !response.optBoolean("stored")) return false
        val prefs = response.optJSONObject("preferences") ?: return false
        val saved = appearance(prefs.optJSONObject("appearance")) ?: return false
        val timetable = prefs.optJSONObject("timetable") ?: return false
        return save(state, saved, timetable.optBoolean("show_substitutions", true), timetable.optJSONObject("class_colors") ?: JSONObject())
    }
    // Same primary palette calculation as applyThemeColorPalette in src/utils/themeAssets.ts.
    fun primary(color: String, white: Double = 0.0, black: Double = 0.0): String = "#" +
        color.drop(1).chunked(2).joinToString("") { channel ->
            (channel.toInt(16) * (1 - white - black) + 255 * white).roundToInt().toString(16).padStart(2, '0')
        }
    data class Palette(val accent: String, val surface: String, val foreground: String, val muted: String,
        val line: String, val emphasis: String, val highlight: String, val dark: Boolean)
    fun palette(state: JSONObject, systemDark: Boolean): Palette {
        val stored = appearance(state.optJSONObject("widgetPreferences")?.optJSONObject("appearance"))
        val accent = stored?.optString("theme_color") ?: normalizeColor(state.optString("accent")) ?: "#f43f5e"
        val mode = stored?.optString("theme_mode") ?: state.optString("themeMode").ifBlank {
            if (state.optBoolean("oled")) "oled" else if (state.optBoolean("dark")) "dark" else "light"
        }
        val oled = mode == "oled"
        val dark = oled || mode == "dark" || (mode == "system" && systemDark)
        return Palette(accent,
            if (oled) "#000000" else if (dark) "#171717" else "#ffffff",
            if (oled) "#f2f2f2" else if (dark) "#f5f5f5" else "#171717",
            if (oled) "#9c9c9c" else if (dark) "#a3a3a3" else "#737373",
            if (oled) "#202020" else if (dark) "#262626" else "#e5e5e5",
            if (dark) primary(accent, white = .55) else primary(accent, black = .25),
            if (dark) primary(accent, black = .78) else primary(accent, white = .96), dark)
    }
}
