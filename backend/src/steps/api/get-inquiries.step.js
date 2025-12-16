// API endpoint to list all inquiries for debugging/testing
export const config = {
    type: 'api',
    name: 'GetInquiries',
    path: '/api/inquiries',
    method: 'GET',
    emits: [],
    description: 'Returns all stored inquiries',
    flows: ['dashboard', 'inquiry-processing']
}

export const handler = async (req, ctx) => {
    try {
        // Fetch all inquiries from state
        const inquiries = await ctx.state.getGroup('inquiries')

        return {
            status: 200,
            body: {
                count: inquiries.length,
                inquiries: inquiries
            }
        }
    } catch (error) {
        ctx.logger.error('Failed to fetch inquiries', { error: error.message })
        return {
            status: 500,
            body: { error: 'Internal server error' }
        }
    }
}
