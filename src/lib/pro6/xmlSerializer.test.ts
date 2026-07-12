import { describe, expect, it } from 'vitest'
import { serializeXml, type XmlNode } from './xmlSerializer'

describe('xmlSerializer', () => {
  it('includes the XML declaration as the first line', () => {
    const node: XmlNode = { tag: 'root' }
    const xml = serializeXml(node)
    expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true)
  })

  it('self-closes tags with no children/text', () => {
    const node: XmlNode = { tag: 'foo', attrs: { a: '1' } }
    const xml = serializeXml(node)
    expect(xml).toContain('<foo a="1"/>')
  })

  it('escapes & < > " in attribute values', () => {
    const node: XmlNode = { tag: 'root', attrs: { value: `& < > " '` } }
    const xml = serializeXml(node)
    expect(xml).toContain('value="&amp; &lt; &gt; &quot; &apos;"')
  })

  it('escapes & < > in text content', () => {
    const node: XmlNode = { tag: 'root', text: `a & b < c > d` }
    const xml = serializeXml(node)
    expect(xml).toContain('<root>a &amp; b &lt; c &gt; d</root>')
  })

  it('does not escape quotes in text content (not required there)', () => {
    const node: XmlNode = { tag: 'root', text: `she said "hi"` }
    const xml = serializeXml(node)
    expect(xml).toContain('<root>she said "hi"</root>')
  })

  it('serializes nested children', () => {
    const node: XmlNode = {
      tag: 'root',
      children: [
        { tag: 'child', attrs: { id: '1' } },
        { tag: 'child', attrs: { id: '2' }, text: 'hello' },
      ],
    }
    const xml = serializeXml(node)
    expect(xml).toContain('<root><child id="1"/><child id="2">hello</child></root>')
  })

  it('produces well-formed XML parseable without throwing', async () => {
    const { XMLParser } = await import('fast-xml-parser')
    const node: XmlNode = {
      tag: 'root',
      attrs: { name: 'a & b' },
      children: [{ tag: 'leaf', text: '<weird> & "text"' }],
    }
    const xml = serializeXml(node)
    const parser = new XMLParser({ ignoreAttributes: false })
    expect(() => parser.parse(xml)).not.toThrow()
  })
})
