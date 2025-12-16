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

    const normalized = {
        inquiryId,
        source,
        brandName: brand.name || null,
        deliverables,
        proposedBudget,
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


