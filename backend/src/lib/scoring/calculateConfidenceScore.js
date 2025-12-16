/**
 * Lightweight confidence scoring for deals.
 * Inputs are plain objects to keep runtime friendly.
 */
const DEFAULT_RED_FLAGS = ['perpetuity', 'exclusive_6month', 'unlimited revisions', 'buyout', 'usage forever']

const scoreThresholds = {
    high: 80,
    medium: 50
}

export const calculateConfidenceScore = (deal, creator) => {
    let score = 50 // start neutral
    const reasons = []
    const redFlags = []

    const message = (deal?.message || '').toLowerCase()
    const deliverables = deal?.terms?.deliverables || []
    const budget = deal?.terms?.proposedBudget
    const interests = creator?.interests || []
    const preferred = creator?.preferredDeliverables || []
    const redFlagKeywords = [...DEFAULT_RED_FLAGS, ...(creator?.redFlags || [])]

    // Interest/deliverable match
    const matchedDeliverables = deliverables.filter(del => {
        const text = `${del.type || ''} ${del.description || ''}`.toLowerCase()
        return interests.some(interest => text.includes((interest || '').toLowerCase()))
    })
    if (matchedDeliverables.length > 0) {
        score += 20
        reasons.push(`Deliverables match creator interests (${matchedDeliverables.length})`)
    } else if (deliverables.length > 0) {
        score += 5
        reasons.push('Deliverables somewhat related (no exact interest match)')
    } else {
        score -= 5
        reasons.push('No clear deliverables provided')
    }

    // Preferred deliverables boost
    const preferredMatch = deliverables.some(del =>
        preferred.some(pref => (del.type || '').toLowerCase().includes((pref || '').toLowerCase()))
    )
    if (preferredMatch) {
        score += 10
        reasons.push('Includes preferred deliverable type')
    }

    // Budget alignment
    if (typeof budget === 'number') {
        if (budget >= (creator?.minRate || 0)) {
            score += 15
            reasons.push('Budget meets or exceeds min rate')
            if (creator?.maxRate && budget >= creator.maxRate) {
                score += 5
                reasons.push('Budget at top of desired range')
            }
        } else if (budget >= (creator?.minRate || 0) * 0.7) {
            score += 5
            reasons.push('Budget slightly below range')
        } else {
            score -= 15
            reasons.push('Budget well below range')
        }
    } else {
        score -= 5
        reasons.push('Budget not provided')
    }

    // Tone and spammy signals (lightweight heuristic)
    const spamSignals = ['free', 'exposure', 'cheap', 'asap', 'urgent']
    if (spamSignals.some(sig => message.includes(sig.toLowerCase()))) {
        score -= 10
        reasons.push('Message tone appears spammy/urgent')
    } else if (message.length > 20) {
        score += 5
        reasons.push('Message appears professional enough')
    }

    // Red flags
    for (const flag of redFlagKeywords) {
        const normalized = (flag || '').toLowerCase().replace(/_/g, ' ')
        if (message.includes(normalized)) {
            redFlags.push(flag)
            score -= 25
        }
    }
    if (redFlags.length) {
        reasons.push(`Red flags detected: ${redFlags.join(', ')}`)
    }

    // Clamp
    score = Math.max(0, Math.min(100, score))

    let level = 'low'
    if (score >= scoreThresholds.high) level = 'high'
    else if (score >= scoreThresholds.medium) level = 'medium'

    return {
        score,
        level,
        reasons,
        redFlags
    }
}

