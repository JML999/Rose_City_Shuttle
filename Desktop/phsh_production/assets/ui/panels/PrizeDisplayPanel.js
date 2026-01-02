// Prize Display Panel - Shows wheel spin prizes with 3D rotating models
class PrizeDisplayPanel {
    constructor() {
        this.isVisible = false;
        this.currentPrize = null;
        this.modelScene = null;
        this.modelCamera = null;
        this.modelRenderer = null;
        this.prizeModel = null;
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
            console.error('[PrizeDisplay] Container not found:', containerId);
            return;
        }

        // Initialize Three.js
        this.THREE = hytopia.three;
        this.GLTFLoader = hytopia.gltfLoader.GLTFLoader;
        
        if (!this.THREE || !this.GLTFLoader) {
            console.error('[PrizeDisplay] Three.js or GLTFLoader not available');
            return;
        }

        // Create panel HTML
        this.createPanelHTML();
        this.addStyles();
        this.setupEventListeners();
        this.setupMessageHandlers();
        
        // Initialize 3D scene
        this.initializeScene();
        
    }

    setupMessageHandlers() {
        // Set up message handling for prize display
        hytopia.onData((data) => {
            if (data.type === 'showPrizeDisplay') {
                this.showPrize(data.prizeData);
            }
        });
    }

    createPanelHTML() {
        const panel = document.createElement('div');
        panel.id = 'prize-display-overlay';
        panel.innerHTML = `
            <div class="prize-display-container">
                <div class="prize-header">
                    <div class="prize-title">🎉 CONGRATULATIONS! 🎉</div>
                    <button class="prize-close-btn" id="prize-close-btn">×</button>
                </div>
                
                <div class="prize-content">
                    <div class="prize-name" id="prize-name"></div>
                    <div class="prize-model-section">
                        <div class="model-container" id="prize-model-container">
                            <!-- 3D model will be rendered here -->
                            <div class="model-loading">Loading model...</div>
                        </div>
                        <div class="model-shadow"></div>
                    </div>
                    <button class="prize-claim-btn" id="prize-claim-btn">Claim Prize</button>
                </div>
                
                <div class="prize-particles" id="prize-particles"></div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.modelContainer = document.getElementById('prize-model-container');
        
        // Hide initially
        document.getElementById('prize-display-overlay').style.display = 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Prize Display Panel Styles */
            :root {
                --prize-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                --prize-bg-primary: linear-gradient(145deg, #1a1a1a, #0f0f0f);
                --prize-bg-secondary: linear-gradient(135deg, #2a2a2a, #1e1e1e);
                --prize-bg-tertiary: rgba(0, 0, 0, 0.8);
                --prize-border: #333;
                --prize-border-light: #444;
                --prize-border-glow: rgba(255, 215, 0, 0.3);
                --prize-text: #ffffff;
                --prize-text-muted: #cccccc;
                --prize-text-dim: #888;
                --prize-gold: #ffd700;
                --prize-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
                --prize-shadow-inset: inset 0 2px 8px rgba(0, 0, 0, 0.6);
            }

            #prize-display-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(8px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 4000;
                font-family: var(--prize-font);
                user-select: none;
            }

            .prize-display-container {
                background: var(--prize-bg-primary);
                border: 2px solid var(--prize-border);
                border-radius: 16px;
                box-shadow: var(--prize-shadow), 
                           inset 0 1px 0 rgba(255, 255, 255, 0.1),
                           0 0 40px rgba(255, 215, 0, 0.2);
                width: 600px;
                max-width: 95vw;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                animation: prizeSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes prizeSlideIn {
                0% {
                    transform: scale(0.8) translateY(50px);
                    opacity: 0;
                }
                100% {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }

            .prize-header {
                padding: 16px 20px;
                background: var(--prize-bg-secondary);
                border-bottom: 1px solid var(--prize-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                overflow: hidden;
            }

            .prize-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                animation: prizeHeaderShine 3s ease-in-out infinite;
            }

            @keyframes prizeHeaderShine {
                0%, 100% { left: -100%; }
                50% { left: 100%; }
            }

            .prize-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--prize-gold);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                letter-spacing: 1px;
                animation: prizeGlow 2s ease-in-out infinite alternate;
            }

            @keyframes prizeGlow {
                0% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 215, 0, 0.3); }
                100% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6); }
            }

            .prize-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid var(--prize-border);
                border-radius: 50%;
                color: var(--prize-text-muted);
                font-size: 20px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .prize-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: var(--prize-text);
                transform: scale(1.1);
            }

            .prize-content {
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px;
                min-height: 400px;
            }

            .prize-model-section {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }

            .model-container {
                width: 280px;
                height: 280px;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
                border: 2px solid var(--prize-border-light);
                border-radius: 50%;
                position: relative;
                overflow: hidden;
                box-shadow: var(--prize-shadow-inset),
                           0 0 30px rgba(255, 215, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .model-loading {
                color: var(--prize-text-muted);
                font-size: 14px;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }

            .model-shadow {
                width: 200px;
                height: 20px;
                background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
                border-radius: 50%;
                margin-top: 10px;
                animation: shadowPulse 2s ease-in-out infinite;
            }
            
            @media (max-width: 768px), (pointer: coarse) {
                .model-shadow {
                    margin-top: 3px !important;
                    height: 10px !important;
                }
            }

            @keyframes shadowPulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.1); opacity: 0.6; }
            }

            .prize-info-section {
                text-align: center;
                display: flex;
                flex-direction: column;
                gap: 12px;
                width: 100%;
            }

            .prize-name {
                font-size: 24px;
                font-weight: 700;
                color: var(--prize-text);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                animation: prizeNameGlow 3s ease-in-out infinite alternate;
            }

            @keyframes prizeNameGlow {
                0% { color: var(--prize-text); }
                100% { color: var(--prize-gold); }
            }

            .prize-rarity {
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 2px;
                padding: 6px 16px;
                border-radius: 20px;
                display: inline-block;
                margin: 0 auto;
                border: 1px solid;
                background: rgba(0, 0, 0, 0.3);
            }

            .prize-description {
                font-size: 14px;
                color: var(--prize-text-muted);
                line-height: 1.5;
                max-width: 400px;
                margin: 0 auto;
            }

            .prize-value {
                font-size: 28px;
                font-weight: 700;
                color: var(--prize-gold);
                font-family: 'Courier New', monospace;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                animation: valueShine 2s ease-in-out infinite;
            }

            @keyframes valueShine {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            .prize-claim-btn {
                background: linear-gradient(135deg, #ff6b35, #ff8c42);
                border: 2px solid #ff6b35;
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
                box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
            }

            .prize-claim-btn:hover {
                background: linear-gradient(135deg, #ff8c42, #ffab5e);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 107, 53, 0.5);
            }

            .prize-claim-btn:active {
                transform: translateY(0);
            }

            .btn-shine {
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                animation: btnShine 3s ease-in-out infinite;
            }

            @keyframes btnShine {
                0%, 100% { left: -100%; }
                50% { left: 100%; }
            }

            .prize-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
            }

            /* Rarity Colors */
            .rarity-common { 
                color: #ffffff; 
                border-color: #ffffff; 
                background: rgba(255, 255, 255, 0.1); 
            }
            .rarity-uncommon { 
                color: #00ff00; 
                border-color: #00ff00; 
                background: rgba(0, 255, 0, 0.1); 
            }
            .rarity-rare { 
                color: #0080ff; 
                border-color: #0080ff; 
                background: rgba(0, 128, 255, 0.1); 
            }
            .rarity-epic { 
                color: #8000ff; 
                border-color: #8000ff; 
                background: rgba(128, 0, 255, 0.1); 
            }
            .rarity-legendary { 
                color: #ff8000; 
                border-color: #ff8000; 
                background: rgba(255, 128, 0, 0.1); 
            }
            .rarity-mythic { 
                color: #ff0080; 
                border-color: #ff0080; 
                background: rgba(255, 0, 128, 0.1); 
            }

            /* Mobile Responsive */
            @media (max-width: 768px), (pointer: coarse) {
                .prize-display-container {
                    width: 53.4375vw;
                    max-height: 70.84vh;
                    height: auto;
                    margin: 0 auto;
                }
                
                .prize-header {
                    padding: 6px 9px;
                }
                
                .prize-title {
                    font-size: 10.5px;
                    line-height: 1.1;
                }
                
                .prize-content {
                    padding: 6px !important;
                    gap: 3px !important;
                    min-height: auto;
                    overflow-y: auto;
                }
                
                .prize-model-section {
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                }
                
                .model-container {
                    width: 120px;
                    height: 120px;
                    flex-shrink: 0;
                    margin-bottom: 0 !important;
                }
                
                .model-shadow {
                    margin-top: 3px !important;
                    height: 10px !important;
                    margin-bottom: 0 !important;
                }
                
                .prize-name {
                    font-size: 12px;
                    line-height: 1.2;
                    margin-bottom: 0 !important;
                }
                
                .prize-value {
                    font-size: 16px;
                }
                
                .prize-description {
                    font-size: 10px;
                    line-height: 1.3;
                }
                
                .prize-claim-btn {
                    font-size: 10px;
                    padding: 6px 12px;
                    margin-top: 0 !important;
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

        const fillLight = new this.THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 0, -5);
        this.modelScene.add(fillLight);

    }

    showPrize(prizeData) {
        this.currentPrize = prizeData;
        
        // Update prize info
        this.updatePrizeInfo(prizeData);
        
        // Load and display model
        this.loadPrizeModel(prizeData);
        
        // Show overlay
        const overlay = document.getElementById('prize-display-overlay');
        overlay.style.display = 'flex';
        this.isVisible = true;
        
        // Disable player input
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();
        
        // Start particles
        this.createParticles();
        
    }

    updatePrizeInfo(prizeData) {
        // Remove value display from the panel
        const nameEl = document.getElementById('prize-name');
        // const valueEl = document.getElementById('prize-value'); // REMOVE

        nameEl.textContent = prizeData.name || 'Mystery Prize';
        
        // Description and value display removed for cleaner UI
    }

    loadPrizeModel(prizeData) {
        if (!this.GLTFLoader || !this.modelScene) return;

        // Clear existing model
        if (this.prizeModel) {
            this.modelScene.remove(this.prizeModel);
            this.prizeModel = null;
        }

        // Hide loading text, show model container
        const loadingEl = this.modelContainer.querySelector('.model-loading');
        if (loadingEl) loadingEl.style.display = 'none';

        // Special handling for 'nothing' prize type
        if (prizeData.type === 'nothing') {
            this.showNoPrizeDisplay();
            return;
        }

        // Get model URL based on prize type
        let modelUrl = this.getPrizeModelUrl(prizeData);
        
        const loader = new this.GLTFLoader();
        
        loader.load(
            modelUrl,
            (gltf) => {
                this.prizeModel = gltf.scene;
                
                // Setup model
                this.setupModel();
                this.modelScene.add(this.prizeModel);
                
                // Start rendering
                this.startRendering();
            },
            (progress) => {
            },
            (error) => {
                console.error('[PrizeDisplay] Error loading model:', error);
                // Fallback to a default model or hide model section
                this.showModelFallback();
            }
        );
    }

    getPrizeModelUrl(prizeData) {
        const baseUrl = this.getAssetBaseUrl();
        
        // Map prize types to model URLs
        if (prizeData.type === 'chest') {
            switch (prizeData.rarity) {
                case 'legendary':
                    return `${baseUrl}/models/items/legendary_chest.gltf`;
                case 'rare':
                    return `${baseUrl}/models/items/rare_chest.gltf`;
                case 'common':
                default:
                    return `${baseUrl}/models/items/common_chest.gltf`;
            }
        } else if (prizeData.type === 'coins') {
            return `${baseUrl}/models/items/gold-coins-1.gltf`;
        }
        
        // Default fallback
        return `${baseUrl}/models/items/generic_item.gltf`;
    }

    setupModel() {
        if (!this.prizeModel || !this.THREE) return;

        // Center and scale the model
        const box = new this.THREE.Box3().setFromObject(this.prizeModel);
        const center = box.getCenter(new this.THREE.Vector3());
        const size = box.getSize(new this.THREE.Vector3());
        
        // Scale to fit nicely in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        this.prizeModel.scale.setScalar(scale);
        
        // Center the model and store base position
        this.basePosition = {
            x: -center.x * scale,
            y: -center.y * scale,
            z: -center.z * scale
        };
        
        this.prizeModel.position.x = this.basePosition.x;
        this.prizeModel.position.y = this.basePosition.y;
        this.prizeModel.position.z = this.basePosition.z;
        
        // Enable shadows
        this.prizeModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance materials for better appearance
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
        
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
        if (this.prizeModel && this.basePosition) {
            // Only rotate around Y axis
            this.prizeModel.rotation.y += 0.01;
            
            // Add gentle floating motion (only Y movement)
            this.prizeModel.position.y = this.basePosition.y + Math.sin(Date.now() * 0.002) * 0.1;
            
            // Keep X and Z at base position (properly centered)
            this.prizeModel.position.x = this.basePosition.x;
            this.prizeModel.position.z = this.basePosition.z;
        }

        this.modelRenderer.render(this.modelScene, this.modelCamera);
    }

    showModelFallback() {
        this.modelContainer.innerHTML = `
            <div class="model-loading">
                <div style="font-size: 48px; margin-bottom: 8px;">🎁</div>
                <div>Prize Model</div>
            </div>
        `;
    }

    showNoPrizeDisplay() {
        this.modelContainer.innerHTML = `
            <div class="model-loading" style="color: #ff6b6b; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 12px;">❌</div>
                <div style="font-size: 16px; font-weight: 600;">No Prize This Time</div>
                <div style="font-size: 12px; margin-top: 4px; opacity: 0.7;">Better luck next spin!</div>
            </div>
        `;
    }

    createParticles() {
        const particlesContainer = document.getElementById('prize-particles');
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
                animation: float${Math.floor(Math.random() * 3) + 1} ${3 + Math.random() * 2}s ease-in-out infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${0.3 + Math.random() * 0.7};
            `;
            particlesContainer.appendChild(particle);
        }

        // Add keyframes for particle animations
        if (!document.getElementById('particle-animations')) {
            const particleStyle = document.createElement('style');
            particleStyle.id = 'particle-animations';
            particleStyle.textContent = `
                @keyframes float1 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translateX(0px) rotate(0deg); }
                    50% { transform: translateX(20px) rotate(180deg); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
                    50% { transform: translate(-15px, -15px) rotate(360deg); }
                }
            `;
            document.head.appendChild(particleStyle);
        }
    }

    getRandomParticleColor() {
        const colors = ['#ffd700', '#ff8000', '#ff6b35', '#0080ff', '#8000ff', '#00ff00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    setupEventListeners() {
        // Close button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prize-close-btn') {
                this.close();
            }
        });

        // Claim button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prize-claim-btn' || e.target.closest('#prize-claim-btn')) {
                this.claimPrize();
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

    claimPrize() {
        
        // Add claim animation
        const claimBtn = document.getElementById('prize-claim-btn');
        if (claimBtn) {
            claimBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                claimBtn.style.transform = '';
            }, 150);
        }

        // Send claim event to server if needed
        hytopia.sendData({
            type: 'prizeClaimed',
            prizeData: this.currentPrize
        });

        // Close after brief delay
        setTimeout(() => {
            this.close();
        }, 500);
    }

    close() {
        if (!this.isVisible) return;

        // Hide overlay
        const overlay = document.getElementById('prize-display-overlay');
        overlay.style.display = 'none';
        this.isVisible = false;

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up model
        if (this.prizeModel && this.modelScene) {
            this.modelScene.remove(this.prizeModel);
            this.prizeModel = null;
        }

        // Re-enable player input
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();

        // Clear current prize
        this.currentPrize = null;

    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'prize-display-chat-style';
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
window.PrizeDisplayPanel = new PrizeDisplayPanel(); 