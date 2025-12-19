// FinanceHub API: Generate AI Finance Insights using Groq
import Groq from 'groq-sdk'

export const config = {
    type: 'api',
    name: 'GenerateFinanceInsights',
    path: '/api/finance/insights',
    method: 'POST',
    emits: [],
    description: 'Generates AI-powered finance insights from aggregated data',
    flows: ['dashboard']
}

export const handler = async (req, ctx) => {
    ctx.logger.info('FinanceHub: Generating AI insights', {
        traceId: ctx.traceId
    })

    try {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            ctx.logger.warn('GROQ_API_KEY missing; cannot generate insights')
            return {
                status: 500,
                body: {
                    success: false,
                    error: 'AI service not configured'
                }
            }
        }

        // Get finance data from request body (already aggregated)
        const financeData = req.body?.data

        if (!financeData) {
            return {
                status: 400,
                body: {
                    success: false,
                    error: 'Finance data is required'
                }
            }
        }

        // Build prompt for AI
        const prompt = `You are a financial advisor analyzing a content creator's income data in India.

FINANCE DATA:
- Total Earnings: ₹${financeData.summary.totalEarnings.toLocaleString('en-IN')}
- GST Collected: ₹${financeData.summary.totalGST.toLocaleString('en-IN')}
- TDS Deducted: ₹${financeData.summary.totalTDS.toLocaleString('en-IN')}
- Net Receivable: ₹${financeData.summary.netReceivable.toLocaleString('en-IN')}
- Total Deals: ${financeData.summary.dealCount}

Platform-wise Earnings:
${financeData.platformData.map(p => `- ${p.platform}: ₹${p.earnings.toLocaleString('en-IN')} (${p.count} deals)`).join('\n')}

Monthly Trend (last 3 months):
${financeData.monthlyTrend.slice(-3).map(m => `- ${m.month}: Earnings ₹${m.earnings.toLocaleString('en-IN')}, GST ₹${m.gst.toLocaleString('en-IN')}, TDS ₹${m.tds.toLocaleString('en-IN')}`).join('\n')}

GST Entries: ${financeData.gst.tableData.length}
TDS Entries: ${financeData.tds.tableData.length}

TASK: Generate concise, actionable financial insights as bullet points. Focus on:
1. Growth trends and patterns
2. Platform dependency risks
3. GST/TDS observations
4. Tax planning suggestions
5. Actionable recommendations

Format: Return ONLY a plain text list of bullet points (use • for bullets). No markdown, no code blocks, no explanations. Maximum 8-10 insights. Be specific and data-driven.`

        const groq = new Groq({ apiKey })
        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: 'You are a financial advisor. Return only bullet points. No markdown, no code blocks.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })

        const insights = completion?.choices?.[0]?.message?.content || 'Unable to generate insights at this time.'

        ctx.logger.info('FinanceHub: AI insights generated', {
            insightsLength: insights.length,
            traceId: ctx.traceId
        })

        return {
            status: 200,
            body: {
                success: true,
                insights: insights,
                generatedAt: new Date().toISOString()
            }
        }
    } catch (error) {
        ctx.logger.error('FinanceHub: Failed to generate insights', {
            error: error.message,
            stack: error.stack,
            traceId: ctx.traceId
        })

        return {
            status: 500,
            body: {
                success: false,
                error: 'Failed to generate insights',
                message: error.message
            }
        }
    }
}

