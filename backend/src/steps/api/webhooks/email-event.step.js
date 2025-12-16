// Email Webhook Event Handler (POST)
// Handles incoming emails from email service (SendGrid, Resend, etc.)
export const config = {
    type: 'api',
    name: 'EmailWebhookEvent',
    path: '/webhooks/email',
    method: 'POST',
    emits: ['message.received'],
    description: 'Handles incoming emails and emits for classification',
    flows: ['inquiry-processing', 'webhooks']
}

export const handler = async (req, ctx) => {
    const body = req.body

    ctx.logger.info('Email webhook received', {
        source: body.from || 'unknown',
        subject: body.subject || 'no subject',
        traceId: ctx.traceId
    })

    try {
        // Extract email data (format depends on email service)
        // Support multiple email webhook formats
        const emailData = {
            // SendGrid format
            from: body.from || body['from-email'] || body.email || 'unknown@example.com',
            to: body.to || body['to-email'] || body.recipient || 'creator@example.com',
            subject: body.subject || body['email-subject'] || '',
            body: body.text || body['email-body'] || body.body || body['text-plain'] || '',
            html: body.html || body['text-html'] || '',
            messageId: body['message-id'] || body.messageId || body['sg_message_id'] || `EMAIL-${Date.now()}`,
            timestamp: body.timestamp || body['received-at'] || new Date().toISOString()
        }

        // Extract sender info
        const senderMatch = emailData.from.match(/(.+?)\s*<(.+?)>/) || [null, emailData.from, emailData.from]
        const senderName = senderMatch[1]?.trim() || emailData.from
        const senderEmail = senderMatch[2] || emailData.from

        ctx.logger.info('[NEW EMAIL]', {
            from: senderEmail,
            subject: emailData.subject,
            bodyPreview: emailData.body.substring(0, 100),
            traceId: ctx.traceId
        })

        // Generate message ID
        const messageId = emailData.messageId

        // Emit message.received for classification
        await ctx.emit({
            topic: 'message.received',
            data: {
                messageId: messageId,
                source: 'email',
                body: emailData.body || emailData.html, // Prefer text, fallback to HTML
                subject: emailData.subject,
                senderId: senderEmail, // Use email as senderId for emails
                senderName: senderName,
                from: senderEmail,
                to: emailData.to,
                html: emailData.html,
                timestamp: emailData.timestamp
            }
        })

        ctx.logger.info('Email message event emitted for classification', {
            messageId,
            topic: 'message.received',
            traceId: ctx.traceId
        })

        // Return 200 OK to email service
        return { status: 200, body: 'EMAIL_RECEIVED' }

    } catch (error) {
        ctx.logger.error('Failed to process email', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        // Still return 200 to prevent email service from retrying
        return { status: 200, body: 'EMAIL_PROCESSING_ERROR' }
    }
}

