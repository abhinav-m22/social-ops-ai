import process from 'process'

export const config = {
    type: 'event',
    name: 'EnrichSender',
    subscribes: ['message.received'],
    emits: ['message.enriched'],
    description: 'Enriches message with sender profile via Facebook Graph API',
    flows: ['inquiry-processing']
}

export const handler = async (input, ctx) => {
    const { messageId, source, body, senderId, pageId } = input

    ctx.logger.info(`Enriching sender for message: ${messageId}`, {
        source,
        senderId,
        traceId: ctx.traceId
    })

    let sender = {
        id: senderId,
        name: null,
        platform: source,
        data: {}
    }

    if (source === 'facebook' && senderId) {
        // Facebook Enrichment logic
        const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN

        if (pageAccessToken) {
            try {
                // Fetch user profile from Graph API
                // GET /{PSID}?fields=first_name,last_name
                const url = `https://graph.facebook.com/v18.0/${senderId}?fields=first_name,last_name&access_token=${pageAccessToken}`

                const response = await fetch(url)

                if (response.ok) {
                    const profile = await response.json()
                    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')

                    sender.name = fullName || null
                    sender.data = profile

                    ctx.logger.info(`Facebook Profile Fetched: ${sender.name}`, {
                        senderId,
                        profile,
                        traceId: ctx.traceId
                    })
                } else {
                    ctx.logger.warn(`Facebook Graph API failed: ${response.status}`, {
                        statusText: response.statusText,
                        senderId,
                        traceId: ctx.traceId
                    })
                }
            } catch (error) {
                ctx.logger.error('Error fetching Facebook profile', {
                    error: error.message,
                    senderId,
                    traceId: ctx.traceId
                })
            }
        } else {
            ctx.logger.warn('Missing Facebook Page Access Token, skipping enrichment', { traceId: ctx.traceId })
        }
    } else if (source === 'email') {
        // Email 'enrichment' (pass-through with normalization)
        sender.name = input.senderName || input.from
        sender.data = {
            from: input.from,
            to: input.to
        }
    }

    // Construct enriched payload
    const enrichedPayload = {
        ...input,
        sender,
        enrichedAt: new Date().toISOString()
    }

    await ctx.emit({
        topic: 'message.enriched',
        data: enrichedPayload
    })

    ctx.logger.info(`Message enriched and emitted for classification`, {
        messageId,
        senderName: sender.name,
        traceId: ctx.traceId
    })
}
