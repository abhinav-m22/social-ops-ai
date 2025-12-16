/**
 * Facebook Messenger Send API Integration
 * 
 * Handles sending messages back to Facebook Messenger.
 * Used by creator action handlers to reply to brand inquiries.
 */

/**
 * Sends a text message to a Facebook Messenger recipient
 * 
 * @param {string} recipientPsid - Facebook Page-Scoped ID of the recipient
 * @param {string} messageText - The message text to send
 * @param {string} pageAccessToken - Facebook Page Access Token
 * @param {object} logger - Motia logger instance for logging
 * @returns {Promise<object>} Response from Facebook API
 */
export async function sendMessage(recipientPsid, messageText, pageAccessToken, logger) {
    if (!recipientPsid) {
        throw new Error('Recipient PSID is required')
    }

    if (!messageText || messageText.trim().length === 0) {
        throw new Error('Message text cannot be empty')
    }

    if (!pageAccessToken) {
        throw new Error('Facebook Page Access Token is required')
    }

    const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`

    const payload = {
        recipient: {
            id: recipientPsid
        },
        message: {
            text: messageText
        },
        messaging_type: 'RESPONSE'
    }

    logger?.info('Sending message to Facebook', {
        recipientPsid,
        messageLength: messageText.length,
        messagingType: 'RESPONSE'
    })

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            // Facebook API error
            logger?.error('Facebook API error', {
                status: response.status,
                error: data.error,
                recipientPsid
            })

            throw new Error(
                `Facebook API error: ${data.error?.message || 'Unknown error'} (code: ${data.error?.code || 'unknown'})`
            )
        }

        logger?.info('✅ Message sent successfully to Facebook', {
            recipientPsid,
            messageId: data.message_id,
            recipientId: data.recipient_id
        })

        return {
            success: true,
            messageId: data.message_id,
            recipientId: data.recipient_id
        }

    } catch (error) {
        logger?.error('Failed to send message to Facebook', {
            error: error.message,
            recipientPsid,
            stack: error.stack
        })

        throw error
    }
}

/**
 * Sends a message with retry logic for transient failures
 * 
 * @param {string} recipientPsid - Facebook Page-Scoped ID of the recipient
 * @param {string} messageText - The message text to send
 * @param {string} pageAccessToken - Facebook Page Access Token
 * @param {object} logger - Motia logger instance
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @returns {Promise<object>} Response from Facebook API
 */
export async function sendMessageWithRetry(
    recipientPsid,
    messageText,
    pageAccessToken,
    logger,
    maxRetries = 2
) {
    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                logger?.info(`Retry attempt ${attempt} of ${maxRetries}`, {
                    recipientPsid
                })
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
            }

            return await sendMessage(recipientPsid, messageText, pageAccessToken, logger)
        } catch (error) {
            lastError = error

            if (error.message.includes('Invalid OAuth')) {
                logger?.error('Permanent error - invalid token, not retrying', {
                    error: error.message
                })
                throw error
            }

            if (error.message.includes('does not exist')) {
                logger?.error('Permanent error - recipient not found, not retrying', {
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
        recipientPsid,
        maxRetries,
        lastError: lastError.message
    })

    throw lastError
}

/**
 * Validates that all required Facebook messaging credentials are present
 * 
 * @returns {object} { valid: boolean, error?: string, token?: string }
 */
export function validateFacebookCredentials() {
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN

    if (!token) {
        return {
            valid: false,
            error: 'Facebook Page Access Token not found in environment variables (FACEBOOK_PAGE_ACCESS_TOKEN or FB_PAGE_TOKEN)'
        }
    }

    return {
        valid: true,
        token
    }
}
