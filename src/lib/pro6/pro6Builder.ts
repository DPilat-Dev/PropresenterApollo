import type { Slide, SlideGroup, Song, TextElementState, VerticalAlignment } from '../../types/song'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../types/song'
import type { XmlNode } from './xmlSerializer'
import { serializeXml } from './xmlSerializer'
import { serializeRect3D } from './rect3d'
import { serializeColor } from './colorFormat'
import { encodeRtf } from './rtfEncoder'
import { encodeBase64Utf8 } from './base64'

/**
 * Mapping of the semantic VerticalAlignment enum to the numeric convention
 * pro6's RVTextElement uses on disk. This is genuinely uncertain territory
 * in the reverse-engineered spec: the convention chosen here is
 * 0 = top, 1 = center, 2 = bottom, matching the natural top-to-bottom
 * ordering used by similarly-named enums elsewhere in the RV-prefixed pro6
 * element family. If a real ProPresenter install disagrees, this map is the
 * single place to fix it.
 */
const VERTICAL_ALIGNMENT_MAP: Record<VerticalAlignment, string> = {
  top: '0',
  center: '1',
  bottom: '2',
}

/**
 * pro6 UUIDs are uppercase/hyphenated. TextElementState.id is used directly
 * (uppercased) as the RVTextElement UUID rather than generating a fresh
 * random one on every export, so exporting the same Song twice produces
 * byte-identical (deterministic) output - useful for diffing/golden tests
 * and for any future "re-export after a small edit" workflow.
 */
function formatUuid(id: string): string {
  return id.toUpperCase()
}

function buildTextElement(el: TextElementState): XmlNode {
  const lines = el.plainText.split('\n')
  const rtf = encodeRtf(lines, el.style)

  return {
    tag: 'RVTextElement',
    attrs: {
      UUID: formatUuid(el.id),
      opacity: String(el.opacity),
      rotation: String(el.rotation),
      verticalAlignment: VERTICAL_ALIGNMENT_MAP[el.verticalAlignment],
      adjustsHeightToFit: 'false',
      // fillColor is an attribute on RVTextElement itself in real pro6 files,
      // not a child element - a real "Amazing Grace expanded.pro6" sample
      // confirms `fillColor="0 0 0 0"` sits directly on the opening tag.
      // Emitting it as a <fillColor> child (the previous approach) meant
      // ProPresenter had no attribute to read and fell back to its own
      // internal default (opaque white), which is exactly the reported bug:
      // every text field showed an opaque white fill despite our data model
      // defaulting to transparent.
      fillColor: serializeColor(el.fillColor),
      // Hard-coded false: there is no UI yet for a user to configure a
      // real box fill, so we never want ProPresenter to draw one,
      // independent of whatever value happens to be stored in fillColor.
      drawingFill: 'false',
      // The attributes below have no corresponding field on TextElementState
      // (nothing in this codebase's data model claims authority over them),
      // so they're static, safe pro6-compliant defaults taken verbatim from
      // a real ProPresenter 6 sample file, in the same spirit as the
      // documented best-effort defaults on buildPro6Document. Keeping them
      // present and correctly-typed reduces the odds of other undiscovered
      // "ProPresenter falls back to its own default" bugs like the fillColor
      // one this function used to have.
      additionalLineFillHeight: '0.000000',
      bezelRadius: '0.000000',
      displayDelay: '0.000000',
      displayName: 'TextElement',
      drawLineBackground: 'false',
      drawingShadow: 'false',
      drawingStroke: 'false',
      fromTemplate: 'true',
      lineFillVerticalOffset: '0.000000',
      locked: 'false',
      persistent: 'false',
      revealType: '0',
      source: '',
      typeID: '0',
      useAllCaps: 'false',
    },
    children: [
      // Position, serialized as pro6's bracketed string form (not nested XML attrs).
      { tag: 'RVRect3D', text: serializeRect3D(el.position) },
      {
        tag: 'NSString',
        attrs: { rvXMLIvarName: 'RTFData' },
        text: encodeBase64Utf8(rtf),
      },
      {
        tag: 'NSString',
        attrs: { rvXMLIvarName: 'PlainText' },
        text: encodeBase64Utf8(el.plainText),
      },
    ],
  }
}

function buildDisplaySlide(slide: Slide): XmlNode {
  const displayElements: XmlNode[] = [buildTextElement(slide.mainText)]
  if (slide.translationText !== null) {
    displayElements.push(buildTextElement(slide.translationText))
  }

  return {
    tag: 'RVDisplaySlide',
    attrs: {
      backgroundColor: serializeColor(slide.backgroundColor),
      enabled: slide.enabled ? 'true' : 'false',
      UUID: formatUuid(slide.id),
      label: slide.label,
      notes: slide.notes,
      hotKey: '',
    },
    children: [
      { tag: 'array', attrs: { rvXMLIvarName: 'displayElements' }, children: displayElements },
      { tag: 'array', attrs: { rvXMLIvarName: 'cues' }, children: [] },
    ],
  }
}

function buildSlideGrouping(group: SlideGroup, slidesById: Map<string, Slide>): XmlNode {
  const slides = group.slideIds
    .map((id) => slidesById.get(id))
    .filter((slide): slide is Slide => slide !== undefined)
    .map(buildDisplaySlide)

  return {
    tag: 'RVSlideGrouping',
    attrs: {
      name: group.name,
      color: serializeColor(group.color),
      uuid: formatUuid(group.id),
    },
    children: [{ tag: 'array', attrs: { rvXMLIvarName: 'slides' }, children: slides }],
  }
}

/**
 * Assembles the full RVPresentationDocument node tree for a Song. Pure
 * function - no I/O, no ID generation side effects (all UUIDs are derived
 * deterministically from existing Song/TextElementState/Slide/SlideGroup ids).
 */
export function buildPro6Document(song: Song): XmlNode {
  const slidesById = new Map(song.slides.map((slide) => [slide.id, slide]))
  const groups = song.groups.map((group) => buildSlideGrouping(group, slidesById))

  return {
    tag: 'RVPresentationDocument',
    attrs: {
      height: String(CANVAS_HEIGHT),
      width: String(CANVAS_WIDTH),
      versionNumber: '600',
      // Document-level background; Song has no dedicated field for this so
      // we default to opaque black (per-slide backgroundColor is what
      // actually matters and is set independently on each RVDisplaySlide).
      backgroundColor: '0 0 0 1',
      drawingBackgroundColor: 'false',
      CCLIDisplay: 'false',
      // The remaining attributes below are metadata ProPresenter 6 writes
      // but that this reverse-engineered spec doesn't pin down precisely.
      // They're best-effort defaults documented here rather than derived
      // from anything in Song - safe placeholders that satisfy a well-formed
      // pro6 file without claiming authority over fields we can't verify.
      buildNumber: '6016',
      docType: '0',
      usedCount: '0',
      category: 'Song',
      resourcesDirectory: '',
      backgroundColorSpace: 'rgba',
      lastDateUsed: song.updatedAt,
      selectedArrangementID: '',
      os: '1',
      artist: '',
      album: '',
      author: '',
      ccliSongTitle: song.title,
    },
    children: [
      // Minimal stub - real ProPresenter timelines carry media-cue data we
      // have no source of truth for; an empty element is valid and ignored.
      { tag: 'RVTimeline', attrs: { rvXMLIvarName: 'timeline', timeLoop: 'false', duration: '0' } },
      { tag: 'array', attrs: { rvXMLIvarName: 'groups' }, children: groups },
      { tag: 'array', attrs: { rvXMLIvarName: 'arrangements' }, children: [] },
    ],
  }
}

/** Main public entry point: builds and serializes a Song straight to a pro6 XML string. */
export function exportSongToPro6Xml(song: Song): string {
  return serializeXml(buildPro6Document(song))
}
