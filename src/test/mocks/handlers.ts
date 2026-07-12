import { http, HttpResponse } from 'msw'

export const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get'

export const handlers = [
  http.get(MYMEMORY_ENDPOINT, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    const langpair = url.searchParams.get('langpair') ?? ''
    const targetLang = langpair.split('|')[1] ?? 'xx'
    return HttpResponse.json({
      responseData: {
        translatedText: `[${targetLang}] ${q}`,
        match: 1,
      },
      responseStatus: 200,
      matches: [],
    })
  }),
]
