// Zephyr Rod Reward Panel - Shows the zephyr rod with 3D rotating model
class ZephyrRodRewardPanel {
    constructor() {
        this.isVisible = false;
        this.modelScene = null;
        this.modelCamera = null;
        this.modelRenderer = null;
        this.rodModel = null;
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
            console.error('[ZephyrRodReward] Container not found:', containerId);
            return;
        }

        // Initialize Three.js
        this.THREE = hytopia.three;
        this.GLTFLoader = hytopia.gltfLoader.GLTFLoader;
        
        if (!this.THREE || !this.GLTFLoader) {
            console.error('[ZephyrRodReward] Three.js or GLTFLoader not available');
            return;
        }

        // Create panel HTML
        this.createPanelHTML();
        this.addStyles();
        this.setupEventListeners();
        this.setupMessageHandlers();
        
        // Initialize 3D scene
        this.initializeScene();
        
        console.log('[ZephyrRodReward] Panel initialized successfully');
    }

    setupMessageHandlers() {
        // Set up message handling for zephyr rod reward
        hytopia.onData((data) => {
            if (data.type === 'showZephyrRodReward') {
                this.showRod(data.rodData);
            }
        });
    }

    createPanelHTML() {
        const panel = document.createElement('div');
        panel.id = 'zephyr-rod-reward-overlay';
        panel.innerHTML = `
            <div class="zephyr-rod-container">
                <div class="zephyr-rod-header">
                    <div class="zephyr-rod-title">✨ Zephyr Rod Unlocked! ✨</div>
                    <button class="zephyr-rod-close-btn" id="zephyr-rod-close-btn">×</button>
                </div>
                
                <div class="zephyr-rod-content">
                    <div class="zephyr-rod-model-section">
                        <div class="zephyr-rod-model-container" id="zephyr-rod-model-container">
                            <!-- 3D model will be rendered here -->
                            <div class="zephyr-rod-model-loading">Loading model...</div>
                        </div>
                        <div class="zephyr-rod-model-shadow"></div>
                    </div>
                    <button class="zephyr-rod-claim-btn" id="zephyr-rod-claim-btn">Claim Rod</button>
                </div>
                
                <div class="zephyr-rod-particles" id="zephyr-rod-particles"></div>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.modelContainer = document.getElementById('zephyr-rod-model-container');
        
        // Hide initially
        document.getElementById('zephyr-rod-reward-overlay').style.display = 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Zephyr Rod Reward Panel Styles */
            :root {
                --zephyr-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                --zephyr-bg-primary: linear-gradient(145deg, #1a1a1a, #0f0f0f);
                --zephyr-bg-secondary: linear-gradient(135deg, #2a2a2a, #1e1e1e);
                --zephyr-border: #333;
                --zephyr-border-light: #444;
                --zephyr-text: #ffffff;
                --zephyr-text-muted: #cccccc;
                --zephyr-gold: #ffd700;
                --zephyr-orange: #ff8000;
                --zephyr-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
                --zephyr-shadow-inset: inset 0 2px 8px rgba(0, 0, 0, 0.6);
            }

            #zephyr-rod-reward-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(8px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 4000;
                font-family: var(--zephyr-font);
                user-select: none;
            }

            .zephyr-rod-container {
                background: var(--zephyr-bg-primary);
                border: 2px solid var(--zephyr-border);
                border-radius: 16px;
                box-shadow: var(--zephyr-shadow), 
                           inset 0 1px 0 rgba(255, 255, 255, 0.1),
                           0 0 40px rgba(255, 128, 0, 0.3);
                width: 600px;
                max-width: 95vw;
                max-height: 90vh;
                overflow: hidden;
                position: relative;
                animation: zephyrSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes zephyrSlideIn {
                0% {
                    transform: scale(0.8) translateY(50px);
                    opacity: 0;
                }
                100% {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }

            .zephyr-rod-header {
                padding: 16px 20px;
                background: var(--zephyr-bg-secondary);
                border-bottom: 1px solid var(--zephyr-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                overflow: hidden;
            }

            .zephyr-rod-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 128, 0, 0.2), transparent);
                animation: zephyrHeaderShine 3s ease-in-out infinite;
            }

            @keyframes zephyrHeaderShine {
                0%, 100% { left: -100%; }
                50% { left: 100%; }
            }

            .zephyr-rod-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--zephyr-orange);
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
                letter-spacing: 1px;
                animation: zephyrGlow 2s ease-in-out infinite alternate;
            }

            @keyframes zephyrGlow {
                0% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 128, 0, 0.3); }
                100% { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 128, 0, 0.6); }
            }

            .zephyr-rod-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid var(--zephyr-border);
                border-radius: 50%;
                color: var(--zephyr-text-muted);
                font-size: 20px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .zephyr-rod-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: var(--zephyr-text);
                transform: scale(1.1);
            }

            .zephyr-rod-content {
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px;
                min-height: 400px;
            }

            .zephyr-rod-model-section {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
            }

            .zephyr-rod-model-container {
                width: 280px;
                height: 280px;
                background: radial-gradient(circle, rgba(255, 128, 0, 0.1) 0%, transparent 70%);
                border: 2px solid var(--zephyr-border-light);
                border-radius: 50%;
                position: relative;
                overflow: hidden;
                box-shadow: var(--zephyr-shadow-inset),
                           0 0 30px rgba(255, 128, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .zephyr-rod-model-loading {
                color: var(--zephyr-text-muted);
                font-size: 14px;
                animation: zephyrPulse 2s ease-in-out infinite;
            }

            @keyframes zephyrPulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }

            .zephyr-rod-model-shadow {
                width: 200px;
                height: 20px;
                background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
                border-radius: 50%;
                margin-top: 10px;
                animation: zephyrShadowPulse 2s ease-in-out infinite;
            }

            @keyframes zephyrShadowPulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.1); opacity: 0.6; }
            }

            .zephyr-rod-claim-btn {
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

            .zephyr-rod-claim-btn:hover {
                background: linear-gradient(135deg, #ff8c42, #ffab5e);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 107, 53, 0.5);
            }

            .zephyr-rod-claim-btn:active {
                transform: translateY(0);
            }

            .zephyr-rod-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
            }

            /* Mobile Responsive */
            @media (max-width: 768px), (pointer: coarse) {
                .zephyr-rod-container {
                    width: 53.4375vw;
                    max-height: 70.84vh;
                    height: auto;
                    margin: 0 auto;
                }
                
                .zephyr-rod-header {
                    padding: 6px 9px;
                }
                
                .zephyr-rod-title {
                    font-size: 10.5px;
                    line-height: 1.1;
                }
                
                .zephyr-rod-content {
                    padding: 6px !important;
                    gap: 3px !important;
                    min-height: auto;
                    overflow-y: auto;
                }
                
                .zephyr-rod-model-section {
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                }
                
                .zephyr-rod-model-container {
                    width: 120px;
                    height: 120px;
                    flex-shrink: 0;
                    margin-bottom: 0 !important;
                }
                
                .zephyr-rod-model-shadow {
                    margin-top: 3px !important;
                    height: 10px !important;
                    margin-bottom: 0 !important;
                }
                
                .zephyr-rod-claim-btn {
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

        console.log('[ZephyrRodReward] 3D scene initialized');
    }

    showRod(rodData) {
        // Load and display model
        this.loadRodModel(rodData);
        
        // Show overlay
        const overlay = document.getElementById('zephyr-rod-reward-overlay');
        overlay.style.display = 'flex';
        this.isVisible = true;
        
        // Disable player input
        hytopia.sendData({ type: 'disablePlayerInput' });
        this.addHideChatStyle();
        
        // Start particles
        this.createParticles();
        
        console.log('[ZephyrRodReward] Showing zephyr rod');
    }

    loadRodModel(rodData) {
        if (!this.GLTFLoader || !this.modelScene) return;

        // Clear existing model
        if (this.rodModel) {
            this.modelScene.remove(this.rodModel);
            this.rodModel = null;
        }

        // Hide loading text, show model container
        const loadingEl = this.modelContainer.querySelector('.zephyr-rod-model-loading');
        if (loadingEl) loadingEl.style.display = 'none';

        // Get model URL - keystone rod model path
        const baseUrl = this.getAssetBaseUrl();
        const modelUrl = `${baseUrl}/models/items/keystone_rod.gltf`;
        
        const loader = new this.GLTFLoader();
        
        loader.load(
            modelUrl,
            (gltf) => {
                console.log('[ZephyrRodReward] Model loaded:', gltf);
                this.rodModel = gltf.scene;
                
                // Setup model
                this.setupModel();
                this.modelScene.add(this.rodModel);
                
                // Start rendering
                this.startRendering();
            },
            (progress) => {
                console.log('[ZephyrRodReward] Loading progress:', progress);
            },
            (error) => {
                console.error('[ZephyrRodReward] Error loading model:', error);
                // Fallback to a default display
                this.showModelFallback();
            }
        );
    }

    setupModel() {
        if (!this.rodModel || !this.THREE) return;

        // Center and scale the model
        const box = new this.THREE.Box3().setFromObject(this.rodModel);
        const center = box.getCenter(new this.THREE.Vector3());
        const size = box.getSize(new this.THREE.Vector3());
        
        // Scale to fit nicely in view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        this.rodModel.scale.setScalar(scale);
        
        // Center the model and store base position
        this.basePosition = {
            x: -center.x * scale,
            y: -center.y * scale,
            z: -center.z * scale
        };
        
        this.rodModel.position.x = this.basePosition.x;
        this.rodModel.position.y = this.basePosition.y;
        this.rodModel.position.z = this.basePosition.z;
        
        // Enable shadows
        this.rodModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance materials for better appearance
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });
        
        console.log('[ZephyrRodReward] Model setup complete');
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
        if (this.rodModel && this.basePosition) {
            // Only rotate around Y axis
            this.rodModel.rotation.y += 0.01;
            
            // Add gentle floating motion (only Y movement)
            this.rodModel.position.y = this.basePosition.y + Math.sin(Date.now() * 0.002) * 0.1;
            
            // Keep X and Z at base position (properly centered)
            this.rodModel.position.x = this.basePosition.x;
            this.rodModel.position.z = this.basePosition.z;
        }

        this.modelRenderer.render(this.modelScene, this.modelCamera);
    }

    showModelFallback() {
        this.modelContainer.innerHTML = `
            <div class="zephyr-rod-model-loading">
                <div style="font-size: 48px; margin-bottom: 8px;">🎣</div>
                <div>Zephyr Rod</div>
            </div>
        `;
    }

    createParticles() {
        const particlesContainer = document.getElementById('zephyr-rod-particles');
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
                animation: zephyrFloat${Math.floor(Math.random() * 3) + 1} ${3 + Math.random() * 2}s ease-in-out infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: ${0.3 + Math.random() * 0.7};
            `;
            particlesContainer.appendChild(particle);
        }

        // Add keyframes for particle animations
        if (!document.getElementById('zephyr-particle-animations')) {
            const particleStyle = document.createElement('style');
            particleStyle.id = 'zephyr-particle-animations';
            particleStyle.textContent = `
                @keyframes zephyrFloat1 {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                @keyframes zephyrFloat2 {
                    0%, 100% { transform: translateX(0px) rotate(0deg); }
                    50% { transform: translateX(20px) rotate(180deg); }
                }
                @keyframes zephyrFloat3 {
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
            if (e.target.id === 'zephyr-rod-close-btn') {
                this.close();
            }
        });

        // Claim button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'zephyr-rod-claim-btn' || e.target.closest('#zephyr-rod-claim-btn')) {
                this.claimRod();
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

    claimRod() {
        console.log('[ZephyrRodReward] Rod claimed');
        
        // Add claim animation
        const claimBtn = document.getElementById('zephyr-rod-claim-btn');
        if (claimBtn) {
            claimBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                claimBtn.style.transform = '';
            }, 150);
        }

        // Send claim event to server
        hytopia.sendData({
            type: 'zephyrRodClaimed'
        });

        // Close after brief delay
        setTimeout(() => {
            this.close();
        }, 500);
    }

    close() {
        if (!this.isVisible) return;

        // Hide overlay
        const overlay = document.getElementById('zephyr-rod-reward-overlay');
        overlay.style.display = 'none';
        this.isVisible = false;

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up model
        if (this.rodModel && this.modelScene) {
            this.modelScene.remove(this.rodModel);
            this.rodModel = null;
        }

        // Re-enable player input
        hytopia.sendData({ type: 'enablePlayerInput' });
        this.removeHideChatStyle();

        console.log('[ZephyrRodReward] Panel closed');
    }

    addHideChatStyle() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'zephyr-rod-reward-chat-style';
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
window.ZephyrRodRewardPanel = new ZephyrRodRewardPanel();

