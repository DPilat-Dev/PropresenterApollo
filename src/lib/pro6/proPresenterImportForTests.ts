import { XMLParser } from 'fast-xml-parser'
import type { Rect3D, RGBAColor } from '../../types/song'
import { decodeBase64Utf8 } from './base64'
import { parseRect3D } from './rect3d'
import { parseColor } from './colorFormat'

export interface ParsedPro6Slide {
  plainText: string
  translationPlainText: string | null
  mainPosition: Rect3D
  mainColor: RGBAColor
}

export interface ParsedPro6Document {
  slides: ParsedPro6Slide[]
}

/** Tags that can legitimately repeat at the same nesting level; force these
 * to always parse as arrays (even when only one is present) so traversal
 * code doesn't need to special-case the "exactly one child" case. */
const ARRAY_TAGS = new Set(['array', 'RVSlideGrouping', 'RVDisplaySlide', 'RVTextElement', 'NSString'])

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) => ARRAY_TAGS.has(name),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findArrayByIvarName(arrays: any[] | undefined, ivarName: string): any | undefined {
  return (arrays ?? []).find((a) => a?.['@_rvXMLIvarName'] === ivarName)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(node: any): string {
  if (typeof node === 'string') return node
  if (node && typeof node === 'object' && '#text' in node) return String(node['#text'])
  return ''
}

/**
 * TEST-ONLY permissive reader for pro6 XML produced by exportSongToPro6Xml.
 *
 * This exists solely to support round-trip regression testing of the
 * exporter (see pro6Builder.roundtrip.test.ts). It is intentionally NOT
 * wired into the app's UI or any production import feature - the product
 * does not support importing arbitrary real-world .pro6 files, and this
 * reader makes no attempt to be robust against files it didn't itself
 * produce.
 */
export function parsePro6ForTests(xml: string): ParsedPro6Document {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = parser.parse(xml)
  const root = doc.RVPresentationDocument
  const groupsArray = findArrayByIvarName(root.array, 'groups')
  const groupings: unknown[] = groupsArray?.RVSlideGrouping ?? []

  const slides: ParsedPro6Slide[] = []

  for (const grouping of groupings as any[]) {
    const slidesArray = findArrayByIvarName(grouping.array, 'slides')
    const displaySlides: unknown[] = slidesArray?.RVDisplaySlide ?? []

    for (const displaySlide of displaySlides as any[]) {
      const displayElementsArray = findArrayByIvarName(displaySlide.array, 'displayElements')
      const textElements: any[] = displayElementsArray?.RVTextElement ?? []

      if (textElements.length === 0) continue

      const mainEl = textElements[0]
      const translationEl = textElements.length > 1 ? textElements[1] : null

      const mainPlainB64 = textOf(findArrayByIvarName(mainEl.NSString, 'PlainText'))
      const plainText = decodeBase64Utf8(mainPlainB64)

      let translationPlainText: string | null = null
      if (translationEl) {
        const transPlainB64 = textOf(findArrayByIvarName(translationEl.NSString, 'PlainText'))
        translationPlainText = decodeBase64Utf8(transPlainB64)
      }

      const mainPosition = parseRect3D(textOf(mainEl.RVRect3D))
      const mainColor = parseColor(mainEl['@_fillColor'])

      slides.push({ plainText, translationPlainText, mainPosition, mainColor })
    }
  }

  return { slides }
}
