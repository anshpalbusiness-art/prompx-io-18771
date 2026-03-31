// Website analyzer utility for extracting design information from URLs

export interface ScrapedWebsite {
    url: string;
    title: string;
    content: string;
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Ensures URL has protocol prefix
 */
export function normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

/**
 * Analyzes a website and extracts design information
 * Note: This is a simplified analysis that generates reasonable defaults
 * A full implementation would use screenshot analysis or backend parsing
 */
export async function analyzeWebsite(url: string): Promise<ScrapedWebsite> {
    // Normalize and validate URL
    const normalizedUrl = normalizeUrl(url);

    if (!isValidUrl(normalizedUrl)) {
        throw new Error('Invalid URL provided');
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';

    // 1. Scrape the website
    const scrapeRes = await fetch(`${backendUrl}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
    });

    if (!scrapeRes.ok) {
        throw new Error('Failed to analyze website content');
    }

    const scrapedData = await scrapeRes.json();
    return {
        url: normalizedUrl,
        title: scrapedData.title || 'Extracted Website',
        content: scrapedData.text || ''
    };
}


