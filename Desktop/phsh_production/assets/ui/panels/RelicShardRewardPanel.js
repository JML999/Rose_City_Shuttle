// Relic Shard Reward Panel - Shows a single relic shard with 3D rotating model
class RelicShardRewardPanel {
    constructor() {
        this.isVisible = false;
        this.modelScene = null;
        this.modelCamera = null;
        this.modelRenderer = null;
        this.shardModel = null;
        this.animationId = null;
        this.container = null;
        this.modelContainer = null;
        this.THREE = null;
        this.GLTFLoader = null;
        this.styleElement = null;
        this.basePosition = { x: 0, y: 0, z: 0 };
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('[RelicShardReward] Container not found:', containerId);
            return;
        }

        // Initialize Three.js
        this.THREE = hytopia.three;
        this.GLTFLoader = hytopia.gltfLoader.GLTFLoader;
        
        if (!this.THREE || !this.GLTFLoader) {
            console.error('[RelicShardReward] Three.js or GLTFLoader not available');
            return;
        }

        // Create panel HTML
        this.createPanelHTML();
        this.addStyles();
        this.setupEventListeners();
        this.setupMessageHandlers();
        
        // Initialize 3D scene
        this.initializeScene();
        
        console.log('[RelicShardReward] Panel initialized successfully');
    }

    setupMessageHandlers() {
        // Set up message handling for relic shard reward
        hytopia.onData((data) => {
            if (data.type === 'showRelicShardReward') {
                this.showShard(data.shardData);
            }
        });
    }

    createPanelHTML() {
        const panel = document.createElement('div');
        panel.id = 'relic-shard-reward-overlay';
        panel.innerHTML = `
            <div class="relic-shard-container">
                <div class="relic-shard-header">
                    <div class="relic-shard-title">✨ Ancient Artifact ✨</div>
                    <button class="relic-shard-close-btn" id="relic-shard-close-btn">×</button>
                </div>
                
                <div class="relic-shard-content">
                    <div class="relic-shard-model-section">
                        <div class="relic-shard-model-container" id="relic-shard-model-container">
                            <!-- 3D model will be rendered here -->
                            <div class="relic-shard-model-loading">Loading model...</div>
                        </div>
                        <div class="relic-shard-model-shadow"></div>
                    </div>
                    <div class="relic-shard-content-wrapper">
                        <div class="relic-shard-text-section">
                            <div class="relic-shard-description" id="relic-shard-description-text">
                                <p>You were rewarded a strange, ancient artifact - could be useful. Perhaps there are others like it, or a place where it belongs...</p>
                            </div>
                        </div>
                        <button class="relic-shard-accept-btn" id="relic-shard-accept-btn">Accept</button>
                    </div>
                </div>
                
                <div class="relic-shard-particles" id="relic-shard-particles"></div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.modelContainer = document.getElementById('relic-shard-model-container');
        
        // Hide initially
        document.getElementById('relic-shard-reward-overlay').style.display = 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Relic Shard Reward Panel Styles */
            :root {
                --relic-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                --relic-bg-primary: linear-gradient(145deg, #1a1a1a, #0f0f0f);
                --relic-bg-secondary: linear-gradient(135deg, #2a2a2a, #1e1e1e);
                --relic-border: #333;
                --relic-border-light: #444;
                --relic-text: #ffffff;
                --relic-text-muted: #cccccc;
                --relic-purple: #9d4edd;
                --relic-purple-light: #c77dff;
                --relic-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
                --relic-shadow-inset: inset 0 2px 8px rgba(0, 0, 0, 0.6);
            }

            #relic-shard-reward-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(8px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 4000;
                font-family: var(--relic-font);
                user-select: none;
            }

            .relic-shard-container {
                background: var(--relic-bg-primary);
                border: 2px solid var(--relic-border);
                border-radius: 16px;
                box-shadow: var(--relic-shadow), 
                           inset 0 1px 0 rgba(255, 255, 255, 0.1),
                           0 0 40px rgba(157, 78, 221, 0.3);
                width: 700px;
                max-width: 95vw;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                animation: relicSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes relicSlideIn {
                0% {
                    transform: scale(0.8) translateY(50px);
                    opacity: 0;
                }
                100% {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }

            .relic-shard-header {
                padding: 16px 20px;
                background: var(--relic-bg-secondary);
                border-bottom: 1px solid var(--relic-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                overflow: hidden;
            }

            .relic-shard-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(157, 78, 221, 0.2), transparent);
                animation: relicHeaderShine 3s ease-in-out infinite;
            }

            @keyframes relicHeaderShine {
                0%, 100% { left: -100%; }
                50% { left: 100%; }
            }

            .relic-shard-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--relic-purple-light);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                letter-spacing: 1px;
                animation: relicGlow 2s ease-in-out infinite alternate;
            }

            @keyframes relicGlow {
                0% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(157, 78, 221, 0.3); }
                100% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(157, 78, 221, 0.6); }
            }

            .relic-shard-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid var(--relic-border);
                border-radius: 50%;
                color: var(--relic-text-muted);
                font-size: 20px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .relic-shard-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: var(--relic-text);
                transform: scale(1.1);
            }

            .relic-shard-content {
                padding: 24px;
                display: flex;
                flex-direction: row;
                align-items: flex-start;
                gap: 24px;
                min-height: 300px;
            }
            
            .relic-shard-content-wrapper {
                display: flex;
                flex-direction: column;
                flex: 1;
                gap: 20px;
            }

            .relic-shard-model-section {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                flex-shrink: 0;
            }

            .relic-shard-model-container {
                width: 200px;
                height: 200px;
                background: radial-gradient(circle, rgba(157, 78, 221, 0.1) 0%, transparent 70%);
                border: 2px solid var(--relic-border-light);
                border-radius: 50%;
                position: relative;
                overflow: hidden;
                box-shadow: var(--relic-shadow-inset),
                           0 0 30px rgba(157, 78, 221, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .relic-shard-model-loading {
                color: var(--relic-text-muted);
                font-size: 14px;
                animation: relicPulse 2s ease-in-out infinite;
            }

            @keyframes relicPulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }

            .relic-shard-model-shadow {
                width: 150px;
                height: 15px;
                background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
                border-radius: 50%;
                margin-top: 10px;
                animation: relicShadowPulse 2s ease-in-out infinite;
            }

            @keyframes relicShadowPulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.1); opacity: 0.6; }
            }

            .relic-shard-text-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }

            .relic-shard-description {
                color: var(--relic-text);
                font-size: 16px;
                line-height: 1.6;
                padding: 20px;
                background: rgba(157, 78, 221, 0.05);
                border: 1px solid rgba(157, 78, 221, 0.2);
                border-radius: 8px;
                flex: 1;
            }

            .relic-shard-description p {
                margin: 0;
            }

            .relic-shard-accept-btn {
                background: linear-gradient(135deg, #9d4edd, #c77dff);
                border: 2px solid #9d4edd;
                border-radius: 12px;
                color: white;
                font-size: 16px;
                font-weight: 700;
                padding: 12px 32px;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 6px 20px rgba(157, 78, 221, 0.4);
                align-self: center;
                width: 100%;
                max-width: 300px;
            }

            .relic-shard-accept-btn:hover {
                background: linear-gradient(135deg, #c77dff, #e0aaff);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(157, 78, 221, 0.5);
            }

            .relic-shard-accept-btn:active {
                transform: translateY(0);
            }

            .relic-shard-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
            }

            /* Mobile Responsive */
            @media (max-width: 768px), (pointer: coarse) {
                .relic-shard-container {
                    width: 90vw;
                    max-height: 85vh;
                    height: auto;
                    margin: 0 auto;
                }
                
                .relic-shard-header {
                    padding: 12px 16px;
                }
                
                .relic-shard-title {
                    font-size: 14px;
                    line-height: 1.2;
                }
                
                .relic-shard-content {
                    padding: 16px !important;
                    gap: 16px !important;
                    flex-direction: column;
                    min-height: auto;
                    overflow-y: auto;
                }
                
                .relic-shard-model-section {
                    align-self: center;
                }
                
                .relic-shard-model-container {
                    width: 150px;
                    height: 150px;
                }
                
                .relic-shard-model-shadow {
                    width: 120px;
                    height: 12px;
                    margin-top: 8px;
                }
                
                .relic-shard-text-section {
                    min-height: auto;
                }
                
                .relic-shard-description {
                    font-size: 14px;
                    padding: 16px;
                }
                
                .relic-shard-accept-btn {
                    font-size: 14px;
                    padding: 10px 24px;
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    initializeScene() {
        if (!this.modelContainer || !this.THREE) return;

        // Create scene
        this.modelScene = new this.THREE.Scene();
        this.modelScene.background = null; // Transparent

        // Create camera
        this.modelCamera = new this.THREE.PerspectiveCamera(
            50, // FOV
            1, // Aspect ratio (will be updated)
            0.1,
            1000
        );
        this.modelCamera.position.set(0, 0, 4);

        // Create renderer
        this.modelRenderer = new this.THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this.modelRenderer.setPixelRatio(window.devicePixelRatio);
        this.modelRenderer.shadowMap.enabled = true;
        this.modelRenderer.shadowMap.type = this.THREE.PCFSoftShadowMap;

        // Create lighting
        const ambientLight = new this.THREE.AmbientLight(0xffffff, 0.6);
        this.modelScene.add(ambientLight);

        const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.modelScene.add(directionalLight);

        const fillLight = new this.THREE.DirectionalLight(0x9d4edd, 0.3);
        fillLight.position.set(-5, 0, -5);
        this.modelScene.add(fillLight);

        console.log('[RelicShardReward] 3D scene initialized');
    }

    showShard(shardData) {
        // Update description text if provided
        if (shardData.text) {
            const descEl = document.getElementById('relic-shard-description-text');
            if (descEl) {
                descEl.innerHTML = `<p>${shardData.text}</p>`;
            }
        }
        
        // Update title if provided
        if (shardData.name) {
            const titleEl = document.querySelector('.relic-shard-title');
            if (titleEl) {
                titleEl.textContent = `✨ ${shardData.name} ✨`;
            }
        }
        
        // Load and display model
        this.loadShardModel(shardData);
        
        // Show overlay
        const overlay = document.getElementById('relic-shard-reward-overlay');
        overlay.style.display = 'flex';
        this.isVisible = true;
        
        // Disable player input
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();
        
        // Hide mobile controls (jump and break buttons)
        if (hytopia.isMobile) {
            this.hideMobileControls();
        }
        
        // Start particles
        this.createParticles();
        
        console.log('[RelicShardReward] Showing reward:', shardData.id || 'relic_shard');
    }

    loadShardModel(shardData) {
        if (!this.GLTFLoader || !this.modelScene) return;

        // Clear existing model
        if (this.shardModel) {
            this.modelScene.remove(this.shardModel);
            this.shardModel = null;
        }

        // Hide loading text, show model container
        const loadingEl = this.modelContainer.querySelector('.relic-shard-model-loading');
        if (loadingEl) loadingEl.style.display = 'none';

        // Get model URL - use shardData model or default to relic_shard
        const baseUrl = this.getAssetBaseUrl();
        const modelId = shardData.id || 'relic_shard';
        const modelPath = shardData.modelUri || `models/items/${modelId}.gltf`;
        const modelUrl = `${baseUrl}/${modelPath}`;
        
        const loader = new this.GLTFLoader();
        
        loader.load(
            modelUrl,
            (gltf) => {
                console.log('[RelicShardReward] Model loaded:', gltf);
                this.shardModel = gltf.scene;
                
                // Setup model
                this.setupModel();
                this.modelScene.add(this.shardModel);
                
                // Start rendering
                this.startRendering();
            },
            (progress) => {
                console.log('[RelicShardReward] Loading progress:', progress);
            },
            (error) => {
                console.error('[RelicShardReward] Error loading model:', error);
                // Fallback to a default display
                this.showModelFallback();
            }
        );
    }

    setupModel() {
        if (!this.shardModel || !this.THREE) return;

        // Center and scale the model
        const box = new this.THREE.Box3().setFromObject(this.shardModel);
        const center = box.getCenter(new this.THREE.Vector3());
        const size = box.getSize(new this.THREE.Vector3());
        
        // Scale to fit nicely in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.0 / maxDim;
        this.shardModel.scale.setScalar(scale);
        
        // Center the model and store base position
        this.basePosition = {
            x: -center.x * scale,
            y: -center.y * scale,
            z: -center.z * scale
        };
        
        this.shardModel.position.x = this.basePosition.x;
        this.shardModel.position.y = this.basePosition.y;
        this.shardModel.position.z = this.basePosition.z;
        
        // Enable shadows
        this.shardModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance materials for better appearance
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
        
        console.log('[RelicShardReward] Model setup complete');
    }

    startRendering() {
        if (!this.modelRenderer || !this.modelContainer) return;

        // Resize renderer to fit container
        const rect = this.modelContainer.getBoundingClientRect();
        this.modelRenderer.setSize(rect.width, rect.height);
        this.modelCamera.aspect = rect.width / rect.height;
        this.modelCamera.updateProjectionMatrix();

        // Append renderer to container
        this.modelContainer.innerHTML = '';
        this.modelContainer.appendChild(this.modelRenderer.domElement);

        // Start animation loop
        this.animate();
    }

    animate = () => {
        if (!this.isVisible || !this.modelRenderer || !this.modelScene || !this.modelCamera) return;

        this.animationId = requestAnimationFrame(this.animate);

        // Rotate the model
        if (this.shardModel && this.basePosition) {
            // Only rotate around Y axis
            this.shardModel.rotation.y += 0.01;
            
            // Add gentle floating motion (only Y movement)
            this.shardModel.position.y = this.basePosition.y + Math.sin(Date.now() * 0.002) * 0.1;
            
            // Keep X and Z at base position (properly centered)
            this.shardModel.position.x = this.basePosition.x;
            this.shardModel.position.z = this.basePosition.z;
        }

        this.modelRenderer.render(this.modelScene, this.modelCamera);
    }

    showModelFallback() {
        this.modelContainer.innerHTML = `
            <div class="relic-shard-model-loading">
                <div style="font-size: 48px; margin-bottom: 8px;">✨</div>
                <div>Relic Shard</div>
            </div>
        `;
    }

    createParticles() {
        const particlesContainer = document.getElementById('relic-shard-particles');
        if (!particlesContainer) return;

        // Clear existing particles
        particlesContainer.innerHTML = '';

        // Create floating particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: ${this.getRandomParticleColor()};
                border-radius: 50%;
                pointer-events: none;
                animation: relicFloat${Math.floor(Math.random() * 3) + 1} ${3 + Math.random() * 2}s ease-in-out infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${0.3 + Math.random() * 0.7};
            `;
            particlesContainer.appendChild(particle);
        }

        // Add keyframes for particle animations
        if (!document.getElementById('relic-particle-animations')) {
            const particleStyle = document.createElement('style');
            particleStyle.id = 'relic-particle-animations';
            particleStyle.textContent = `
                @keyframes relicFloat1 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                @keyframes relicFloat2 {
                    0%, 100% { transform: translateX(0px) rotate(0deg); }
                    50% { transform: translateX(20px) rotate(180deg); }
                }
                @keyframes relicFloat3 {
                    0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
                    50% { transform: translate(-15px, -15px) rotate(360deg); }
                }
            `;
            document.head.appendChild(particleStyle);
        }
    }

    getRandomParticleColor() {
        const colors = ['#9d4edd', '#c77dff', '#e0aaff', '#7b2cbf', '#5a189a', '#240046'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    setupEventListeners() {
        // Close button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'relic-shard-close-btn') {
                this.close();
            }
        });

        // Accept button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'relic-shard-accept-btn' || e.target.closest('#relic-shard-accept-btn')) {
                this.acceptShard();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.close();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isVisible && this.modelRenderer) {
                this.resizeRenderer();
            }
        });
    }

    resizeRenderer() {
        if (!this.modelRenderer || !this.modelContainer || !this.modelCamera) return;

        const rect = this.modelContainer.getBoundingClientRect();
        this.modelRenderer.setSize(rect.width, rect.height);
        this.modelCamera.aspect = rect.width / rect.height;
        this.modelCamera.updateProjectionMatrix();
    }

    acceptShard() {
        console.log('[RelicShardReward] Shard accepted');
        
        // Add accept animation
        const acceptBtn = document.getElementById('relic-shard-accept-btn');
        if (acceptBtn) {
            acceptBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                acceptBtn.style.transform = '';
            }, 150);
        }

        // Send accept event to server (optional - shard already in inventory)
        hytopia.sendData({
            type: 'relicShardAccepted'
        });

        // Close after brief delay
        setTimeout(() => {
            this.close();
        }, 500);
    }

    close() {
        if (!this.isVisible) return;

        // Hide overlay
        const overlay = document.getElementById('relic-shard-reward-overlay');
        overlay.style.display = 'none';
        this.isVisible = false;

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up model
        if (this.shardModel && this.modelScene) {
            this.modelScene.remove(this.shardModel);
            this.shardModel = null;
        }

        // Re-enable player input
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();

        // Show mobile controls (jump and break buttons)
        if (hytopia.isMobile) {
            this.showMobileControls();
        }

        console.log('[RelicShardReward] Panel closed');
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'relic-shard-reward-chat-style';
            this.styleElement.textContent = `#chat-window { display: none !important; }`;
            document.head.appendChild(this.styleElement);
        }
    }

    removeHideChatStyle() {
        if (this.styleElement) {
            document.head.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

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
            document.getElementById('mobile-quest-button'),
            document.getElementById('mobile-break-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Hide elements by ID
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Hide elements by class
        controlButtons.forEach(button => {
            if (button) {
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
            document.getElementById('mobile-cast-button'),
            document.getElementById('mobile-interact-button'),
            document.getElementById('mobile-fishing-button'),
            document.getElementById('mobile-quest-button'),
            document.getElementById('mobile-break-button')
        ];
        
        // Also try to get elements by class
        const controlButtons = document.querySelectorAll('.mobile-control-button');
        
        // Show elements by ID
        mobileControls.forEach(element => {
            if (element) {
                element.style.display = '';
            }
        });
        
        // Show elements by class
        controlButtons.forEach(button => {
            if (button) {
                button.style.display = '';
            }
        });
    }

    getAssetBaseUrl() {
        if (typeof window.CDN_ASSETS_URL !== 'undefined' && window.CDN_ASSETS_URL) {
            return window.CDN_ASSETS_URL;
        }
        
        const scriptTags = document.getElementsByTagName('script');
        for (let i = 0; i < scriptTags.length; i++) {
            const src = scriptTags[i].src;
            if (src && src.includes('/ui/panels/')) {
                return src.substring(0, src.indexOf('/ui/panels/'));
            }
        }
        
        return window.location.origin;
    }
}

// Make it globally available
window.RelicShardRewardPanel = new RelicShardRewardPanel();

