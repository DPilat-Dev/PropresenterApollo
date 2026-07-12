import { describe, it, expect } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../../../test/mocks/server'
import { MYMEMORY_ENDPOINT } from '../../../test/mocks/handlers'
import { MyMemoryProvider } from './myMemoryProvider'
import { TranslationError } from '../types'

describe('MyMemoryProvider', () => {
  it('returns the translated text from the default success-path handler', async () => {
    const provider = new MyMemoryProvider()

    const result = await provider.translate('Hello world', 'en', 'es')

    expect(result).toBe('[es] Hello world')
  })

  it('throws TranslationError when the response is HTTP 200 with a MYMEMORY WARNING payload', async () => {
    server.use(
      http.get(MYMEMORY_ENDPOINT, () => {
        return HttpResponse.json({
          responseData: {
            translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY',
            match: 0,
          },
          responseStatus: 200,
          matches: [],
        })
      }),
    )

    const provider = new MyMemoryProvider()

    await expect(provider.translate('Hello world', 'en', 'es')).rejects.toThrow(TranslationError)
  })

  it('throws TranslationError on HTTP 500', async () => {
    server.use(
      http.get(MYMEMORY_ENDPOINT, () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    const provider = new MyMemoryProvider()

    await expect(provider.translate('Hello world', 'en', 'es')).rejects.toThrow(TranslationError)
  })

  it(
    'throws TranslationError when the request exceeds the configured timeout',
    async () => {
      server.use(
        http.get(MYMEMORY_ENDPOINT, async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
      )

      const provider = new MyMemoryProvider(50)

      await expect(provider.translate('Hello world', 'en', 'es')).rejects.toThrow(TranslationError)
    },
    2000,
  )
})
