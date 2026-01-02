class GameUpdatesPanel {
    constructor() {
        console.log('GameUpdatesPanel constructor called');
        this.container = null;
        this.panel = null;
        this.updatesContainer = null;
        this.recentMessages = new Map();
    }

    initialize(containerId) {
        console.log('GameUpdatesPanel initializing...');
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        this.panel = document.createElement('div');
        this.panel.id = 'game-updates-panel';
        this.panel.style.display = 'none'; // Start hidden
        this.panel.innerHTML = `
            <div class="updates-header">
                <h3>Quest Updates</h3>
            </div>
            <div class="updates-container"></div>
        `;
        
        this.container.appendChild(this.panel);
        this.updatesContainer = this.panel.querySelector('.updates-container');

        // Add responsive styles
        const style = document.createElement('style');
        style.textContent = `
            #game-updates-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                background: linear-gradient(145deg, #2a2a2a, #1e1e1e);
                border: 2px solid #3a4a5c;
                border-radius: 6px;
                padding: 0;
                color: #e0e0e0;
                width: 220px;
                max-height: 200px;
                overflow: hidden;
                z-index: 100;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                box-shadow: 0 3px 15px rgba(0, 0, 0, 0.4);
                display: flex;
                flex-direction: column;
            }
            
            .updates-header {
                background: linear-gradient(135deg, #3a3a3a, #2d2d2d);
                border-bottom: 1px solid #444;
                padding: 6px 10px;
                flex-shrink: 0;
            }
            
            #game-updates-panel h3 {
                margin: 0;
                font-size: 12px;
                font-weight: 600;
                color: #ffffff;
                text-align: center;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
                letter-spacing: 0.2px;
            }
            
            .updates-container {
                overflow-y: auto;
                max-height: calc(200px - 30px);
                padding: 6px;
            }
            
            .update-message {
                margin-bottom: 4px;
                padding: 6px 8px;
                border-radius: 4px;
                background-color: rgba(30, 38, 50, 0.85);
                border-left: 2px solid #3a4a5c;
                font-size: 12px;
                line-height: 1.3;
                color: #e0e0e0;
            }
            
            .update-message.quest-message {
                background-color: rgba(40, 50, 65, 0.9);
                border-left-color: #4a90e2;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(10px); }
            }
            
            /* Mobile optimization */
            @media (max-width: 767px) {
                #game-updates-panel {
                    width: 75vw;
                    max-width: 220px;
                    right: auto;
                    left: 50%;
                    transform: translateX(-50%);
                    max-height: 180px;
                }
                
                .updates-header {
                    padding: 6px 8px;
                }
                
                #game-updates-panel h3 {
                    font-size: 11px;
                }
                
                .updates-container {
                    max-height: calc(180px - 28px);
                    padding: 5px;
                }
                
                .update-message {
                    padding: 5px 7px;
                    font-size: 11px;
                    margin-bottom: 4px;
                }
            }
            
            /* Additional mobile optimization for very small screens */
            @media (max-width: 360px) {
                #game-updates-panel {
                    width: 80vw;
                    max-width: 200px;
                    top: 5px;
                    max-height: 160px;
                }
                
                .update-message {
                    font-size: 10px;
                    padding: 4px 6px;
                }
            }
        `;
        document.head.appendChild(style);

        // Set up message handling
        hytopia.onData(data => {
         
            if (data.type === 'gameUpdate' || data.type === 'welcomeReady' || data.type === 'questUpdate') {
                console.log("Received update:", data.type, data.message);
                
                this.hideMobileControls(); 
                
                // Show panel 
                this.panel.style.display = 'block';
                
                // Create and show message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'update-message';
                messageDiv.id = `message-${data.messageId || Date.now() + Math.random()}`; // Use messageId if provided, else generate
                
                // Add quest-specific styling if it's a quest update
                if (data.type === 'questUpdate') {
                    messageDiv.classList.add('quest-message');
                }
                
                // On mobile, simplify quest update messages to just "Quest log updated"
                let displayMessage = data.message;
                const isMobile = hytopia.isMobile || document.body.classList.contains('mobile') || 
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile && data.type === 'questUpdate') {
                    displayMessage = 'Quest log updated. Tap Level bar to view';
                }
                
                messageDiv.textContent = displayMessage;
                
                messageDiv.style.animation = 'fadeIn 0.3s ease-in';
                this.updatesContainer.insertBefore(messageDiv, this.updatesContainer.firstChild);
                
                // Auto-hide message after duration (longer for quest updates to allow achievement popup to clear)
                const displayDuration = data.type === 'questUpdate' ? 7000 : 5000; // 7 seconds for quests, 5 for others
                setTimeout(() => {
                    messageDiv.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                        messageDiv.remove();
                        // Hide panel only if no messages remain
                        if (!this.updatesContainer.hasChildNodes()) {
                            this.panel.style.display = 'none';
                            this.showMobileControls();
                        }
                    }, 300); // Wait for fadeOut animation
                }, displayDuration);
            }
            else if (data.type === 'removeGameMessage') {
                 console.log("Attempting to remove message:", data.messageId);
                 const messageToRemove = document.getElementById(`message-${data.messageId}`);
                 if (messageToRemove) {
                     console.log("Found message to remove:", messageToRemove);
                     messageToRemove.style.animation = 'fadeOut 0.3s ease-out';
                     setTimeout(() => {
                         messageToRemove.remove();
                         if (!this.updatesContainer.hasChildNodes()) {
                             this.panel.style.display = 'none';
                             this.showMobileControls();
                         }
                         console.log("Message removed. Remaining messages:", this.updatesContainer.innerHTML);
                     }, 300);
                 } else {
                     console.log("Message to remove not found:", data.messageId);
                 }
            }
        });

        console.log('GameUpdatesPanel initialized');
    }

    // This method can still be used for direct message adding if needed
    addUpdate(message, messageId) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'update-message';
        if (messageId) {
            messageDiv.id = `message-${messageId}`;
        }
        messageDiv.textContent = message;
        messageDiv.style.animation = 'fadeIn 0.3s ease-in';
        this.updatesContainer.insertBefore(messageDiv, this.updatesContainer.firstChild);
        document.getElementById('game-updates-panel').style.display = 'block';
    }

        // Add these methods to the TutorialPanel class
        hideMobileControls() {
            // Common mobile control button IDs and classes
            const mobileControls = [
                document.getElementById('mobile-quest-button')
            ];
            
            // Hide elements by ID
            mobileControls.forEach(element => {
                if (element) {
                    console.log(`Tutorial hiding mobile control: ${element.id}`);
                    element.style.display = 'none';
                }
            });
            
        }
    
        showMobileControls() {
            // Common mobile control button IDs and classes
            const mobileControls = [
                document.getElementById('mobile-quest-button')
            ];
            
            // Show elements by ID
            mobileControls.forEach(element => {
                if (element) {
                    console.log(`Tutorial showing mobile control: ${element.id}`);
                    element.style.display = '';  // Reset to default display value
                }
            });

        }
}

// Make it globally available
window.GameUpdatesPanel = new GameUpdatesPanel();
console.log('GameUpdatesPanel global object created');
