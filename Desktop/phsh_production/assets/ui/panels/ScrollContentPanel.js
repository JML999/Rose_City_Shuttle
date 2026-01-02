window.ScrollContentPanel = {
    panel: null,
    isInitialized: false,
    containerId: null,
    currentPage: 0,
    totalPages: 2,
    pages: [],
    navigationCooldown: false,
    cooldownTime: 300, // 300ms cooldown between page changes

    initialize: function(containerId) {
        if (this.isInitialized) return;
        
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[SCROLL-CONTENT] Container not found:', containerId);
            return;
        }

        // Prepare scroll content - split into logical pages
        this.preparePages();

        // Create panel HTML - matching mobile leaderboard structure but taller
        container.innerHTML = `
            <div id="scroll-content-overlay" class="sc-overlay" style="display: none;">
                <div class="sc-content">
                    <div class="sc-header">
                        <h2>The Ancient Scroll</h2>
                        <button class="sc-close-button">×</button>
                    </div>
                    <div class="sc-body">
                        <div class="sc-scroll-container">
                            <!-- Pages will be dynamically generated -->
                        </div>
                        <div class="sc-pagination">
                            <button class="sc-page-arrow" id="sc-page-up">▲</button>
                            <div class="sc-page-info" id="sc-page-info">1/${this.totalPages}</div>
                            <button class="sc-page-arrow" id="sc-page-down">▼</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles matching mobile leaderboard aesthetic but optimized for readability
        const style = document.createElement('style');
        style.textContent = `
            .sc-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 2000;
                display: none;
                justify-content: center;
                align-items: center;
            }
            
            .sc-content {
                width: 95%;
                max-width: 500px;
                background-color: #1a2332;
                border: 3px solid #4a6491;
                border-radius: 4px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                max-height: 90vh;
                min-height: 70vh;
                display: flex;
                flex-direction: column;
                color: #e0e0e0;
                overflow: hidden;
            }
            
            .sc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: #2c3e50;
                border-bottom: 2px solid #4a6491;
                flex-shrink: 0;
            }
            
            .sc-header h2 {
                margin: 0;
                color: #85c1e9;
                font-size: 18px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .sc-close-button {
                background: transparent;
                border: none;
                color: #85c1e9;
                font-size: 24px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                padding: 0;
                font-weight: bold;
            }
            
            .sc-close-button:hover,
            .sc-close-button:active {
                color: #e74c3c;
                transform: scale(1.1);
            }
            
            .sc-body {
                display: flex;
                flex: 1;
                overflow: hidden;
                min-height: 0;
            }
            
            .sc-scroll-container {
                flex: 1;
                overflow: hidden;
                position: relative;
                background-color: #161b26;
            }
            
            .sc-page {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                padding: 25px 20px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                touch-action: pan-y;
                box-sizing: border-box;
            }
            
            .sc-scroll-text {
                font-size: 17px;
                line-height: 2;
                color: #e8d5a3;
                text-align: left;
                font-family: 'Georgia', serif;
                max-width: 100%;
            }
            
            .sc-scroll-text p {
                margin: 12px 0;
                text-indent: 0;
            }
            
            .sc-scroll-text p.opening-line {
                font-weight: bold;
                color: #d4af37;
                font-size: 18px;
                margin-bottom: 20px;
                text-indent: 0;
            }
            
            .sc-scroll-text p.body-text {
                margin: 16px 0;
                text-indent: 0;
            }
            
            .sc-hints-header {
                font-weight: bold;
                color: #d4af37;
                font-size: 19px;
                margin: 20px 0 15px 0;
                text-indent: 0;
            }
            
            .sc-clues {
                margin: 15px 0;
                padding-left: 0;
                list-style: none;
            }
            
            .sc-clues li {
                margin: 18px 0;
                padding-left: 30px;
                position: relative;
                line-height: 1.9;
            }
            
            .sc-clues li:before {
                content: "•";
                position: absolute;
                left: 8px;
                color: #d4af37;
                font-size: 22px;
                font-weight: bold;
            }
            
            .sc-clues li strong {
                color: #d4af37;
                font-size: 18px;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: block;
                margin-bottom: 4px;
            }
            
            .sc-signature {
                text-align: right;
                margin-top: 30px;
                padding-right: 10px;
                font-style: italic;
                color: #d4af37;
                font-size: 18px;
                text-indent: 0;
            }
            
            .sc-pagination {
                width: 50px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px 8px;
                background-color: #1a2332;
                border-left: 2px solid #4a6491;
                gap: 12px;
                flex-shrink: 0;
            }
            
            .sc-page-arrow {
                background: transparent;
                border: none;
                color: #85c1e9;
                font-size: 20px;
                width: 35px;
                height: 35px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                padding: 0;
                font-weight: bold;
            }
            
            .sc-page-arrow:hover,
            .sc-page-arrow:active {
                color: #4a90e2;
                transform: scale(1.1);
            }
            
            .sc-page-arrow:disabled {
                color: #3a4a5c;
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .sc-page-info {
                color: #85c1e9;
                font-size: 11px;
                font-weight: 700;
                text-align: center;
                writing-mode: vertical-rl;
                text-orientation: mixed;
            }
            
            /* Custom scrollbar */
            .sc-page::-webkit-scrollbar {
                width: 8px;
            }
            
            .sc-page::-webkit-scrollbar-track {
                background: rgba(30, 38, 50, 0.5);
                border-radius: 4px;
            }
            
            .sc-page::-webkit-scrollbar-thumb {
                background: #3a4a5c;
                border-radius: 4px;
            }
            
            .sc-page::-webkit-scrollbar-thumb:hover {
                background: #4a90e2;
            }
        `;

        document.head.appendChild(style);

        // Add event listeners
        container.querySelector('.sc-close-button').addEventListener('click', () => this.hide());
        
        // Page navigation
        const pageUpBtn = container.querySelector('#sc-page-up');
        const pageDownBtn = container.querySelector('#sc-page-down');
        
        pageUpBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        pageDownBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        
        // Touch support for arrows
        pageUpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.goToPage(this.currentPage - 1);
        });
        pageDownBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.goToPage(this.currentPage + 1);
        });

        this.panel = container;
        this.isInitialized = true;

        // Listen for server event to open this panel
        hytopia.onData((data) => {
            if (data && data.type === 'openScrollContent') {
                this.show();
            }
        });
    },

    preparePages: function() {
        // Define the scroll content in logical sections
        this.pages = [
            {
                content: `
                    <div class="sc-scroll-text">
                        <p class="opening-line">To the worthy soul that finds this:</p>
                        <p class="body-text">I've hidden my treasure, and the key to it has been broken into three pieces. Each piece is guarded by a test. Once you have all three, a final test awaits—to forge them together using the island's runic lifeforce.</p>
                        <p class="body-text">Find each piece, pass each test, and bring them back together. What was once whole shall be made whole again.</p>
                    </div>
                `
            },
            {
                content: `
                    <div class="sc-scroll-text">
                        <p class="sc-hints-header">The three tests be:</p>
                        <ul class="sc-clues">
                            <li><strong>Forge</strong> - A piece locked away by an ancient magnetic field, requiring a feat of forging or skilled wielding to break through</li>
                        </ul>
                    </div>
                `
            },
            {
                content: `
                    <div class="sc-scroll-text">
                        <ul class="sc-clues">
                            <li><strong>Mind</strong> - A piece hidden under the stars, revealed only to them what can read the celestial patterns above</li>
                        </ul>
                    </div>
                `
            },
            {
                content: `
                    <div class="sc-scroll-text">
                        <ul class="sc-clues">
                            <li><strong>Strength</strong> - A test of earth-moving strength, where only the mightiest can unlock the final piece</li>
                        </ul>
                        <p class="sc-signature">— The Cartographer</p>
                    </div>
                `
            }
        ];
        
        this.totalPages = this.pages.length;
    },

    renderPages: function() {
        const container = this.panel.querySelector('.sc-scroll-container');
        container.innerHTML = '';
        
        this.pages.forEach((page, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'sc-page';
            pageDiv.setAttribute('data-page', index);
            pageDiv.innerHTML = page.content;
            if (index !== 0) {
                pageDiv.style.display = 'none';
            }
            container.appendChild(pageDiv);
        });
    },

    goToPage: function(page) {
        if (page < 0 || page >= this.totalPages) return;
        
        // Cooldown check - prevent rapid clicking
        if (this.navigationCooldown) {
            return;
        }
        
        // Set cooldown
        this.navigationCooldown = true;
        setTimeout(() => {
            this.navigationCooldown = false;
        }, this.cooldownTime);
        
        this.currentPage = page;
        
        const container = this.panel.querySelector('.sc-scroll-container');
        const pages = container.querySelectorAll('.sc-page');
        const pageInfo = this.panel.querySelector('#sc-page-info');
        const pageUpBtn = this.panel.querySelector('#sc-page-up');
        const pageDownBtn = this.panel.querySelector('#sc-page-down');
        
        pages.forEach((pageDiv, index) => {
            if (index === page) {
                pageDiv.style.display = 'block';
            } else {
                pageDiv.style.display = 'none';
            }
        });
        
        pageInfo.textContent = `${page + 1}/${this.totalPages}`;
        pageUpBtn.disabled = (page === 0);
        pageDownBtn.disabled = (page === this.totalPages - 1);
    },

    hideMobileControls: function() {
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('break-button'),
            document.getElementById('mobile-movement-area'),
            document.getElementById('mobile-look-area'),
            document.getElementById('mobile-build-button'),
            document.getElementById('mobile-jump-button'),
            document.getElementById('mobile-cast-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-fishing-button'),
            document.getElementById('mobile-quest-button'),
            document.getElementById('mobile-break-button')
        ];
        
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = 'none';
            }
        });
    },

    showMobileControls: function() {
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('break-button'),
            document.getElementById('mobile-movement-area'),
            document.getElementById('mobile-look-area'),
            document.getElementById('mobile-build-button'),
            document.getElementById('mobile-jump-button'),
            document.getElementById('mobile-cast-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-fishing-button'),
            document.getElementById('mobile-quest-button'),
            document.getElementById('mobile-break-button')
        ];
        
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = '';
            }
        });
        
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = '';
            }
        });
    },

    show: function() {
        if (this.panel) {
            const overlay = this.panel.querySelector('.sc-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                this.panel.style.display = 'block';
                // Render pages
                this.renderPages();
                // Reset to page 1
                this.goToPage(0);
                // Disable player input
                hytopia.sendData({ type: 'disablePlayerInput' });
                // Hide mobile controls
                if (hytopia.isMobile) {
                    this.hideMobileControls();
                }
            }
        }
    },

    hide: function() {
        if (this.panel) {
            const overlay = this.panel.querySelector('.sc-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                this.panel.style.display = 'none';
                // Re-enable player input
                hytopia.sendData({ type: 'enablePlayerInput' });
                // Show mobile controls
                if (hytopia.isMobile) {
                    this.showMobileControls();
                }
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
               this.panel.querySelector('.sc-overlay') && 
               this.panel.querySelector('.sc-overlay').style.display === 'flex';
    }
};
