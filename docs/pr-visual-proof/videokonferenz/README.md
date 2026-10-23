# Videokonferenz — redacted live-account screenshots

Captured on 2026-10-15 from the UI PR using a real authenticated Schulportal
account with eight room entries. All its rooms were waiting/closed at capture
time. The full catalog is scrollable; the desktop and mobile viewports show
part of that catalog.

Room names, teacher labels, IDs, link labels, and URLs were replaced before
reaching the browser. Opaque bars cover the replacement text in the captured
UI. Counts, teacher-list lengths, materials-link presence, and current room
state are preserved. No original personal names, session links, or credentials
are included in these images or their metadata.

The demo route supplies only the navigation/authentication shell. The room API
service is connected to a local harness with a real Schulportal session,
rather than the fictional demo catalog. The banner identifies the live,
anonymized source. Redaction was applied before browser capture; no image
generation or blur was used.

- [Desktop live overview, light mode](desktop-redacted.png)
- [Mobile live overview, dark mode](mobile-dark-redacted.png), 390 × 844 CSS pixels
- [Controlled status outage, mobile dark mode](status-outage-redacted.png)

The outage image is explicitly labeled as a simulated timeout of the status
request. It uses the real room catalog, shows unknown states and an unavailable
status summary, and offers no join actions. It is not evidence of a real portal
outage. No conference was entered, and no currently open live room was available
to test entry or media behavior.
