window.FitzNotePanel = {
    panel: null,
    isInitialized: false,
    containerId: null,

    initialize: function(containerId) {
        if (this.isInitialized) return;
        
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[FITZ-NOTE] Container not found:', containerId);
            return;
        }

        // Create panel HTML
        container.innerHTML = `
            <div id="fitz-note-overlay" class="fn-overlay" style="display: none;">
                <div class="fn-content">
                    <div class="fn-header">
                        <h2>A Torn Note</h2>
                        <button class="fn-close-button">×</button>
                    </div>
                    <div class="fn-body">
                        <div class="fn-note-text">
                            Got to this one first, ole sport.
                        </div>
                        <div class="fn-signature">—Fitz</div>
                    </div>
                    <div class="fn-footer">
                        <button class="fn-button" id="fitz-note-find-button">Find Fitz</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .fn-overlay {
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
                z-index: 2000;
            }
            
            .fn-content {
                background: rgba(22, 28, 36, 0.95);
                border: 2px solid #d4af37;
                border-radius: 12px;
                padding: 30px;
                width: 500px;
                max-width: 90vw;
                color: white;
                font-family: 'Arial', sans-serif;
                box-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
            }

            .fn-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                border-bottom: 2px solid #d4af37;
                padding-bottom: 15px;
            }

            .fn-header h2 {
                margin: 0;
                color: #d4af37;
                font-size: 24px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-family: 'Georgia', serif;
            }

            .fn-close-button {
                background: none;
                border: none;
                color: #d4af37;
                font-size: 32px;
                cursor: pointer;
                padding: 0 5px;
                transition: all 0.2s ease;
                line-height: 1;
            }

            .fn-close-button:hover {
                color: white;
                transform: scale(1.1);
            }

            .fn-body {
                margin-bottom: 25px;
                text-align: center;
                padding: 20px 0;
            }

            .fn-note-text {
                font-size: 20px;
                line-height: 1.6;
                color: #e0e0e0;
                font-style: italic;
                margin-bottom: 15px;
                font-family: 'Georgia', serif;
            }

            .fn-signature {
                font-size: 18px;
                color: #d4af37;
                font-weight: bold;
                text-align: right;
                margin-top: 20px;
                padding-right: 20px;
            }
            
            .fn-footer {
                text-align: center;
                padding-top: 15px;
                border-top: 1px solid rgba(212, 175, 55, 0.3);
            }
            
            .fn-button {
                background: #d4af37;
                color: #1a1a1a;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .fn-button:hover {
                background: #f4d03f;
                transform: scale(1.05);
            }

            .fn-button:active {
                transform: scale(0.98);
            }

            /* Responsive adjustments */
            @media (max-width: 600px) {
                .fn-content {
                    width: 95vw;
                    padding: 20px;
                }
                
                .fn-note-text {
                    font-size: 18px;
                }
            }
        `;

        document.head.appendChild(style);

        // Add event listeners
        container.querySelector('.fn-close-button').addEventListener('click', () => this.hide());
        container.querySelector('#fitz-note-find-button').addEventListener('click', () => {
            this.hide();
            // Notify server that player wants to find Fitz
            hytopia.sendData({
                type: 'fitzNoteFindFitz'
            });
        });

        this.panel = container;
        this.isInitialized = true;
        console.log('[FITZ-NOTE] Initialized');

        // Listen for server event to open this panel
        hytopia.onData((data) => {
            if (data && data.type === 'openFitzNote') {
                this.show();
            }
        });
    },

    show: function() {
        console.log('[FITZ-NOTE] Show called');
        if (this.panel) {
            const overlay = this.panel.querySelector('.fn-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                this.panel.style.display = 'block';
            }
        }
    },

    hide: function() {
        console.log('[FITZ-NOTE] Hide called');
        if (this.panel) {
            const overlay = this.panel.querySelector('.fn-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                this.panel.style.display = 'none';
            }
        }
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

    isShowing: function() {
        return this.panel && 
               this.panel.querySelector('.fn-overlay') && 
               this.panel.querySelector('.fn-overlay').style.display === 'flex';
    }
};

console.log('[FITZ-NOTE] Script loaded');

