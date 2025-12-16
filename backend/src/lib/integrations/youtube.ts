
export async function getCreatorMetrics(channelId: string) {
    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) throw new Error('YOUTUBE_API_KEY not found')
    if (!channelId) throw new Error('Channel ID is required')

    try {
        // Fetch channel statistics
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
        )

        if (!response.ok) {
            throw new Error(`YouTube API Error: ${response.statusText}`)
        }

        const data = await response.json()

        if (!data.items || data.items.length === 0) {
            throw new Error('Channel not found')
        }

        const channel = data.items[0]

        return {
            channelId: channel.id,
            title: channel.snippet.title,
            subscribers: parseInt(channel.statistics.subscriberCount),
            totalViews: parseInt(channel.statistics.viewCount),
            videoCount: parseInt(channel.statistics.videoCount),
            averageViewsPerVideo: parseInt(channel.statistics.videoCount) > 0
                ? Math.round(parseInt(channel.statistics.viewCount) / parseInt(channel.statistics.videoCount))
                : 0
        }
    } catch (error) {
        console.error('YouTube Integration Error:', error)
        throw error
    }
}
