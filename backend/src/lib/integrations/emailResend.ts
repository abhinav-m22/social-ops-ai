/**
 * Email Reply Integration using Resend
 * 
 * Handles sending email replies back to brand contacts.
 * Used by creator action handlers to reply to brand inquiries via email.
 */

import { Resend } from 'resend'

/**
 * Sends an email reply using Resend
 * 
 * @param {string} recipientEmail - Email address of the recipient
 * @param {string} subject - Email subject line
 * @param {string} messageText - The message text to send
 * @param {object} options - Additional options (inReplyTo, references, etc.)
 * @param {object} logger - Motia logger instance for logging
 * @returns {Promise<object>} Response from Resend API
 */
export async function sendEmail(
    recipientEmail,
    subject,
    messageText,
    options = {},
    logger
) {
    if (!recipientEmail) {
        throw new Error('Recipient email is required')
    }

    if (!messageText || messageText.trim().length === 0) {
        throw new Error('Message text cannot be empty')
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        throw new Error('RESEND_API_KEY not found in environment variables')
    }

    // For testing without domain verification, use onboarding@resend.dev
    // For production, use a verified domain email
    let fromEmail = process.env.RESEND_FROM_EMAIL
    
    // Fallback to test email if domain not verified
    if (!fromEmail) {
        logger?.warn('RESEND_FROM_EMAIL not set, using test email onboarding@resend.dev')
        fromEmail = 'onboarding@resend.dev'
    }
    
    if (fromEmail.includes('.resend.app')) {
        logger?.warn('⚠️ .resend.app domains cannot be used for sending emails. Automatically switching to onboarding@resend.dev for testing.', {
            attemptedEmail: fromEmail,
            usingEmail: 'onboarding@resend.dev'
        })
        fromEmail = 'onboarding@resend.dev'
    }

    const resend = new Resend(apiKey)

    const emailPayload = {
        from: fromEmail,
        to: recipientEmail,
        subject: subject || 'Re: Collaboration Inquiry',
        text: messageText,
        ...(options.inReplyTo && { inReplyTo: options.inReplyTo }),
        ...(options.references && { references: options.references }),
        ...(options.replyTo && { replyTo: options.replyTo })
    }

    logger?.info('Sending email via Resend', {
        recipientEmail,
        subject: emailPayload.subject,
        messageLength: messageText.length,
        hasInReplyTo: !!options.inReplyTo,
        hasReferences: !!options.references
    })

    try {
        const response = await resend.emails.send(emailPayload)

        // Check for errors first
        if (response.error) {
            const errorMessage = response.error.message || 'Unknown Resend API error'
            const statusCode = response.error.statusCode || response.error.status || 'unknown'
            
            logger?.error('Resend API returned an error', {
                error: errorMessage,
                statusCode: statusCode,
                errorName: response.error.name,
                recipientEmail,
                fromEmail
            })
            
            // Provide helpful error messages
            if (errorMessage.includes('domain is not verified')) {
                throw new Error(`Domain verification required: ${errorMessage}. Please verify your domain at https://resend.com/domains or use onboarding@resend.dev for testing.`)
            }
            
            throw new Error(`Resend API error (${statusCode}): ${errorMessage}`)
        }

        if (!response.data || !response.data.id) {
            logger?.error('Resend API returned unexpected response', {
                response: JSON.stringify(response),
                recipientEmail
            })
            throw new Error('Resend API returned unexpected response format')
        }

        logger?.info('✅ Email sent successfully via Resend', {
            recipientEmail,
            emailId: response.data.id,
            subject: emailPayload.subject
        })

        return {
            success: true,
            emailId: response.data.id,
            recipientEmail: recipientEmail
        }

    } catch (error) {
        logger?.error('Failed to send email via Resend', {
            error: error.message,
            recipientEmail,
            stack: error.stack
        })

        throw error
    }
}

/**
 * Sends an email with retry logic for transient failures
 * 
 * @param {string} recipientEmail - Email address of the recipient
 * @param {string} subject - Email subject line
 * @param {string} messageText - The message text to send
 * @param {object} options - Additional options (inReplyTo, references, etc.)
 * @param {object} logger - Motia logger instance
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @returns {Promise<object>} Response from Resend API
 */
export async function sendEmailWithRetry(
    recipientEmail,
    subject,
    messageText,
    options = {},
    logger,
    maxRetries = 2
) {
    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                logger?.info(`Retry attempt ${attempt} of ${maxRetries}`, {
                    recipientEmail
                })
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
            }

            return await sendEmail(recipientEmail, subject, messageText, options, logger)
        } catch (error) {
            lastError = error

            // Don't retry on authentication errors
            if (error.message.includes('API key') || error.message.includes('unauthorized')) {
                logger?.error('Permanent error - invalid API key, not retrying', {
                    error: error.message
                })
                throw error
            }

            // Don't retry on invalid recipient errors
            if (error.message.includes('invalid') && error.message.includes('email')) {
                logger?.error('Permanent error - invalid recipient email, not retrying', {
                    error: error.message
                })
                throw error
            }

            // Don't retry on domain verification errors
            if (error.message.includes('domain is not verified') || error.message.includes('Domain verification required')) {
                logger?.error('Permanent error - domain not verified, not retrying', {
                    error: error.message
                })
                throw error
            }

            logger?.warn(`Attempt ${attempt + 1} failed, will retry if attempts remaining`, {
                error: error.message,
                attemptsRemaining: maxRetries - attempt
            })
        }
    }

    // All retries exhausted
    logger?.error('All retry attempts exhausted', {
        recipientEmail,
        maxRetries,
        lastError: lastError.message
    })

    throw lastError
}

/**
 * Validates that all required Resend credentials are present
 * 
 * @returns {object} { valid: boolean, error?: string, apiKey?: string, fromEmail?: string }
 */
export function validateResendCredentials() {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    if (!apiKey) {
        return {
            valid: false,
            error: 'RESEND_API_KEY not found in environment variables'
        }
    }

    // fromEmail is optional - will default to onboarding@resend.dev for testing
    return {
        valid: true,
        apiKey,
        fromEmail: fromEmail || 'onboarding@resend.dev'
    }
}

