/**
 * Thought Signature system for Marathon Agent
 * 
 * Maintains reasoning context across multi-day deal lifecycles
 * Enables self-correction when new information arrives
 */

export interface ThoughtSignature {
    dealId: string;
    sessionId: string;
    startedAt: Date;
    lastUpdated: Date;

    // Context that persists across tool calls
    context: {
        brandName: string;
        creatorId: string;
        dealStage: 'inquiry' | 'negotiating' | 'active' | 'completed';
        keyFacts: string[]; // Important facts to remember
    };

    // Reasoning chain
    reasoningChain: ReasoningStep[];

    // Decisions made
    decisions: Decision[];

    // Self-corrections
    corrections: Correction[];
}

export interface ReasoningStep {
    timestamp: Date;
    stage: string; // e.g., "rate_calculation", "negotiation_strategy"
    thought: string; // The reasoning
    confidence: number; // 0-100
    factors: string[]; // Key factors considered
    outcome?: string; // Result of this reasoning
}

export interface Decision {
    timestamp: Date;
    type: 'rate_proposal' | 'counter_offer' | 'accept_deal' | 'escalate';
    reasoning: string;
    parameters: Record<string, any>;
    executed: boolean;
}

export interface Correction {
    timestamp: Date;
    originalThought: string;
    newThought: string;
    reason: string; // Why the correction was needed
    trigger: string; // What new info triggered it
}

export class ThoughtSignatureManager {
    private signatures: Map<string, ThoughtSignature> = new Map();

    /**
     * Create a new thought signature for a deal
     */
    create(dealId: string, context: ThoughtSignature['context']): ThoughtSignature {
        const signature: ThoughtSignature = {
            dealId,
            sessionId: `session-${Date.now()}`,
            startedAt: new Date(),
            lastUpdated: new Date(),
            context,
            reasoningChain: [],
            decisions: [],
            corrections: [],
        };

        this.signatures.set(dealId, signature);
        return signature;
    }

    /**
     * Add a reasoning step
     */
    addReasoning(
        dealId: string,
        stage: string,
        thought: string,
        confidence: number,
        factors: string[]
    ): void {
        const signature = this.signatures.get(dealId);
        if (!signature) {
            throw new Error(`No thought signature found for deal ${dealId}`);
        }

        signature.reasoningChain.push({
            timestamp: new Date(),
            stage,
            thought,
            confidence,
            factors,
        });

        signature.lastUpdated = new Date();
    }

    /**
     * Record a decision
     */
    recordDecision(
        dealId: string,
        type: Decision['type'],
        reasoning: string,
        parameters: Record<string, any>
    ): void {
        const signature = this.signatures.get(dealId);
        if (!signature) {
            throw new Error(`No thought signature found for deal ${dealId}`);
        }

        signature.decisions.push({
            timestamp: new Date(),
            type,
            reasoning,
            parameters,
            executed: false,
        });

        signature.lastUpdated = new Date();
    }

    /**
     * Mark decision as executed
     */
    markExecuted(dealId: string, decisionIndex: number): void {
        const signature = this.signatures.get(dealId);
        if (!signature) return;

        if (signature.decisions[decisionIndex]) {
            signature.decisions[decisionIndex].executed = true;
            signature.lastUpdated = new Date();
        }
    }

    /**
     * Self-correct a previous thought
     */
    selfCorrect(
        dealId: string,
        originalThought: string,
        newThought: string,
        reason: string,
        trigger: string
    ): void {
        const signature = this.signatures.get(dealId);
        if (!signature) {
            throw new Error(`No thought signature found for deal ${dealId}`);
        }

        signature.corrections.push({
            timestamp: new Date(),
            originalThought,
            newThought,
            reason,
            trigger,
        });

        signature.lastUpdated = new Date();
    }

    /**
     * Get thought signature for a deal
     */
    get(dealId: string): ThoughtSignature | undefined {
        return this.signatures.get(dealId);
    }

    /**
     * Get thinking context as a prompt
     */
    getContextPrompt(dealId: string): string {
        const signature = this.signatures.get(dealId);
        if (!signature) {
            return '';
        }

        const { context, reasoningChain, decisions, corrections } = signature;

        let prompt = `## Deal Context\n`;
        prompt += `Brand: ${context.brandName}\n`;
        prompt += `Stage: ${context.dealStage}\n`;
        prompt += `Key Facts:\n${context.keyFacts.map(f => `- ${f}`).join('\n')}\n\n`;

        if (reasoningChain.length > 0) {
            prompt += `## Previous Reasoning\n`;
            const recentReasoning = reasoningChain.slice(-3); // Last 3 steps
            for (const step of recentReasoning) {
                prompt += `[${step.stage}] ${step.thought} (confidence: ${step.confidence}%)\n`;
            }
            prompt += '\n';
        }

        if (decisions.length > 0) {
            prompt += `## Decisions Made\n`;
            const recentDecisions = decisions.slice(-3);
            for (const decision of recentDecisions) {
                prompt += `[${decision.type}] ${decision.reasoning} ${decision.executed ? '✓' : '⏳'}\n`;
            }
            prompt += '\n';
        }

        if (corrections.length > 0) {
            prompt += `## Self-Corrections\n`;
            for (const correction of corrections) {
                prompt += `Changed thinking: "${correction.originalThought}" → "${correction.newThought}"\n`;
                prompt += `Reason: ${correction.reason}\n\n`;
            }
        }

        return prompt;
    }

    /**
     * Update deal stage
     */
    updateStage(dealId: string, newStage: ThoughtSignature['context']['dealStage']): void {
        const signature = this.signatures.get(dealId);
        if (!signature) return;

        signature.context.dealStage = newStage;
        signature.lastUpdated = new Date();
    }

    /**
     * Add key fact to context
     */
    addKeyFact(dealId: string, fact: string): void {
        const signature = this.signatures.get(dealId);
        if (!signature) return;

        signature.context.keyFacts.push(fact);
        signature.lastUpdated = new Date();
    }

    /**
     * Export thought signature for persistence
     */
    export(dealId: string): ThoughtSignature | undefined {
        return this.signatures.get(dealId);
    }

    /**
     * Import thought signature from storage
     */
    import(signature: ThoughtSignature): void {
        this.signatures.set(signature.dealId, signature);
    }

    /**
     * Clear old signatures (cleanup)
     */
    cleanup(olderThanDays: number = 30): void {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - olderThanDays);

        for (const [dealId, signature] of this.signatures.entries()) {
            if (signature.lastUpdated < cutoff) {
                this.signatures.delete(dealId);
            }
        }
    }
}

// Singleton instance
export const thoughtManager = new ThoughtSignatureManager();
