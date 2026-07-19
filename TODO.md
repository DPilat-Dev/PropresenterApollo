# TODO / Roadmap

Tracks what's left from the visual redesign (see `docs/design-reference/` for
the source mockups) and other known gaps. Items are grouped by whether they
were deliberately deferred, deliberately scoped out, or are pre-existing gaps
unrelated to the redesign.

## Deferred from the redesign (needs new data-model work)

These appear in the reference mockups but were intentionally left out of the
first redesign pass because they require new fields/store actions, not just
new UI. The redesign pass added clearly-labeled "coming soon" placeholders in
their place rather than dead controls.

- **Horizontal text alignment** (left / center / right). Only vertical
  alignment (`top` / `center` / `bottom`) exists today on `TextElementState`.
  Would need a new `horizontalAlignment` field, `text-align` in the preview,
  RTF `\ql`/`\qc`/`\qr` support in `rtfEncoder.ts`, and a store action.
- **Third language / third text role.** `Slide` only has `mainText` and
  `translationText`. Adding a `thirdText: TextElementState | null` (mirroring
  `translationText`) touches the data model, store, preview, RTF/`.pro6`
  export, and the Colors/Layout tabs' "third language" rows.
- **Text effects: shadow / outline.** No `TextStyle.shadow`/`outline` fields
  exist. Real ProPresenter 6 files DO have the backing structure for this
  (`<shadow rvXMLIvarName="shadow">opacity|r g b a|{x, y}</shadow>` and a
  `<dictionary rvXMLIvarName="stroke">` with `RVShapeElementStrokeColorKey` /
  `RVShapeElementStrokeWidthKey`, confirmed against a real exported file) —
  the export side is a known, spec-backed target whenever this gets built.
- **Slide layout composition presets** (Original + Translation, Two + Two,
  Alternating, Three Languages, Side by Side, Original Only, Translation
  Only). The mockup's Layout tab lists 7 presets; today the app has one
  implicit layout (main text + optional translation, positioned/aligned
  individually). This needs a real composition-pattern concept, ideally
  additive on top of the existing per-role position/visibility fields rather
  than a parallel rendering system.
- **Quality tab.** Placeholder only — the reference screenshot's Quality tab
  content was cut off, so no fake settings were invented. Revisit once there's
  an actual spec for what belongs here (export resolution/quality settings?).

## Deliberately out of scope (conflicts with existing product decisions)

- **Verse/chorus AI auto-detection.** The mockup's left "Sections" panel
  shows `verse`/`chorus` badges and the Home Page tagline references
  detecting them automatically. This app's lyric splitting is a fixed,
  user-configurable number of lines per slide (`splitLyrics`), not
  blank-line/repetition-based semantic detection — an earlier, deliberate
  product decision. Building real verse/chorus classification would reverse
  that. The Sections list is restyled to match the mockup's card look, but
  uses plain "Slide N" labels (or the slide's own `label` if set), not
  fabricated verse/chorus tags. If this is wanted later, it needs a real
  product decision first (change the splitting model, or layer detection on
  top of it), not just a styling pass.
- **Community / Team pages.** Nav items exist and are styled, but are inert
  placeholders ("coming soon"). This app has no backend or accounts; real
  collaboration features are a different project.
- **Manual theme switcher.** The mockup shows a Dark/Light dropdown in the
  header. This app deliberately follows the OS/browser's `prefers-color-scheme`
  automatically instead (confirmed decision) — no manual switcher UI.
- **Publish/Unpublish, version History.** The editor mockup shows a
  "Published" badge, a History button, and Unpublish/Publish toggle. There's
  no publish concept or version history in this app (it's local-only,
  autosaved). The editor shows a static "Draft" badge instead of fabricating
  fake publish state; History was omitted rather than stubbed with no data
  behind it.
- **Real Settings screen.** The header's settings icon is present but
  disabled — there's currently nothing in the app to configure.
- **Importing real `.pro6` files.** Always out of scope (see main README) —
  "import" means plain lyrics text only.

## Pre-existing gaps (unrelated to the redesign)

- `src/test/helpers/comparePro6.ts` and `src/test/fixtures/pro6-golden/*.pro6`
  (structural golden-file XML comparison) exist but aren't wired into any
  active test yet — reserved for a future golden-file test suite.
- No UI ever existed for `RVSlideGrouping`-level settings (group name/color)
  — the app only ever creates a single implicit "Slides" group per song.
