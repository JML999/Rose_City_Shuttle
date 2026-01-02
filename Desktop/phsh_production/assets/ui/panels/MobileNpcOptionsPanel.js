class MobileNpcOptionsPanel {
    constructor() {
        this.containerId = 'mobile-npc-options-container'; // ID of the div in index.html
        this.containerElement = null;
        console.log('[MobileNpcOptionsPanel] Constructor called');
    }

    initialize() {
        console.log('[MobileNpcOptionsPanel] Initializing...');
        this.containerElement = document.getElementById(this.containerId);

        if (!this.containerElement) {
            console.error(`[MobileNpcOptionsPanel] Container element #${this.containerId} not found! Make sure it exists in index.html.`);
            return;
        }

        // Listen for events from the server
        hytopia.onData((data) => {
            if (data.type === 'showMobileNpcOptions') {
                console.log('[MobileNpcOptionsPanel] Received showMobileNpcOptions:', data.options);
                // Clear achievement popups when NPC options are shown
                if (window.AchievementPopupPanel && window.AchievementPopupPanel.clearAll) {
                    window.AchievementPopupPanel.clearAll();
                }
                this.updateMobileOptionButtons(data.options);
            } else if (data.type === 'npcInteractionEnded') {
                console.log('[MobileNpcOptionsPanel] Received npcInteractionEnded. Hiding buttons.');
                this.hideMobileOptions();
            }
        });

        console.log('[MobileNpcOptionsPanel] Initialization complete.');
    }

    // Method to update MOBILE OVERLAY buttons
    updateMobileOptionButtons(options) {
        if (!this.containerElement) return;

        // Clear previous buttons
        this.containerElement.innerHTML = '';

        if (!options || options.length === 0) {
            this.containerElement.style.display = 'none';
            return;
        }

        // Show the container
        this.containerElement.style.display = 'flex'; // Use flex (direction set by CSS)

        // Add buttons for each option (max 3)
        const maxButtons = Math.min(options.length, 3);
        for (let i = 0; i < maxButtons; i++) {
            const optionText = options[i]; // Get the actual option text
            const button = document.createElement('button');
            // Ensure class matches CSS
            button.className = 'mobile-npc-option-button';
            button.textContent = `${i + 1}. ${optionText}`; // Display number and text

            // Shared handler function
            const handleMobileInput = (e) => {
                 if(e) e.preventDefault(); // Prevent default for touch
                 const keyNumber = i + 1;
                 const inputKey = keyNumber.toString();
                 console.log(`[MobileNpcOptionsPanel] Mobile Option ${i} selected ('${optionText}'). Simulating key press: ${inputKey}`);

                 // Use pressInput like MerchantPanel
                 hytopia.pressInput(inputKey, true);
                 setTimeout(() => {
                     hytopia.pressInput(inputKey, false);
                 }, 100);

                 // Hide the container immediately on selection
                 this.hideMobileOptions();
            };

            // Add listeners
            button.addEventListener('click', handleMobileInput);
            button.addEventListener('touchend', handleMobileInput);

            this.containerElement.appendChild(button);
        }
         console.log(`[MobileNpcOptionsPanel] Displayed ${maxButtons} mobile overlay buttons.`);
    }

    hideMobileOptions() {
        if (this.containerElement) {
            this.containerElement.innerHTML = ''; // Clear buttons
            this.containerElement.style.display = 'none';
        }
    }
}

// Create and register the panel instance
window.MobileNpcOptionsPanel = new MobileNpcOptionsPanel();
