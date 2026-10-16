package de.lanis.app

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class TimetableTileService : TileService() {
    override fun onStartListening() { qsTile?.let { it.state = Tile.STATE_INACTIVE; it.label = getString(R.string.widget_today); it.updateTile() } }
    override fun onClick() {
        val intent = Intent(this, MainActivity::class.java).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("https://lanis.arg-server.de/timetable")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (Build.VERSION.SDK_INT >= 34) startActivityAndCollapse(PendingIntent.getActivity(this, 900, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        else { @Suppress("DEPRECATION") startActivityAndCollapse(intent) }
    }
}
