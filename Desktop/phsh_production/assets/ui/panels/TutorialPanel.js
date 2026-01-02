class TutorialPanel {
    constructor() {
        this.container = null;
        this.tutorialOpen = false;
        this.currentStep = 0;
        this.tutorialSteps = [];
        this.isActive = false;
        this.styleElement = null;
        this.panel = document.getElementById('tutorial-panel');
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        // Create panel HTML
        const panel = document.createElement('div');
        panel.id = 'tutorial-ui';
        panel.innerHTML = `
            <div id="tutorial-overlay">
                <div class="tutorial-container">
                    <div class="tutorial-header">
                        <h2 id="tutorial-title">Welcome to Fishing Adventure!</h2>
                        <div class="close-button" id="tutorial-close-button">×</div>
                    </div>
                    <div class="tutorial-content">
                        <div class="tutorial-image-container">
                            <img id="tutorial-image" class="tutorial-image" src="" alt="Tutorial Image">
                        </div>
                        <p id="tutorial-text"></p>
                        <div class="tutorial-navigation">
                            <button id="tutorial-prev">Previous</button>
                            <button id="tutorial-next">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(panel);

        // Add CSS for the tutorial
        const style = document.createElement('style');
        style.textContent = `
            #tutorial-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 2000;
                display: none;
                justify-content: center;
                align-items: center;
            }
            
            .tutorial-container {
                width: 600px;
                background-color: #1a2633;
                border: 2px solid #4a90e2;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .tutorial-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #0a1622;
                border-bottom: 1px solid #4a90e2;
            }
            
            .tutorial-header h2 {
                margin: 0;
                color: #ffffff;
                font-size: 22px;
            }
            
            .close-button {
                font-size: 24px;
                color: #ffffff;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            .close-button:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .tutorial-content {
                padding: 20px;
                overflow-y: auto;
            }
            
            .tutorial-image-container {
                width: 100%;
                height: 220px;
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
                background-color: #0d1a26;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .tutorial-image {
                width: 80%;
                height: 60%;
                object-fit: contain;
            }
            
            #tutorial-text {
                color: #d0d0d0;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 20px;
            }
            
            .tutorial-navigation {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
                
            
            #tutorial-prev, #tutorial-next {
                background-color: #4a90e2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }

            
            #tutorial-prev:hover, #tutorial-next:hover {
                background-color: #3a7bc8;
            }
            
            #tutorial-prev:disabled {
                background-color: #2a3b4d;
                cursor: not-allowed;
            }
        `;
        
        this.container.appendChild(style);

        // Add these mobile-specific styles to the existing style declaration
        if (hytopia.isMobile) {
            const mobileStyle = document.createElement('style');
            mobileStyle.textContent = `
                /* Mobile Tutorial Styles */
                body.mobile #tutorial-overlay {
                    background-color: rgba(0, 0, 0, 0.9);
                }
                
                body.mobile .tutorial-container {
                    width: 100% !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    max-width: 100% !important;
                    border-radius: 0 !important;
                    border: none !important;
                    display: flex;
                    flex-direction: column;
                }
                
                body.mobile .tutorial-header {
                    padding: 8px 10px !important;
                    background: #0a1622;
                    border-bottom: 1px solid #4a90e2;
                }
                
                body.mobile .tutorial-header h2 {
                    font-size: 18px !important;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                body.mobile .close-button {
                    width: 24px !important;
                    height: 24px !important;
                    font-size: 20px !important;
                    margin-left: 8px;
                }
                
                body.mobile .tutorial-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px !important;
                    display: flex;
                    flex-direction: column;
                }
                
                body.mobile .tutorial-image-container {
                    width: 100% !important;
                    min-height: 180px !important;
                    height: auto !important;
                    flex: 1;
                    margin-bottom: 12px !important;
                }
                
                body.mobile #tutorial-text {
                    font-size: 15px !important;
                    margin-bottom: 12px !important;
                    overflow-y: auto;
                    flex-shrink: 1;
                }
                
                body.mobile .tutorial-navigation {
                    padding-top: 5px;
                    border-top: 1px solid rgba(74, 144, 226, 0.3);
                }
                
                body.mobile #tutorial-prev, 
                body.mobile #tutorial-next {
                    padding: 10px 16px !important;
                    font-size: 16px !important;
                    min-width: 100px;
                }
                
                /* ASCII art adjustments for mobile */
                body.mobile .ascii-container {
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 180px;
                }
                
                body.mobile .ascii-art {
                    font-size: 10px !important;
                    line-height: 1.1 !important;
                    transform: scale(0.85);
                }
                
                /* Mobile tutorial examples */
                body.mobile #tutorial-example {
                    padding: 10px !important;
                }
                
                body.mobile .power-bar,
                body.mobile .jig-meter {
                    height: 120px !important;
                }
                
                body.mobile .instruction.left,
                body.mobile .instruction.right {
                    width: 110px !important;
                    font-size: 12px !important;
                }
                
                @media (max-height: 500px) {
                    body.mobile .tutorial-image-container {
                        min-height: 150px !important;
                    }
                    
                    body.mobile #tutorial-text {
                        max-height: 80px;
                        overflow-y: auto;
                        padding-right: 5px;
                    }
                    
                    body.mobile .tutorial-header h2 {
                        font-size: 16px !important;
                    }
                    
                    body.mobile .ascii-art {
                        transform: scale(0.7);
                    }
                }
            `;
            document.head.appendChild(mobileStyle);
        }

        // Set up event handlers
        this.setupEventListeners();
        
        // Set up message handling from server
        hytopia.onData((data) => {
            if (data.type === 'showTutorial') {
                console.log('Received tutorial data:', data);
                this.tutorialSteps = data.steps;
                this.currentStep = 0;
                this.showTutorial();
            } else if (data.type === 'showHelp') {
                console.log('Received help data:', data);
                this.tutorialSteps = data.steps;
                this.currentStep = 0;
                this.showTutorial();
            }
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.tutorialOpen) {
                this.closeTutorial();
            }
        });
    }

    setupEventListeners() {
        const tutorialContainer = document.querySelector('.tutorial-container');
        if (tutorialContainer) {
            tutorialContainer.addEventListener('click', (e) => {
                const target = e.target;
                
                if (target.id === 'tutorial-next') {
                    e.stopPropagation();
                    this.nextStep();
                }
                
                if (target.id === 'tutorial-prev') {
                    e.stopPropagation();
                    this.previousStep();
                }
                
                if (target.id === 'tutorial-close-button' || 
                    target.classList.contains('close-button') || 
                    (target.closest('.close-button') !== null)) {
                    e.stopPropagation();
                    this.closeTutorial();
                    hytopia.sendData({
                        type: 'tutorialCompleted'
                    });
                }
            });
        }
    }

    showTutorial() {
        this.isActive = true;
        const overlay = document.getElementById('tutorial-overlay');
        overlay.style.display = 'flex';
        this.tutorialOpen = true;
        
        // Apply optimized mobile-specific styles
        console.log("Logging hytopia object:", hytopia); 
        if (hytopia.isMobile) {
            // Remove any existing mobile styles to avoid conflicts
            const existingMobileStyle = document.getElementById('optimized-mobile-tutorial');
            if (existingMobileStyle) existingMobileStyle.remove();
            
            // Create new optimized mobile styles - landscape format like leaderboard
            const mobileStyle = document.createElement('style');
            mobileStyle.id = 'optimized-mobile-tutorial';
            mobileStyle.textContent = `
                /* Mobile tutorial - landscape format matching leaderboard */
                body.mobile #tutorial-overlay {
                    background-color: rgba(0, 0, 0, 0.8);
                    align-items: center;
                    justify-content: center;
                }
                
                body.mobile .tutorial-container {
                    width: 95% !important;
                    max-width: 500px !important;
                    height: auto !important;
                    max-height: 85vh !important;
                    border-radius: 4px !important;
                    border: 3px solid #4a6491 !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
                    overflow: hidden !important;
                    background-color: #1a2332 !important;
                }
                
                body.mobile .tutorial-header {
                    padding: 6px 10px !important;
                }
                
                body.mobile .tutorial-header h2 {
                    font-size: 16px !important;
                }
                
                body.mobile .tutorial-content {
                    padding: 10px !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                
                body.mobile .tutorial-image-container {
                    height: auto !important;
                    min-height: 120px !important;
                    max-height: 35vh !important;
                    margin-bottom: 10px !important;
                }
                
                body.mobile #tutorial-text {
                    font-size: 14px !important;
                    margin-top: 0 !important;
                    margin-bottom: 5px !important;
                    color: white !important;
                }
                
                /* Replace buttons with tap instructions */
                body.mobile .tutorial-navigation {
                    display: none !important;
                }
                
                body.mobile .tutorial-container::after {
                    content: "Tap anywhere to continue" !important;
                    display: block !important;
                    text-align: center !important;
                    color: #4a90e2 !important;
                    font-size: 12px !important;
                    padding: 5px !important;
                    border-top: 1px solid rgba(74, 144, 226, 0.3) !important;
                }
                
                /* Mobile-specific examples */
                body.mobile #tutorial-example {
                    padding: 8px !important;
                    margin: 0 !important;
                }
                
                /* ASCII art optimization */
                body.mobile .ascii-container {
                    min-height: 120px !important;
                }
                
                body.mobile .tutorial-reeling-animation {
                    padding: 10px !important;
                    margin: 0 !important;
                }
            `;
            document.head.appendChild(mobileStyle);
            
            // Update tutorial steps for mobile if needed
            this.updateMobileSteps();
            
            // Add tap-to-advance functionality
            const tutorialContainer = document.querySelector('.tutorial-container');
            if (tutorialContainer) {
                // Remove old event listener if exists
                if (this.tapHandler) {
                    tutorialContainer.removeEventListener('click', this.tapHandler);
                }
                
                // Create new tap handler
                this.tapHandler = (e) => {
                    // Don't trigger on close button
                    if (e.target.id === 'tutorial-close-button' || 
                        e.target.classList.contains('close-button') || 
                        (e.target.closest('.close-button') !== null)) {
                        return;
                    }
                    
                    e.stopPropagation();
                    this.nextStep();
                };
                
                tutorialContainer.addEventListener('click', this.tapHandler);
            }
        }
        
        // Disable player controls while tutorial is open
        hytopia.sendData({
            type: 'disablePlayerInput'
        });
        
        this.updateTutorialContent();
        this.hideMobileControls();
        
        // Add style to hide chat window when tutorial is active
        this.addHideChatStyle();
    }

    closeTutorial() {
        this.isActive = false;
        const overlay = document.getElementById('tutorial-overlay');
        overlay.style.display = 'none';
        this.tutorialOpen = false;
        
        // Clean up tap event listener
        if (this.tapHandler) {
            const tutorialContainer = document.querySelector('.tutorial-container');
            if (tutorialContainer) {
                tutorialContainer.removeEventListener('click', this.tapHandler);
            }
            this.tapHandler = null;
        }
        
        // Restore normal scrolling
        if (hytopia.isMobile) {
            document.body.style.overflow = '';
        }
        
        // Re-enable player controls
        hytopia.sendData({
            type: 'enablePlayerInput'
        });
        
        // Remove style to show chat window when tutorial is inactive
        this.removeHideChatStyle();
        this.showMobileControls();
    }

    updateTutorialContent() {
        if (this.currentStep >= this.tutorialSteps.length) {
            this.closeTutorial();
            return;
        }

        // Use mobile-specific content if available
        const step = hytopia.isMobile && this.mobileSteps ? 
            this.mobileSteps[this.currentStep] : 
            this.tutorialSteps[this.currentStep];
        
        // Use concise text on mobile if available
        if (hytopia.isMobile && step.mobileConciseText) {
            document.getElementById('tutorial-text').textContent = step.mobileConciseText;

                 


        } else {
            document.getElementById('tutorial-text').textContent = step.text || '';
        }
        
        document.getElementById('tutorial-title').textContent = step.title || 'Tutorial';
        
        if (this.currentStep === 0) {
            document.getElementById('tutorial-title').textContent = step.title || 'Tutorial';
            document.getElementById('tutorial-text').textContent = step.text || '';
            
            const imageContainer = document.querySelector('.tutorial-image-container');
            
            if (hytopia.isMobile) {
                // Smaller version of the ASCII art for mobile
            imageContainer.innerHTML = `
                <div class="ascii-container">
                        <pre class="ascii-art mobile-ascii">
╔═══════════════════════════════════════════╗
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
║      ██████  ██   ██ ███████ ██   ██      ║
║      ██   ██ ██   ██ ██      ██   ██      ║
║      ██████  ███████ ███████ ███████      ║
║      ██      ██   ██      ██ ██   ██      ║
║      ██      ██   ██ ███████ ██   ██      ║
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
║     Your Fishing Adventure Begins         ║
╚═══════════════════════════════════════════╝
                </pre>
            </div>
        `;

                // Add mobile-specific style
                const mobileStyle = document.createElement('style');
                mobileStyle.id = 'mobile-first-slide';
                mobileStyle.textContent = `
                    .mobile-ascii {
                        font-size: 10px !important;
                        line-height: 1.1 !important;
                        transform: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                `;
                document.head.appendChild(mobileStyle);
            } else {
                // Original ASCII art for desktop
                imageContainer.innerHTML = `
                    <div class="ascii-container">
                        <pre class="ascii-art">
~   ~   ~   ~   ~   ~   ~   ~   ~   ~   ~   ~   ~   ~
╔═══════════════════════════════════════════╗
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
║      ██████  ██   ██ ███████ ██   ██      ║
║      ██   ██ ██   ██ ██      ██   ██      ║
║      ██████  ███████ ███████ ███████      ║
║      ██      ██   ██      ██ ██   ██      ║
║      ██      ██   ██ ███████ ██   ██      ║
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
║     Your Fishing Adventure Begins         ║
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
║     > Press NEXT to learn to fish <       ║
║  ~   ~   ~   ~   ~   ~   ~   ~   ~   ~    ║
╚═══════════════════════════════════════════╝
                        </pre>
                    </div>
                `;
            }

            const style = document.createElement('style');
            style.id = 'tutorial-ascii-style';
            style.textContent = `
                .ascii-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    width: 100%;
                    font-family: monospace;
                    background: #0a1622;
                    border-radius: 4px;
                }

                .ascii-art {
                    color: #4a90e2;
                    text-shadow: 0 0 5px #4a90e2;
                    font-size: 14px;
                    line-height: 1.2;
                    white-space: pre;
                    animation: glow 2s infinite alternate;
                    margin: 0;
                    text-align: center;
                    position: relative;
                }

                .ascii-art::before {
                    content: '><(((º>';
                    position: absolute;
                    top: 20%;
                    left: -10%;
                    animation: swimAcross 8s linear infinite;
                }

                .ascii-art::after {
                    content: '<º)))><';
                    position: absolute;
                    bottom: 20%;
                    right: -10%;
                    animation: swimBack 8s linear infinite;
                }

                @keyframes glow {
                    from {
                        text-shadow: 0 0 5px #4a90e2, 0 0 10px #4a90e2;
                    }
                    to {
                        text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2;
                    }
                }

                @keyframes swimAcross {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(400%); }
                }

                @keyframes swimBack {
                    from { transform: translateX(100%); }
                    to { transform: translateX(-400%); }
                }
            `;
            document.head.appendChild(style);
        }
        // Special handling for last panel (reeling animation) - now step 3 is the last step
        else if (this.currentStep === 3 || this.currentStep === this.tutorialSteps.length - 1) {
            document.getElementById('tutorial-title').textContent = step.title || 'Tutorial';
            document.getElementById('tutorial-text').textContent = step.text || '';
            this.createAnimatedReelingExample();
        }
        else {
            // Regular panel handling
            document.getElementById('tutorial-title').textContent = step.title || 'Tutorial';
            document.getElementById('tutorial-text').textContent = step.text || '';
            
            if (step.type && ['casting', 'jigging', 'reeling'].includes(step.type)) {
                this.addTutorialExample(step.type);
                document.getElementById('tutorial-image').style.display = 'none';
            } else if (step.image) {
                const tutorialImage = document.getElementById('tutorial-image');
                tutorialImage.src = step.image;
                tutorialImage.style.display = 'block';
            } else {
                document.getElementById('tutorial-image').style.display = 'none';
            }
        }
        
        // Update next button text
        const nextButton = document.getElementById('tutorial-next');
        nextButton.textContent = this.currentStep === this.tutorialSteps.length - 1 ? 'Finish' : 'Next';
    }
    
    clearTutorialExample() {
        // Remove any existing example
        const existingExample = document.getElementById('tutorial-example');
        if (existingExample) {
            existingExample.remove();
        }
    }
    
    addTutorialExample(type) {
        // Clear any existing example
        this.clearTutorialExample();
        
        // Create container for the example
        const exampleContainer = document.createElement('div');
        exampleContainer.id = 'tutorial-example';
        exampleContainer.style.marginTop = '15px';
        exampleContainer.style.marginBottom = '15px';
        exampleContainer.style.padding = '15px';
        exampleContainer.style.backgroundColor = 'rgba(10, 20, 30, 0.5)';
        exampleContainer.style.borderRadius = '8px';
        exampleContainer.style.border = '1px solid rgba(74, 144, 226, 0.3)';
        
        // Check if we're on mobile
        const isMobile = hytopia.isMobile || document.body.classList.contains('mobile');
        
        // Add the appropriate example based on type and device
        switch (type) {
            case 'casting':
                if (isMobile) {
                    this.createMobileCastingExample(exampleContainer);
                } else {
                    this.createCastingExample(exampleContainer);
                }
                break;
            case 'jigging':
                if (isMobile) {
                    this.createMobileJiggingExample(exampleContainer);
                } else {
                    this.createJiggingExample(exampleContainer);
                }
                break;
            case 'reeling':
                this.createReelingExample(exampleContainer);
                break;
        }
        
        // Insert the example in the image container
        const imageContainer = document.querySelector('.tutorial-image-container');
        imageContainer.innerHTML = ''; // Clear the image container
        imageContainer.appendChild(exampleContainer);
    }
    
    createCastingExample(container) {
        container.innerHTML = `
            <div class="casting-example">
                <div class="casting-instructions">
                    <div class="instruction left">Right click to begin cast</div>
                    <div class="power-bar">
                        <div class="power-fill"></div>
                    </div>
                    <div class="instruction right">Right click to end cast</div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .casting-example {
                display: flex;
                justify-content: center;
                margin: 10px 0;
            }

            .casting-instructions {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .instruction {
                color: #4a90e2;
                font-size: 14px;
                text-shadow: 0 0 5px #4a90e2;
                white-space: nowrap;
            }

            .instruction.left {
                text-align: right;
                width: 150px;
                opacity: 0;
                animation: fadeIn 0.5s forwards;
            }

            .instruction.right {
                text-align: left;
                width: 150px;
                opacity: 0;
                animation: fadeIn 0.5s forwards;
                animation-delay: 1.5s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .power-bar {
                width: 30px;
                height: 150px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #666;
                border-radius: 15px;
                position: relative;
                overflow: hidden;
            }

            .power-fill {
                position: absolute;
                bottom: 0;
                width: 100%;
                background: linear-gradient(to bottom, #ff4444, #ffff44);
                border-radius: 15px;
                animation: fillMeter 3s infinite;
            }

            @keyframes fillMeter {
                0% { height: 0%; }
                50%, 100% { height: 100%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    createJiggingExample(container) {
        container.innerHTML = `
            <div class="jigging-example">
                <div class="jig-meter">
                    <div class="jig-section top"></div>
                    <div class="jig-section middle"></div>
                    <div class="jig-section bottom"></div>
                    <div class="jig-ball"></div>
                </div>
                <div class="checkmark"></div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .jigging-example {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                margin: 10px 0;
            }

            .jig-meter {
                width: 40px;
                height: 150px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #666;
                border-radius: 20px;
                position: relative;
                overflow: hidden;
            }

            .jig-section {
                height: 33.33%;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .jig-ball {
                width: 24px;
                height: 24px;
                background: linear-gradient(to bottom, #ff4444 50%, #fff 50%);
                border-radius: 50%;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                animation: jigMove 3s forwards;
            }

            .checkmark {
                color: #4CAF50;
                font-size: 32px;
                opacity: 0;
                animation: showCheck 3s forwards;
            }

            .checkmark::after {
                content: "✓";
            }

            @keyframes jigMove {
                0% { top: 10px; }
                99%, 100% { top: 50%; transform: translate(-50%, -50%); }
            }

            @keyframes showCheck {
                0%, 60% { opacity: 0; }
                66%, 80% { opacity: 1; }
                81%, 100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    createReelingExample(container) {
        // Create reeling minigame example
        const reelingExample = document.createElement('div');
        reelingExample.style.width = '100%';
        reelingExample.style.maxWidth = '400px';
        reelingExample.style.margin = '10px auto';
        
        // Tension bar
        const tensionBar = document.createElement('div');
        tensionBar.style.height = '30px';
        tensionBar.style.background = 'rgba(0, 0, 0, 0.8)';
        tensionBar.style.border = '2px solid white';
        tensionBar.style.position = 'relative';
        tensionBar.style.marginBottom = '15px';
        
        // Target zone
        const targetZone = document.createElement('div');
        targetZone.style.position = 'absolute';
        targetZone.style.width = '20%';
        targetZone.style.height = '100%';
        targetZone.style.left = '40%'; // Position in the middle
        targetZone.style.background = 'rgba(255, 255, 255, 0.3)';
        targetZone.style.borderLeft = '2px solid white';
        targetZone.style.borderRight = '2px solid white';
        
        // Fish marker (inside the target zone)
        const fishMarker = document.createElement('div');
        fishMarker.style.position = 'absolute';
        fishMarker.style.width = '4px';
        fishMarker.style.height = '100%';
        fishMarker.style.left = '50%'; // Position in the middle of target zone
        fishMarker.style.background = '#ffeb3b';
        
        tensionBar.appendChild(targetZone);
        tensionBar.appendChild(fishMarker);
        reelingExample.appendChild(tensionBar);
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.style.height = '15px';
        progressBar.style.background = 'rgba(0, 0, 0, 0.8)';
        progressBar.style.border = '2px solid white';
        progressBar.style.marginBottom = '10px';
        progressBar.style.position = 'relative';
        progressBar.style.overflow = 'hidden';
        
        const progressFill = document.createElement('div');
        progressFill.style.height = '100%';
        progressFill.style.background = 'white';
        progressFill.style.width = '60%'; // Example progress
        
        progressBar.appendChild(progressFill);
        reelingExample.appendChild(progressBar);
        
        // Add instructions
        const instructions = document.createElement('div');
        instructions.textContent = 'Keep the fish in the target zone to fill the progress meter!';
        instructions.style.textAlign = 'center';
        instructions.style.marginTop = '10px';
        instructions.style.color = '#d0d0d0';
        instructions.style.fontSize = '14px';
        
        container.appendChild(reelingExample);
        container.appendChild(instructions);
    }

    createAnimatedReelingExample() {
        const container = document.querySelector('.tutorial-image-container');
        container.innerHTML = `
            <div class="tutorial-reeling-animation">
                <div class="tutorial-tension-bar">
                    <div class="tutorial-fish-marker"></div>
                    <div class="tutorial-target-zone"></div>
                </div>
                <div class="tutorial-progress-container">
                    <div class="tutorial-progress-fill"></div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .tutorial-reeling-animation {
                width: 100%;
                max-width: 400px;
                margin: 20px auto;
                padding: 20px;
            }

            .tutorial-tension-bar {
                height: 40px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid white;
                position: relative;
                margin-bottom: 20px;
            }

            .tutorial-target-zone {
                position: absolute;
                width: 20%;
                height: 100%;
                background: rgba(255, 255, 255, 0.3);
                border-left: 2px solid white;
                border-right: 2px solid white;
                animation: tutorialTargetMove 4s forwards;
            }

            .tutorial-fish-marker {
                position: absolute;
                width: 4px;
                height: 100%;
                background: #ffeb3b;
                left: 75%;
            }

            .tutorial-progress-container {
                height: 20px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid white;
                overflow: hidden;
            }

            .tutorial-progress-fill {
                height: 100%;
                width: 0%;
                background: white;
                animation: tutorialFillProgress 4s forwards;
            }

            @keyframes tutorialTargetMove {
                0% { left: 20%; }
                40% { left: 65%; }
                70%, 100% { left: 65%; }
            }
            @keyframes tutorialFillProgress {
                0% { width: 0%; }
                40% { width: 0%; }
                70%, 100% { width: 100%; }
            }
        `;
        document.head.appendChild(style);
    }

    // Create new mobile-specific casting example method
    createMobileCastingExample(container) {
        container.innerHTML = `
            <div class="casting-example mobile">
                <div class="casting-instructions">
                    <div class="instruction left">Tap to begin cast</div>
                    <div class="mobile-power-bar">
                        <div class="mobile-power-fill"></div>
                    </div>
                    <div class="instruction right">Tap to release</div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .casting-example.mobile {
                display: flex;
                justify-content: center;
                margin: 5px 0;
            }

            .mobile-power-bar {
                width: 25px;
                height: 100px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #666;
                border-radius: 12px;
                position: relative;
                overflow: hidden;
            }

            .mobile-power-fill {
                position: absolute;
                bottom: 0;
                width: 100%;
                background: linear-gradient(to bottom, #ff4444, #ffff44);
                border-radius: 12px;
                animation: mobileFillMeter 3s infinite;
            }

            .casting-example.mobile .instruction {
                color: #4a90e2;
                font-size: 12px;
                text-shadow: 0 0 5px #4a90e2;
                white-space: nowrap;
            }

            .casting-example.mobile .instruction.left {
                text-align: right;
                width: 120px;
                opacity: 0;
                animation: mobileFadeIn 0.5s forwards;
            }

            .casting-example.mobile .instruction.right {
                text-align: left;
                width: 120px;
                opacity: 0;
                animation: mobileFadeIn 0.5s forwards;
                animation-delay: 1.5s;
            }

            .casting-example.mobile .casting-instructions {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            @keyframes mobileFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes mobileFillMeter {
                0% { height: 0%; }
                50%, 100% { height: 100%; }
            }
        `;
        document.head.appendChild(style);
    }

    // Create new mobile-specific jigging example method
    createMobileJiggingExample(container) {
        container.innerHTML = `
            <div class="jigging-example mobile">
                <div class="mobile-jig-meter">
                    <div class="jig-section top"></div>
                    <div class="jig-section middle"></div>
                    <div class="jig-section bottom"></div>
                    <div class="mobile-jig-ball"></div>
                </div>
                <div class="mobile-checkmark"></div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .jigging-example.mobile {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                margin: 5px 0;
            }

            .mobile-jig-meter {
                width: 32px;
                height: 100px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid #666;
                border-radius: 16px;
                position: relative;
                overflow: hidden;
            }

            .mobile-jig-meter .jig-section {
                height: 33.33%;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .mobile-jig-ball {
                width: 20px;
                height: 20px;
                background: linear-gradient(to bottom, #ff4444 50%, #fff 50%);
                border-radius: 50%;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                animation: mobileJigMove 3s forwards;
            }

            .mobile-checkmark {
                color: #4CAF50;
                font-size: 26px;
                opacity: 0;
                animation: mobileShowCheck 3s forwards;
            }

            .mobile-checkmark::after {
                content: "✓";
            }
            
            @keyframes mobileJigMove {
                0% { top: 10px; }
                99%, 100% { top: 50%; transform: translate(-50%, -50%); }
            }

            @keyframes mobileShowCheck {
                0%, 60% { opacity: 0; }
                66%, 80% { opacity: 1; }
                81%, 100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    nextStep() {
        if (this.currentStep < this.tutorialSteps.length - 1) {
            this.currentStep++;
            this.updateTutorialContent();
        } else {
            this.closeTutorial();
            hytopia.sendData({
                type: 'tutorialCompleted'
            });
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateTutorialContent();
        }
    }

    // Method to show tutorial for new players
    showForNewPlayer() {
        hytopia.sendData({
            type: 'checkNewPlayer'
        });
    }

    // Add style to hide chat window
    addHideChatStyle() {
        // Create style element if it doesn't exist
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'tutorial-chat-style';
            this.styleElement.textContent = `
                #chat-window {
                    display: none !important;
                }
            `;
            document.head.appendChild(this.styleElement);
        }
    }

    // Remove style to show chat window
    removeHideChatStyle() {
        // Remove style element if it exists
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }


    // Add these methods to the TutorialPanel class
    hideMobileControls() {
        // Common mobile control button IDs and classes
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
            document.getElementById('mobile-break-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button, .mobile-button');
        
        // Hide elements by ID
        mobileControls.forEach(element => {
            if (element) {
                console.log(`Tutorial hiding mobile control: ${element.id}`);
                element.style.display = 'none';
            }
        });
        
        // Hide elements by class
        controlButtons.forEach(button => {
            if (button) {
                console.log('Tutorial hiding mobile control button by class');
                button.style.display = 'none';
            }
        });
    }

    showMobileControls() {
        // Common mobile control button IDs and classes
        const mobileControls = [
            document.getElementById('jump-button'),
            document.getElementById('break-button'),
            document.getElementById('mobile-movement-area'),
            document.getElementById('mobile-look-area'),
            document.getElementById('mobile-build-button'),
            document.getElementById('mobile-jump-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-break-button'),
            document.getElementById('mobile-fishing-button'),
            document.getElementById('mobile-cast-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button, .mobile-button');
        
        // Show elements by ID
        mobileControls.forEach(element => {
            if (element) {
                console.log(`Tutorial showing mobile control: ${element.id}`);
                element.style.display = '';  // Reset to default display value
            }
        });
        
        // Show elements by class
        controlButtons.forEach(button => {
            if (button) {
                console.log('Tutorial showing mobile control button by class');
                button.style.display = '';   // Reset to default display value
            }
        });
    }

    // Add this method to adjust content for mobile
    adjustContentForMobile() {
        if (!hytopia.isMobile) return;
        
        // Calculate available height for the image container
        const tutorialContainer = document.querySelector('.tutorial-container');
        const header = document.querySelector('.tutorial-header');
        const textElement = document.getElementById('tutorial-text');
        const navigation = document.querySelector('.tutorial-navigation');
        const imageContainer = document.querySelector('.tutorial-image-container');
        
        if (tutorialContainer && header && textElement && navigation && imageContainer) {
            // Get viewport height
            const viewportHeight = window.innerHeight;
            
            
            // Calculate available height
            const headerHeight = header.offsetHeight;
            const textHeight = textElement.offsetHeight;
            const navigationHeight = navigation.offsetHeight;
            const paddingHeight = 24; // Account for padding
            
            const availableHeight = viewportHeight - headerHeight - textHeight - navigationHeight - paddingHeight;
            
            // Set a minimum height but allow it to grow if space is available
            imageContainer.style.minHeight = `${Math.max(150, availableHeight)}px`;
            imageContainer.style.flex = '1';
        }
    }

    // Add this method to update steps for mobile
    updateMobileSteps() {
        if (!this.tutorialSteps || !Array.isArray(this.tutorialSteps)) return;
        
        // Clone steps to avoid modifying originals
        this.mobileSteps = JSON.parse(JSON.stringify(this.tutorialSteps));
        
        // Update text for mobile controls
        this.mobileSteps.forEach(step => {
            if (step.text) {
                // Replace keyboard references with mobile controls
                step.text = step.text
                    .replace(/right mouse button/g, "fishing button (🎣)")
                    .replace(/TAP 'Q'/g, "TAP the fishing button (🎣)")
                    .replace(/HOLD Q/g, "HOLD the fishing button (🎣)")
                    .replace(/left mouse button/g, "break button (👊)");
                    
                // Make text more concise if needed
                if (step.text.length > 120) {
                    // Keep it simpler for mobile
                    step.mobileConciseText = step.text
                        .replace(/\. /g, ".\n")
                        .replace(/\s+/g, " ")
                        .trim();
                }
            }
        });
    }

}

// Make it globally available
window.TutorialPanel = new TutorialPanel();
console.log('TutorialPanel global object created');