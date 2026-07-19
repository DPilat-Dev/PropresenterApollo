# Verse2Slide

A browser-based tool that turns pasted song lyrics into ProPresenter 6 (`.pro6`) slide decks: paste or upload lyrics, auto-split them into slides, fine-tune spacing/positioning/color per slide, add an auto-translated (and manually overridable) line in the language of your choice, and export a real `.pro6` file. Everything runs client-side — no backend, no accounts, no server.

## Features

- **Home / song list** — a landing page with search, sort (recently edited / title), grid/list view, and multi-select bulk delete over your locally saved songs.
- **Import** — paste lyrics or upload a plain `.txt` file.
- **Auto-split** — lyrics are chunked into slides using a configurable fixed number of lines per slide (blank lines are skipped, not turned into empty slides); adjustable live from the editor without leaving the page.
- **Slide editing** — reorder (drag & drop), merge, split, and delete slides; edit text directly.
- **Style panel** — a tabbed Layout / Type / Colors / Quality panel per slide: vertical alignment and text-box position, font family/size/weight and line spacing, and text/background color pickers, all with a live 16:9 preview.
- **Quick Edit** — bulk-apply a Top/Center/Bottom placement to every slide's main or translation text at once, with an option to clamp the translation box directly beneath the main text box instead of moving independently.
- **Translation** — pick a target language and auto-translate each slide via the free MyMemory API; any slide's translation can be manually edited, and manual edits are protected from being overwritten by a later bulk re-translate.
- **Export** — download a real ProPresenter 6 `.pro6` XML file (RTF-encoded text, correct slide/group structure, transparent text-box fill by default — verified against a real ProPresenter 6 file).
- **Local persistence** — songs autosave to the browser's IndexedDB, plus a manual Save button; a Saved Songs panel lets you create, load, and delete songs. No account or server required.
- **Light/dark theme** — follows the OS/browser's `prefers-color-scheme` automatically; no manual switcher.

See [`TODO.md`](TODO.md) for what's intentionally not built yet (and why), and [`docs/design-reference/`](docs/design-reference/) for the mockups the current visual design is based on.

## Tech stack

React + TypeScript + Vite, Zustand for state, `idb` for IndexedDB persistence, hand-rolled RTF/XML encoding for the `.pro6` export pipeline (no generic XML library, to match ProPresenter's exact on-disk conventions).

## Getting started

```
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | Run `tsc` with no output |
| `npm run test` | Run the unit/component suite (Vitest) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run e2e` | Run the end-to-end suite (Playwright) — builds and serves the app automatically |

## Project layout

```
src/
  types/        Core data model (Song, Slide, TextElementState, Rect3D, ...)
  lib/
    lyrics/      Pure lyrics-to-slides splitting logic
    pro6/        .pro6 XML/RTF export pipeline
    translation/ Translation provider abstraction + MyMemory client
  storage/       IndexedDB persistence (song save/load/list/delete)
  state/         Zustand store (song, translation, and UI slices)
  components/    Small shared UI primitives (icons)
  features/
    home/          Landing page + top nav (AppHeader)
    song-manager/   Saved-songs list: search, sort, view toggle, multi-select
    lyrics-input/   Paste/upload lyrics + split settings
    slide-list/     Per-song slide list ("Sections")
    slide-preview/  Live 16:9 canvas preview, with prev/next navigation
    slide-editor/   Per-slide text editing + position/spacing controls
    style-panel/    Tabbed Layout / Type / Colors / Quality panel
    quick-edit/     Bulk placement across all slides
    translation/    Language picker + per-slide translate/override
    export/         .pro6 export/download
e2e/             Playwright end-to-end specs
docs/
  design-reference/ Mockups the current visual design is based on
```

## Testing & CI

The project has three layers of regression coverage:

- **Unit/component tests** (Vitest + React Testing Library) for the pure library modules, state store, and UI components — including a round-trip test that exports a `.pro6` file and parses it back to verify slide count, text, positions, and colors survive the export pipeline intact.
- **End-to-end tests** (Playwright) covering the full user flow in a real browser: import & split, edit & reorder, translation (including the manual-override-survives-re-translate guarantee), persistence across a page reload, and real downloaded `.pro6` file validity.
- **CI** (`.github/workflows/ci.yml`) runs lint + typecheck, the unit/component suite, and the e2e suite on every pull request and push to `main`.

## Notes on the `.pro6` format

ProPresenter 6's file format isn't officially documented; the export pipeline is built from a reverse-engineered spec. If you have access to a real ProPresenter 6 installation, exporting a song and opening it there is the best validation of any changes to `src/lib/pro6/`.
