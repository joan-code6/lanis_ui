# Preparing modules sooner

LANIS already starts preloading after a 500 ms head start for the active screen.
Previously, it waited for each entire module before starting the next. A slow
calendar request could delay messages, courses and everything behind it.

The new scheduler uses two workers in the existing dashboard/sidebar priority
order. One worker can continue while the other waits. Each module's own requests
remain sequential, and duplicate module IDs are removed. This bounds background
work without firing every request at once.

Offline mode, Data Saver and 2G restrictions still suppress speculation. Effect
cleanup stops new queued modules and follow-up requests. Already-started reads
are allowed to finish because a page navigation may be sharing their promise.
The existing API layer still expires speculative responses, retries failed
prefetches and bypasses them for manual refresh.

This improves the opportunity for the next page's data to be ready. It does not
make uncached data instantaneous or save all modules across app restarts. A
separate saved-screen change addresses returning launches. Two workers can use
more network/server capacity than a sequential queue; the benefit should be
checked on real connections before increasing concurrency further.

The deterministic regression test holds calendar pending and verifies that
messages finishing starts courses before calendar finishes. It also verifies a
peak of two scheduler requests, duplicate suppression, cancellation of queued
and follow-up reads, offline mode, Data Saver, and all existing speculative-read
handoff and refresh behavior. These are behavior checks, not production speed
measurements.
