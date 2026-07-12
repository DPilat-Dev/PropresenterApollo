/**
 * Abstraction point for translation providers. Calling code (UI, translationClient)
 * depends only on this interface, so the concrete translation API can be swapped
 * out later without touching callers.
 */
export interface TranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>
}

/**
 * Thrown by TranslationProvider implementations whenever a translation could not
 * be obtained: network failure, non-2xx HTTP status, request timeout, or a
 * provider-specific "soft" failure (e.g. MyMemory returning HTTP 200 with a
 * quota-exceeded warning instead of a real translation).
 */
export class TranslationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TranslationError'
  }
}
