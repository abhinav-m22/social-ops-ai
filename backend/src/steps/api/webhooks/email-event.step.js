// Email Webhook Event Handler (POST)
// Handles incoming emails from email service
import crypto from 'crypto'
import { Resend } from 'resend'
import { extractTextSafely, extractTextFromHtml } from '../../../lib/utils/htmlExtractor.js'

export const config = {
    type: 'api',
    name: 'EmailWebhookEvent',
    path: '/webhooks/email',
    method: 'POST',
    emits: ['message.received'],
    description: 'Handles incoming emails and emits for classification',
    flows: ['inquiry-processing', 'webhooks']
}

/**
 * Verifies Resend webhook signature
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Signature from resend-signature header
 * @param {string} secret - Resend webhook signing secret
 * @returns {boolean} - True if signature is valid
 */
function verifyResendSignature(payload, signature, secret) {
    if (!secret || !signature) {
        return false
    }
    
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    
    // Resend sends signature as hex string
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    )
}

export const handler = async (req, ctx) => {
    const body = req.body
    const headers = req.headers || {}
    
    const rawBody = req.rawBody || JSON.stringify(body)

    ctx.logger.info('Email webhook received - Full payload structure', {
        fullPayload: JSON.stringify(body, null, 2).substring(0, 2000),
        hasType: !!body.type,
        type: body.type,
        hasData: !!body.data,
        topLevelKeys: Object.keys(body),
        hasSignature: !!headers['resend-signature'],
        traceId: ctx.traceId
    })

    ctx.logger.info('Email webhook received', {
        source: body.from || body.data?.from || 'unknown',
        subject: body.subject || body.data?.subject || 'no subject',
        hasSignature: !!headers['resend-signature'],
        traceId: ctx.traceId
    })

    // Verify Resend webhook signature if signing secret is configured
    const resendSigningSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET
    const resendSignature = headers['resend-signature'] || headers['x-resend-signature']
    
    if (resendSigningSecret && resendSignature) {
        const isValid = verifyResendSignature(rawBody, resendSignature, resendSigningSecret)
        
        if (!isValid) {
            ctx.logger.warn('Invalid Resend webhook signature', {
                traceId: ctx.traceId,
                hasSecret: !!resendSigningSecret,
                hasSignature: !!resendSignature,
                note: 'If this persists, check that RESEND_WEBHOOK_SIGNING_SECRET matches the secret in Resend dashboard'
            })
            
            return {
                status: 401,
                body: { error: 'Invalid webhook signature' }
            }
        }
        
        ctx.logger.info('✅ Resend webhook signature verified', {
            traceId: ctx.traceId
        })
    } else if (resendSigningSecret && !resendSignature) {
        ctx.logger.warn('Resend signing secret configured but no signature header found', {
            traceId: ctx.traceId,
            note: 'This may be a test request or webhook from a different source'
        })
    } else if (!resendSigningSecret) {
        ctx.logger.info('Resend webhook signature verification skipped (no signing secret configured)', {
            traceId: ctx.traceId,
            note: 'For production, set RESEND_WEBHOOK_SIGNING_SECRET for security'
        })
    }

    try {
 
        ctx.logger.debug('Raw webhook payload structure', {
            hasType: !!body.type,
            type: body.type,
            hasData: !!body.data,
            dataKeys: body.data ? Object.keys(body.data) : [],
            topLevelKeys: Object.keys(body),
            sampleBody: JSON.stringify(body).substring(0, 500),
            traceId: ctx.traceId
        })

        const isResendFormat = body.type === 'email.received' || body.type === 'email.sent' || body.data

        let fetchedEmailContent = null
        if (isResendFormat && body.type === 'email.received') {
            const emailId = body.data?.email_id || 
                           body.data?.emailId || 
                           body.data?.id ||
                           body.email_id ||
                           body.emailId
            
            if (emailId) {
                ctx.logger.info('Fetching email content from Resend API', {
                    emailId,
                    traceId: ctx.traceId
                })
            
                try {
                    const resendApiKey = process.env.RESEND_API_KEY
                    if (!resendApiKey) {
                        ctx.logger.warn('RESEND_API_KEY not set, cannot fetch email content', {
                            traceId: ctx.traceId
                        })
                    } else {
                        const resend = new Resend(resendApiKey)
                        const emailResponse = await resend.emails.receiving.get(emailId)
                        
                        if (emailResponse && emailResponse.data) {
                            fetchedEmailContent = {
                                html: emailResponse.data.html || '',
                                text: emailResponse.data.text || '',
                                headers: emailResponse.data.headers || {}
                            }
                            ctx.logger.info('✅ Successfully fetched email content from Resend', {
                                emailId,
                                hasHtml: !!fetchedEmailContent.html,
                                hasText: !!fetchedEmailContent.text,
                                htmlLength: fetchedEmailContent.html?.length || 0,
                                textLength: fetchedEmailContent.text?.length || 0,
                                traceId: ctx.traceId
                            })
                        } else {
                            ctx.logger.warn('Resend API returned no data', {
                                emailId,
                                response: emailResponse,
                                traceId: ctx.traceId
                            })
                        }
                    }
                } catch (error) {
                    ctx.logger.error('Failed to fetch email content from Resend API', {
                        emailId,
                        error: error.message,
                        stack: error.stack,
                        traceId: ctx.traceId
                    })
                }
            } else {
                ctx.logger.warn('Resend email.received webhook missing email_id', {
                    dataKeys: body.data ? Object.keys(body.data) : [],
                    traceId: ctx.traceId
                })
            }
        }
        
        // Extract email data (format depends on email service)
        const emailData = isResendFormat ? {

            from: body.data?.from || body.data?.from_email || body.from || 'unknown@example.com',
            to: body.data?.to || body.data?.to_email || body.data?.recipient || body.to || [],
            subject: body.data?.subject || 
                    body.data?.email_subject || 
                    body.data?.headers?.subject ||
                    body.data?.headers?.['Subject'] ||
                    body.subject || 
                    '',
            body: fetchedEmailContent?.text || 
                  body.data?.text || 
                  body.data?.text_plain || 
                  body.data?.plain_text ||
                  body.data?.text_content ||
                  body.data?.body || 
                  body.data?.content?.text ||
                  body.data?.content?.plain ||
                  body.data?.message?.text ||
                  body.text || 
                  body.body || 
                  '',
            html: fetchedEmailContent?.html || 
                  body.data?.html || 
                  body.data?.text_html || 
                  body.data?.html_content ||
                  body.data?.content?.html ||
                  body.data?.message?.html ||
                  body.html || 
                  '',
            messageId: body.data?.messageId || 
                      body.data?.message_id || 
                      body.data?.id || 
                      body.messageId || 
                      `EMAIL-${Date.now()}`,
            timestamp: body.data?.createdAt || 
                      body.data?.created_at || 
                      body.data?.date || 
                      body.timestamp || 
                      new Date().toISOString(),
            inReplyTo: fetchedEmailContent?.headers?.['in-reply-to'] ||
                      fetchedEmailContent?.headers?.['In-Reply-To'] ||
                      body.data?.headers?.['in-reply-to'] || 
                      body.data?.headers?.['In-Reply-To'] ||
                      body.data?.inReplyTo || 
                      body.data?.in_reply_to ||
                      body['in-reply-to'] || 
                      null,
            references: fetchedEmailContent?.headers?.references ||
                       fetchedEmailContent?.headers?.References ||
                       body.data?.headers?.references || 
                       body.data?.headers?.References ||
                       body.data?.references || 
                       body.references || 
                       null,
            headers: fetchedEmailContent?.headers || body.data?.headers || body.headers || {}
        } : {
            from: body.from || body['from-email'] || body.email || 'unknown@example.com',
            to: body.to || body['to-email'] || body.recipient || 'creator@example.com',
            subject: body.subject || body['email-subject'] || '',
            body: body.text || body['email-body'] || body.body || body['text-plain'] || '',
            html: body.html || body['text-html'] || '',
            messageId: body['message-id'] || body.messageId || body['sg_message_id'] || `EMAIL-${Date.now()}`,
            timestamp: body.timestamp || body['received-at'] || new Date().toISOString(),
            inReplyTo: body['in-reply-to'] || body.inReplyTo || null,
            references: body.references || null,
            headers: body.headers || {}
        }

        const toEmail = Array.isArray(emailData.to) 
            ? emailData.to[0] 
            : (typeof emailData.to === 'string' ? emailData.to : 'creator@example.com')

        const senderMatch = emailData.from.match(/(.+?)\s*<(.+?)>/) || [null, emailData.from, emailData.from]
        const senderName = senderMatch[1]?.trim() || emailData.from
        const senderEmail = senderMatch[2] || emailData.from

        let messageBody = ''
        
        if (emailData.body && !emailData.body.includes('<')) {
            messageBody = emailData.body.trim()
        }
        else if (emailData.html) {
            messageBody = extractTextFromHtml(emailData.html)
            ctx.logger.info('Extracted text from HTML', {
                htmlLength: emailData.html.length,
                textLength: messageBody.length,
                traceId: ctx.traceId
            })
        }
        else if (emailData.body) {
            messageBody = extractTextSafely(emailData.body)
            ctx.logger.info('Extracted text from body (contained HTML)', {
                originalLength: emailData.body.length,
                textLength: messageBody.length,
                traceId: ctx.traceId
            })
        }
        else if (body.data) {
            const rawContent = body.data?.text_content || 
                             body.data?.plain_text ||
                             body.data?.content?.plain ||
                             body.data?.message?.text ||
                             ''
            messageBody = extractTextSafely(rawContent)
        }

        if (!messageBody || messageBody.trim().length === 0) {
            messageBody = emailData.subject || ''
            ctx.logger.info('Email body is empty, using subject as body for classification', {
                subject: emailData.subject,
                traceId: ctx.traceId
            })
        }

        // Log extracted data for debugging
        ctx.logger.info('[NEW EMAIL]', {
            from: senderEmail,
            senderName: senderName,
            subject: emailData.subject,
            to: toEmail,
            bodyPreview: messageBody.substring(0, 100),
            bodyLength: messageBody.length,
            hasInReplyTo: !!emailData.inReplyTo,
            hasReferences: !!emailData.references,
            hasHtml: !!emailData.html,
            htmlLength: emailData.html?.length || 0,
            traceId: ctx.traceId
        })

        // Additional debug logging if subject or body seems wrong
        if (!emailData.subject || emailData.subject.length < 3) {
            ctx.logger.warn('Email subject appears empty or too short', {
                extractedSubject: emailData.subject,
                rawBodyKeys: Object.keys(body),
                dataKeys: body.data ? Object.keys(body.data) : [],
                traceId: ctx.traceId
            })
        }

        if (!messageBody || messageBody.length === 0) {
            ctx.logger.warn('Email body is empty - checking raw payload', {
                hasText: !!emailData.body,
                hasHtml: !!emailData.html,
                rawBodySample: JSON.stringify(body).substring(0, 300),
                traceId: ctx.traceId
            })
        }

        // Generate message ID
        const messageId = emailData.messageId

        // Emit message.received for classification
        await ctx.emit({
            topic: 'message.received',
            data: {
                messageId: messageId,
                source: 'email',
                body: messageBody,
                subject: emailData.subject,
                senderId: senderEmail, // Use email as senderId for emails
                senderName: senderName,
                from: senderEmail,
                to: toEmail,
                html: emailData.html,
                timestamp: emailData.timestamp,
                // Email threading information
                inReplyTo: emailData.inReplyTo,
                references: emailData.references,
                emailHeaders: emailData.headers
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

