// Bridges existing inquiry events into canonical negotiation domain events
export const config = {
    type: 'event',
    name: 'BrandInquiryBridge',
    subscribes: ['inquiry.received'],
    emits: ['BrandInquiryReceived', 'BrandMessageReceived'],
    description: 'Maps inquiry.received to canonical brand inquiry/message events',
    flows: ['dealflow', 'negotiation']
}

export const handler = async (input, ctx) => {
    const { inquiryId, source, body, senderId, sender } = input || {}

    if (!inquiryId || !body) {
        ctx.logger.warn('BrandInquiryBridge: missing inquiryId or body', { inquiryId })
        return
    }

    const threadKey = `${source || 'unknown'}:${senderId || sender?.id || 'unknown'}`

    const baseEvent = {
        inquiryId,
        source,
        creatorId: 'default-creator', // can be replaced when creator resolution exists
        rawMessage: body,
        senderId: senderId || sender?.id || null,
        sender: sender || null,
        senderType: 'brand',
        threadKey,
        receivedAt: new Date().toISOString()
    }

    // Emit canonical inquiry event
    await ctx.emit({
        topic: 'BrandInquiryReceived',
        data: baseEvent
    })

    // Also treat the first message as a BrandMessageReceived for consistency
    await ctx.emit({
        topic: 'BrandMessageReceived',
        data: {
            ...baseEvent,
            messageId: `msg-${inquiryId}`,
            sequenceInThread: 1
        }
    })

    ctx.logger.info('BrandInquiryBridge: emitted canonical inquiry+message', {
        inquiryId,
        source
    })
}


