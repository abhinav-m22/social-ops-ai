import Groq from 'groq-sdk'

/**
 * AI-Powered Proposal Generator
 * 
 * Generates professional, personalized proposals for brand collaboration inquiries
 * using Groq's Llama model.
 */

/**
 * Generates a context-aware professional message for a brand collaboration
 * 
 * @param {object} deal - The deal object containing brand and campaign details
 * @param {object} creatorProfile - Creator's profile with rates and preferences
 * @param {object} logger - Motia logger instance
 * @param {object} options - Optional parameters
 * @param {string} options.intent - User's intent/instruction (e.g., "be more friendly", "mention the budget")
 * @param {string} options.action - Action type ('send_proposal', 'decline', 'counter', etc.)
 * @param {number} options.counterAmount - Explicit counter-offer amount entered by user (takes priority)
 * @returns {Promise<string>} Generated proposal message
 */
export async function generateProposal(deal, creatorProfile, logger, options = {}) {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        throw new Error('GROQ_API_KEY not found in environment variables')
    }

    const client = new Groq({ apiKey })
    const { intent, action = 'send_proposal', counterAmount } = options

    // Extract relevant information from deal
    const brandName = deal?.brand?.name || 'your brand'
    const contactPerson = deal?.brand?.contactPerson || null
    const deliverables = deal?.terms?.deliverables || []
    const proposedBudget = deal?.terms?.proposedBudget
    const messageBody = deal?.rawInquiry || deal?.message || ''
    const dealStatus = deal?.status || 'new'
    const negotiation = deal?.negotiation || null
    const history = deal?.history || []
    const lastBrandMessage = messageBody

    const recentHistory = history
        .filter(h => ['message_appended', 'creator_reply_sent', 'auto_reply_sent', 'deal_updated'].includes(h.event))
        .slice(-5)
        .map(h => ({
            event: h.event,
            timestamp: h.timestamp,
            data: h.data
        }))
    const minRate = creatorProfile?.minRate ?? null
    const maxRate = creatorProfile?.maxRate ?? null
    const preferredDeliverables = creatorProfile?.preferredDeliverables || []
    let perUnitRate = null
    if (proposedBudget && deliverables.length > 0) {
        const totalCount = deliverables.reduce((sum, d) => sum + (d.count || 1), 0)
        if (totalCount > 0) {
            perUnitRate = Math.round(proposedBudget / totalCount)
        }
    }

    if (negotiation?.aiRecommendedRates?.market && deliverables.length > 0) {
        const totalCount = deliverables.reduce((sum, d) => sum + (d.count || 1), 0)
        if (totalCount > 0) {
            perUnitRate = Math.round(negotiation.aiRecommendedRates.market / totalCount)
        }
    }

    const deliverablesText = deliverables.length > 0
        ? deliverables.map((d) => `${d.count || 1}x ${d.type || 'deliverable'}${d.description ? ` - ${d.description}` : ''}`).join(', ')
        : null

    let negotiationContext = ''
    if (negotiation) {
        const recommendedRate = negotiation.aiRecommendedRates?.market || negotiation.aiRecommendedRates?.conservative
        negotiationContext = `\nNEGOTIATION CONTEXT:
- Brand offered: ₹${negotiation.brandOfferedAmount || 'Not specified'}
- AI recommended market rate: ₹${recommendedRate || 'To be discussed'}
- Budget assessment: ${negotiation.budgetAssessment || 'pending'}
- Current deal status: ${dealStatus}`
    }

    let historyContext = ''
    if (recentHistory.length > 0) {
        historyContext = `\nCONVERSATION HISTORY:
${recentHistory.map(h => `- ${h.event} at ${h.timestamp}: ${JSON.stringify(h.data)}`).join('\n')}`
    }

    let messageType = 'proposal'
    let toneGuidance = 'Professional but friendly, confident without being aggressive'
    
    if (action === 'decline') {
        messageType = 'polite decline'
        toneGuidance = 'Polite, appreciative, and professional. Express gratitude but decline clearly.'
    } else if (action === 'counter') {
        messageType = 'counter-offer'
        toneGuidance = 'Professional, collaborative, and open to discussion. Present counter-offer clearly.'
    } else if (dealStatus === 'RATE_RECOMMENDED' || dealStatus === 'NEGOTIATION_READY') {
        messageType = 'negotiation response'
        toneGuidance = 'Professional, clear, and direct about rates and terms.'
    }

    let intentGuidance = ''
    if (intent && intent.trim()) {
        intentGuidance = `\nUSER INSTRUCTION: The creator wants you to "${intent}". Incorporate this guidance naturally into the message.`
    }

    let counterAmountGuidance = ''
    if (counterAmount && action === 'counter') {
        counterAmountGuidance = `\nCRITICAL: The creator has explicitly entered a counter-offer amount of ₹${counterAmount.toLocaleString('en-IN')}. You MUST use this exact amount in your counter-offer message. Do NOT use any other rate - use ₹${counterAmount.toLocaleString('en-IN')} as the counter-offer.`
    }

    const systemPrompt = `You are a professional brand collaboration assistant helping Indian content creators respond to brand inquiries.

Your task is to generate a concise, context-aware, professional message based on the current deal status.

TONE & STYLE:
- ${toneGuidance}
- Very concise and direct (aim for 50-120 words, maximum 150 words)
- Indian English context (use ₹ for currency)
- Sound like a real person, not a template
- End with a simple, professional closing like "Looking forward to your response" or "Best regards" - but NO name or signature
- If you don't know the creator's name, end without any signature - just close the message naturally

MESSAGE TYPE: ${messageType.toUpperCase()}

CRITICAL RULES:
- Be CONCISE - no repetition of brand introduction if this is a follow-up message
- Focus ONLY on what's new/changed or what needs to be discussed
- Do NOT repeat information already shared in previous messages
- If this is an update to requirements, acknowledge ONLY the changes
- Do NOT include subject lines, headers, or formatting markers
- Use ONLY the provided rates/data - never make up or assume values
- Do NOT be pushy or salesy (unless declining)
- NEVER include placeholders like "[Your Name]", "[Creator Name]", or "[Name]" in the message
- NEVER include signatures with names unless the creator's actual name is explicitly provided
- If no creator name is available, end the message naturally without any signature line
${intentGuidance}${counterAmountGuidance}

OUTPUT FORMAT:
Return ONLY the message text. No markdown, no code blocks, no metadata, no placeholders, no signature with names.`

    // Determine if this is a follow-up (has history) vs first message
    const isFollowUp = recentHistory.length > 0
    const previousMessageCount = recentHistory.filter(h => h.event === 'message_appended').length
    
    let pricingContext = ''
    if (proposedBudget && deliverables.length > 0) {
        const totalCount = deliverables.reduce((sum, d) => sum + (d.count || 1), 0)
        pricingContext = `\nPRICING CONTEXT (from latest deal state):
- Total budget: ₹${proposedBudget}
- Deliverables: ${totalCount} unit(s)${perUnitRate ? `\n- Per-unit rate: ₹${perUnitRate.toLocaleString('en-IN')}` : ''}`
    }
    if (negotiation?.aiRecommendedRates?.market) {
        pricingContext += `\n- AI recommended market rate: ₹${negotiation.aiRecommendedRates.market.toLocaleString('en-IN')}`
        if (negotiation.budgetAssessment) {
            pricingContext += `\n- Budget assessment: ${negotiation.budgetAssessment}`
        }
    }

    let counterAmountContext = ''
    if (counterAmount && action === 'counter') {
        counterAmountContext = `\nUSER COUNTER-OFFER AMOUNT: ₹${counterAmount.toLocaleString('en-IN')} (THIS IS THE EXACT AMOUNT TO USE - do not use any other rate)`
    }

    const userPrompt = `Generate a ${messageType} response for this brand collaboration:

${isFollowUp ? 'NOTE: This is a FOLLOW-UP message. Focus only on what changed or needs to be discussed. Do NOT repeat previous introductions.' : 'NOTE: This is the FIRST message. Be welcoming but concise.'}

BRAND: ${brandName}
${contactPerson ? `CONTACT PERSON: ${contactPerson}` : ''}
LATEST BRAND MESSAGE: "${lastBrandMessage}"
${deliverablesText ? `DELIVERABLES: ${deliverablesText}` : 'No specific deliverables mentioned'}${pricingContext}${counterAmountContext}
DEAL STATUS: ${dealStatus}${negotiationContext}${historyContext}

${(minRate !== null || maxRate !== null) ? `CREATOR RATE RANGE:${minRate !== null ? ` Min: ₹${minRate.toLocaleString('en-IN')}` : ''}${maxRate !== null ? ` Max: ₹${maxRate.toLocaleString('en-IN')}` : ''}` : ''}

Generate a concise, professional ${messageType} response (50-120 words). Remember: No placeholders, no signature with names unless explicitly provided.`

    logger?.info('Generating AI proposal', {
        dealId: deal?.dealId,
        brand: brandName,
        deliverablesCount: deliverables.length
    })

    try {
        const completion = await client.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            max_tokens: 300  // Reduced to encourage more concise replies
        })

        let proposal = completion.choices[0].message.content.trim()

        proposal = proposal
            .replace(/\s*Best regards,?\s*\[.*?\]/gi, '')
            .replace(/\s*Regards,?\s*\[.*?\]/gi, '')
            .replace(/\s*\[.*?Name.*?\]/gi, '')
            .replace(/\s*\[.*?\]/g, '') 
            .replace(/\n{3,}/g, '\n\n')
            .trim()

        logger?.info('✅ AI proposal generated successfully', {
            dealId: deal?.dealId,
            proposalLength: proposal.length,
            tokensUsed: completion.usage?.total_tokens,
            counterAmountUsed: counterAmount || null
        })

        return proposal
    } catch (error) {
        logger?.error('Failed to generate AI proposal', {
            dealId: deal?.dealId,
            error: error.message,
            stack: error.stack
        })

        throw new Error(`AI proposal generation failed: ${error.message}`)
    }
}

/**
 * Generates a proposal with fallback to template if AI fails
 * 
 * @param {object} deal - The deal object
 * @param {object} creatorProfile - Creator's profile
 * @param {string} fallbackTemplate - Template to use if AI fails
 * @param {object} logger - Motia logger instance
 * @param {object} options - Optional parameters (intent, action)
 * @returns {Promise<string>} Generated or fallback proposal message
 */
export async function generateProposalWithFallback(deal, creatorProfile, fallbackTemplate, logger, options = {}) {
    try {
        return await generateProposal(deal, creatorProfile, logger, options)
    } catch (error) {
        logger?.warn('AI proposal generation failed, using fallback template', {
            dealId: deal?.dealId,
            error: error.message
        })

        if (options.action === 'decline' && fallbackTemplate) {
            const contactPerson = deal?.brand?.contactPerson || deal?.brand?.name || 'there'
            return fallbackTemplate.replace(/\[Brand Contact\]/g, contactPerson)
        }

        return fallbackTemplate || 'Thank you for reaching out. I appreciate your interest and will get back to you soon.'
    }
}
