// UTF-8-safe base64 helpers.
//
// `btoa`/`atob` operate on Latin1 code units, so passing arbitrary unicode
// text through them directly corrupts anything outside the Latin1 range.
// Instead we go through TextEncoder/TextDecoder to get well-formed UTF-8
// bytes, and base64-encode/decode those bytes ourselves.

/** Encodes a JS string as UTF-8 bytes, then base64-encodes those bytes. */
export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Inverse of encodeBase64Utf8: base64-decodes to bytes, then decodes as UTF-8. */
export function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}
