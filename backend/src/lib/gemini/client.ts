import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';

/**
 * Gemini 3 Client for SocialOps AI
 * 
 * Provides unified interface for:
 * - Text generation with thinking levels
 * - Multimodal input (text, images, video)
 * - Structured JSON output
 * - Rate limiting and error handling
 */

export type GeminiModel =
    | 'gemini-3.0-pro'
    | 'gemini-3.0-flash'
    | 'gemini-3.5-flash'
    | 'gemini-2.0-flash-exp'; // Fallback

export type ThinkingLevel = 'none' | 'level1' | 'level2' | 'level3';

export interface GeminiClientConfig {
    apiKey: string;
    model?: GeminiModel;
    thinkingLevel?: ThinkingLevel;
    temperature?: number;
    maxOutputTokens?: number;
}

export interface MultimodalContent {
    type: 'text' | 'image' | 'video';
    content: string | Buffer; // Text or base64/buffer for media
    mimeType?: string;
}

export interface GeminiResponse<T = any> {
    content: string;
    parsed?: T;
    finishReason: string;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
    thinkingProcess?: string; // Available when thinking level > none
}

export class GeminiClient {
    private client: GoogleGenerativeAI;
    private config: Required<GeminiClientConfig>;
    private model: GenerativeModel;

    constructor(config: GeminiClientConfig) {
        this.config = {
            apiKey: config.apiKey,
            model: config.model || 'gemini-2.0-flash-exp',
            thinkingLevel: config.thinkingLevel || 'none',
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxOutputTokens || 8192,
        };

        this.client = new GoogleGenerativeAI(this.config.apiKey);
        this.model = this.client.getGenerativeModel({
            model: this.config.model,
        });
    }

    /**
     * Generate text response with optional thinking levels
     */
    async generate(prompt: string): Promise<GeminiResponse> {
        const enhancedPrompt = this.addThinkingInstructions(prompt);

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
            },
        });

        return this.parseResponse(result);
    }

    /**
     * Generate with multimodal input (text + images/video)
     */
    async generateMultimodal(
        inputs: MultimodalContent[]
    ): Promise<GeminiResponse> {
        const parts = inputs.map(input => {
            if (input.type === 'text') {
                return { text: input.content as string };
            } else {
                return {
                    inlineData: {
                        mimeType: input.mimeType || 'image/jpeg',
                        data: typeof input.content === 'string'
                            ? input.content
                            : input.content.toString('base64')
                    }
                };
            }
        });

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
            },
        });

        return this.parseResponse(result);
    }

    /**
     * Generate with structured JSON output
     */
    async generateJSON<T = any>(
        prompt: string,
        schema?: any
    ): Promise<GeminiResponse<T>> {
        const jsonPrompt = `${prompt}\n\nYou must respond with valid JSON only. No markdown, no explanations.`;

        const result = await this.generate(jsonPrompt);

        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonText = result.content.trim();

            // Remove markdown code blocks if present
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/```\n?/g, '');
            }

            const parsed = JSON.parse(jsonText) as T;

            return {
                ...result,
                parsed,
            };
        } catch (error) {
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nResponse: ${result.content}`);
        }
    }

    /**
     * Add thinking level instructions to prompt
     */
    private addThinkingInstructions(prompt: string): string {
        if (this.config.thinkingLevel === 'none') {
            return prompt;
        }

        const thinkingInstructions = {
            level1: `Before answering, briefly consider the key factors (1-2 sentences of reasoning).`,
            level2: `Before answering, think deeply about:
1. What are the key variables and constraints?
2. What are the trade-offs?
3. What strategy would maximize the outcome?

Show your reasoning process, then provide your answer.`,
            level3: `You are an expert strategist. Before answering, engage in deep analytical thinking:
1. Break down the problem into components
2. Consider multiple perspectives and scenarios
3. Analyze trade-offs and second-order effects
4. Develop a strategic approach
5. Anticipate counter-arguments or edge cases

Provide your detailed reasoning chain, then your final recommendation.`,
        };

        const instruction = thinkingInstructions[this.config.thinkingLevel];
        return `${instruction}\n\n${prompt}`;
    }

    /**
     * Parse Gemini response
     */
    private parseResponse(result: GenerateContentResult): GeminiResponse {
        const response = result.response;
        const content = response.text();

        // Extract thinking process if present (usually in the beginning)
        let thinkingProcess: string | undefined;
        const thinkingMarkers = ['reasoning:', 'thinking:', 'analysis:'];

        for (const marker of thinkingMarkers) {
            const markerIndex = content.toLowerCase().indexOf(marker);
            if (markerIndex !== -1) {
                const nextSection = content.indexOf('\n\n', markerIndex);
                if (nextSection !== -1) {
                    thinkingProcess = content.substring(markerIndex, nextSection).trim();
                    break;
                }
            }
        }

        return {
            content,
            finishReason: response.candidates?.[0]?.finishReason || 'STOP',
            usageMetadata: response.usageMetadata ? {
                promptTokenCount: response.usageMetadata.promptTokenCount,
                candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
                totalTokenCount: response.usageMetadata.totalTokenCount,
            } : undefined,
            thinkingProcess,
        };
    }

    /**
     * Count tokens in text
     */
    async countTokens(text: string): Promise<number> {
        const result = await this.model.countTokens(text);
        return result.totalTokens;
    }

    /**
     * Change model or configuration
     */
    updateConfig(updates: Partial<GeminiClientConfig>) {
        this.config = { ...this.config, ...updates };

        if (updates.model) {
            this.model = this.client.getGenerativeModel({
                model: updates.model,
            });
        }
    }
}

/**
 * Factory function to create Gemini client from environment
 */
export function createGeminiClient(
    overrides?: Partial<GeminiClientConfig>
): GeminiClient {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY not found in environment');
    }

    return new GeminiClient({
        apiKey,
        ...overrides,
    });
}
