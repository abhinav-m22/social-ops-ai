import Groq from 'groq-sdk'

export type TrendInput = {
    platform: string
    trends: Array<{
        topic: string
        velocityScore: number
        competitionLevel: string
        tags: string[]
    }>
}

export type ContentIdea = {
    title: string
    angle: string
    format: string
    hooks: string[]
    thumbnail_concept: string
    estimated_views: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
}

export type TrendAnalysis = {
    ranked_trends: Array<{
        topic: string
        category: 'HOT' | 'RISING' | 'EMERGING'
        reasoning: string
        content_ideas: ContentIdea[]
    }>
    daily_action_plan: {
        youtube: string
        instagram: string
        twitter: string
        facebook: string
        global_momentum: string
    }
}

export async function interpretTrends(
    niche: string,
    aggregatedResults: any[],
    logger: any
): Promise<TrendAnalysis | null> {
    const apiKey = process.env.GROQ_API_KEY

    // Prepare context for the prompt
    const trendContext = aggregatedResults.map((r: any) => {
        return `${r.platform}: ${r.trends.map((t: any) => `${t.topic} (Score: ${t.velocityScore})`).join(', ')}`
    }).join('\n')

    // Extract top trends for fallback
    const allTrends = aggregatedResults.flatMap((r: any) =>
        r.trends.map((t: any) => ({ ...t, platform: r.platform }))
    ).sort((a, b) => b.velocityScore - a.velocityScore)

    const topTrend = allTrends[0]?.topic || 'AI Innovation'
    const secondTrend = allTrends[1]?.topic || 'Tech Trends'
    const thirdTrend = allTrends[2]?.topic || 'Developer Tools'

    // FALLBACK: Generate realistic mock data based on actual trends
    const generateFallbackAnalysis = (): TrendAnalysis => {
        return {
            ranked_trends: [
                {
                    topic: topTrend,
                    category: 'HOT' as const,
                    reasoning: `This topic is experiencing ${allTrends[0]?.velocityScore || 9}x growth with minimal competition. Perfect timing to capture early audience.`,
                    content_ideas: [
                        {
                            title: `Why ${topTrend.split(':')[0]} Changes Everything for ${niche} Creators`,
                            angle: 'First-mover advantage + practical implementation guide',
                            format: 'Long-form YouTube + Carousel Post',
                            hooks: [
                                `I spent 72 hours testing ${topTrend.split(':')[0]} - here's what nobody is telling you...`,
                                `This ${topTrend.split(':')[0]} breakthrough just made 90% of ${niche} content obsolete.`,
                                `If you're in ${niche} and NOT using ${topTrend.split(':')[0]}, you're already behind.`
                            ],
                            thumbnail_concept: `Split screen: "Before/After" with ${topTrend.split(':')[0]} logo glowing in center. Bold text overlay.`,
                            estimated_views: '50K-150K',
                            difficulty: 'Medium'
                        },
                        {
                            title: `${topTrend.split(':')[0]}: 5-Minute Breakdown for Busy ${niche} Professionals`,
                            angle: 'Ultra-condensed, no-fluff explainer with instant takeaways',
                            format: 'Short-form (Reels/Shorts/TikTok)',
                            hooks: [
                                `Everyone's talking about ${topTrend.split(':')[0]}. Here's what it ACTUALLY means in 60 seconds.`,
                                `${topTrend.split(':')[0]} explained like you're 5 (but make it ${niche}).`
                            ],
                            thumbnail_concept: `Clean minimal design with stopwatch icon + "${topTrend.split(':')[0]}" in bold sans-serif`,
                            estimated_views: '80K-200K',
                            difficulty: 'Easy'
                        },
                        {
                            title: `I Built a ${niche} Project Using ${topTrend.split(':')[0]} - Full Walkthrough`,
                            angle: 'Hands-on tutorial with real code/examples',
                            format: 'Tutorial Video + Blog Post',
                            hooks: [
                                `Want to see ${topTrend.split(':')[0]} in action? Follow along as I build this live.`,
                                `This ${topTrend.split(':')[0]} tutorial took me 3 days. Sharing it for free.`
                            ],
                            thumbnail_concept: `Code editor screenshot with ${topTrend.split(':')[0]} integration highlighted. "FULL BUILD" badge`,
                            estimated_views: '30K-80K',
                            difficulty: 'Hard'
                        },
                        {
                            title: `${topTrend.split(':')[0]} vs [Competitor] - Honest Comparison`,
                            angle: 'Objective pros/cons analysis with recommendation',
                            format: 'Comparison Video + Infographic',
                            hooks: [
                                `I tested both for a week. Here's the one you should actually use.`,
                                `${topTrend.split(':')[0]} fans won't like this comparison...`
                            ],
                            thumbnail_concept: `VS battle style with two logos facing off. Checkmarks and X marks for features`,
                            estimated_views: '40K-100K',
                            difficulty: 'Medium'
                        },
                        {
                            title: `The Dark Side of ${topTrend.split(':')[0]} Nobody Talks About`,
                            angle: 'Contrarian take highlighting limitations/risks',
                            format: 'Opinion piece + Discussion Thread',
                            hooks: [
                                `Before you jump on the ${topTrend.split(':')[0]} hype train, read this.`,
                                `Everyone's praising ${topTrend.split(':')[0]}. Here's what they're missing.`
                            ],
                            thumbnail_concept: `Dark red background with warning symbol. "${topTrend.split(':')[0]}" text with shadow effect`,
                            estimated_views: '60K-140K',
                            difficulty: 'Easy'
                        }
                    ]
                },
                {
                    topic: secondTrend,
                    category: 'RISING' as const,
                    reasoning: `Gaining traction fast with ${allTrends[1]?.velocityScore || 7}x velocity. Great opportunity for early adopters.`,
                    content_ideas: [
                        {
                            title: `${secondTrend}: The Quiet Winner of 2025`,
                            angle: 'Underdog narrative + predictions',
                            format: 'Commentary Video',
                            hooks: [
                                `While everyone obsesses over ${topTrend}, THIS is what's actually winning.`,
                                `Mark my words: ${secondTrend} will dominate ${niche} by Q3 2025.`
                            ],
                            thumbnail_concept: `Podium graphic with ${secondTrend} in #1 position. "UNDERRATED" stamp`,
                            estimated_views: '25K-70K',
                            difficulty: 'Easy'
                        }
                    ]
                },
                {
                    topic: thirdTrend,
                    category: 'EMERGING' as const,
                    reasoning: `Early signal detected. Low competition makes this ideal for thought leadership positioning.`,
                    content_ideas: [
                        {
                            title: `${thirdTrend}: The Trend I'm Betting On (And You Should Too)`,
                            angle: 'Predictions + strategic positioning',
                            format: 'Analysis Thread + Newsletter',
                            hooks: [
                                `This ${thirdTrend} trend is still under the radar. Here's why I'm all in.`,
                                `In 6 months, everyone will talk about ${thirdTrend}. You heard it here first.`
                            ],
                            thumbnail_concept: `Crystal ball or telescope imagery with ${thirdTrend} emerging from fog`,
                            estimated_views: '15K-50K',
                            difficulty: 'Medium'
                        }
                    ]
                }
            ],
            daily_action_plan: {
                youtube: `Create a 12-minute deep dive on "${topTrend}" with a hands-on demo. Title: "I Tested ${topTrend.split(':')[0]} for 48 Hours - Honest Results". Use split-screen format showing before/after. Post between 2-4 PM for max reach.`,
                instagram: `Film a 45-second Reel showing the top 3 use cases for ${topTrend.split(':')[0]} in ${niche}. Hook: "If you're not using ${topTrend.split(':')[0]} yet, you're missing out." Add trending audio. Post at 11 AM or 7 PM.`,
                twitter: `Write a 7-tweet thread breaking down ${topTrend} with this hook: "Everyone's talking about ${topTrend.split(':')[0]}. Here's what actually matters for ${niche} folks (thread):" Include code snippets or screenshots. Pin the thread.`,
                facebook: `Post a quick text update in relevant ${niche} groups: "Anyone else experimenting with ${topTrend.split(':')[0]}? Just got some wild results - happy to share my learnings." Follow up with a detailed comment showing your insights. Engage in discussions.`,
                global_momentum: `${niche} creators are rushing to adopt ${topTrend.split(':')[0]} as velocity spikes +${allTrends[0]?.velocityScore || 9}00% - the window for first-mover advantage is closing fast.`
            }
        }
    }

    // If no API key, use fallback immediately
    if (!apiKey) {
        logger.warn('GROQ_API_KEY missing; using fallback trend analysis')
        return generateFallbackAnalysis()
    }

    const groq = new Groq({ apiKey })

    const prompt = `
You are an expert Social Media Trend Analyst & Content Strategist for the "${niche}" niche.

Here is the real-time trend data collected from across the web (YouTube, Google Trends, Twitter, Facebook, Instagram):

${trendContext}

Your Goal:
1.  Rank the trends by "Opportunity Score" (Availability vs Demand).
2.  Categorize each into HOT (Viral now), RISING (Gaining momentum), or EMERGING (Early signal).
3.  Generate 10 high-converting content ideas for the top 3 trends.
4.  CRITICAL: Create a "Daily Action Plan" with ONE crystal clear, specific content recommendation for each platform (YouTube, Instagram, Twitter, Facebook) that the creator can post TODAY.
5.  Summarize the "Global Momentum" in one powerful sentence.

For each Content Idea, provide:
-   **Title**: Clicky but honest.
-   **Angle**: Unique perspective.
-   **Format**: Short-form, Long-form, Thread, Post, etc.
-   **Hooks**: 2-3 opening lines to grab attention.
-   **Thumbnail Concept**: Visual description.
-   **Estimated Views**: Realistic projection based on trend velocity.
-   **Difficulty**: Production effort.

CRITICAL: You MUST return JSON with EXACTLY this structure (use these exact field names):
{
  "ranked_trends": [
    {
      "topic": "Trend name",
      "category": "HOT" or "RISING" or "EMERGING",
      "reasoning": "Why this trend matters",
      "content_ideas": [
        {
          "title": "Content title",
          "angle": "Unique angle",
          "format": "Video/Reel/Thread/Post",
          "hooks": ["Hook 1", "Hook 2"],
          "thumbnail_concept": "Visual description",
          "estimated_views": "10K-50K",
          "difficulty": "Easy" or "Medium" or "Hard"
        }
      ]
    }
  ],
  "daily_action_plan": {
    "youtube": "Specific YouTube content idea the creator can post TODAY",
    "instagram": "Specific Instagram content idea the creator can post TODAY",
    "twitter": "Specific Twitter content idea the creator can post TODAY",
    "facebook": "Specific Facebook content idea the creator can post TODAY",
    "global_momentum": "One sentence summary of current market state"
  }
}

DO NOT use "Trends" or "Content Ideas" as keys. Use "ranked_trends" and "daily_action_plan" exactly as shown above.
`

    try {
        const completion = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are a JSON-only response bot. Return ONLY valid JSON with the exact structure specified. Use "ranked_trends" and "daily_action_plan" as keys. No markdown, no explanations.' },
                { role: 'user', content: prompt }
            ]
        })

        const content = completion.choices[0]?.message?.content
        if (!content) {
            logger.warn('Groq returned empty content; using fallback')
            return generateFallbackAnalysis()
        }

        let parsed: any
        try {
            parsed = JSON.parse(content)
        } catch (parseError) {
            logger.warn('Failed to parse Groq JSON response; using fallback', { error: parseError })
            return generateFallbackAnalysis()
        }

        // Transform AI response if it uses different structure (Trends/Content Ideas instead of ranked_trends/daily_action_plan)
        // Always transform if we detect the alternative structure, even if daily_action_plan exists (it might be incomplete)
        if ((parsed.Trends || parsed.trends) && (parsed['Content Ideas'] || parsed.content_ideas)) {
            logger.info('Transforming AI response from alternative structure to expected format')
            
            const trendsArray = parsed.Trends || parsed.trends || []
            const contentIdeasArray = parsed['Content Ideas'] || parsed.content_ideas || []
            
            // Get top 3 trends
            const topTrends = trendsArray.slice(0, 3)
            const topTrend = topTrends[0]?.Topic || topTrends[0]?.Trend || topTrends[0]?.topic || allTrends[0]?.topic || 'AI Innovation'
            
            // Transform to ranked_trends format
            const ranked_trends = topTrends.map((t: any, idx: number) => {
                const trendName = t.Topic || t.Trend || t.topic || 'Unknown Trend'
                const relatedIdeas = contentIdeasArray.filter((ci: any) => {
                    const ciTrend = ci.Trend || ci.trend || ci.Topic || ci.topic
                    return ciTrend === trendName || ciTrend?.includes(trendName) || trendName?.includes(ciTrend)
                })
                
                return {
                    topic: trendName,
                    category: (t.Category || t.category || (idx === 0 ? 'HOT' : idx === 1 ? 'RISING' : 'EMERGING')) as 'HOT' | 'RISING' | 'EMERGING',
                    reasoning: `Trend with score ${t.Score || t.velocityScore || 0} in ${t.Category || t.category || 'HOT'} category`,
                    content_ideas: relatedIdeas.slice(0, 5).map((ci: any) => ({
                        title: ci.Title || ci.title || 'Content Idea',
                        angle: ci.Angle || ci.angle || 'Engaging angle',
                        format: ci.Format || ci.format || 'Video',
                        hooks: Array.isArray(ci.Hooks) ? ci.Hooks : (Array.isArray(ci.hooks) ? ci.hooks : ['Hook 1', 'Hook 2']),
                        thumbnail_concept: ci['Thumbnail Concept'] || ci.thumbnail_concept || 'Visual concept',
                        estimated_views: ci['Estimated Views'] || ci.estimated_views || '10K-50K',
                        difficulty: (ci.Difficulty || ci.difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard'
                    }))
                }
            })

            // Use existing daily_action_plan if it exists, otherwise extract or generate from Content Ideas
            let daily_action_plan = parsed.daily_action_plan
            
            // Get top trend title for use in generation
            const topTrendTitle = topTrends[0]?.Topic || topTrends[0]?.Trend || topTrends[0]?.topic || topTrend
            
            if (!daily_action_plan || !daily_action_plan.youtube) {
                // Extract or generate daily_action_plan from Content Ideas or create from top trends
                const youtubeIdea = contentIdeasArray.find((ci: any) => 
                    (ci.Platform === 'YouTube' || ci.platform === 'youtube' || 
                     ci.Format?.toLowerCase().includes('video') || ci.format?.toLowerCase().includes('video'))
                )
                const instagramIdea = contentIdeasArray.find((ci: any) => 
                    (ci.Platform === 'Instagram' || ci.platform === 'instagram' || 
                     ci.Format?.toLowerCase().includes('reel') || ci.format?.toLowerCase().includes('reel'))
                )
                const twitterIdea = contentIdeasArray.find((ci: any) => 
                    (ci.Platform === 'Twitter' || ci.platform === 'twitter' || 
                     ci.Format?.toLowerCase().includes('thread') || ci.format?.toLowerCase().includes('thread'))
                )
                const facebookIdea = contentIdeasArray.find((ci: any) => 
                    (ci.Platform === 'Facebook' || ci.platform === 'facebook' || 
                     ci.Format?.toLowerCase().includes('post') || ci.format?.toLowerCase().includes('post'))
                )

                // Use the first content idea for each platform if no specific match, or generate from top trend
                const firstContentIdea = contentIdeasArray[0]

                daily_action_plan = {
                    youtube: youtubeIdea?.Title || youtubeIdea?.title || 
                            (firstContentIdea?.Format?.toLowerCase().includes('video') ? firstContentIdea.Title || firstContentIdea.title : null) ||
                            `Create a 12-minute deep dive on "${topTrendTitle}" with hands-on examples. Post between 2-4 PM for max reach.`,
                    instagram: instagramIdea?.Title || instagramIdea?.title ||
                              (firstContentIdea?.Format?.toLowerCase().includes('reel') ? firstContentIdea.Title || firstContentIdea.title : null) ||
                              `Film a 45-second Reel showcasing "${topTrendTitle}" with trending audio. Post at 11 AM or 7 PM.`,
                    twitter: twitterIdea?.Title || twitterIdea?.title ||
                            (firstContentIdea?.Format?.toLowerCase().includes('thread') ? firstContentIdea.Title || firstContentIdea.title : null) ||
                            `Write a 7-tweet thread breaking down "${topTrendTitle}" with code snippets. Pin the thread.`,
                    facebook: facebookIdea?.Title || facebookIdea?.title ||
                             (firstContentIdea?.Format?.toLowerCase().includes('post') ? firstContentIdea.Title || firstContentIdea.title : null) ||
                             `Post an update about "${topTrendTitle}" in relevant ${niche} groups. Engage in discussions.`,
                    global_momentum: parsed.daily_action_plan?.global_momentum || 
                                   `${niche} creators are rushing to adopt ${topTrendTitle} as velocity spikes - the window for first-mover advantage is closing fast.`
                }
            }

            logger.info('Successfully transformed AI response to expected format', { 
                hasDailyActionPlan: !!daily_action_plan,
                topTrend: topTrendTitle
            })
            return {
                ranked_trends,
                daily_action_plan
            } as TrendAnalysis
        }

        // Validate structure - check for expected format
        if (!parsed.daily_action_plan || !parsed.daily_action_plan.youtube) {
            logger.warn('Groq response missing daily_action_plan; attempting to generate from available data')
            
            // Try to generate daily_action_plan from available data
            const topTrend = allTrends[0]?.topic || 'AI Innovation'
            const trendsArray = parsed.Trends || parsed.trends || []
            const topTrendFromResponse = trendsArray[0]?.Topic || trendsArray[0]?.Trend || trendsArray[0]?.topic || topTrend
            
            parsed.daily_action_plan = {
                youtube: `Create a 12-minute deep dive on "${topTrendFromResponse}" with hands-on examples. Post between 2-4 PM for max reach.`,
                instagram: `Film a 45-second Reel showcasing "${topTrendFromResponse}" with trending audio. Post at 11 AM or 7 PM.`,
                twitter: `Write a 7-tweet thread breaking down "${topTrendFromResponse}" with code snippets. Pin the thread.`,
                facebook: `Post an update about "${topTrendFromResponse}" in relevant ${niche} groups. Engage in discussions.`,
                global_momentum: `${niche} creators are rushing to adopt ${topTrendFromResponse} as velocity spikes - the window for first-mover advantage is closing fast.`
            }
            
            logger.info('Generated daily_action_plan from available trend data')
        }

        // Ensure all required fields exist
        if (!parsed.ranked_trends || !Array.isArray(parsed.ranked_trends)) {
            logger.warn('Groq response missing ranked_trends array; using fallback')
            return generateFallbackAnalysis()
        }

        // Final validation - ensure daily_action_plan has all required platforms
        if (!parsed.daily_action_plan.youtube || !parsed.daily_action_plan.instagram || 
            !parsed.daily_action_plan.twitter || !parsed.daily_action_plan.facebook || 
            !parsed.daily_action_plan.global_momentum) {
            logger.warn('Groq response has incomplete daily_action_plan; using fallback')
            return generateFallbackAnalysis()
        }

        return parsed as TrendAnalysis

    } catch (error) {
        logger.error('Groq Trend Interpretation Failed; using fallback', { error })
        return generateFallbackAnalysis()
    }
}
