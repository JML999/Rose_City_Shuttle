// assets/ui/panels/PlayerOptionsPanel.js

class PlayerOptionsPanel {
    
    constructor() {
        this.templateId = 'player-options-template';
        this.templateName = 'player-options';
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
            // Structure to hold multiple option lines
            templateElement.innerHTML = `
                <div class="player-options-container">
                  </div>
            `;
            document.body.appendChild(templateElement);
        } else {
        }

        // --- Create and Inject CSS Styles ---
        const styleId = 'player-options-styles';
        if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            // --- UPDATE STYLES ---
            styleElement.textContent = `
              .player-options-container {
                /* Container styling - adjust as needed */
                display: flex;
                /* Choose layout direction: */
                flex-direction: column; /* Stack buttons vertically */
                /* OR */
                /* flex-direction: row; */ /* Arrange buttons horizontally */
                gap: 8px; /* Spacing between buttons */
                align-items: center; /* Center buttons horizontally */
                justify-content: center;
                max-width: 300px; /* Adjust width */
                margin: 0 auto;
                display: none; /* Hidden by default */
                /* Remove background/padding from container if buttons provide it */
                /* background-color: rgba(0, 0, 0, 0.6); */
                /* padding: 8px 12px; */
                /* border-radius: 6px; */
              }
              /* Style for the clickable button */
              .player-option-button {
                  background-color: rgba(30, 30, 30, 0.8); /* Darker background */
                  color: #ffffff;
                  border: 1px solid rgba(200, 200, 200, 0.5);
                  border-radius: 5px;
                  padding: 8px 15px; /* Make it easily clickable */
                  font-family: Arial, sans-serif;
                  font-size: 14px;
                  cursor: pointer;
                  text-align: left; /* Align text inside button */
                  white-space: normal; /* Allow text wrapping */
                  min-width: 150px; /* Ensure a minimum width */
                  transition: background-color 0.2s; /* Add hover effect */
              }
              .player-option-button:hover {
                   background-color: rgba(70, 70, 70, 0.9);
              }
            `;
            // --- END STYLE UPDATE ---
            document.head.appendChild(styleElement);
        } else {
        }
    }

    registerSceneUITemplate() {

        try {
            // Use 'this' to refer to the panel instance
            const panelInstance = this;

            hytopia.registerSceneUITemplate(this.templateName, (id, onState) => {
        
                const template = document.getElementById(panelInstance.templateId); // Use panelInstance
                if (!template) {
                    console.error(`[PlayerOptionsPanel] Template element #${panelInstance.templateId} not found!`);
                    return document.createElement('div'); 
                }
                
                const clone = template.content.cloneNode(true);
                const optionsContainer = clone.querySelector('.player-options-container');

                if (!optionsContainer) {
                    console.error('[PlayerOptionsPanel] Template content query selector failed!');
                    return document.createElement('div');
                }

                // Use an arrow function for onState to preserve 'this' context
                onState(state => {


                    // --- VISIBILITY CHECK ---
                    if (!panelInstance.playerId || !state || state.owningPlayerId !== panelInstance.playerId) {
                        optionsContainer.style.display = 'none'; // Hide if no match or ID missing
                        // console.log(`[PlayerOptionsPanel] Hiding options. Owner: ${state?.owningPlayerId}, Client: ${panelInstance.playerId}`);
                        return; // Stop processing if not owner
                    }
                    // --- END VISIBILITY CHECK ---

                    // If IDs match, render options
                    optionsContainer.innerHTML = ''; // Clear previous options
                    let hasValidOptions = false;

                    if (state.options && Array.isArray(state.options)) {
                        state.options.forEach((optionText, index) => {
                            if (typeof optionText === 'string' && optionText.trim() !== '') {
                                // --- CREATE BUTTON INSTEAD OF DIV ---
                                const optionElement = document.createElement('button'); // Changed to button
                                optionElement.className = 'player-option-button';       // Use new class
                                optionElement.textContent = `[${index + 1}] ${optionText}`;
                                // ---------------------------------------

                                // --- Add click listener to trigger input ---
                                optionElement.addEventListener('click', () => {
                                    const inputCode = (index + 1).toString();
            
                                    hytopia.triggerInput(inputCode, true);
                                    setTimeout(() => hytopia.triggerInput(inputCode, false), 50);
                                    // Hide immediately on click for better feedback
                                     optionsContainer.style.display = 'none';
                                });
                                // --- End click listener ---

                                optionsContainer.appendChild(optionElement);
                                hasValidOptions = true; // Mark that we added at least one option
                            }
                        });
                    }

                    // Show or hide container based on whether valid options were rendered
                    if (hasValidOptions) {
                        // Clear achievement popups when NPC options are shown
                        if (window.AchievementPopupPanel && window.AchievementPopupPanel.clearAll) {
                            window.AchievementPopupPanel.clearAll();
                        }
                        optionsContainer.style.display = 'flex'; // Show the container
                        // console.log(`[PlayerOptionsPanel] Displaying ${state.options?.length} options for owner.`);
                    } else {
                        optionsContainer.style.display = 'none'; // Hide if no valid options
                        // console.log('[PlayerOptionsPanel] Hiding options container (no valid options).');
                    }
                });

                return clone;
            });

        } catch (error) {
            console.error(`[PlayerOptionsPanel] Error registering template '${this.templateName}':`, error);
        }
    }
}

window.PlayerOptionsPanel = new PlayerOptionsPanel(); 