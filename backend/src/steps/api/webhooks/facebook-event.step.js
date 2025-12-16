// Facebook Messenger Webhook Event Handler (POST)
export const config = {
    type: 'api',
    name: 'FacebookWebhookEvent',
    path: '/webhooks/facebook',
    method: 'POST',
    emits: ['message.received'],
    description: 'Handles incoming Facebook Messenger messages',
    flows: ['inquiry-processing', 'webhooks']
}

export const handler = async (req, ctx) => {
    const body = req.body

    ctx.logger.info('Facebook webhook received', {
        object: body.object,
        entryCount: (body.entry || []).length,
        traceId: ctx.traceId
    })

    // Facebook sends object: "page" for page events
    if (body.object !== 'page') {
        ctx.logger.warn('Non-page event received', {
            object: body.object,
            traceId: ctx.traceId
        })
        return { status: 404, body: 'Not a page event' }
    }

    // Process each entry (can have multiple)
    const entries = body.entry || []
    let processedCount = 0

    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN

    const fetchPageName = async pageId => {
        if (!pageId || !pageAccessToken) return null
        try {
            const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=name&access_token=${pageAccessToken}`)
            if (!response.ok) {
                ctx.logger.warn('Facebook: Failed to fetch page name', {
                    pageId,
                    status: response.status
                })
                return null
            }
            const data = await response.json()
            return data.name || null
        } catch (error) {
            ctx.logger.error('Facebook: Error fetching page name', {
                pageId,
                error: error.message
            })
            return null
        }
    }

    for (const entry of entries) {
        const messagingEvents = entry.messaging || []

        ctx.logger.debug('Processing entry', {
            entryId: entry.id,
            messagingCount: messagingEvents.length,
            traceId: ctx.traceId
        })

        const pageId = entry.id
        const pageName = await fetchPageName(pageId)

        // Process each messaging event
        for (const event of messagingEvents) {
            // Check if this is a message event with text
            if (event.message && event.message.text) {
                const senderId = event.sender.id
                const text = event.message.text
                const messageId = event.message.mid
                const timestamp = event.timestamp
                const inquiryId = `FB-${Date.now()}-${senderId.slice(-4)}`

                ctx.logger.info(`[NEW MESSAGE] From: ${senderId} → Page: ${body.entry[0].id}`, {
                    messageId,
                    text: text, // Log the actual text as requested
                    pageName,
                    traceId: ctx.traceId
                })

                try {
                    // Generate message ID for classification
                    const messageId = `MSG-${Date.now()}-${senderId.slice(-4)}`

                    // Emit message.received for classification (not storing yet)
                    await ctx.emit({
                        topic: 'message.received',
                        data: {
                            messageId: messageId,
                            source: 'facebook',
                            body: text,
                            senderId: senderId,
                            subject: null, // Facebook messages don't have subjects
                            pageId,
                            pageName
                        }
                    })

                    ctx.logger.info('Message event emitted for classification', {
                        messageId,
                        topic: 'message.received',
                        traceId: ctx.traceId
                    })

                    processedCount++
                } catch (error) {
                    ctx.logger.error('Failed to process message', {
                        inquiryId,
                        senderId,
                        error: error.message,
                        stack: error.stack,
                        traceId: ctx.traceId
                    })
                }
            } else {
                ctx.logger.debug('Skipping non-text event', {
                    hasMessage: !!event.message,
                    hasText: !!(event.message && event.message.text),
                    eventType: Object.keys(event).join(','),
                    traceId: ctx.traceId
                })
            }

            // TODO: Handle other event types (postback, delivery, read, etc.)
        }
    }

    ctx.logger.info('Facebook webhook processed', {
        totalEntries: entries.length,
        messagesProcessed: processedCount,
        traceId: ctx.traceId
    })

    // Facebook requires 200 OK response
    return { status: 200, body: 'EVENT_RECEIVED' }
}
