// Event handler: Stores inquiry only if classified as brand collaboration
import { extractTextSafely } from '../../lib/utils/htmlExtractor.js'

export const config = {
    type: 'event',
    name: 'StoreInquiry',
    subscribes: ['message.classified'],
    emits: ['inquiry.received'],
    description: 'Stores inquiry in state only if message is classified as brand collaboration',
    flows: ['inquiry-processing', 'dealflow'],
    input: {
        type: 'object',
        properties: {
            messageId: { type: 'string' },
            source: { type: 'string' },
            body: { type: 'string' },
            subject: { type: 'string' },
            senderId: { type: 'string' },
            sender: { type: 'object' },
            isBrandInquiry: { type: 'boolean' },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
            keywords: { type: 'array' },
            classifiedAt: { type: 'string' }
        },
        required: ['messageId', 'source', 'body', 'isBrandInquiry']
    }
}

export const handler = async (input, ctx) => {
    const {
        messageId,
        source,
        body,
        subject,
        senderId,
        sender,
        isBrandInquiry,
        confidence,
        reasoning,
        keywords,
        classifiedAt,
        inReplyTo,
        references,
        emailHeaders
    } = input

    ctx.logger.info('='.repeat(80))
    ctx.logger.info(`Processing classified message: ${messageId}`)
    ctx.logger.info(`Is Brand Inquiry: ${isBrandInquiry}`)
    ctx.logger.info(`Confidence: ${(confidence * 100).toFixed(1)}%`)
    ctx.logger.info('='.repeat(80))

    // Only proceed if classified as brand inquiry
    if (!isBrandInquiry) {
        ctx.logger.info(`⏭️  Skipping storage - Not a brand inquiry (${reasoning})`)
        ctx.logger.info('='.repeat(80))
        return // Don't store, don't emit inquiry.received
    }

    // Generate inquiry ID based on source
    const inquiryId = source === 'facebook'
        ? `FB-${Date.now()}-${senderId?.slice(-4) || 'XXXX'}`
        : source === 'email'
            ? `EMAIL-${Date.now()}-${messageId.slice(-6)}`
            : `${source.toUpperCase()}-${Date.now()}-${messageId.slice(-6)}`
    const threadKey = `${source || 'unknown'}:${senderId || 'unknown'}`

    try {
        // Extract clean text from body (handles HTML if present)
        const cleanBody = extractTextSafely(body)
        
        ctx.logger.info('Storing inquiry with cleaned body', {
            originalLength: body?.length || 0,
            cleanedLength: cleanBody.length,
            hadHtml: body?.includes('<') || body?.includes('&'),
            traceId: ctx.traceId
        })

        // Store inquiry in state
        const inquiry = {
            id: inquiryId,
            messageId: messageId,
            source: source,
            senderId: senderId || null,
            sender: sender || null, // Store Enriched Sender Object
            pageName: input.pageName || null,
            body: cleanBody, // Store clean text, not HTML
            subject: subject || null,
            receivedAt: new Date().toISOString(),
            status: 'new',
            threadKey,
            classification: {
                isBrandInquiry: isBrandInquiry,
                confidence: confidence,
                reasoning: reasoning,
                keywords: keywords || [],
                classifiedAt: classifiedAt
            },
            raw: {
                messageId,
                source,
                body: body, // Keep original HTML in raw for reference
                subject,
                senderId,
                // Email threading metadata
                ...(source === 'email' && {
                    inReplyTo: inReplyTo || null,
                    references: references || null,
                    emailHeaders: emailHeaders || null
                })
            },
            ...(source === 'email' && {
                inReplyTo: inReplyTo || null,
                references: references || null
            })
        }

        await ctx.state.set('inquiries', inquiryId, inquiry)

        ctx.logger.info('✅ Inquiry stored in state', {
            inquiryId,
            source,
            confidence: `${(confidence * 100).toFixed(1)}%`,
            senderName: sender?.name,
            hasBody: !!inquiry.body,
            bodyLength: inquiry.body?.length || 0,
            bodyPreview: inquiry.body?.substring(0, 100) || 'NO BODY SAVED'
        })

        // Emit inquiry.received for downstream processing (extraction)
        // Pass clean body (not HTML) to downstream steps
        await ctx.emit({
            topic: 'inquiry.received',
            data: {
                inquiryId: inquiryId,
                source: source,
                body: cleanBody, // Pass clean text, not HTML
                senderId: senderId,
                sender: sender, // Pass it down
                threadKey
            }
        })

        ctx.logger.info('✅ Inquiry event emitted', {
            inquiryId,
            topic: 'inquiry.received'
        })
        ctx.logger.info('='.repeat(80))

        return {
            success: true,
            inquiryId: inquiryId,
            stored: true
        }

    } catch (error) {
        ctx.logger.error('❌ Failed to store inquiry', {
            messageId,
            inquiryId,
            error: error.message,
            stack: error.stack
        })
        throw error
    }
}

