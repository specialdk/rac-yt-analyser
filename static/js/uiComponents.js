// UI Components and utilities
class UIComponents {
    constructor() {
        this.animationDuration = 300;
        this.notificationTimeout = 3000;
    }
    
    /**
     * Show/hide elements with smooth transitions
     */
    show(element, display = 'block') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.display = display;
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        // Force reflow
        element.offsetHeight;
        
        element.style.transition = `all ${this.animationDuration}ms ease`;
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }
    
    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.transition = `all ${this.animationDuration}ms ease`;
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, this.animationDuration);
    }
    
    /**
     * Fade transitions
     */
    fadeIn(element, duration = this.animationDuration) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '1';
        }, 10);
    }
    
    fadeOut(element, duration = this.animationDuration) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    }
    
    /**
     * Slide animations
     */
    slideDown(element, duration = this.animationDuration) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.display = 'block';
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms ease`;
        
        const height = element.scrollHeight;
        setTimeout(() => {
            element.style.height = height + 'px';
        }, 10);
        
        setTimeout(() => {
            element.style.height = 'auto';
            element.style.overflow = 'visible';
        }, duration);
    }
    
    slideUp(element, duration = this.animationDuration) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.style.height = element.scrollHeight + 'px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms ease`;
        
        setTimeout(() => {
            element.style.height = '0';
        }, 10);
        
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    }
    
    /**
     * Loading states
     */
    showLoading(element, text = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.classList.add('loading');
        element.disabled = true;
        
        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }
        
        element.innerHTML = `
            <span class="loading-spinner"></span>
            <span>${text}</span>
        `;
    }
    
    hideLoading(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.classList.remove('loading');
        element.disabled = false;
        
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    }
    
    /**
     * Progress indicators
     */
    updateProgress(progressBar, percentage) {
        if (typeof progressBar === 'string') {
            progressBar = document.getElementById(progressBar);
        }
        
        if (!progressBar) return;
        
        const fill = progressBar.querySelector('.progress-fill');
        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }
    
    /**
     * Form validation helpers
     */
    markFieldAsValid(field) {
        if (typeof field === 'string') {
            field = document.getElementById(field);
        }
        
        if (!field) return;
        
        field.classList.remove('error');
        field.classList.add('success');
        
        // Remove error message
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }
    
    markFieldAsError(field, message) {
        if (typeof field === 'string') {
            field = document.getElementById(field);
        }
        
        if (!field) return;
        
        field.classList.remove('success');
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        if (message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            errorDiv.style.color = '#ef4444';
            errorDiv.style.fontSize = '0.875rem';
            errorDiv.style.marginTop = '0.25rem';
            
            field.parentNode.appendChild(errorDiv);
        }
    }
    
    clearFieldValidation(field) {
        if (typeof field === 'string') {
            field = document.getElementById(field);
        }
        
        if (!field) return;
        
        field.classList.remove('error', 'success');
        
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }
    
    /**
     * Modal utilities
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modalId);
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideModal(modalId);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, this.animationDuration);
    }
    
    /**
     * Tooltip utilities
     */
    showTooltip(element, text, position = 'top') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        // Remove existing tooltip
        this.hideTooltip(element);
        
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip-popup tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #1f2937;
            color: white;
            padding: 0.5rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 5;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 5;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 5;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 5;
                break;
        }
        
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
        
        // Show tooltip
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);
        
        // Store reference for cleanup
        element._tooltip = tooltip;
    }
    
    hideTooltip(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element || !element._tooltip) return;
        
        element._tooltip.style.opacity = '0';
        
        setTimeout(() => {
            if (element._tooltip && element._tooltip.parentNode) {
                element._tooltip.parentNode.removeChild(element._tooltip);
            }
            delete element._tooltip;
        }, 200);
    }
    
    /**
     * Smooth scrolling
     */
    scrollTo(elementOrSelector, offset = 0) {
        let element;
        
        if (typeof elementOrSelector === 'string') {
            element = document.querySelector(elementOrSelector);
        } else {
            element = elementOrSelector;
        }
        
        if (!element) return;
        
        const targetPosition = element.offsetTop - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
    
    /**
     * Debounce utility
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle utility
     */
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    /**
     * Format numbers with commas
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    /**
     * Format file sizes
     */
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    }
    
    /**
     * Copy text to clipboard with fallback
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }
}

// Export for global use
window.UIComponents = UIComponents;

// Initialize global instance
window.ui = new UIComponents();
