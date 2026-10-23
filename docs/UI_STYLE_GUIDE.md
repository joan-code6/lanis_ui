# Module UI style guide

The source of truth for these styles is `src/index.css` (`@layer components`).
Use the shared classes rather than copying their Tailwind utilities into each module.
This guide covers authenticated modules, including their demo and loading views.
Landing pages, authentication and legal content have their own composition.

## Layout

- Standard page: `module-page` (full width, centered, maximum 80rem; 1rem padding below 640px, 1.5rem above). Do not add another padded wrapper.
- When the page needs a full-height outer canvas: `module-padding` on that canvas; it shares the width limit and gutters of `module-page`. Existing inner width wrappers may remain, but must not add padding.
- Header: `page-header` (1.5rem bottom margin, 2rem from 640px). Add `page-header-actions` when there are actions: stacked with 1rem gap on mobile, aligned at the top on desktop.
- Sections: `space-y-6`; repeated cards: `gap-4`. Wider content such as lesson timelines may use `gap-6` when grouping information.
- Cards: `card`; clickable cards additionally use `card-hover`. Use `p-4` for dense rows, retaining `card` surfaces and borders. Avoid custom shadows and corner radii for equivalent cards.

## Typography

Keep semantic heading levels independent of size. Use one h1 for the active page.

- Page heading: `page-title`: 24px / 32px line height on mobile; 30px / 36px from 640px; weight 700, tight tracking, surface-900 / surface-100.
- Page description or date range: `page-subtitle`: 14px / 20px on mobile, 16px / 24px from 640px; weight 400; surface-500 / surface-400; 4px top margin.
- Section heading: `section-title`: 18px / 28px, weight 600, surface-900 / surface-100.
- Item heading or dialog title: `item-title`: 16px / 24px, weight 600, same colors.
- Body: `text-sm` (14px / 20px), weight 400. Labels and interactive controls use weight 500. Metadata: `text-xs`, surface-500 / surface-400.
- Empty-state heading: `empty-state-title`: 14px / 20px, weight 500, surface-700 / surface-300. Description: `empty-state-text`. Use `empty-state` and `empty-state-icon` for standalone empty panels.

Preserve truncation, wrapping and layout helpers alongside these classes. Do not add competing font-size, font-weight, text-color or margin utilities to shared typography classes.

## Controls and colors

Use `btn` with `btn-primary`, `btn-secondary` or `btn-ghost`; use `input`, `label` and `badge` for their corresponding controls. Standard buttons are 14px, weight 500, with 10px vertical and 16px horizontal padding. Icons are normally 20px; 16px inside labeled buttons.

Use theme-aware `primary-*` and `surface-*` tokens. Pair custom light surfaces and text with dark variants. Keep semantic status colors for errors, warnings and success. Verify light, dark and OLED modes; do not hardcode white text in place of surface-100 for ordinary headings.

## Intentional exceptions

Messaging is a full-height split pane: retain its own scrolling, pane borders and compact controls. Its h1 uses `page-title page-title-compact` (18px at every breakpoint, same weight and colors). Calendar retains its height and scrolling constraints. Timetables retain their dense cells. These content layouts do not change the surrounding module typography or gutters.

## Review checklist

Check the affected demo routes at a narrow mobile width and desktop width. Include loading, empty and populated states where available. Confirm long titles wrap or truncate appropriately, header actions fit, there is only one set of page gutters, and light/dark/OLED text remains legible. Run `npm run build`. When introducing a new recurring pattern, add its shared class and update this guide in the same PR.

Agents uses compact connection rows and shared controls. OAuth approval uses the existing themed AppIcon and three access presets; individual permissions appear only under Custom.
