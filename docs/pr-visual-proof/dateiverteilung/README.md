# Dateiverteilung — redacted live-account screenshots

Captured on 2026-10-15 from the Dateiverteilung UI PR using the populated
Schulportal account verified during live testing. Its current response contains
three distributions, two unread notices, and one file. Grouping, unread state,
notice line counts, and the file/download control come from that response.

The local screenshot harness replaced names, author/source labels, titles,
notice text, dates, filenames, IDs, and links **before sending any data to the
browser**. Opaque bars cover the replacement text in the captured UI. The source
initials are generated aliases, not the account's real initials. No original
personal content or credentials are present in these images or their metadata.

The existing demo route supplies only the navigation/authentication shell; the
Dateiverteilung overview is supplied by the redacted live response rather than
the demo fixture. The banner and corner annotation identify this explicitly.
Downloads were disabled for these screenshots. The mobile download image uses
the real search input to filter by the anonymized filename.

- [Desktop overview, light mode](desktop-redacted.png) — all three distributions
  and the file control.
- [Mobile overview, dark mode](mobile-dark-redacted.png) — 390 × 844 CSS viewport.
- [Mobile file search/download control, dark mode](mobile-download-redacted.png)
  — same viewport, filtered to the file distribution.

These are browser screenshots, with redaction applied before capture. No image
generation, blur, or original personal text underneath the bars was used.
The screenshot commit changes documentation and image assets only.
