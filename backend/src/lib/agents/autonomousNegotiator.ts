/**
 * Autonomous Negotiation Agent - Marathon Agent Feature
 * 
 * Runs multi-round brand deal negotiation without human intervention
 * Uses Gemini 3 Thinking Level 2 for strategic decision-making
 */

import { createGeminiClient } from '../gemini/client.js';
import { thoughtManager } from '../gemini/thinking.js';

export interface NegotiationContext {
    dealId: string;
    brandName: string;
    creatorId: string;
    originalProposal: {
        brandOffer: number;
        deliverables: string;
    };
    ourRates: {
        conservative: number;
        market: number;
        premium: number;
    };
    negotiationHistory: NegotiationRound[];
    autoNegotiateThreshold: number; // Minimum acceptable rate
}

export interface NegotiationRound {
    round: number;
    timestamp: Date;
    fromBrand: boolean;
    offer: number;
    message: string;
    reasoning?: string;
}

export interface NegotiationDecision {
    action: 'accept' | 'counter' | 'escalate' | 'decline';
    counterOffer?: number;
    message: string;
    reasoning: string;
    confidence: number; // 0-100
}

export class AutonomousNegotiationAgent {
    private maxRounds: number = 3;
    private acceptThresholdPercent: number = 80; // Accept if offer >= 80% of market rate

    constructor(options?: { maxRounds?: number; acceptThresholdPercent?: number }) {
        if (options?.maxRounds) this.maxRounds = options.maxRounds;
        if (options?.acceptThresholdPercent) this.acceptThresholdPercent = options.acceptThresholdPercent;
    }

    /**
     * Analyze brand's counter-offer and decide next action
     */
    async analyzeCounterOffer(
        context: NegotiationContext,
        opts: { logger?: { info?: Function; warn?: Function } } = {}
    ): Promise<NegotiationDecision> {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            thinkingLevel: 'level2', // Strategic thinking
            temperature: 0.3,
        });

        // Get thought signature context
        const thoughtContext = thoughtManager.getContextPrompt(context.dealId);

        const latestBrandOffer = context.negotiationHistory.filter(r => r.fromBrand).slice(-1)[0];
        const currentRound = context.negotiationHistory.length;

        const prompt = `${thoughtContext}

You are an AI negotiation agent handling a brand deal for an Indian creator.

CURRENT SITUATION:
- Brand: ${context.brandName}
- Deliverables: ${context.originalProposal.deliverables}
- Our calculated rates:
  - Conservative: ₹${context.ourRates.conservative}
  - Market: ₹${context.ourRates.market}
  - Premium: ₹${context.ourRates.premium}
- Minimum threshold: ₹${context.autoNegotiateThreshold} (${this.acceptThresholdPercent}% of market rate)

NEGOTIATION HISTORY:
${context.negotiationHistory.map(r => `
Round ${r.round} (${r.fromBrand ? 'Brand' : 'Us'}): ₹${r.offer}
Message: ${r.message}
`).join('\n')}

LATEST BRAND OFFER: ₹${latestBrandOffer.offer}
Current Round: ${currentRound}/${this.maxRounds}

DECISION RULES:
1. If brand offer >= ₹${context.autoNegotiateThreshold} (${this.acceptThresholdPercent}% threshold), ACCEPT
2. If brand offer is 60-79% of market rate AND rounds left, COUNTER with midpoint
3. If brand offer < 60% of market rate, DECLINE or ESCALATE
4. If at max rounds, either ACCEPT best offer so far or ESCALATE

Analyze the situation strategically and decide:
- Should we accept, counter, escalate to human, or decline?
- If counter, what's the strategic counter-offer?
- What message should we send?

Return ONLY valid JSON:
{
  "action": "accept" | "counter" | "escalate" | "decline",
  "counterOffer": number or null,
  "message": "email-ready message to brand",
  "reasoning": "your strategic thinking",
  "confidence": number (0-100)
}`;

        const response = await client.generateJSON<NegotiationDecision>(prompt);

        if (!response.parsed) {
            throw new Error('Failed to get negotiation decision from Gemini');
        }

        // Record this reasoning in thought signature
        thoughtManager.addReasoning(
            context.dealId,
            'negotiation_analysis',
            response.parsed.reasoning,
            response.parsed.confidence,
            ['brand_offer', 'market_rate', 'negotiation_round', 'thresholds']
        );

        if (response.parsed.action === 'accept' || response.parsed.action === 'decline') {
            thought Manager.recordDecision(
            context.dealId,
            response.parsed.action === 'accept' ? 'accept_deal' : 'decline',
            response.parsed.reasoning,
            { finalOffer: latestBrandOffer.offer }
        );
        } else if (response.parsed.action === 'counter') {
            thoughtManager.recordDecision(
                context.dealId,
                'counter_offer',
                response.parsed.reasoning,
                { counterOffer: response.parsed.counterOffer }
            );
        }

        opts.logger?.info?.('[Autonomous Agent] Negotiation decision made', {
            action: response.parsed.action,
            counterOffer: response.parsed.counterOffer,
            confidence: response.parsed.confidence,
        });

        return response.parsed;
    }

    /**
     * Generate professional counter-offer email
     */
    async generateCounterOfferEmail(
        context: NegotiationContext,
        decision: NegotiationDecision
    ): Promise<string> {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            temperature: 0.7, // More creative for email writing
        });

        const prompt = `Generate a professional, friendly email to ${context.brandName} with our counter-offer.

Context:
- They offered: ₹${context.negotiationHistory.slice(-1)[0].offer}
- We're countering with: ₹${decision.counterOffer}
- Deliverables: ${context.originalProposal.deliverables}

Tone: Professional but warm, emphasize value we bring (engagement rate, content quality)
Keep it concise (3-4 sentences)

Return just the email body text, no subject line.`;

        const response = await client.generate(prompt);
        return response.content;
    }

    /**
     * Generate acceptance email
     */
    async generateAcceptanceEmail(
        context: NegotiationContext,
        finalRate: number
    ): Promise<string> {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            temperature: 0.7,
        });

        const prompt = `Generate a professional acceptance email to ${context.brandName}.

We're accepting their offer of ₹${finalRate} for ${context.originalProposal.deliverables}.

Tone: Enthusiastic, professional, mention next steps (contract, timeline)
Keep it concise (2-3 sentences)

Return just the email body text.`;

        const response = await client.generate(prompt);
        return response.content;
    }

    /**
     * Self-correction: Revise strategy if new information arrives
     */
    async selfCorrect(
        context: NegotiationContext,
        newInfo: string
    ): Promise<void> {
        const previousDecision = thoughtManager.get(context.dealId)?.decisions.slice(-1)[0];

        if (!previousDecision) return;

        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            thinkingLevel: 'level2',
        });

        const prompt = `NEW INFORMATION: ${newInfo}

Previous decision: ${previousDecision.type} - ${previousDecision.reasoning}

Should we revise our strategy based on this new info? If yes, explain why.

Return JSON:
{
  "shouldRevise": boolean,
  "newStrategy": "description" or null,
  "reason": "explanation"
}`;

        const response = await client.generateJSON<{
            shouldRevise: boolean;
            newStrategy?: string;
            reason: string;
        }>(prompt);

        if (response.parsed?.shouldRevise && response.parsed.newStrategy) {
            thoughtManager.selfCorrect(
                context.dealId,
                previousDecision.reasoning,
                response.parsed.newStrategy,
                response.parsed.reason,
                newInfo
            );
        }
    }
}

/**
 * Factory function
 */
export function createNegotiationAgent(options?: {
    maxRounds?: number;
    acceptThresholdPercent?: number;
}): AutonomousNegotiationAgent {
    return new AutonomousNegotiationAgent(options);
}
