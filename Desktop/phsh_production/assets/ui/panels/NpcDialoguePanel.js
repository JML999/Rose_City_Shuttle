// assets/ui/panels/NpcDialoguePanel.js

class NpcDialoguePanel {
    constructor() {
        this.templateId = 'npc-dialogue-template';
        this.templateName = 'npc-dialogue';
        this.playerId = null;
    }

    initialize() {

        this.injectTemplateAndStyles();
        this.registerSceneUITemplate();
        // Listen for player ID from server
        hytopia.onData((data) => {
            if (data.type === 'playerIdentity') {
                this.playerId = data.playerId;
        
            }
        });
    }

    injectTemplateAndStyles() {
        // --- Create and Inject HTML Template ---
        if (!document.getElementById(this.templateId)) {
            const templateElement = document.createElement('template');
            templateElement.id = this.templateId;
            templateElement.innerHTML = `
                <div class="dialogue-bubble">
                  <div class="dialogue-text"></div>
                  <div class="dialogue-caret"></div>
                </div>
            `;
            document.body.appendChild(templateElement);

        } else {

        }

        // --- Create and Inject CSS Styles ---
        const styleId = 'npc-dialogue-styles';
        if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = `
              .dialogue-bubble {
                background-color: rgba(255, 255, 255, 0.8);
                padding: 10px 15px;
                border-radius: 8px;
                text-align: center;
                color: #333333;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                font-family: Arial, sans-serif;
                font-size: 14px;
                position: relative; /* Needed for caret positioning */
                max-width: 200px;
                margin: 0 auto; /* Center horizontally */
                display: none; /* Hidden by default, shown via state */
              }
            
              .dialogue-text {
                /* Add any specific text styling here if needed */
              }
            
              .dialogue-caret {
                position: absolute;
                bottom: -8px; /* Position below the bubble */
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid rgba(255, 255, 255, 0.8); /* Match bubble background */
              }
            `;
            document.head.appendChild(styleElement);

        } else {
 
        }
    }

    registerSceneUITemplate() {
        try {
            // Use 'this' to refer to the panel instance within the factory function
            const panelInstance = this;
            window.npcDialogueTemplateRegistered = false;

            hytopia.registerSceneUITemplate(this.templateName, (id, onState) => {
                // Create container for name tag + dialogue bubble
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.alignItems = 'center';
                container.style.gap = '6px';
                
                // Create name tag element
                const nameTag = document.createElement('div');
                nameTag.className = 'npc-name-tag';
                nameTag.style.padding = '4px 12px';
                nameTag.style.background = '#9575cd'; // Darker purple to match border
                nameTag.style.border = '2px solid #b39ddb'; // Lighter purple border
                nameTag.style.borderRadius = '12px';
                nameTag.style.fontFamily = "'Comic Neue', 'Quicksand', sans-serif";
                nameTag.style.fontSize = '14px';
                nameTag.style.fontWeight = 'bold';
                nameTag.style.color = '#fff';
                nameTag.style.textShadow = '1px 1px 2px rgba(0,0,0,0.3)';
                nameTag.style.whiteSpace = 'nowrap';
                nameTag.style.boxShadow = '0 3px 12px rgba(0,0,0,0.15)';
                
                // Create dialogue bubble
                const element = document.createElement('div');
                element.className = 'npc-dialogue-bubble';
                
                // Hybrid cartoon style with improved readability for longer text
                element.style.padding = '14px 18px'; // More padding for breathing room
                element.style.background = '#b39ddb'; // Soft purple (cartoon style)
                element.style.border = '3px solid #9575cd'; // Slightly thinner border
                element.style.borderRadius = '16px'; // Keep rounded
                element.style.fontFamily = "'Comic Neue', 'Quicksand', 'Arial Rounded MT Bold', sans-serif"; // More readable comic font first
                element.style.fontSize = '17px'; // Slightly larger
                element.style.fontWeight = '500'; // Medium weight instead of bold (more readable)
                element.style.color = '#fff'; // White text
                element.style.boxShadow = '0 6px 24px rgba(0,0,0,0.18)';
                element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.3)'; // Lighter, more readable shadow
                element.style.maxWidth = '320px'; // Much wider for longer text (was 220px)
                element.style.textAlign = 'left'; // Left-align for better readability of longer text
                element.style.whiteSpace = 'pre-line'; // Preserve line breaks
                element.style.lineHeight = '1.5'; // Better line spacing
                element.style.letterSpacing = '0.3px'; // Slight letter spacing for clarity
                element.style.animation = 'cartoon-pop 0.3s cubic-bezier(.68,-0.55,.27,1.55)';

                // Inject animation CSS if not present
                if (!document.getElementById('cartoon-pop-style')) {
                    const style = document.createElement('style');
                    style.id = 'cartoon-pop-style';
                    style.textContent = `
                    @keyframes cartoon-pop {
                      0% { transform: scale(0.7); opacity: 0; }
                      80% { transform: scale(1.1); opacity: 1; }
                      100% { transform: scale(1); }
                    }
                    `;
                    document.head.appendChild(style);
                }

                // Assemble container
                container.appendChild(nameTag);
                container.appendChild(element);

                onState(state => {
                    // --- VISIBILITY CHECK ---
                    // Check if the owningPlayerId in the state matches this client's playerId
                    if (!panelInstance.playerId || !state || state.owningPlayerId !== panelInstance.playerId) {
                        container.style.display = 'none'; // Hide if no match or ID missing
                        return; // Stop processing if not owner
                    }
                    // --- END VISIBILITY CHECK ---

                    // If we reach here, the IDs match, so render the text and show
                    if (state.text && typeof state.text === 'string' && state.text.trim() !== '') {
                        nameTag.textContent = state.npcName || 'NPC'; // Display NPC name
                        element.textContent = state.text;
                        
                        // On mobile: hide name tag if text is too long
                        const isMobile = hytopia.isMobile || false;
                        const textLength = state.text.length;
                        const MAX_TEXT_LENGTH_FOR_NAME_TAG = 100; // Adjust this threshold as needed
                        
                        if (isMobile && textLength > MAX_TEXT_LENGTH_FOR_NAME_TAG) {
                            nameTag.style.display = 'none';
                        } else {
                            nameTag.style.display = 'block';
                        }
                        
                        container.style.display = 'flex'; // Show the container
                    } else {
                        container.style.display = 'none'; // Hide if text is empty
                    }
                });

                return container;
            });
            console.log(`[NpcDialoguePanel] Template '${this.templateName}' registration successful.`);
            window.npcDialogueTemplateRegistered = true;
        } catch (error) {
            console.error(`[NpcDialoguePanel] Error registering template '${this.templateName}':`, error);
        }
    }
}

// Create an instance and make it globally available (similar pattern to other panels)
window.NpcDialoguePanel = new NpcDialoguePanel(); 