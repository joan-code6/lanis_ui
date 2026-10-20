# LANIS UI development

Use a git worktree for changes. Do not modify another checkout's uncommitted work.

Before changing module UI, read [the UI style guide](docs/UI_STYLE_GUIDE.md).
Use the shared layout, typography, controls and theme tokens in `src/index.css`.
Keep equivalent module elements consistent; document intentional exceptions in the guide.
Apply the guide to loading and demo views as well as populated pages.

Run `npm run build` and verify affected demo routes at mobile and desktop widths.
