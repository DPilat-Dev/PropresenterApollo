import { XMLParser } from 'fast-xml-parser'
import { decodeBase64Utf8 } from '../../lib/pro6/base64'
import { parseRect3D } from '../../lib/pro6/rect3d'
import { parseColor } from '../../lib/pro6/colorFormat'

/**
 * Structural comparison helper for pro6 XML golden-file tests. Intended for
 * a later phase's `pro6Builder.golden.test.ts` (see the
 * `test:update-goldens` package.json script) - not currently wired into any
 * test in this module, provided as a documented bonus utility.
 *
 * Compares two pro6 XML strings for semantic equivalence:
 *  - Attribute order is ignored (both are parsed into objects, not compared
 *    as raw strings).
 *  - `RTFData` NSString fields are base64-decoded and compared as text
 *    (RTF's own formatting/whitespace is compared literally, since the RTF
 *    encoder is deterministic - only the raw XML attribute order is treated
 *    as insignificant).
 *  - `RVRect3D` and color fields (`fillColor`, `backgroundColor`, group
 *    `color`) are parsed and compared numerically with an epsilon, so
 *    e.g. "1" vs "1.0" don't spuriously fail.
 *  - Everything else is compared via deep structural equality after
 *    normalizing key ordering (irrelevant for JS object comparison anyway).
 *
 * Throws with a descriptive message on first mismatch found (rather than
 * returning a boolean), so it reads well as a Vitest assertion helper:
 *   assertPro6Equivalent(actual, golden)
 */
export function assertPro6Equivalent(actual: string, golden: string, epsilon = 1e-6): void {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
  })

  const actualDoc = parser.parse(actual)
  const goldenDoc = parser.parse(golden)

  compareNode(actualDoc, goldenDoc, '$', epsilon)
}

const RECT_KEYS = new Set(['RVRect3D'])
// fillColor, backgroundColor, and (group) color are all real pro6 XML
// attributes (not child elements), so under the attributeNamePrefix: '@_'
// parser config above they show up as '@_fillColor' etc. The un-prefixed
// names are kept too in case a future caller feeds in a document shape
// where one of these appears as a child element instead.
const COLOR_KEYS = new Set([
  'fillColor', '@_fillColor',
  'backgroundColor', '@_backgroundColor',
  'color', '@_color',
])
const RTF_ATTR_MARKER = 'RTFData'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compareNode(actual: any, golden: any, path: string, epsilon: number): void {
  if (typeof golden === 'string' || typeof actual === 'string') {
    compareLeaf(actual, golden, path, epsilon)
    return
  }

  if (golden === null || golden === undefined) {
    if (actual !== golden) {
      throw new Error(`Mismatch at ${path}: expected ${JSON.stringify(golden)}, got ${JSON.stringify(actual)}`)
    }
    return
  }

  if (Array.isArray(golden)) {
    if (!Array.isArray(actual)) {
      throw new Error(`Mismatch at ${path}: expected array, got ${typeof actual}`)
    }
    if (actual.length !== golden.length) {
      throw new Error(`Mismatch at ${path}: expected array length ${golden.length}, got ${actual.length}`)
    }
    golden.forEach((g, i) => compareNode(actual[i], g, `${path}[${i}]`, epsilon))
    return
  }

  if (typeof golden === 'object') {
    const goldenKeys = Object.keys(golden).sort()
    const actualKeys = Object.keys(actual ?? {}).sort()
    if (JSON.stringify(goldenKeys) !== JSON.stringify(actualKeys)) {
      throw new Error(
        `Mismatch at ${path}: expected keys [${goldenKeys.join(', ')}], got [${actualKeys.join(', ')}]`,
      )
    }

    // Special-case: an NSString whose rvXMLIvarName attribute is RTFData -
    // decode and compare as text rather than raw base64.
    if (golden['@_rvXMLIvarName'] === RTF_ATTR_MARKER && '#text' in golden) {
      const goldenRtf = decodeBase64Utf8(String(golden['#text']))
      const actualRtf = decodeBase64Utf8(String(actual['#text']))
      if (goldenRtf !== actualRtf) {
        throw new Error(`Mismatch at ${path} (decoded RTFData):\nexpected: ${goldenRtf}\ngot:      ${actualRtf}`)
      }
      return
    }

    for (const key of goldenKeys) {
      if (RECT_KEYS.has(key) && typeof golden[key] === 'string') {
        compareRect(actual[key], golden[key], `${path}.${key}`, epsilon)
        continue
      }
      if (COLOR_KEYS.has(key) && typeof golden[key] === 'string') {
        compareColor(actual[key], golden[key], `${path}.${key}`, epsilon)
        continue
      }
      compareNode(actual[key], golden[key], `${path}.${key}`, epsilon)
    }
    return
  }

  if (actual !== golden) {
    throw new Error(`Mismatch at ${path}: expected ${JSON.stringify(golden)}, got ${JSON.stringify(actual)}`)
  }
}

function compareLeaf(actual: unknown, golden: unknown, path: string, epsilon: number): void {
  const goldenStr = String(golden)
  const actualStr = String(actual)

  // Rect-shaped or color-shaped leaf strings get numeric comparison too,
  // in case they show up outside one of the known element/attribute names.
  if (/^\{.*\}$/.test(goldenStr.trim())) {
    compareRect(actualStr, goldenStr, path, epsilon)
    return
  }
  if (/^-?\d/.test(goldenStr.trim()) && goldenStr.trim().split(/\s+/).length === 4) {
    compareColor(actualStr, goldenStr, path, epsilon)
    return
  }

  if (actualStr !== goldenStr) {
    throw new Error(`Mismatch at ${path}: expected ${JSON.stringify(goldenStr)}, got ${JSON.stringify(actualStr)}`)
  }
}

function compareRect(actual: unknown, golden: unknown, path: string, epsilon: number): void {
  const g = parseRect3D(String(golden))
  const a = parseRect3D(String(actual))
  for (const key of Object.keys(g) as (keyof typeof g)[]) {
    if (Math.abs(a[key] - g[key]) > epsilon) {
      throw new Error(`Mismatch at ${path}.${key}: expected ${g[key]}, got ${a[key]}`)
    }
  }
}

function compareColor(actual: unknown, golden: unknown, path: string, epsilon: number): void {
  const g = parseColor(String(golden))
  const a = parseColor(String(actual))
  for (const key of Object.keys(g) as (keyof typeof g)[]) {
    if (Math.abs(a[key] - g[key]) > epsilon) {
      throw new Error(`Mismatch at ${path}.${key}: expected ${g[key]}, got ${a[key]}`)
    }
  }
}
