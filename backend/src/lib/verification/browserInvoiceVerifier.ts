/**
 * Browser-based Invoice Verification - Vibe Engineering Feature
 * 
 * Agent generates invoice PDF, then VERIFIES it via browser + Gemini Vision
 * Self-corrects and regenerates until perfect (max 3 attempts)
 */

import { chromium, Browser, Page } from 'playwright';
import { createGeminiVision } from '../gemini/vision.js';
import { createGeminiClient } from '../gemini/client.js';
import * as fs from 'fs';
import * as path from 'path';

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    creatorName: string;
    creatorGSTIN: string;
    brandName: string;
    brandAddress: string;
    amount: number;
    gstRate: number; // 0.18 for 18%
    description: string;
}

export interface VerificationResult {
    attempt: number;
    passed: boolean;
    errors: string[];
    warnings: string[];
    screenshotPath?: string;
    correctionsMade?: string[];
}

export class BrowserInvoiceVerifier {
    private browser: Browser | null = null;
    private maxAttempts: number = 3;

    async initialize() {
        this.browser = await chromium.launch({ headless: true });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Main workflow: Generate → Verify → Correct → Repeat
     */
    async generateAndVerifyInvoice(
        invoiceData: InvoiceData,
        opts: { logger?: { info?: Function; warn?: Function } } = {}
    ): Promise<{
        success: boolean;
        finalPDFPath?: string;
        verificationHistory: VerificationResult[];
    }> {
        if (!this.browser) {
            await this.initialize();
        }

        const verificationHistory: VerificationResult[] = [];
        let currentData = { ...invoiceData };

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            opts.logger?.info?.(`[Browser Verifier] Attempt ${attempt}/${this.maxAttempts}`);

            // Step 1: Generate PDF
            const pdfPath = await this.generateInvoicePDF(currentData, attempt);

            // Step 2: Open in browser and screenshot
            const screenshotPath = await this.screenshotPDF(pdfPath, attempt);

            // Step 3: Verify with Gemini Vision
            const verificationResult = await this.verifyWithVision(
                screenshotPath,
                currentData,
                attempt,
                opts
            );

            verificationHistory.push(verificationResult);

            if (verificationResult.passed) {
                opts.logger?.info?.('[Browser Verifier] ✓ Invoice passed verification!');
                return {
                    success: true,
                    finalPDFPath: pdfPath,
                    verificationHistory,
                };
            }

            // Step 4: Self-correct based on errors
            if (attempt < this.maxAttempts) {
                opts.logger?.warn?.('[Browser Verifier] Errors detected, correcting...', {
                    errors: verificationResult.errors,
                });
                currentData = await this.correctInvoiceData(
                    currentData,
                    verificationResult.errors,
                    opts
                );
            }
        }

        opts.logger?.warn?.('[Browser Verifier] ✗ Max attempts reached, verification failed');
        return {
            success: false,
            verificationHistory,
        };
    }

    /**
     * Generate invoice PDF using pdfkit
     */
    private async generateInvoicePDF(data: InvoiceData, attempt: number): Promise<string> {
        const PDFDocument = (await import('pdfkit')).default;
        const outputDir = path.join(process.cwd(), 'temp', 'invoices');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pdfPath = path.join(outputDir, `invoice_${data.invoiceNumber}_attempt${attempt}.pdf`);
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(pdfPath);

        doc.pipe(stream);

        // Header
        doc.fontSize(24).text('TAX INVOICE', { align: 'center' });
        doc.moveDown();

        // Invoice Details
        doc.fontSize(12);
        doc.text(`Invoice #: ${data.invoiceNumber}`);
        doc.text(`Date: ${data.date}`);
        doc.moveDown();

        // Seller Details
        doc.fontSize(14).text('From:', { underline: true });
        doc.fontSize(11).text(data.creatorName);
        doc.text(`GSTIN: ${data.creatorGSTIN}`);
        doc.moveDown();

        // Buyer Details
        doc.fontSize(14).text('To:', { underline: true });
        doc.fontSize(11).text(data.brandName);
        doc.text(data.brandAddress);
        doc.moveDown();

        // Line Items Table
        doc.fontSize(12).text('Description', 50, doc.y, { continued: true });
        doc.text('Amount', 400);
        doc.moveDown(0.5);

        doc.fontSize(10).text(data.description, 50, doc.y, { width: 330 });
        doc.text(`₹${data.amount.toFixed(2)}`, 400, doc.y - 20);
        doc.moveDown(2);

        // Calculations
        const gstAmount = data.amount * data.gstRate;
        const total = data.amount + gstAmount;

        doc.text(`Subtotal: ₹${data.amount.toFixed(2)}`, { align: 'right' });
        doc.text(`GST (${(data.gstRate * 100).toFixed(0)}%): ₹${gstAmount.toFixed(2)}`, { align: 'right' });
        doc.moveDown();
        doc.fontSize(14).text(`Total: ₹${total.toFixed(2)}`, { align: 'right' });

        // Footer
        doc.moveDown(3);
        doc.fontSize(10).text('Thank you for your business!', { align: 'center' });

        doc.end();

        return new Promise((resolve) => {
            stream.on('finish', () => resolve(pdfPath));
        });
    }

    /**
     * Open PDF in browser and take screenshot
     */
    private async screenshotPDF(pdfPath: string, attempt: number): Promise<string> {
        if (!this.browser) throw new Error('Browser not initialized');

        const page = await this.browser.newPage();
        await page.goto(`file://${pdfPath}`);
        await page.waitForTimeout(1000); // Let PDF render

        const screenshotDir = path.join(process.cwd(), 'temp', 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const screenshotPath = path.join(
            screenshotDir,
            `invoice_${path.basename(pdfPath, '.pdf')}_screenshot.png`
        );

        await page.screenshot({ path: screenshotPath, fullPage: true });
        await page.close();

        return screenshotPath;
    }

    /**
     * Verify screenshot using Gemini Vision
     */
    private async verifyWithVision(
        screenshotPath: string,
        expectedData: InvoiceData,
        attempt: number,
        opts: { logger?: { info?: Function; warn?: Function } } = {}
    ): Promise<VerificationResult> {
        const client = createGeminiClient();
        const vision = createGeminiVision(client);

        opts.logger?.info?.('[Gemini Vision] Analyzing invoice screenshot...');

        const result = await vision.verifyInvoicePDF(screenshotPath);

        const verificationResult: VerificationResult = {
            attempt,
            passed: result.isValid && result.errors.length === 0,
            errors: result.errors,
            warnings: result.warnings,
            screenshotPath,
        };

        return verificationResult;
    }

    /**
     * Self-correct invoice data based on errors
     */
    private async correctInvoiceData(
        currentData: InvoiceData,
        errors: string[],
        opts: { logger?: { info?: Function } } = {}
    ): Promise<InvoiceData> {
        const client = createGeminiClient({
            model: 'gemini-2.0-flash-exp',
            temperature: 0.1, // Precise corrections
        });

        const prompt = `You are correcting an invoice based on detected errors.

CURRENT INVOICE DATA:
${JSON.stringify(currentData, null, 2)}

ERRORS DETECTED:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Analyze each error and provide corrected invoice data.
Common fixes:
- GSTIN format should be: 22AAAAA0000A1Z5 (15 chars)
- GST calculation: GST amount = amount × gstRate, Total = amount + GST
- All required fields must be present

Return ONLY valid JSON with corrected invoice data matching InvoiceData shape.`;

        const response = await client.generateJSON<InvoiceData>(prompt);

        if (!response.parsed) {
            throw new Error('Failed to generate corrections');
        }

        opts.logger?.info?.('[Self-Correction] Applied fixes', {
            correctedFields: Object.keys(response.parsed),
        });

        return response.parsed;
    }
}

/**
 * Factory function
 */
export async function createInvoiceVerifier(): Promise<BrowserInvoiceVerifier> {
    const verifier = new BrowserInvoiceVerifier();
    await verifier.initialize();
    return verifier;
}
