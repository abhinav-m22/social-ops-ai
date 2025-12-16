import Groq from 'groq-sdk'

/**
 * AI-Powered Proposal Generator
 * 
 * Generates professional, personalized proposals for brand collaboration inquiries
 * using Groq's Llama model.
 */

/**
 * Generates a professional proposal message for a brand collaboration
 * 
 * @param {object} deal - The deal object containing brand and campaign details
 * @param {object} creatorProfile - Creator's profile with rates and preferences
 * @param {object} logger - Motia logger instance
 * @returns {Promise<string>} Generated proposal message
 */
export async function generateProposal(deal, creatorProfile, logger) {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        throw new Error('GROQ_API_KEY not found in environment variables')
    }

    const client = new Groq({ apiKey })

    // Extract relevant information from deal
    const brandName = deal?.brand?.name || 'your brand'
    const contactPerson = deal?.brand?.contactPerson || null
    const deliverables = deal?.terms?.deliverables || []
    const proposedBudget = deal?.terms?.proposedBudget
    const messageBody = deal?.rawInquiry || deal?.message || ''

    // Extract creator information
    const minRate = creatorProfile?.minRate || 15000
    const maxRate = creatorProfile?.maxRate || 50000
    const preferredDeliverables = creatorProfile?.preferredDeliverables || []

    // Build context for AI
    const deliverablesText = deliverables
        .map((d) => `${d.count || 1}x ${d.type || 'deliverable'} - ${d.description || 'as discussed'}`)
        .join(', ')

    const systemPrompt = `You are a professional brand collaboration assistant helping Indian content creators respond to brand inquiries.

Your task is to generate a professional, warm, and non-pushy proposal response to a brand inquiry.

TONE & STYLE:
- Professional but friendly
- Confident without being aggressive
- Clear and concise
- Indian English context (use ₹ for currency)

STRUCTURE:
1. Greeting (use contact person name if available, otherwise brand name)
2. Express genuine interest in the collaboration
3. Briefly acknowledge what they're looking for
4. State your rates and deliverables clearly
5. Mention next steps (asking for more details, timeline, or budget if needed)
6. Professional closing

IMPORTANT RULES:
- Keep the message between 150-250 words
- Do NOT include subject lines, headers, or formatting markers
- Be specific about rates (use the provided range)
- Sound like a real person, not a template
- Do NOT be pushy or salesy
- Ask for clarification on timeline or budget if not mentioned
- Do NOT mention anything you're unsure about

OUTPUT FORMAT:
Return ONLY the message text. No markdown, no code blocks, no metadata.`

    const userPrompt = `Generate a proposal response for this brand inquiry:

BRAND: ${brandName}
CONTACT PERSON: ${contactPerson || 'Not specified'}
THEIR MESSAGE: "${messageBody}"
DELIVERABLES REQUESTED: ${deliverablesText || 'General collaboration'}
THEIR BUDGET: ${proposedBudget ? `₹${proposedBudget}` : 'Not mentioned'}

CREATOR RATES:
- Minimum rate: ₹${minRate}
- Maximum rate: ₹${maxRate}
- Preferred deliverables: ${preferredDeliverables.join(', ') || 'Flexible'}

Generate a professional proposal response now.`

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
            max_tokens: 500
        })

        const proposal = completion.choices[0].message.content.trim()

        logger?.info('✅ AI proposal generated successfully', {
            dealId: deal?.dealId,
            proposalLength: proposal.length,
            tokensUsed: completion.usage?.total_tokens
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
 * @returns {Promise<string>} Generated or fallback proposal message
 */
export async function generateProposalWithFallback(deal, creatorProfile, fallbackTemplate, logger) {
    try {
        return await generateProposal(deal, creatorProfile, logger)
    } catch (error) {
        logger?.warn('AI proposal generation failed, using fallback template', {
            dealId: deal?.dealId,
            error: error.message
        })

        // Use fallback template
        return fallbackTemplate
    }
}
