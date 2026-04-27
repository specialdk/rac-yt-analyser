// Main application JavaScript
class YouTubeTranscriptAnalyzer {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentData = null;
        this.isProcessing = false;

        this.initializeElements();
        this.bindEvents();
        this.checkApiHealth();
    }

    initializeElements() {
        // Input elements
        this.urlInput = document.getElementById('youtube-url');
        this.analyzeBtn = document.getElementById('analyze-btn');
        this.btnText = this.analyzeBtn.querySelector('.btn-text');
        this.btnLoader = this.analyzeBtn.querySelector('.btn-loader');
        // Add these lines in initializeElements() with the other element references
        this.transcriptLengthSlider = document.getElementById('transcript-length-slider');
        this.transcriptLengthInput = document.getElementById('transcript-length-input');
        // Section elements
        this.progressSection = document.getElementById('progress-section');
        this.errorSection = document.getElementById('error-section');
        this.resultsSection = document.getElementById('results-section');
        // Save analysis elements
        this.saveAnalysisBtn = document.getElementById('save-analysis-btn');
        this.saveModal = document.getElementById('save-modal');
        this.saveModalClose = document.getElementById('save-modal-close');
        this.analysisCategory = document.getElementById('analysis-category');
        this.customCategory = document.getElementById('custom-category');
        this.saveCancelBtn = document.getElementById('save-cancel-btn');
        this.saveConfirmBtn = document.getElementById('save-confirm-btn');
        // Progress steps
        this.progressSteps = {
            step1: document.getElementById('step-1'),
            step2: document.getElementById('step-2'),
            step3: document.getElementById('step-3')
        };

        // Error elements
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');

        // Result elements
        this.videoTitle = document.getElementById('video-title');
        this.videoAuthor = document.getElementById('video-author');
        this.videoDate = document.getElementById('video-date');
        this.videoDuration = document.getElementById('video-duration');
        this.transcriptLanguage = document.getElementById('transcript-language');
        this.transcriptType = document.getElementById('transcript-type');
        this.wordCount = document.getElementById('word-count');
        this.summaryContent = document.getElementById('summary-content');
        this.bulletPoints = document.getElementById('bullet-points');
        this.transcriptContent = document.getElementById('transcript-content');

        // Action buttons
        this.newAnalysisBtn = document.getElementById('new-analysis-btn');
        this.copyAllBtn = document.getElementById('copy-all-btn');

        // Copy buttons
        this.copyButtons = document.querySelectorAll('.copy-btn');

        // Notification
        this.notification = document.getElementById('notification');
    }

    bindEvents() {
        // Main analyze button
        this.analyzeBtn.addEventListener('click', () => this.handleAnalyze());

        // Enter key on input
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAnalyze();
            }
        });
        // Transcript length controls sync
        this.transcriptLengthSlider.addEventListener('input', (e) => {
            this.transcriptLengthInput.value = e.target.value;
        });

        this.transcriptLengthInput.addEventListener('input', (e) => {
            this.transcriptLengthSlider.value = e.target.value;
        });
        // Input validation
        this.urlInput.addEventListener('input', () => this.validateInput());

        // Retry button
        this.retryBtn.addEventListener('click', () => this.handleAnalyze());

        // New analysis button
        this.newAnalysisBtn.addEventListener('click', () => this.resetApp());

        // Copy all button
        this.copyAllBtn.addEventListener('click', () => this.copyAllResults());

        // Individual copy buttons
        this.copyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const copyType = e.currentTarget.getAttribute('data-copy');
                this.copyToClipboard(copyType);
            });
        });
        // Save analysis functionality
        this.saveAnalysisBtn.addEventListener('click', () => this.showSaveModal());
        this.saveModalClose.addEventListener('click', () => this.hideSaveModal());
        this.saveCancelBtn.addEventListener('click', () => this.hideSaveModal());
        this.saveConfirmBtn.addEventListener('click', () => this.confirmSaveAnalysis());

        // Show custom category input when "Other" is selected
        this.analysisCategory.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                this.customCategory.style.display = 'block';
                this.customCategory.focus();
            } else {
                this.customCategory.style.display = 'none';
            }
        });

        // Close modal when clicking outside
        this.saveModal.addEventListener('click', (e) => {
            if (e.target === this.saveModal) {
                this.hideSaveModal();
            }
        });
    }

    async checkApiHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();

            if (!data.services.config_valid) {
                this.showNotification('API configuration warning: Some features may not work properly', 'warning');
            }
        } catch (error) {
            console.warn('Health check failed:', error);
        }
    }

    validateInput() {
        const url = this.urlInput.value.trim();
        const isValid = url && (
            url.includes('youtube.com/watch') ||
            url.includes('youtu.be/') ||
            url.includes('youtube.com/embed/') ||
            /^[a-zA-Z0-9_-]{11}$/.test(url)
        );

        if (url && !isValid) {
            this.urlInput.style.borderColor = '#ef4444';
        } else {
            this.urlInput.style.borderColor = '#e2e8f0';
        }

        return isValid;
    }

    async handleAnalyze() {
        if (this.isProcessing) return;

        const url = this.urlInput.value.trim();
        if (!url) {
            this.showNotification('Please enter a YouTube URL', 'error');
            this.urlInput.focus();
            return;
        }

        if (!this.validateInput()) {
            this.showNotification('Please enter a valid YouTube URL', 'error');
            this.urlInput.focus();
            return;
        }

        this.startProcessing();

        try {
            await this.analyzeVideo(url);
        } catch (error) {
            this.showError(error.message);
        }

        this.stopProcessing();
    }

    async analyzeVideo(url) {
        this.hideAllSections();
        this.showProgress();

        // Step 1: Start processing
        this.updateProgressStep(1, 'active');
        await this.delay(500);

        try {
            const transcriptLength = parseInt(this.transcriptLengthInput.value);

            const response = await fetch(`${this.apiBaseUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    transcript_length: transcriptLength
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze video');
            }

            // Step 2: Video processing
            this.updateProgressStep(1, 'completed');
            this.updateProgressStep(2, 'active');
            await this.delay(1000);

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            // Step 3: AI analysis
            this.updateProgressStep(2, 'completed');
            this.updateProgressStep(3, 'active');
            await this.delay(1500);

            this.updateProgressStep(3, 'completed');
            await this.delay(500);

            // Store data and show results
            this.currentData = data;
            this.originalUrl = url;  // Store URL separately

            this.displayResults(data);

        } catch (error) {
            throw error;
        }
    }

    startProcessing() {
        this.isProcessing = true;
        this.analyzeBtn.disabled = true;
        this.btnText.style.display = 'none';
        this.btnLoader.style.display = 'flex';
        this.urlInput.disabled = true;
    }

    stopProcessing() {
        this.isProcessing = false;
        this.analyzeBtn.disabled = false;
        this.btnText.style.display = 'block';
        this.btnLoader.style.display = 'none';
        this.urlInput.disabled = false;
    }

    hideAllSections() {
        this.progressSection.style.display = 'none';
        this.errorSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
    }

    showProgress() {
        this.hideAllSections();
        this.progressSection.style.display = 'block';
        this.resetProgressSteps();
    }

    showError(message) {
        this.hideAllSections();
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
    }

    showResults() {
        this.hideAllSections();
        this.resultsSection.style.display = 'block';
    }

    resetProgressSteps() {
        Object.values(this.progressSteps).forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    updateProgressStep(stepNumber, status) {
        const step = this.progressSteps[`step${stepNumber}`];
        if (step) {
            step.classList.remove('active', 'completed');
            if (status) {
                step.classList.add(status);
            }
        }
    }

    displayResults(data) {
        // Video metadata
        this.videoTitle.textContent = data.metadata.title;
        this.videoAuthor.textContent = data.metadata.author;
        this.videoDate.textContent = data.metadata.publish_date;
        this.videoDuration.textContent = data.metadata.duration;

        // Handle transcript info based on success
        if (data.transcript_success) {
            this.transcriptLanguage.textContent = `Language: ${data.transcript.language}`;
            this.transcriptType.textContent = data.transcript.is_generated ? 'Auto-generated' : 'Manual';
            this.wordCount.textContent = `${data.transcript.word_count} words`;

            // Full transcript
            this.transcriptContent.textContent = data.transcript.text;

            // Show transcript section
            const transcriptSection = document.getElementById('transcript-section');
            if (transcriptSection) {
                transcriptSection.style.display = 'block';
            }
        } else {
            // Handle transcript failure
            this.transcriptLanguage.textContent = 'Language: Unavailable';
            this.transcriptType.textContent = 'Transcript not available';
            this.wordCount.textContent = '0 words';

            // Show error message instead of transcript
            this.transcriptContent.innerHTML = `
                <div class="transcript-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-content">
                        <h4>Transcript Not Available</h4>
                        <p>${data.transcript.error_message || 'Unable to extract transcript from this video.'}</p>
                        ${data.transcript.attempts > 1 ? `<p class="retry-info">Attempted ${data.transcript.attempts} times with different methods.</p>` : ''}
                    </div>
                </div>
            `;

            // Hide transcript section or show with error styling
            const transcriptSection = document.getElementById('transcript-section');
            if (transcriptSection) {
                transcriptSection.style.display = 'block';
                transcriptSection.classList.add('transcript-error-section');
            }
        }

        // Analysis results
        this.summaryContent.textContent = data.analysis.summary;

        // Bullet points
        this.bulletPoints.innerHTML = '';
        data.analysis.bullet_points.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            this.bulletPoints.appendChild(li);
        });

        // Display warnings if any
        this.displayWarnings(data.warnings || []);

        this.showResults();

        // Show appropriate success message
        if (data.transcript_success) {
            this.showNotification('Analysis completed successfully!', 'success');
        } else {
            this.showNotification('Video metadata retrieved. Transcript extraction failed.', 'warning');
        }
    }

    displayWarnings(warnings) {
        // Remove any existing warning elements
        const existingWarnings = document.querySelectorAll('.warning-banner');
        existingWarnings.forEach(warning => warning.remove());

        if (warnings.length === 0) return;

        // Create warning banner for each warning
        warnings.forEach(warning => {
            const warningBanner = document.createElement('div');
            warningBanner.className = 'warning-banner';

            let warningIcon = '⚠️';
            let warningTitle = 'Warning';

            if (warning.type === 'transcript_failed') {
                warningTitle = 'Transcript Extraction Failed';
                warningIcon = '📝';
            } else if (warning.type === 'metadata_failed') {
                warningTitle = 'Video Information Unavailable';
                warningIcon = '📹';
            }

            warningBanner.innerHTML = `
                <div class="warning-content">
                    <div class="warning-header">
                        <span class="warning-icon">${warningIcon}</span>
                        <span class="warning-title">${warningTitle}</span>
                    </div>
                    <div class="warning-message">${warning.message}</div>
                    ${warning.details ? `<div class="warning-details">Error type: ${warning.details}</div>` : ''}
                </div>
            `;

            // Insert warning banner at the top of results section
            const resultsSection = document.getElementById('results-section');
            const firstChild = resultsSection.firstElementChild;
            resultsSection.insertBefore(warningBanner, firstChild);
        });
    }

    resetApp() {
        this.currentData = null;
        this.urlInput.value = '';
        this.urlInput.style.borderColor = '#e2e8f0';
        this.hideAllSections();
        this.urlInput.focus();
    }

    copyToClipboard(type) {
        if (!this.currentData) return;

        let textToCopy = '';

        switch (type) {
            case 'summary':
                textToCopy = this.currentData.analysis.summary;
                break;
            case 'bullets':
                textToCopy = this.currentData.analysis.bullet_points
                    .map((point, index) => `${index + 1}. ${point}`)
                    .join('\n');
                break;
            case 'transcript':
                textToCopy = this.currentData.transcript.text;
                break;
            default:
                return;
        }

        this.writeToClipboard(textToCopy, type);
    }

    copyAllResults() {
        if (!this.currentData) return;

        const data = this.currentData;
        const allText = `
YouTube URL: ${this.originalUrl || 'URL not available'}
Video: ${data.metadata.title}
Channel: ${data.metadata.author}
Date: ${data.metadata.publish_date}
Duration: ${data.metadata.duration}

SUMMARY:
${data.analysis.summary}

KEY POINTS:
${data.analysis.bullet_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}

FULL TRANSCRIPT:
${data.transcript.text}
        `.trim();

        this.writeToClipboard(allText, 'all results');
    }

    async writeToClipboard(text, type) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard!`, 'success');
            } catch (fallbackError) {
                this.showNotification('Failed to copy to clipboard', 'error');
            }

            document.body.removeChild(textArea);
        }
    }

    showNotification(message, type = 'success') {
        const messageElement = this.notification.querySelector('.notification-message');
        const iconElement = this.notification.querySelector('.notification-icon');

        messageElement.textContent = message;

        // Set icon and color based on type
        if (type === 'error') {
            iconElement.textContent = '⚠️';
            this.notification.className = 'notification error';
        } else if (type === 'warning') {
            iconElement.textContent = '⚠️';
            this.notification.className = 'notification warning';
        } else {
            iconElement.textContent = '✓';
            this.notification.className = 'notification';
        }

        // Show notification
        this.notification.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            this.notification.style.display = 'none';
        }, 3000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showSaveModal() {
        if (!this.currentData) {
            this.showNotification('No analysis to save', 'error');
            return;
        }

        // Reset form
        this.analysisCategory.value = '';
        this.customCategory.value = '';
        this.customCategory.style.display = 'none';

        // Show modal
        this.saveModal.style.display = 'flex';
    }

    hideSaveModal() {
        this.saveModal.style.display = 'none';
    }

    // Replace your confirmSaveAnalysis function with this improved version:
    async confirmSaveAnalysis() {
        if (!this.currentData) {
            this.showNotification('No analysis to save', 'error');
            return;
        }

        // Get category
        let category = this.analysisCategory.value;

        if (category === 'Other') {
            category = this.customCategory.value.trim();
            if (!category) {
                this.showNotification('Please enter a custom category', 'error');
                return;
            }
        }

        if (!category) {
            this.showNotification('Please select a category', 'error');
            return;
        }

        // Better URL capture - try multiple sources
        let youtubeUrl = null;

        // First try: stored originalUrl
        if (this.originalUrl && this.originalUrl.includes('youtu')) {
            youtubeUrl = this.originalUrl;
        }
        // Second try: current input value
        else if (this.urlInput.value.trim() && this.urlInput.value.trim().includes('youtu')) {
            youtubeUrl = this.urlInput.value.trim();
        }
        // Third try: extract from currentData if available
        else if (this.currentData && this.currentData.metadata && this.currentData.metadata.video_id) {
            youtubeUrl = `https://youtu.be/${this.currentData.metadata.video_id}`;
        }

        // Debug logging
        console.log('URL Debug:', {
            originalUrl: this.originalUrl,
            inputValue: this.urlInput.value,
            finalUrl: youtubeUrl,
            videoId: this.currentData?.metadata?.video_id
        });

        // Disable save button
        this.saveConfirmBtn.disabled = true;
        this.saveConfirmBtn.textContent = 'Saving...';

        try {
            const response = await fetch(`${this.apiBaseUrl}/save-analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_data: this.currentData,
                    category: category,
                    youtube_url: youtubeUrl || 'URL not captured'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Analysis saved successfully!', 'success');
                this.hideSaveModal();
            } else {
                throw new Error(result.error || 'Failed to save analysis');
            }

        } catch (error) {
            console.error('Save error:', error);
            this.showNotification(`Failed to save: ${error.message}`, 'error');
        } finally {
            // Re-enable save button
            this.saveConfirmBtn.disabled = false;
            this.saveConfirmBtn.textContent = 'Save Analysis';
        }

    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeTranscriptAnalyzer();
});

// Handle any uncaught errors
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// ============================================
// TAB NAVIGATION AND BROWSE FUNCTIONALITY
// ============================================

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function () {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');

            // Load saved analyses when browse tab is clicked
            if (tabName === 'browse') {
                loadSavedAnalyses();
            }
        });
    });

    // Search functionality
    document.getElementById('search-btn').addEventListener('click', performSearch);
    document.getElementById('search-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Category filter
    document.getElementById('category-filter').addEventListener('change', performSearch);
});

// Load saved analyses from the database
async function loadSavedAnalyses() {
    const browseLoading = document.getElementById('browse-loading');
    const savedAnalysesList = document.getElementById('saved-analyses-list');
    const noResults = document.getElementById('no-results');

    browseLoading.style.display = 'block';
    savedAnalysesList.innerHTML = '';
    noResults.style.display = 'none';

    try {
        const response = await fetch('/api/saved-analyses');
        const data = await response.json();

        browseLoading.style.display = 'none';

        if (data.success && data.analyses && data.analyses.length > 0) {
            displayAnalyses(data.analyses);
        } else {
            noResults.style.display = 'block';
            console.log('No saved analyses found:', data);
        }
    } catch (error) {
        browseLoading.style.display = 'none';
        console.error('Error loading saved analyses:', error);
        savedAnalysesList.innerHTML = '<p style="color: red; text-align: center;">Error loading saved analyses. Please try again.</p>';
    }
}

// Updated displayAnalyses function with View Summary and View Full buttons
function displayAnalyses(analyses) {
    const savedAnalysesList = document.getElementById('saved-analyses-list');

    savedAnalysesList.innerHTML = analyses.map(analysis => {
        const createdDate = new Date(analysis.created_at).toLocaleDateString();
        const createdTime = new Date(analysis.created_at).toLocaleTimeString();

        return `
            <div class="analysis-card" data-category="${analysis.category || ''}" data-title="${analysis.title || ''}" data-summary="${analysis.summary || ''}" data-id="${analysis.id}">
                <div class="card-content">
                    <h3>${analysis.title || 'Untitled Analysis'}</h3>
                    <a href="${analysis.youtube_url || '#'}" target="_blank" class="video-url">${analysis.youtube_url || 'URL not available'}</a>
                    <div class="category">${analysis.category || 'Uncategorized'}</div>
                    <div class="summary">${truncateText(analysis.summary || '', 200)}</div>
                    <div class="timestamp">Saved on ${createdDate} at ${createdTime}</div>
                    <div class="actions">
                        <button class="btn-view-summary" onclick="viewSummary(${analysis.id})">View Summary</button>
                        <button class="btn-view-full" onclick="viewFullAnalysis(${analysis.id})">View Full</button>
                        <button class="btn-delete" onclick="deleteAnalysis(${analysis.id})">Delete</button>
                    </div>
                </div>
                
                <!-- Expanded Content (hidden by default) -->
                <div class="expanded-content" id="expanded-${analysis.id}" style="display: none;">
                    <div class="expanded-header">
                        <h4 class="expanded-title">Complete Analysis</h4>
                        <button class="btn-close-expansion" onclick="closeExpansion(${analysis.id})">Close</button>
                    </div>
                    <div class="expanded-body" id="expanded-body-${analysis.id}">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// View Summary - shows full summary and bullet points
async function viewSummary(analysisId) {
    try {
        // Hide other expanded content
        closeAllExpansions();

        // Get the analysis data
        const analysisData = await fetchAnalysisDetails(analysisId);

        if (!analysisData) {
            alert('Could not load analysis details');
            return;
        }

        const expandedBody = document.getElementById(`expanded-body-${analysisId}`);
        expandedBody.innerHTML = `
            <div class="summary-section">
                <h5>Complete Summary</h5>
                <div class="full-summary">${analysisData.summary || 'Summary not available'}</div>
            </div>
            
            <div class="bullets-section">
                <h5>Key Points</h5>
                <ul class="full-bullet-points">
                    ${(analysisData.bullet_points || []).map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
            
            <div class="metadata-section">
                <h5>Video Information</h5>
                <div class="metadata-grid">
                    <div><strong>Channel:</strong> ${analysisData.author || 'Unknown'}</div>
                    <div><strong>Duration:</strong> ${analysisData.duration || 'Unknown'}</div>
                    <div><strong>Published:</strong> ${analysisData.publish_date || 'Unknown'}</div>
                </div>
            </div>
        `;

        // Show the expanded content
        document.getElementById(`expanded-${analysisId}`).style.display = 'block';

        // Scroll to the expanded content
        document.getElementById(`expanded-${analysisId}`).scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });

    } catch (error) {
        console.error('Error loading summary:', error);
        alert('Error loading analysis summary. Please try again.');
    }
}

// View Full - shows everything including transcript
async function viewFullAnalysis(analysisId) {
    try {
        // Hide other expanded content
        closeAllExpansions();

        // Get the analysis data
        const analysisData = await fetchAnalysisDetails(analysisId);

        if (!analysisData) {
            alert('Could not load analysis details');
            return;
        }

        const expandedBody = document.getElementById(`expanded-body-${analysisId}`);
        expandedBody.innerHTML = `
            <div class="summary-section">
                <h5>Complete Summary</h5>
                <div class="full-summary">${analysisData.summary || 'Summary not available'}</div>
            </div>
            
            <div class="bullets-section">
                <h5>Key Points</h5>
                <ul class="full-bullet-points">
                    ${(analysisData.bullet_points || []).map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
            
            <div class="metadata-section">
                <h5>Video Information</h5>
                <div class="metadata-grid">
                    <div><strong>Channel:</strong> ${analysisData.author || 'Unknown'}</div>
                    <div><strong>Duration:</strong> ${analysisData.duration || 'Unknown'}</div>
                    <div><strong>Published:</strong> ${analysisData.publish_date || 'Unknown'}</div>
                    <div><strong>Word Count:</strong> ${analysisData.word_count || 'Unknown'}</div>
                </div>
            </div>
            
            <div class="transcript-section">
                <h5>Full Transcript</h5>
                <div class="full-transcript">
                    ${analysisData.transcript_text || 'Transcript not available'}
                </div>
            </div>
        `;

        // Show the expanded content
        document.getElementById(`expanded-${analysisId}`).style.display = 'block';

        // Scroll to the expanded content
        document.getElementById(`expanded-${analysisId}`).scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });

    } catch (error) {
        console.error('Error loading full analysis:', error);
        alert('Error loading full analysis. Please try again.');
    }
}


// Replace the fetchAnalysisDetails function with this fixed version:
async function fetchAnalysisDetails(analysisId) {
    try {
        const response = await fetch('/api/saved-analyses');
        const data = await response.json();

        if (data.success && data.analyses) {
            const analysis = data.analyses.find(a => a.id == analysisId);
            if (analysis) {
                // Handle bullet_points as text instead of JSON
                let bulletPoints = [];
                if (analysis.bullet_points) {
                    // If it's a string with numbered points, split it into array
                    if (typeof analysis.bullet_points === 'string') {
                        // Split by lines and clean up
                        bulletPoints = analysis.bullet_points
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                            .map(line => {
                                // Remove leading numbers/bullets if present
                                return line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').replace(/^•\s*/, '');
                            })
                            .filter(line => line.length > 0);
                    } else {
                        // If it's already an array
                        bulletPoints = analysis.bullet_points;
                    }
                }

                return {
                    summary: analysis.summary || 'Summary not available',
                    bullet_points: bulletPoints,
                    author: analysis.author || 'Unknown',
                    duration: analysis.duration || 'Unknown',
                    publish_date: analysis.publish_date || 'Unknown',
                    word_count: analysis.word_count || 'Unknown',
                    transcript_text: analysis.transcript_text || 'Transcript not available'
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching analysis details:', error);
        return null;
    }
}

// Close expansion
function closeExpansion(analysisId) {
    document.getElementById(`expanded-${analysisId}`).style.display = 'none';
}

// Close all expansions
function closeAllExpansions() {
    const allExpanded = document.querySelectorAll('.expanded-content');
    allExpanded.forEach(element => {
        element.style.display = 'none';
    });
}

// Truncate text for display
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Enhanced search to work with expanded content
function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const analysisCards = document.querySelectorAll('.analysis-card');
    let visibleCount = 0;

    // Close all expansions when searching
    closeAllExpansions();

    analysisCards.forEach(card => {
        const title = card.getAttribute('data-title').toLowerCase();
        const summary = card.getAttribute('data-summary').toLowerCase();
        const category = card.getAttribute('data-category');

        const matchesSearch = !searchTerm || title.includes(searchTerm) || summary.includes(searchTerm);
        const matchesCategory = !categoryFilter || category === categoryFilter;

        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide no results message
    const noResults = document.getElementById('no-results');
    if (visibleCount === 0 && analysisCards.length > 0) {
        noResults.style.display = 'block';
        noResults.innerHTML = '<p>No analyses match your search criteria.</p>';
    } else {
        noResults.style.display = 'none';
    }
}

// Delete analysis
async function deleteAnalysis(analysisId) {
    if (!confirm('Are you sure you want to delete this analysis?')) {
        return;
    }

    try {
        const response = await fetch('/api/delete-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ analysis_id: analysisId })
        });

        const data = await response.json();

        if (data.success) {
            // Remove the card from the display
            const cardToRemove = document.querySelector(`[onclick="deleteAnalysis(${analysisId})"]`).closest('.analysis-card');
            cardToRemove.remove();

            // Check if no cards left
            const remainingCards = document.querySelectorAll('.analysis-card');
            if (remainingCards.length === 0) {
                document.getElementById('no-results').style.display = 'block';
                document.getElementById('no-results').innerHTML = '<p>No saved analyses found. Start by analyzing some videos!</p>';
            }
        } else {
            alert('Error deleting analysis: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting analysis:', error);
        alert('Error deleting analysis. Please try again.');
    }
}