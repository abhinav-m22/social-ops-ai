import { TrendScoutState } from "@/types/trend-scout"

// Use relative URL to leverage Next.js rewrites, or absolute if API_BASE is set
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export async function triggerTrendScout(creatorId: string, niche: string = "Tech"): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/api/trend-scout/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, niche }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to trigger TrendScout: ${text}`)
    }
    
    const contentType = res.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text()
        throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`)
    }
    
    const data = await res.json()
    return data
}

export async function getTrendScoutState(creatorId: string): Promise<TrendScoutState | null> {
    try {
        const url = `${API_BASE}/api/trend-scout/state?creatorId=${encodeURIComponent(creatorId)}`
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            }
        })
        
        if (!res.ok) {
            if (res.status === 404) return null
            const text = await res.text()
            console.error(`API Error (${res.status}):`, text.substring(0, 200))
            throw new Error(`Failed to fetch TrendScout state: ${res.status} ${res.statusText}`)
        }
        
        const contentType = res.headers.get("content-type") || ''
        if (!contentType.includes("application/json")) {
            const text = await res.text()
            console.error('Unexpected content type:', contentType, 'URL:', url)
            console.error('Response preview:', text.substring(0, 200))
            // If we get HTML, it might be a Next.js page - try to provide helpful error
            if (contentType.includes('text/html')) {
                throw new Error(`API endpoint returned HTML instead of JSON. Make sure the backend is running on ${API_BASE} and the endpoint is registered.`)
            }
            throw new Error(`Expected JSON but got: ${contentType}`)
        }
        
        return await res.json()
    } catch (error) {
        console.error('getTrendScoutState error:', error)
        throw error
    }
}
