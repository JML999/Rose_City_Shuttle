window.QuickTutorialPanel = {
    panel: null,
    isInitialized: false,
    containerId: null,

    initialize: function(containerId) {
        if (this.isInitialized) return;
        
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[QUICK-TUTORIAL] Container not found:', containerId);
            return;
        }

        // Create panel HTML
        container.innerHTML = `
            <div id="quick-tutorial-overlay" class="qt-overlay" style="display: none;">
                <div class="qt-content">
                    <div class="qt-header">
                        <h2>Quick Fishing Guide</h2>
                        <button class="qt-close-button">×</button>
                    </div>
                    <div class="qt-body">
                        <div class="qt-step-grid">
                            <div class="qt-step">
                                <div class="qt-step-icon">Step 1: Casting</div>
                                <div class="qt-step-title">Cast Your Line</div>
                                <div class="qt-step-text">Begin your cast by clicking the right mouse button. Time the meter at the top to get the farthest distance.</div>
                            </div>
                            <div class="qt-step">
                                <div class="qt-step-icon">Step 2: Jigging</div>
                                <div class="qt-step-title">Lure the fish</div>
                                <div class="qt-step-text">Once your line is in the water, TAP 'Q' to jig your line.  Keep your jig around the center for your best chance of luring a fish.</div>
                            </div>
                            <div class="qt-step">
                                <div class="qt-step-icon">Step 3: Reeling</div>
                                <div class="qt-step-title">Reel It In</div>
                                <div class="qt-step-text">When you get a bite, HOLD Q to move your white catch meter to the right. Let go, and it will move left.  Trapping the yellow fish line in the bar fills your progres meter. Once its full, you caught your fish!</div>
                            </div>
                        </div>
                    </div>
                    <div class="qt-footer">
                        <div class="qt-key-tip">Press <span class="qt-key">T</span> to toggle this guide</div>
                    </div>
                </div>
            </div>
        `;

        // Add styles with unique class names to avoid conflicts
        const style = document.createElement('style');
        style.textContent = `
            .qt-overlay {
                position: fixed;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .qt-content {
                background: rgba(22, 28, 36, 0.95);
                border: 2px solid #4a90e2;
                border-radius: 12px;
                padding: 25px;
                width: 1000px;
                max-width: 900vw;
                color: white;
                font-family: 'Arial', sans-serif;
                box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
            }

            .qt-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #4a90e2;
                padding-bottom: 15px;
            }

            .qt-header h2 {
                margin: 0;
                color: #4a90e2;
                font-size: 24px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .qt-close-button {
                background: none;
                border: none;
                color: #4a90e2;
                font-size: 28px;
                cursor: pointer;
                padding: 0 5px;
                transition: all 0.2s ease;
            }

            .qt-close-button:hover {
                color: white;
                transform: scale(1.1);
            }

            .qt-body {
                margin-bottom: 20px;
            }

            .qt-step-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }

            .qt-step {
                background: rgba(74, 144, 226, 0.1);
                width: 250px;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: all 0.2s ease;
                border-bottom: 3px solid #4a90e2;
            }
            
            .qt-step:hover {
                background: rgba(74, 144, 226, 0.2);
                transform: translateY(-5px);
            }

            .qt-step-icon {
                font-size: 32px;
                margin-bottom: 10px;
            }

            .qt-step-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 8px;
                color: #4a90e2;
            }

            .qt-step-text {
                font-size: 14px;
                line-height: 1.4;
                color: #e0e0e0;
            }
            
            .qt-footer {
                text-align: center;
                font-size: 14px;
                color: #999;
                padding-top: 15px;
                border-top: 1px solid rgba(74, 144, 226, 0.3);
            }
            
            .qt-key-tip {
                display: inline-block;
            }
            
            .qt-key {
                display: inline-block;
                background: #4a90e2;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: bold;
                margin: 0 3px;
            }

            /* Responsive adjustments */
            @media (max-width: 600px) {
                .qt-step-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);

        // Add event listeners
        container.querySelector('.qt-close-button').addEventListener('click', () => this.hide());
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'h') {
                this.toggle();
            }
        });

        this.panel = container;
        this.isInitialized = true;
    },

    toggle: function() {
        if (!this.isInitialized) {
            this.initialize(this.containerId);
        }
        
        if (this.isShowing()) {
            this.hide();
        } else {
            this.show();
        }
    },

    show: function() {
        if (this.panel) {
            const overlay = this.panel.querySelector('.qt-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                this.panel.style.display = 'block';
            }
        }
    },

    hide: function() {
        if (this.panel) {
            const overlay = this.panel.querySelector('.qt-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                this.panel.style.display = 'none';
            }
        }
    },

    isShowing: function() {
        return this.panel && 
               this.panel.querySelector('.qt-overlay') && 
               this.panel.querySelector('.qt-overlay').style.display === 'flex';
    }
};

console.log('[QUICK-TUTORIAL] Script loaded');
