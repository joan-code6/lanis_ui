# LANIS icon usage

The theme palette is defined in `scripts/icon-palettes.mjs`. Run
`node scripts/generate-themed-icons.mjs` and `node scripts/generate-opengraph.mjs`
after changing it. The immutable raster sources are
`scripts/assets/icon-source.png` and `scripts/assets/icon-source-cyan.png`;
public files are generated output. Option D applies `round(channel * 0.4)` to
each harmonious hat color, including cyan. Cyan has its own source to preserve
its original background and shading.

| Surface | Source | Behavior |
| --- | --- | --- |
| Login, onboarding, mobile header, desktop sidebar | `AppIcon` | Selected theme via `getThemeIconUrl` |
| Landing header, install promotion | `AppIcon` | Selected theme, default ruby |
| Status and incident headers | `AppIcon` | Selected theme |
| Agent authorization, including error states | `AppIcon` | Selected theme |
| Browser favicon, Apple touch icon, install manifest | `index.html`, `applyThemeAssets` | Selected theme; theme manifests point to matching 192/512 PNGs |
| Prerendered school pages | `ThemeProvider` with school color | Closest supported theme artwork |
| Direct `/favicon/*` URLs and `/icon.webp` | Icon generator | Default ruby; PNG aliases match themed ruby exactly |
| Browser push icon and badge | `public/sw.js` | Default ruby through root favicon aliases |
| Link previews, Open Graph, Twitter | `generate-opengraph.mjs`, `SEO`, `index.html` | Fixed ruby branding with the shared ruby hat palette |
| Android launchers and round launchers | `generate-android-icons.mjs` on `feat/android-app` | Packaged copies of all nine 512px theme images |
| Android recent-apps/task icon | `MainActivity.kt` | Selected launcher resource |
| Android system splash | `ic_lanis_splash` → `ic_lanis` → `ic_lanis_ruby` | Default ruby |
| Android notification/status, quick-settings tile, shortcuts, monochrome launcher | `ic_stat_lanis` | Monochrome glyph, intentionally independent of the color palette |
| Admin portal header | `lanis_admin/public/lanis-logo.png` | Cyan option D; copied from the shared generated cyan artwork |

`lanis_api` contains no bundled LANIS icon references. The admin portal is a
separate repository. Android resources live on the separate `feat/android-app`
branch and must be regenerated there after web artwork is synchronized.

Screenshots under `docs/` and landing screenshots are historical captures rather
than live icon sources. Custom theme colors continue to select the closest
supported icon palette through `getThemeAssetName`.
