// Dashboard API: Seed deals with sample data
export const config = {
    type: 'api',
    name: 'SeedDeals',
    path: '/api/seed-deals',
    method: 'POST',
    emits: [],
    description: 'Seeds 25 sample deals into Motia state for testing/development',
    flows: ['dashboard']
}

// Sample brand names for variety
const brandNames = [
    'TechGadgets Pro', 'Fashion Forward', 'Beauty Bliss', 'Fitness First', 'Foodie Delights',
    'Travel Tales', 'Home Decor Hub', 'Pet Paradise', 'Sports Zone', 'Music Masters',
    'Art & Craft Co', 'Wellness World', 'Green Living', 'Auto Experts', 'Gaming Galaxy',
    'Bookworm Publishers', 'Kids Corner', 'Luxury Lifestyle', 'Budget Brands', 'Eco Essentials',
    'Digital Dreams', 'Urban Outfitters', 'Rural Roots', 'Cosmic Creations', 'Nature Nurture'
]

// Sample POC names
const pocNames = [
    'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
    'Anjali Mehta', 'Rohit Verma', 'Kavita Nair', 'Suresh Iyer', 'Meera Joshi',
    'Arjun Malhotra', 'Divya Kapoor', 'Nikhil Agarwal', 'Riya Gupta', 'Karan Shah',
    'Pooja Desai', 'Manish Rao', 'Swati Menon', 'Aditya Chawla', 'Neha Bhatia',
    'Varun Khanna', 'Shreya Jain', 'Rahul Dutta', 'Isha Agarwal', 'Kunal Mehra'
]

// Sample email domains
const emailDomains = [
    'gmail.com', 'outlook.com', 'yahoo.com', 'company.com', 'brand.com',
    'business.in', 'corp.com', 'enterprise.com', 'startup.io', 'digital.com'
]

// Sample platforms
const platforms = ['facebook', 'email', 'instagram', 'youtube', 'unknown']

// Sample statuses
const statuses = ['new', 'awaiting_details', 'awaiting_response', 'inquiry', 'negotiating', 'active', 'completed']

// Sample deliverable types
const deliverableTypes = [
    'Instagram Post', 'Instagram Reel', 'Instagram Story', 'YouTube Video', 'YouTube Short',
    'Facebook Post', 'Facebook Video', 'Blog Post', 'Product Review', 'Unboxing Video'
]

// Generate random email
const generateEmail = (brandName, index) => {
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)]
    const name = brandName.toLowerCase().replace(/\s+/g, '')
    return `${name}${index}@${domain}`
}

// Generate random date within last 90 days
const randomDate = (daysAgo = 0) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo - Math.floor(Math.random() * 90))
    return date.toISOString()
}

// Generate random amount between min and max
const randomAmount = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Calculate GST (18% of agreed rate)
const calculateGST = (agreedRate) => {
    return Math.round(agreedRate * 0.18)
}

// Calculate TDS (10% of agreed rate)
const calculateTDS = (agreedRate) => {
    return Math.round(agreedRate * 0.10)
}

// Calculate total (agreedRate + GST - TDS)
const calculateTotal = (agreedRate, gst, tds) => {
    return agreedRate + gst - tds
}

// Generate deliverables
const generateDeliverables = (dealId, count = 1) => {
    const types = [...deliverableTypes]
    const deliverables = []
    const daysFromNow = Math.floor(Math.random() * 30) + 7 // 7-37 days from now
    
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)]
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + daysFromNow + i * 7)
        
        deliverables.push({
            id: `del-${dealId}-${i}`,
            type: type,
            count: Math.floor(Math.random() * 3) + 1,
            description: `${type} for brand campaign`,
            dueDate: dueDate.toISOString(),
            status: ['pending', 'in_progress', 'submitted'][Math.floor(Math.random() * 3)]
        })
    }
    
    return deliverables
}

// Generate confidence data
const generateConfidence = () => {
    const levels = ['high', 'medium', 'low']
    const level = levels[Math.floor(Math.random() * levels.length)]
    const score = level === 'high' ? randomAmount(75, 95) : level === 'medium' ? randomAmount(50, 74) : randomAmount(25, 49)
    
    const reasons = [
        'Clear budget mentioned',
        'Specific deliverables requested',
        'Professional communication',
        'Established brand',
        'Quick response time'
    ]
    
    const redFlags = Math.random() > 0.7 ? [
        'Budget too low',
        'Unclear requirements',
        'No contract mentioned'
    ] : []
    
    return {
        level,
        score,
        reasons: reasons.slice(0, Math.floor(Math.random() * 3) + 2),
        redFlags
    }
}

export const handler = async (req, ctx) => {
    ctx.logger.info('Seeding 25 deals into Motia state')

    try {
        const deals = []
        const now = new Date().toISOString()

        for (let i = 0; i < 25; i++) {
            const dealId = `deal-${Date.now()}-${i}`
            const inquiryId = `inquiry-${Date.now()}-${i}`
            const creatorId = 'default-creator'
            
            const brandName = brandNames[i]
            const pocName = pocNames[i]
            const email = generateEmail(brandName, i)
            const platform = platforms[Math.floor(Math.random() * platforms.length)]
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            
            // Generate financial terms
            const agreedRate = randomAmount(10000, 200000) // ₹10k to ₹2L
            const gst = calculateGST(agreedRate)
            const tds = calculateTDS(agreedRate)
            const total = calculateTotal(agreedRate, gst, tds)
            const proposedBudget = status === 'negotiating' ? randomAmount(agreedRate - 10000, agreedRate + 10000) : agreedRate
            
            // Generate deliverables
            const deliverableCount = Math.floor(Math.random() * 3) + 1
            const deliverables = generateDeliverables(dealId, deliverableCount)
            
            // Generate confidence data
            const confidence = generateConfidence()
            
            // Generate timeline dates
            const daysAgo = Math.floor(Math.random() * 90)
            const inquiryReceived = randomDate(daysAgo)
            const dealCreated = randomDate(daysAgo - 1)
            const ratesCalculated = status !== 'new' ? randomDate(daysAgo - 2) : null
            const autoReplySent = confidence.level === 'high' ? randomDate(daysAgo - 1) : null
            
            // Generate history
            const history = [
                {
                    timestamp: inquiryReceived,
                    event: 'inquiry_received',
                    data: { source: platform, inquiryId }
                },
                {
                    timestamp: dealCreated,
                    event: 'deal_created',
                    data: { dealId }
                }
            ]
            
            if (ratesCalculated) {
                history.push({
                    timestamp: ratesCalculated,
                    event: 'rates_calculated',
                    data: { agreedRate, gst, tds, total }
                })
            }
            
            if (autoReplySent) {
                history.push({
                    timestamp: autoReplySent,
                    event: 'auto_reply_sent',
                    data: { message: 'Thank you for your inquiry...' }
                })
            }

            const deal = {
                dealId,
                inquiryId,
                creatorId,
                status,
                platform,
                
                brand: {
                    name: brandName,
                    contactPerson: pocName,
                    email: email,
                    pageName: `${brandName} Official`,
                    platformAccountId: `platform-${i}`,
                    logoUrl: `https://example.com/logos/${brandName.toLowerCase().replace(/\s+/g, '-')}.png`
                },
                
                message: `Hi, we are interested in collaborating with you for our ${deliverables[0].type.toLowerCase()} campaign. We have a budget of ₹${proposedBudget.toLocaleString('en-IN')} and would like to discuss the deliverables. Looking forward to your response.`,
                
                confidenceScore: confidence.score,
                confidenceLevel: confidence.level,
                confidenceReasons: confidence.reasons,
                redFlags: confidence.redFlags,
                
                autoReplySent: confidence.level === 'high',
                autoReplyAt: autoReplySent,
                autoReplyMessage: confidence.level === 'high' ? 'Thank you for your inquiry. We will review your requirements and get back to you shortly.' : null,
                aiSuggestedReply: confidence.level === 'high' ? 'Thank you for reaching out. We would be happy to discuss this collaboration opportunity.' : null,
                
                creatorReplySent: status === 'active' || status === 'completed',
                creatorReplyAt: (status === 'active' || status === 'completed') ? randomDate(daysAgo - 5) : null,
                creatorReplyMessage: (status === 'active' || status === 'completed') ? 'Thank you for your interest. We accept your proposal and look forward to working together.' : null,
                creatorReplyAction: status === 'active' ? 'send_proposal' : undefined,
                
                terms: {
                    deliverables: deliverables,
                    proposedBudget: proposedBudget,
                    agreedRate: agreedRate,
                    gst: gst,
                    tds: tds, // Adding TDS to terms
                    total: total
                },
                
                timeline: {
                    inquiryReceived: inquiryReceived,
                    ratesCalculated: ratesCalculated,
                    dealCreated: dealCreated,
                    autoReplySent: autoReplySent,
                    contractSent: status === 'active' ? randomDate(daysAgo - 3) : null,
                    signatureReceived: status === 'active' ? randomDate(daysAgo - 2) : null,
                    deliverablesDue: deliverables.map(del => ({ id: del.id, dueDate: del.dueDate }))
                },
                
                history: history,
                
                extractedData: {
                    budget: proposedBudget,
                    platform: platform,
                    deliverables: deliverables.map(d => d.type),
                    brandName: brandName
                },
                
                source: platform,
                rawInquiry: `Original inquiry from ${brandName} via ${platform}`
            }

            // Save deal to Motia state
            await ctx.state.set('deals', dealId, deal)
            deals.push(deal)
            
            ctx.logger.debug(`Created deal ${i + 1}/25`, { dealId, brandName, status, agreedRate })
        }

        ctx.logger.info('Successfully seeded 25 deals', {
            totalDeals: deals.length,
            statuses: deals.reduce((acc, d) => {
                acc[d.status] = (acc[d.status] || 0) + 1
                return acc
            }, {})
        })

        return {
            status: 200,
            body: {
                success: true,
                message: 'Successfully seeded 25 deals',
                count: deals.length,
                deals: deals.map(d => ({
                    dealId: d.dealId,
                    brandName: d.brand.name,
                    status: d.status,
                    agreedRate: d.terms.agreedRate,
                    gst: d.terms.gst,
                    tds: d.terms.tds,
                    total: d.terms.total
                }))
            }
        }
    } catch (error) {
        ctx.logger.error('Failed to seed deals', {
            error: error.message,
            stack: error.stack
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to seed deals',
                message: error.message
            }
        }
    }
}

