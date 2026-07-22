# Glossa

*Worship slides in seconds, in any language.* (Named for *glossa* — tongue, language.)

A browser-based tool that turns pasted song lyrics into bilingual ProPresenter 6 (`.pro6`) slide decks: paste or upload lyrics, auto-split them into slides, auto-translate them line by line into the language of your choice, pick how the two languages sit together on the slide, and export a real `.pro6` file. Everything runs client-side — no backend, no accounts, no server.

## Features

- **Home / song list** — a landing page with search, sort (recently edited / title), grid/list view, and multi-select bulk delete over your locally saved songs.
- **Import** — paste lyrics or upload a plain `.txt` file. `[Verse 1]` / `Chorus:` style headers are detected and used to name and group the slides they precede.
- **Auto-split** — lyrics are chunked into slides using a configurable max lines per slide (blank lines are skipped, not turned into empty slides); adjustable live from the editor without leaving the page.
- **Slide editing** — reorder (drag & drop), merge, split, and delete slides; edit text directly.
- **Slide layouts** — presets for how the original and the translation share a slide: translation stacked under the original, side by side, woven line-by-line (Alternating) or in pairs (Two + Two), or either language on its own.
- **Auto-layout** — text boxes are sized to their own content and centered automatically; no manual positioning. When a slide's text would overflow the 1920×1080 canvas, the type is scaled down to fit (your chosen point size is kept as the maximum, so it springs back when the slide gets shorter).
- **Style panel** — a tabbed Layout / Type / Colors / Quality panel. Type and Colors are **global** settings that apply to the whole song, and by default style the original and the translation together; a checkbox splits them so each language can be styled separately.
- **Translation** — pick a target language and auto-translate via the free MyMemory API. Translation is **per line**, and every line is cached and saved with the song, so re-splitting the lyrics regroups the existing translations instead of re-hitting the API. Any slide's translation can be edited by hand, and manual edits are protected from being overwritten by a later bulk re-translate.
- **Export** — download a real ProPresenter 6 `.pro6` XML file (RTF-encoded text, correct slide/group structure, transparent text-box fill by default — verified against a real ProPresenter 6 file).
- **Local persistence** — songs autosave to the browser's IndexedDB, plus a manual Save button. No account or server required.
- **Light/dark theme** — follows the OS/browser's `prefers-color-scheme`, with a manual override in the header.

See [`docs/design-reference/`](docs/design-reference/) for the mockups the current visual design is based on.

## How to use it

1. **Start a song.** From the home page, hit **+ New Song**. Give it a title (and an artist, if you like).
2. **Paste your lyrics.** Drop the whole song in, or upload a `.txt` file. If you write section headers — `[Verse 1]`, `Chorus:` — they're picked up and used to name and group the slides beneath them. Blank lines are treated as separators, not as empty slides.
3. **Set how many lines go on a slide.** In **STYLE → Layout**, drag **Max Lines Per Slide**. This re-splits the song live, so try a couple of values and watch the preview. Two is a good starting point for congregational singing.
4. **Add a language.** Still in the Layout tab, pick a **Source Language** (what the lyrics are in) and a target language, then **Translate All Slides**. Each line is translated and cached individually, so going back and changing lines-per-slide afterwards costs you nothing — the existing translations are just regrouped onto the new slides.
5. **Fix anything the machine got wrong.** Select a slide and edit its translation directly. Hand edits are marked and won't be clobbered if you hit Translate All again later.
6. **Choose a layout.** Back at the top of the Layout tab, pick how the two languages share a slide — translation under the original, side by side, woven line-by-line (Alternating) or in pairs (Two + Two), or one language on its own.
7. **Style it.** **Type** sets font, size, weight and line height; **Colors** sets text and background. Both apply to the whole song, and to both languages at once — tick *Style main & translation separately* if you want the translation to look different from the original. Boxes size and center themselves, and text shrinks automatically if a slide gets too full, so there's nothing to position by hand.
8. **Export.** Hit **Export** for a real `.pro6` file, then open or import it in ProPresenter 6.

Your songs autosave to this browser. They aren't uploaded anywhere — which also means they're tied to this browser on this machine, so export anything you care about keeping.

## Known limitations

- **Lyrics in, not `.pro6` in.** Import means plain lyrics text; the app can't read existing ProPresenter files.
- **Two languages.** A slide has an original and one translation. A third language isn't in the data model.
- **No verse/chorus detection.** Splitting is by a fixed line count. Section names come from headers you write yourself, not from analysis of the song.
- **Machine translation.** Translations come from the free MyMemory API and are worth a read-through before a service — hence the per-slide override.
- **Placeholders.** The Quality tab, the Community/Team nav items, the Publish badge and the Settings button are styled but inert; there's nothing behind them yet.
- **Bulk placement** (`src/features/quick-edit/`) and the manual padding/box-height controls are built and unit-tested but deliberately unwired from the UI while auto-layout settles. Same for the structural golden-file `.pro6` comparison in `src/test/helpers/comparePro6.ts`.

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
    lyrics/      Pure lyrics-to-slides splitting logic (incl. section headers)
    layout/      Pure line-interleaving for the Alternating / Two + Two layouts
    pro6/        .pro6 XML/RTF export pipeline
    translation/ Translation provider abstraction, per-line cache + MyMemory client
  storage/       IndexedDB persistence (song save/load/list/delete)
  state/         Zustand store (song, translation, and UI slices)
  components/    Small shared UI primitives (icons)
  features/
    home/          Landing page + top nav (AppHeader)
    song-manager/   Saved-songs list: search, sort, view toggle, multi-select
    lyrics-input/   Paste/upload lyrics + split settings
    slide-list/     Per-song slide list ("Sections")
    slide-preview/  Live 16:9 canvas preview, with prev/next navigation
    slide-editor/   Per-slide main/translation text editing
    style-panel/    Tabbed Layout / Type / Colors / Quality panel
    quick-edit/     Bulk placement across all slides (built, not currently
                    wired into the UI — see "Known limitations")
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
