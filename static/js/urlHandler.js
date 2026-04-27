// URL handling utilities
class URLHandler {
    constructor() {
        this.supportedDomains = [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be'
        ];
    }
    
    /**
     * Extract video ID from various YouTube URL formats
     * @param {string} url - The YouTube URL
     * @returns {string|null} - The video ID or null if invalid
     */
    extractVideoId(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }
        
        // Clean up the URL
        url = url.trim();
        
        // Check if it's already a video ID (11 characters)
        if (this.isValidVideoId(url)) {
            return url;
        }
        
        try {
            const urlObj = new URL(url);
            
            // Handle different URL formats
            switch (urlObj.hostname) {
                case 'youtube.com':
                case 'www.youtube.com':
                case 'm.youtube.com':
                    return this.extractFromYouTube(urlObj);
                
                case 'youtu.be':
                    return this.extractFromYouTuBe(urlObj);
                
                default:
                    return null;
            }
        } catch (error) {
            // If URL parsing fails, try regex patterns
            return this.extractWithRegex(url);
        }
    }
    
    /**
     * Extract video ID from standard YouTube URLs
     * @param {URL} urlObj - Parsed URL object
     * @returns {string|null} - Video ID or null
     */
    extractFromYouTube(urlObj) {
        // Standard watch URL: /watch?v=VIDEO_ID
        if (urlObj.pathname === '/watch') {
            return urlObj.searchParams.get('v');
        }
        
        // Embed URL: /embed/VIDEO_ID
        if (urlObj.pathname.startsWith('/embed/')) {
            const parts = urlObj.pathname.split('/');
            return parts[2] || null;
        }
        
        // Live URL: /live/VIDEO_ID
        if (urlObj.pathname.startsWith('/live/')) {
            const parts = urlObj.pathname.split('/');
            return parts[2] || null;
        }
        
        return null;
    }
    
    /**
     * Extract video ID from shortened YouTube URLs
     * @param {URL} urlObj - Parsed URL object
     * @returns {string|null} - Video ID or null
     */
    extractFromYouTuBe(urlObj) {
        // Format: youtu.be/VIDEO_ID
        const videoId = urlObj.pathname.substring(1); // Remove leading slash
        return this.isValidVideoId(videoId) ? videoId : null;
    }
    
    /**
     * Extract video ID using regex patterns as fallback
     * @param {string} url - The URL string
     * @returns {string|null} - Video ID or null
     */
    extractWithRegex(url) {
        const patterns = [
            // Standard YouTube URLs
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // YouTube URLs with additional parameters
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
            // Mobile YouTube URLs
            /m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    /**
     * Validate if a string is a valid YouTube video ID
     * @param {string} id - The ID to validate
     * @returns {boolean} - True if valid
     */
    isValidVideoId(id) {
        return typeof id === 'string' && 
               id.length === 11 && 
               /^[a-zA-Z0-9_-]+$/.test(id);
    }
    
    /**
     * Validate if a URL is from a supported YouTube domain
     * @param {string} url - The URL to validate
     * @returns {boolean} - True if from supported domain
     */
    isSupportedDomain(url) {
        try {
            const urlObj = new URL(url);
            return this.supportedDomains.includes(urlObj.hostname);
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Clean and normalize a YouTube URL
     * @param {string} url - The URL to clean
     * @returns {string|null} - Cleaned URL or null if invalid
     */
    normalizeUrl(url) {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return null;
        }
        
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    /**
     * Get various URL formats for a video ID
     * @param {string} videoId - The video ID
     * @returns {Object} - Object with different URL formats
     */
    getUrlFormats(videoId) {
        if (!this.isValidVideoId(videoId)) {
            return null;
        }
        
        return {
            watch: `https://www.youtube.com/watch?v=${videoId}`,
            embed: `https://www.youtube.com/embed/${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            shortUrl: `https://youtu.be/${videoId}`
        };
    }
    
    /**
     * Parse additional parameters from YouTube URLs
     * @param {string} url - The YouTube URL
     * @returns {Object} - Object with parsed parameters
     */
    parseUrlParameters(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            
            // Extract common parameters
            params.videoId = this.extractVideoId(url);
            params.startTime = urlObj.searchParams.get('t') || null;
            params.playlistId = urlObj.searchParams.get('list') || null;
            params.playlistIndex = urlObj.searchParams.get('index') || null;
            
            return params;
        } catch (error) {
            return { videoId: this.extractVideoId(url) };
        }
    }
    
    /**
     * Check if URL points to a YouTube playlist
     * @param {string} url - The URL to check
     * @returns {boolean} - True if it's a playlist URL
     */
    isPlaylistUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.has('list');
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if URL points to a YouTube channel
     * @param {string} url - The URL to check
     * @returns {boolean} - True if it's a channel URL
     */
    isChannelUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname.startsWith('/channel/') || 
                   urlObj.pathname.startsWith('/c/') ||
                   urlObj.pathname.startsWith('/@');
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get error message for invalid URLs
     * @param {string} url - The invalid URL
     * @returns {string} - Descriptive error message
     */
    getValidationError(url) {
        if (!url || !url.trim()) {
            return 'Please enter a YouTube URL';
        }
        
        if (this.isPlaylistUrl(url)) {
            return 'Playlist URLs are not supported. Please use a direct video URL.';
        }
        
        if (this.isChannelUrl(url)) {
            return 'Channel URLs are not supported. Please use a direct video URL.';
        }
        
        if (!this.isSupportedDomain(url)) {
            return 'Only YouTube URLs are supported (youtube.com, youtu.be).';
        }
        
        if (!this.extractVideoId(url)) {
            return 'Invalid YouTube URL format. Please check the URL and try again.';
        }
        
        return 'Invalid URL format';
    }
}

// Export for use in other modules
window.URLHandler = URLHandler;
