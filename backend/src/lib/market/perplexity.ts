type StateClient = {
    get: (collection: string, key: string) => Promise<any>
    set: (collection: string, key: string, value: any) => Promise<void>
}

export type MarketRateResult = {
    min: number | null
    max: number | null
    avg: number | null
    sources: string[]
}

type FetchMarketRatesParams = {
    niche: string
    followers: number
    platform: string
    country?: string
}

const CACHE_COLLECTION = 'marketRates'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const parseNumber = (value: unknown) => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.]/g, '')
        const num = Number(cleaned)
        return Number.isFinite(num) ? num : null
    }
    return null
}

const extractRatesFromText = (text: string): MarketRateResult => {
    const numberRegex = /(?:₹|\$)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g
    const matches: number[] = []
    let match
    while ((match = numberRegex.exec(text)) !== null) {
        const num = parseNumber(match[1])
        if (num !== null) matches.push(num)
    }

    const sorted = matches.sort((a, b) => a - b)
    const min = sorted.length ? sorted[0] : null
    const max = sorted.length ? sorted[sorted.length - 1] : null
    const avg =
        sorted.length && max !== null && min !== null
            ? Math.round((min + max) / 2)
            : null

    return { min, max, avg, sources: [] }
}

export const fetchMarketRates = async (
    params: FetchMarketRatesParams,
    opts: { state?: StateClient; logger?: { info: Function; warn: Function; error: Function } } = {}
): Promise<MarketRateResult | null> => {
    const { niche, followers, platform, country = 'India' } = params
    const { state, logger } = opts
    const cacheKey = `${platform}:${country}:${niche}:${followers}`

    try {
        if (state) {
            const cached = await state.get(CACHE_COLLECTION, cacheKey)
            if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
                logger?.info?.('Perplexity cache hit', { cacheKey })
                return cached.data as MarketRateResult
            }
        }
    } catch (error) {
        logger?.warn?.('Perplexity cache read failed (continuing without cache)', {
            cacheKey,
            error: (error as Error).message
        })
    }

    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
        logger?.warn?.('Perplexity API key missing; skipping market fetch')
        return null
    }

    const query = `Return JSON with keys min,max,avg,sources for current ${country} influencer rates on ${platform} for creators with ${followers} followers in the ${niche} niche in 2025. Include INR values and cite sources array.`

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: 'Return concise JSON only with fields {min,max,avg,sources}. Sources is an array of strings (urls or source names). Do not include any prose.'
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.2
            })
        })

        if (!response.ok) {
            logger?.warn?.('Perplexity API non-200; skipping', {
                status: response.status,
                statusText: response.statusText
            })
            return null
        }

        const payload = await response.json()
        const text =
            payload?.choices?.[0]?.message?.content ||
            payload?.choices?.[0]?.content ||
            ''

        let parsed: MarketRateResult | null = null
        if (typeof text === 'string') {
            try {
                parsed = JSON.parse(text)
            } catch {
                parsed = null
            }
        } else if (typeof text === 'object' && text !== null) {
            parsed = text as MarketRateResult
        }

        const extracted =
            parsed && typeof parsed === 'object'
                ? {
                      min: parseNumber((parsed as any).min),
                      max: parseNumber((parsed as any).max),
                      avg: parseNumber((parsed as any).avg),
                      sources: Array.isArray((parsed as any).sources)
                          ? (parsed as any).sources.map((s: any) => String(s))
                          : []
                  }
                : extractRatesFromText(String(text || ''))

        if (state) {
            try {
                await state.set(CACHE_COLLECTION, cacheKey, {
                    data: extracted,
                    expiresAt: Date.now() + ONE_DAY_MS
                })
                logger?.info?.('Perplexity cache write success', { cacheKey })
            } catch (error) {
                logger?.warn?.('Perplexity cache write failed (continuing)', {
                    cacheKey,
                    error: (error as Error).message
                })
            }
        }

        logger?.info?.('Perplexity fetched market data', {
            cacheKey,
            min: extracted.min,
            max: extracted.max,
            avg: extracted.avg
        })
        return extracted
    } catch (error) {
        logger?.warn?.('Perplexity fetch failed; returning null', {
            error: (error as Error).message
        })
        return null
    }
}

