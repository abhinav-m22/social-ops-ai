import { GeminiClient, MultimodalContent } from './client.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vision utilities for Gemini multimodal analysis
 */

export interface ImageAnalysisResult {
    description: string;
    detectedObjects?: string[];
    textContent?: string; // OCR result
    compliance?: {
        hasAdDisclosure: boolean;
        disclosureText?: string;
        issues?: string[];
    };
}

export interface PDFVerificationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fields: {
        gstinFormat: boolean;
        gstCalculation: boolean;
        requiredFields: boolean;
    };
    suggestions?: string[];
}

export class GeminiVision {
    private client: GeminiClient;

    constructor(client: GeminiClient) {
        this.client = client;
    }

    /**
     * Analyze image for general description and objects
     */
    async analyzeImage(imagePath: string, prompt?: string): Promise<ImageAnalysisResult> {
        const imageBuffer = fs.readFileSync(imagePath);
        const mimeType = this.getMimeType(imagePath);

        const defaultPrompt = prompt || `Analyze this image in detail. Describe what you see, identify key objects, and extract any visible text.`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: defaultPrompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateMultimodal(inputs);

        return {
            description: response.content,
        };
    }

    /**
     * Check social media post for ASCI compliance
     */
    async checkCompliance(imagePath: string): Promise<ImageAnalysisResult> {
        const imageBuffer = fs.readFileSync(imagePath);
        const mimeType = this.getMimeType(imagePath);

        const prompt = `You are a compliance checker for Indian ASCI guidelines.

Analyze this social media post image and check:
1. Is there an #Ad or #Sponsored disclosure visible?
2. Is the disclosure prominent (visible in first view)?
3. Extract the exact disclosure text
4. List any compliance issues

Return JSON:
{
  "hasAdDisclosure": boolean,
  "disclosureText": string or null,
  "isProminent": boolean,
  "issues": ["issue1", "issue2"]
}`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: prompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateJSON<{
            hasAdDisclosure: boolean;
            disclosureText?: string;
            isProminent: boolean;
            issues: string[];
        }>(JSON.stringify(inputs));

        return {
            description: response.content,
            compliance: {
                hasAdDisclosure: response.parsed?.hasAdDisclosure || false,
                disclosureText: response.parsed?.disclosureText,
                issues: response.parsed?.issues || [],
            },
        };
    }

    /**
     * Verify GST invoice PDF via screenshot analysis
     */
    async verifyInvoicePDF(screenshotPath: string): Promise<PDFVerificationResult> {
        const imageBuffer = fs.readFileSync(screenshotPath);
        const mimeType = this.getMimeType(screenshotPath);

        const prompt = `You are verifying a GST invoice PDF for an Indian creator.

Check for:
1. GSTIN format: Should be 22AAAAA0000A1Z5 (15 characters, specific pattern)
2. GST calculation: If amount is X, GST (18%) should be 0.18*X, Total = X + GST
3. Required fields: Invoice number, date, seller GSTIN, buyer details, itemized breakdown

Analyze this invoice screenshot and return JSON:
{
  "isValid": boolean,
  "errors": ["critical error 1", "critical error 2"],
  "warnings": ["minor issue 1"],
  "fields": {
    "gstinFormat": boolean,
    "gstCalculation": boolean,
    "requiredFields": boolean
  },
  "suggestions": ["fix 1", "fix 2"]
}`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: prompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateJSON<PDFVerificationResult>(
            JSON.stringify(inputs)
        );

        if (!response.parsed) {
            throw new Error('Failed to parse PDF verification response');
        }

        return response.parsed;
    }

    /**
     * Analyze competitor's Instagram grid
     */
    async analyzeCompetitorGrid(screenshotPath: string): Promise<{
        contentTypes: Record<string, number>; // e.g., { "reels": 70, "posts": 30 }
        postingFrequency: string;
        aestheticThemes: string[];
        insights: string[];
    }> {
        const imageBuffer = fs.readFileSync(screenshotPath);
        const mimeType = this.getMimeType(screenshotPath);

        const prompt = `Analyze this Instagram profile grid screenshot.

Identify:
1. Content type distribution (Reels vs Posts vs Carousels) - estimate percentages
2. Posting frequency patterns (daily, weekly, etc.)
3. Visual aesthetic themes (colors, style, branding)
4. Strategic insights (what's working, patterns)

Return JSON:
{
  "contentTypes": { "reels": 70, "posts": 20, "carousels": 10 },
  "postingFrequency": "3-4 posts per week",
  "aestheticThemes": ["minimalist", "blue color palette", "portrait style"],
  "insights": ["Heavy focus on Reels", "Consistent brand colors"]
}`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: prompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateJSON<{
            contentTypes: Record<string, number>;
            postingFrequency: string;
            aestheticThemes: string[];
            insights: string[];
        }>(JSON.stringify(inputs));

        if (!response.parsed) {
            throw new Error('Failed to parse competitor grid analysis');
        }

        return response.parsed;
    }

    /**
     * Extract text from image (OCR)
     */
    async extractText(imagePath: string): Promise<string> {
        const imageBuffer = fs.readFileSync(imagePath);
        const mimeType = this.getMimeType(imagePath);

        const prompt = `Extract all visible text from this image. Return the text exactly as it appears, preserving formatting where possible.`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: prompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateMultimodal(inputs);
        return response.content;
    }

    /**
     * Analyze brand deliverable (screenshot of posted content)
     */
    async analyzeDeliverable(
        screenshotPath: string,
        contractRequirements: {
            brandLogoRequired: boolean;
            productMustBeVisible: boolean;
            specificHashtags?: string[];
        }
    ): Promise<{
        compliant: boolean;
        findings: {
            brandLogoPresent?: boolean;
            productVisible?: boolean;
            hashtagsFound?: string[];
        };
        issues: string[];
    }> {
        const imageBuffer = fs.readFileSync(screenshotPath);
        const mimeType = this.getMimeType(screenshotPath);

        const prompt = `Analyze this brand deliverable screenshot against contract requirements:

Requirements:
- Brand logo required: ${contractRequirements.brandLogoRequired}
- Product must be visible: ${contractRequirements.productMustBeVisible}
${contractRequirements.specificHashtags ? `- Required hashtags: ${contractRequirements.specificHashtags.join(', ')}` : ''}

Check if deliverable meets all requirements.

Return JSON:
{
  "compliant": boolean,
  "findings": {
    "brandLogoPresent": boolean,
    "productVisible": boolean,
    "hashtagsFound": ["#hashtag1", "#hashtag2"]
  },
  "issues": ["Missing brand logo", "Product not clearly visible"]
}`;

        const inputs: MultimodalContent[] = [
            { type: 'text', content: prompt },
            { type: 'image', content: imageBuffer, mimeType },
        ];

        const response = await this.client.generateJSON<{
            compliant: boolean;
            findings: {
                brandLogoPresent?: boolean;
                productVisible?: boolean;
                hashtagsFound?: string[];
            };
            issues: string[];
        }>(JSON.stringify(inputs));

        if (!response.parsed) {
            throw new Error('Failed to parse deliverable analysis');
        }

        return response.parsed;
    }

    /**
     * Get MIME type from file extension
     */
    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };

        return mimeTypes[ext] || 'image/jpeg';
    }
}

/**
 * Factory function to create vision helper
 */
export function createGeminiVision(client: GeminiClient): GeminiVision {
    return new GeminiVision(client);
}
