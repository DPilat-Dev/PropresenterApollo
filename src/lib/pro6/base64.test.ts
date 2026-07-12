import { describe, expect, it } from 'vitest'
import { decodeBase64Utf8, encodeBase64Utf8 } from './base64'

describe('base64 utf-8 helpers', () => {
  it('round-trips ASCII text', () => {
    const text = 'Hello, world!'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })

  it('round-trips accented Latin text', () => {
    const text = 'café, naïve, résumé'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })

  it('round-trips CJK text', () => {
    const text = '主よ、みもとに近づかん'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })

  it('round-trips emoji (surrogate pairs)', () => {
    const text = 'Amazing grace 🎵🙏'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })

  it('round-trips empty string', () => {
    expect(decodeBase64Utf8(encodeBase64Utf8(''))).toBe('')
  })

  it('produces standard base64 output for a known value', () => {
    expect(encodeBase64Utf8('abc')).toBe(btoa('abc'))
  })

  it('round-trips multi-line text', () => {
    const text = 'line one\nline two\nline three'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })
})
