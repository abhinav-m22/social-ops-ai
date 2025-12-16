// Facebook Webhook Verification (GET)
export const config = {
    type: 'api',
    name: 'FacebookWebhookVerify',
    path: '/webhooks/facebook',
    method: 'GET',
    emits: [],
    description: 'Verifies Facebook webhook subscription',
    flows: ['webhooks']
}

export const handler = async (req, ctx) => {
    // Motia framework uses queryParams
    const query = req.queryParams || {}

    ctx.logger.info('Facebook verification request', {
        queryKeys: Object.keys(query),
        mode: query['hub.mode']
    })

    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
        ctx.logger.info('Facebook webhook verified successfully')
        return {
            status: 200,
            body: parseInt(challenge) || challenge
        }
    }

    ctx.logger.warn('Facebook verification failed', { mode, token })
    return { status: 403, body: 'Forbidden' }
}
