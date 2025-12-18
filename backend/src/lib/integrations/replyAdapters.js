/**
 * Reply Adapter Factory
 * 
 * Provides a unified interface for sending replies across different platforms.
 * Abstracts away platform-specific details (Facebook Messenger, Email, etc.)
 */

import { sendMessageWithRetry, validateFacebookCredentials } from './facebookMessenger.js'
import { sendEmailWithRetry, validateResendCredentials } from './emailResend.js'

/**
 * Sends a reply message using the appropriate adapter based on platform
 * 
 * @param {string} platform - Platform identifier ('facebook' | 'email')
 * @param {object} deal - Deal object containing brand and platform info
 * @param {string} messageText - The message text to send
 * @param {object} options - Platform-specific options
 * @param {object} logger - Motia logger instance
 * @returns {Promise<object>} Response from the platform API
 */
export async function sendReply(platform, deal, messageText, options = {}, logger) {
    if (!platform) {
        throw new Error('Platform is required')
    }

    if (!deal) {
        throw new Error('Deal is required')
    }

    if (!messageText || !messageText.trim()) {
        throw new Error('Message text is required')
    }

    const normalizedPlatform = (platform || '').toLowerCase()

    switch (normalizedPlatform) {
        case 'facebook':
            return await sendFacebookReply(deal, messageText, options, logger)
        
        case 'email':
            return await sendEmailReply(deal, messageText, options, logger)
        
        default:
            throw new Error(`Unsupported platform: ${platform}`)
    }
}

/**
 * Sends a reply via Facebook Messenger
 */
async function sendFacebookReply(deal, messageText, options, logger) {
    const fbValidation = validateFacebookCredentials()
    if (!fbValidation.valid) {
        throw new Error(`Facebook credentials missing: ${fbValidation.error}`)
    }

    const recipientPsid = deal.brand?.platformAccountId || deal.brand?.senderId
    if (!recipientPsid) {
        throw new Error('Recipient PSID not found in deal')
    }

    logger?.info('Sending reply via Facebook Messenger', {
        dealId: deal.dealId,
        recipientPsid,
        messageLength: messageText.length
    })

    const response = await sendMessageWithRetry(
        recipientPsid,
        messageText,
        fbValidation.token,
        logger,
        options.maxRetries || 2
    )

    return {
        platform: 'facebook',
        messageId: response.messageId,
        recipientId: response.recipientId,
        ...response
    }
}

/**
 * Sends a reply via Email (Resend)
 */
async function sendEmailReply(deal, messageText, options, logger) {
    const emailValidation = validateResendCredentials()
    if (!emailValidation.valid) {
        throw new Error(`Email credentials missing: ${emailValidation.error}`)
    }

    const recipientEmail = deal.brand?.email || deal.brand?.platformAccountId
    if (!recipientEmail) {
        throw new Error('Recipient email not found in deal')
    }

    // Generate subject line - use original subject or create a reply subject
    const originalSubject = deal.brand?.emailSubject || 'Collaboration Inquiry'
    const replySubject = originalSubject.startsWith('Re:') 
        ? originalSubject 
        : `Re: ${originalSubject}`

    // Extract email threading info if available
    const emailOptions = {
        inReplyTo: options.inReplyTo || deal.brand?.lastEmailId || null,
        references: options.references || deal.brand?.emailReferences || null,
        replyTo: options.replyTo || null,
        maxRetries: options.maxRetries || 2
    }

    logger?.info('Sending reply via Email', {
        dealId: deal.dealId,
        recipientEmail,
        subject: replySubject,
        messageLength: messageText.length,
        hasInReplyTo: !!emailOptions.inReplyTo
    })

    const response = await sendEmailWithRetry(
        recipientEmail,
        replySubject,
        messageText,
        emailOptions,
        logger,
        emailOptions.maxRetries
    )

    return {
        platform: 'email',
        emailId: response.emailId,
        recipientEmail: response.recipientEmail,
        subject: replySubject,
        ...response
    }
}

/**
 * Validates credentials for a given platform
 * 
 * @param {string} platform - Platform identifier
 * @returns {object} { valid: boolean, error?: string }
 */
export function validatePlatformCredentials(platform) {
    const normalizedPlatform = (platform || '').toLowerCase()

    switch (normalizedPlatform) {
        case 'facebook':
            return validateFacebookCredentials()
        
        case 'email':
            return validateResendCredentials()
        
        default:
            return {
                valid: false,
                error: `Unsupported platform: ${platform}`
            }
    }
}

