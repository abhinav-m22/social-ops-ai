// Normalizes extracted inquiry data and emits brand context updates
export const config = {
    type: 'event',
    name: 'BrandContextUpdated',
    subscribes: ['inquiry.extracted'],
    emits: ['BrandContextUpdated'],
    description: 'Creates normalized brand context for negotiation gating',
    flows: ['dealflow', 'negotiation']
}

const inferPlatformContent = (deliverables = []) => {
    for (const del of deliverables) {
        const type = (del.type || '').toLowerCase()
        if (type.includes('instagram')) {
            return { platform: 'instagram', contentType: type.includes('reel') ? 'reel' : 'post', inferred: true }
        }
        if (type.includes('youtube')) {
            return { platform: 'youtube', contentType: type.includes('short') ? 'short' : 'video', inferred: true }
        }
        if (type.includes('facebook')) {
            return { platform: 'facebook', contentType: 'video', inferred: true }
        }
    }
    return { platform: null, contentType: null, inferred: false }
}

export const handler = async (input, ctx) => {
    const { inquiryId, source, extracted } = input || {}
    if (!inquiryId || !extracted) {
        ctx.logger.warn('BrandContextUpdated: missing required data', { inquiryId })
        return
    }

    const brand = extracted.brand || {}
    const campaign = extracted.campaign || {}
    const deliverables = Array.isArray(campaign.deliverables) ? campaign.deliverables : []
    const proposedBudget = campaign?.budget?.amount ?? null

    const platformGuess = inferPlatformContent(deliverables)
    const platformOrContentType = {
        platform: campaign.platform || platformGuess.platform,
        contentType: campaign.contentType || platformGuess.contentType,
        inferred: platformGuess.inferred || false
    }

    // Determine thread and deal linkage
    const inquiry = await ctx.state.get('inquiries', inquiryId)
    const threadKey = inquiry?.threadKey || `${source || 'unknown'}:${inquiry?.senderId || 'unknown'}`

    // Try to link to an existing deal for this thread
    // Strategy 1: Match by unique thread/conversation key
    const deals = await ctx.state.getGroup('deals')
    let existingDeal = (deals || []).find(
        (d) => d.threadKey === threadKey && !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
    )

    // Strategy 2: Match by BrandId (if threadKey match failed)
    const senderId = inquiry?.senderId || (source === 'facebook' ? (inquiry?.sender?.id) : null)
    if (!existingDeal && senderId) {
        existingDeal = (deals || []).find(
            (d) =>
                d.brandId === senderId &&
                !['completed', 'cancelled', 'declined'].includes((d.status || '').toLowerCase())
        )
    }

    const existingContext = (await ctx.state.get('brandContexts', inquiryId)) || {}

    // MERGE STRATEGY:
    // - Deliverables: New overwrite old IF present/non-empty. Else keep old.
    // - Budget: New overwrites old IF present. Else keep old.
    // - Platform: New overwrites old.
    const mergedDeliverables = (deliverables && deliverables.length > 0)
        ? deliverables
        : existingContext.deliverables || []

    const mergedBudget = proposedBudget ?? existingContext.proposedBudget ?? null

    const normalized = {
        inquiryId,
        dealId: existingDeal?.dealId || inquiry?.dealId || existingContext.dealId || null,
        threadKey,
        source,
        brandName: brand.name || existingContext.brandName || null,
        deliverables: mergedDeliverables,
        proposedBudget: mergedBudget,
        platformOrContentType,
        updatedAt: new Date().toISOString()
    }

    // Persist latest brand context for this inquiry
    await ctx.state.set('brandContexts', inquiryId, normalized)

    // Emit canonical context update
    await ctx.emit({
        topic: 'BrandContextUpdated',
        data: normalized
    })

    ctx.logger.info('BrandContextUpdated: emitted normalized context', {
        inquiryId,
        hasDeliverables: deliverables.length > 0,
        hasBudget: proposedBudget != null,
        platform: platformOrContentType.platform,
        contentType: platformOrContentType.contentType
    })
}


