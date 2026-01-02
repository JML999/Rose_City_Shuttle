class MerchantPanel {
    constructor() {
        this.container = null;
        this.isMerchantDialogOpen = false;
        this.optionButtonsContainer = null;
        this.playerId = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        this.playerId = null;
        
        // Listen for player ID from server
        hytopia.onData((data) => {
            if (data.type === 'playerIdentity') {
                this.playerId = data.playerId;
        
            }
        });
        
        // Create template first
        const template = document.createElement('template');
        template.id = 'merchant-dialog-template';
        template.innerHTML = `
            <div class="merchant-dialog">
                <h3 class="merchant-name"></h3>
                <div class="merchant-prompt"></div>
                <div class="options"></div>
            </div>
        `;
        this.container.appendChild(template);

        // Create a container for option buttons that go across the screen
        if (!document.getElementById('merchant-option-buttons')) {
            this.optionButtonsContainer = document.createElement('div');
            this.optionButtonsContainer.id = 'merchant-option-buttons';
            this.optionButtonsContainer.style.display = 'none';
            document.body.appendChild(this.optionButtonsContainer);
            
        } else {
            this.optionButtonsContainer = document.getElementById('merchant-option-buttons');
        }

        // Register the scene UI template
        hytopia.registerSceneUITemplate('merchant-dialog', (id, onState, entityAttachedTo) => {

            const template = document.getElementById('merchant-dialog-template');
            const clone = template.content.cloneNode(true);
            const optionsContainer = clone.querySelector('.options');
            const promptContainer = clone.querySelector('.merchant-prompt');
            const nameContainer = clone.querySelector('.merchant-name');
        
            onState(state => {

                // We assume the Hytopia SDK + server code ensures this state is only sent to the target player.
                // Therefore, we proceed directly with updating the UI.
                
                // Update name - Use state.name or fallback
                if (nameContainer) {
                    nameContainer.textContent = state.name || 'Townsperson';
                }
                
                // Update prompt
                if (state.message) {
                    promptContainer.textContent = state.message;
                    promptContainer.style.display = 'block';
                } else {
                    promptContainer.style.display = 'none';
                }
                
                // Update options
                optionsContainer.innerHTML = '';
                state.options.forEach((option, index) => {
                    const div = document.createElement('div');
                    div.textContent = `[${index + 1}] ${option}`;
                    optionsContainer.appendChild(div);
                });

                // Update the center screen option buttons only for the target player
                if (state.targetPlayerId === this.playerId) {
                    this.updateOptionButtons(state.options);
                    
                    // This dialog is for us, so set our interaction state
                    this.isMerchantDialogOpen = true;
                }
            });
            
            return clone;
        });


        this.setupEventListeners();
        this.addStyles();
    }

    updateOptionButtons(options) {
        // Clear previous buttons
        this.optionButtonsContainer.innerHTML = '';
        
        // Check if we're on mobile
        const isMobile = hytopia.isMobile || document.body.classList.contains('mobile');
        
        // Don't show buttons on desktop or if there are no options
        if (!isMobile || !options || options.length === 0) {
            this.optionButtonsContainer.style.display = 'none';
            return;
        }
        
        // Show the container
        this.optionButtonsContainer.style.display = 'flex';
        
        // Add buttons for each option (up to 3)
        const maxButtons = Math.min(options.length, 3);
        for (let i = 0; i < maxButtons; i++) {
            const button = document.createElement('button');
            button.className = 'merchant-center-button';
            button.textContent = (i + 1).toString();
            button.dataset.index = i;
            
            // Click handler - simulate pressing the number key
            button.addEventListener('click', () => {
                // Simulate pressing the corresponding number key (1-3)
                const keyNumber = i + 1;
                hytopia.pressInput(keyNumber.toString(), true);
                
                // Release key after a short delay
                setTimeout(() => {
                    hytopia.pressInput(keyNumber.toString(), false);
                }, 100);
                
            });
            
            // Touch handler for mobile - same approach
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                
                // Simulate pressing the corresponding number key (1-3)
                const keyNumber = i + 1;
                hytopia.pressInput(keyNumber.toString(), true);
                
                // Release key after a short delay
                setTimeout(() => {
                    hytopia.pressInput(keyNumber.toString(), false);
                }, 100);
                
            });
            
            this.optionButtonsContainer.appendChild(button);
        }
    }

    setupEventListeners() {
        hytopia.onData((data) => {
            if (data.type === 'showMerchantDialog') {
                this.isMerchantDialogOpen = true;
                
                // Check if we're on mobile - be very explicit about it
                const isMobile = hytopia.isMobile || 
                                document.body.classList.contains('mobile') || 
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                
                // Show the option buttons if on mobile
                if (this.optionButtonsContainer && isMobile) {
                    this.optionButtonsContainer.style.display = 'flex';
                    
                    // Make sure the buttons have the right styling
                    const buttons = this.optionButtonsContainer.querySelectorAll('.merchant-center-button');
                    if (buttons.length === 0) {
                        // If no buttons exist, create them
                        this.createMobileOptionButtons();
                    }
                } 
                
                // Hide chat window when merchant dialog is opened
                this.hideChatWindow(true);
            } else if (data.type === 'hideMerchantDialog') {
                const menu = document.getElementById('merchant-dialog');
                if (menu) {
                    menu.style.display = 'none';
                    menu.style.pointerEvents = 'none';
                }
                this.isMerchantDialogOpen = false;
                document.querySelector('.merchant-dialog')?.remove();
                
                // Hide the option buttons
                if (this.optionButtonsContainer) {
                    this.optionButtonsContainer.style.display = 'none';
                }
                
                // Show chat window again when merchant dialog is closed
                this.hideChatWindow(false);
            } else if (data.type === 'merchantSpeak') {
                const dialog = document.querySelector('.merchant-dialog');
                if (dialog) {
                    const prompt = dialog.querySelector('.merchant-prompt');
                    if (prompt) {
                        prompt.textContent = data.message;
                        prompt.style.display = 'block';
                    }
                }
            }
        });
        
        // Handle number key presses for merchant options
        document.addEventListener('keydown', (e) => {
            if (!this.isMerchantDialogOpen) return;
            
            if (e.key >= '1' && e.key <= '3') {
                const index = parseInt(e.key) - 1;
                hytopia.sendData({
                    type: 'merchantOption',
                    option: index
                });
                e.preventDefault();
            }
        });
    }
    
    // Method to hide/show chat window
    hideChatWindow(hide) {
        // Create or get the style element
        let chatStyle = document.getElementById('merchant-chat-style');
        
        if (hide) {
            // Create style element if it doesn't exist
            if (!chatStyle) {
                chatStyle = document.createElement('style');
                chatStyle.id = 'merchant-chat-style';
                chatStyle.textContent = `
                    #chat-window {
                        display: none !important;
                    }
                `;
                document.head.appendChild(chatStyle);
            }
        } else {
            // Remove style element if it exists
            if (chatStyle) {
                chatStyle.remove();
            }
        }
    }

    updateMerchantDialog(data) {
        const dialog = document.querySelector('.merchant-dialog');
        if (!dialog) return;
        
        // Update merchant prompt if provided
        const promptElement = dialog.querySelector('.merchant-prompt');
        if (promptElement && data.message) {
            promptElement.textContent = data.message;
            promptElement.style.display = 'block';
        } else if (promptElement) {
            promptElement.style.display = 'none';
        }
        
        // Update options
        const optionsContainer = dialog.querySelector('.options');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        if (data.options && data.options.length > 0) {
            data.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.textContent = option;
                button.classList.add('merchant-option');
                button.dataset.index = index;
                button.addEventListener('click', () => {
                    hytopia.sendData({
                        type: 'merchantOption',
                        merchantId: data.merchantId,
                        option: index
                    });
                });
                optionsContainer.appendChild(button);
            });
            
            // Update center screen option buttons
            this.updateOptionButtons(data.options);
        }
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .merchant-prompt {
            margin-bottom: 15px;
            font-size: 16px;
            line-height: 1.4;
            color: #f0f0f0;
            text-align: center;
        }
        
        /* Center screen option buttons */
        #merchant-option-buttons {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            justify-content: center;
            gap: 20px;
            z-index: 2000;
        }
        
        .merchant-center-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(to bottom, #4a6491, #2c3e50);
            color: white;
            border: 2px solid #3a4a5c;
            font-size: 24px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.2s;
        }
        
        .merchant-center-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
            background: linear-gradient(to bottom, #5a7cb6, #3a5272);
        }
        
        .merchant-center-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
        
        /* Mobile improvements */
        body.mobile .merchant-center-button {
            width: 70px;
            height: 70px;
            font-size: 28px;
        }
        
        body.mobile #merchant-option-buttons {
            bottom: 150px; /* Position higher on mobile */
        }
        `;
        document.head.appendChild(style);
    }

    // Add a helper method to create the mobile option buttons
    createMobileOptionButtons() {
        
        // Clear existing buttons
        if (this.optionButtonsContainer) {
            this.optionButtonsContainer.innerHTML = '';
        } else {
            // If container doesn't exist, create it
            this.optionButtonsContainer = document.createElement('div');
            this.optionButtonsContainer.id = 'merchant-option-buttons';
            this.optionButtonsContainer.style.display = 'flex';
            document.body.appendChild(this.optionButtonsContainer);
        }
        
        // Create 3 buttons for options 1, 2, 3
        for (let i = 0; i < 3; i++) {
            const button = document.createElement('button');
            button.className = 'merchant-center-button';
            button.textContent = (i + 1).toString();
            button.dataset.index = i;
            
            // Click handler
            button.addEventListener('click', () => {
                // Simulate pressing the number key
                const keyNumber = i + 1;
                hytopia.pressInput(keyNumber.toString(), true);
                setTimeout(() => {
                    hytopia.pressInput(keyNumber.toString(), false);
                }, 100);
            });
            
            // Touch handler
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const keyNumber = i + 1;
                hytopia.pressInput(keyNumber.toString(), true);
                setTimeout(() => {
                    hytopia.pressInput(keyNumber.toString(), false);
                }, 100);
            });
            
            this.optionButtonsContainer.appendChild(button);
        }
        
        // Force the styling to be correct
        this.optionButtonsContainer.style.position = 'fixed';
        this.optionButtonsContainer.style.bottom = '100px';
        this.optionButtonsContainer.style.left = '50%';
        this.optionButtonsContainer.style.transform = 'translateX(-50%)';
        this.optionButtonsContainer.style.display = 'flex';
        this.optionButtonsContainer.style.justifyContent = 'center';
        this.optionButtonsContainer.style.gap = '20px';
        this.optionButtonsContainer.style.zIndex = '2000';
        
        // Log the creation
        console.log("Created option buttons container:", this.optionButtonsContainer);
    }
}

window.MerchantPanel = new MerchantPanel();