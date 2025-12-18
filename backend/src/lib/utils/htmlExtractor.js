/**
 * HTML to Plain Text Extractor
 * 
 * Converts HTML content to clean, readable plain text.
 * Handles Gmail and other email client HTML formatting.
 */

/**
 * Extracts plain text from HTML content
 * @param {string} html - HTML content to extract text from
 * @returns {string} - Clean plain text
 */
export function extractTextFromHtml(html) {
    if (!html || typeof html !== 'string') {
        return ''
    }

    // If it doesn't look like HTML, return as-is
    if (!html.includes('<') && !html.includes('&')) {
        return html.trim()
    }

    let cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+class="[^"]*"/gi, '')
        .replace(/\s+id="[^"]*"/gi, '')
        .replace(/\s+dir="[^"]*"/gi, '')
        .replace(/\s+style="[^"]*"/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<h[1-6][^>]*>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<tr[^>]*>/gi, '\n')
        .replace(/<\/td>/gi, ' ')
        .replace(/<td[^>]*>/gi, '')
        .replace(/<\/th>/gi, ' ')
        .replace(/<th[^>]*>/gi, '')
        .replace(/<[^>]+>/g, ' ')
    
    let text = cleanHtml
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&apos;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '--')
        .replace(/&#8230;/g, '...')
        .replace(/&hellip;/g, '...')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    
    text = text
        .replace(/\n\s*\n\s*\n+/g, '\n\n') 
        .replace(/[ \t]+/g, ' ')
        .replace(/^\s+|\s+$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .trim()
    
    return text
}

/**
 * Checks if a string contains HTML
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains HTML
 */
export function containsHtml(text) {
    if (!text || typeof text !== 'string') {
        return false
    }
    // Check for HTML tags or entities
    return /<[^>]+>/.test(text) || /&[#\w]+;/.test(text)
}

/**
 * Safely extracts text from HTML or returns text as-is if already plain text
 * @param {string} content - HTML or plain text content
 * @returns {string} - Clean plain text
 */
export function extractTextSafely(content) {
    if (!content || typeof content !== 'string') {
        return ''
    }
    
    if (containsHtml(content)) {
        return extractTextFromHtml(content)
    }
    
    return content.trim()
}


