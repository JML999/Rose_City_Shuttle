class BoatControlsPanel {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.joystick = null;
        this.activePointerId = null;
        this.startX = 0;
        this.startY = 0;
        this.maxRadius = 96;
        this.currentInput = { w: false, a: false, s: false, d: false };
        this.inputLoopRaf = null;
    }

    initialize(containerId) {
        this.container = document.getElementById(containerId);
        
        
        // Create virtual joystick
        this.createVirtualJoystick();
        
        if (!this.joystick || !this.joystick.container) {
            console.error('[BoatControls] Failed to create joystick!');
            return;
        }
        
        
        this.addStyles();
        this.setupNativeJoystickBlocking();
        
        // Listen for boat state changes
        hytopia.onData((data) => {
            if (data.type === 'boatMounted') {
                this.show();
            } else if (data.type === 'boatDismounted') {
                this.hide();
            }
        });
    }

    /**
     * Create virtual joystick element
     */
    createVirtualJoystick() {
        const container = document.createElement('div');
        container.className = 'boat-joystick';
        container.id = 'boat-joystick-container';
        
        const base = document.createElement('div');
        base.className = 'boat-joystick__base';
        
        const knob = document.createElement('div');
        knob.className = 'boat-joystick__knob';
        
        container.appendChild(base);
        container.appendChild(knob);
        
        // Append to body (not container) so it can be positioned anywhere
        document.body.appendChild(container);
        
        this.joystick = {
            container,
            base,
            knob,
            activePointerId: null,
            startX: 0,
            startY: 0,
            maxRadius: 96
        };
        
        this.preventIOSZoom(container);
        this.setupJoystickHandlers();
    }

    /**
     * Prevent iOS zoom gestures
     */
    preventIOSZoom(target) {
        if (!target || target.__iosZoomGuarded) return;
        
        const preventDefault = (e) => {
            try { e.preventDefault(); } catch {}
        };
        
        // Block pinch/magnify gestures
        ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) => {
            try { target.addEventListener(evt, preventDefault, { passive: false }); } catch {}
        });
        
        // Block double-tap zoom and two-finger starts
        try {
            target.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length > 1) {
                    preventDefault(e);
                }
            }, { passive: false });
            
            target.addEventListener('dblclick', preventDefault, { passive: false });
        } catch {}
        
        target.__iosZoomGuarded = true;
    }

    /**
     * Check if pointer event is from touch/pen (not mouse)
     */
    isTouchPointer(evt) {
        return !evt.pointerType || evt.pointerType === 'touch' || evt.pointerType === 'pen';
    }

    /**
     * Press/release input key
     */
    pressInput(key, pressed) {
        try {
            if (typeof hytopia !== 'undefined' && hytopia.pressInput) {
                hytopia.pressInput(key, pressed);
                return true;
            }
        } catch (error) {
            console.warn('[BoatControls] pressInput failed for', key, error);
        }
        return false;
    }

    /**
     * Set input state and update visual feedback
     */
    setInput(key, pressed) {
        if (this.currentInput[key] === pressed) return;
        
        this.currentInput[key] = pressed;
        this.pressInput(key, pressed);
        
        if (pressed) {
            this.ensureInputLoop();
        } else if (!this.currentInput.w && !this.currentInput.a && !this.currentInput.s && !this.currentInput.d) {
            this.stopInputLoop();
        }
    }

    /**
     * Ensure continuous input loop is running
     */
    ensureInputLoop() {
        if (this.inputLoopRaf !== null) return;
        
        const tick = () => {
            // If no inputs are active, stop the loop
            if (!this.currentInput.w && !this.currentInput.a && !this.currentInput.s && !this.currentInput.d) {
                this.inputLoopRaf = null;
                return;
            }
            
            // Keep inputs pressed
            if (this.currentInput.w) this.pressInput('w', true);
            if (this.currentInput.a) this.pressInput('a', true);
            if (this.currentInput.s) this.pressInput('s', true);
            if (this.currentInput.d) this.pressInput('d', true);
            
            this.inputLoopRaf = window.requestAnimationFrame(tick);
        };
        
        this.inputLoopRaf = window.requestAnimationFrame(tick);
    }

    /**
     * Stop input loop
     */
    stopInputLoop() {
        if (this.inputLoopRaf !== null) {
            window.cancelAnimationFrame(this.inputLoopRaf);
            this.inputLoopRaf = null;
        }
    }

    /**
     * Show joystick at touch position
     */
    showJoystick(pointerId, x, y) {
        if (!this.joystick || !this.joystick.container) {
            console.error('[BoatControls] Joystick not initialized!');
            return;
        }
        
        this.joystick.activePointerId = pointerId;
        this.joystick.startX = x;
        this.joystick.startY = y;
        
        const baseRadius = this.joystick.base.offsetWidth / 2;
        if (baseRadius) {
            this.joystick.maxRadius = Math.max(60, baseRadius * 0.45);
        }
        
        this.joystick.container.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.joystick.knob.style.transform = 'translate3d(0px, 0px, 0px)';
        this.joystick.container.classList.add('is-active');
        
    }

    /**
     * Update joystick knob position
     */
    updateJoystickPosition(x, y) {
        if (this.joystick.activePointerId === null) return;
        
        const dx = x - this.joystick.startX;
        const dy = y - this.joystick.startY;
        const distance = Math.hypot(dx, dy);
        const max = this.joystick.maxRadius;
        
        let clampedX = dx;
        let clampedY = dy;
        
        if (distance > max) {
            const scale = max / (distance || 1);
            clampedX *= scale;
            clampedY *= scale;
        }
        
        this.joystick.knob.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
        
        // Convert joystick position to WASD input
        this.updateInputFromJoystick(clampedX, clampedY, max);
    }

    /**
     * Convert joystick position to WASD input
     * Only sends W/S (forward/back) - camera handles steering (no A/D)
     */
    updateInputFromJoystick(x, y, maxRadius) {
        // Normalize to -1 to 1 range
        const normalizedY = -y / maxRadius; // Invert Y (screen Y is down, game Y is up)
        
        // Deadzone to prevent accidental input
        const deadzone = 0.2;
        const absY = Math.abs(normalizedY);
        
        if (absY < deadzone) {
            // Clear forward/back inputs (but always clear A/D since we don't use them)
            this.setInput('w', false);
            this.setInput('s', false);
            this.setInput('a', false);
            this.setInput('d', false);
            return;
        }
        
        // Calculate direction threshold
        const threshold = 0.3; // Minimum value to trigger input
        
        // Forward/Back (W/S) only - ignore left/right
        // Camera (right thumbstick) handles all steering
        if (normalizedY > threshold) {
            this.setInput('w', true);
            this.setInput('s', false);
        } else if (normalizedY < -threshold) {
            this.setInput('w', false);
            this.setInput('s', true);
        } else {
            this.setInput('w', false);
            this.setInput('s', false);
        }
        
        // Always clear A/D - camera handles steering
        this.setInput('a', false);
        this.setInput('d', false);
    }

    /**
     * Hide joystick
     */
    hideJoystick() {
        this.joystick.activePointerId = null;
        this.joystick.container.classList.remove('is-active');
        this.joystick.knob.style.transform = 'translate3d(0px, 0px, 0px)';
        
        // Clear all inputs
        this.setInput('w', false);
        this.setInput('a', false);
        this.setInput('s', false);
        this.setInput('d', false);
    }

    /**
     * Setup joystick event handlers
     */
    setupJoystickHandlers() {
        const pointerDownHandler = (evt) => {
            if (!this.isVisible) {
                return;
            }
            if (!this.isTouchPointer(evt)) {
                return;
            }
            
            // Only handle touches in left 40% of screen (joystick area)
            const screenWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            if (evt.clientX > screenWidth * 0.4) {
                return;
            }
            
            // Don't handle if it's on an interactive element
            if (evt.target.closest('button, a, input, select, textarea, [role="button"], .mobile-button, .boat-button')) {
                return;
            }
            
            evt.preventDefault();
            evt.stopPropagation();
            
            this.showJoystick(evt.pointerId, evt.clientX, evt.clientY);
            
            try {
                this.joystick.container.setPointerCapture(evt.pointerId);
            } catch (e) {
                console.warn('[BoatControls] Failed to capture pointer:', e);
            }
        };
        
        const pointerMoveHandler = (evt) => {
            if (!this.isVisible) return;
            if (this.joystick.activePointerId === null) return;
            if (this.joystick.activePointerId !== evt.pointerId) return;
            
            evt.preventDefault();
            evt.stopPropagation();
            
            this.updateJoystickPosition(evt.clientX, evt.clientY);
        };
        
        const pointerUpHandler = (evt) => {
            if (!this.isVisible) return;
            if (this.joystick.activePointerId !== evt.pointerId) return;
            
            evt.preventDefault();
            evt.stopPropagation();
            
            this.hideJoystick();
        };
        
        // Use capture phase to intercept before native handlers
        // Listen on window, not joystick container (since container is hidden initially)
        const capturePassiveFalse = { capture: true, passive: false };
        
        window.addEventListener('pointerdown', pointerDownHandler, capturePassiveFalse);
        window.addEventListener('pointermove', pointerMoveHandler, capturePassiveFalse);
        window.addEventListener('pointerup', pointerUpHandler, capturePassiveFalse);
        window.addEventListener('pointercancel', pointerUpHandler, capturePassiveFalse);
        
        // Store handlers for cleanup
        this._joystickHandlers = {
            pointerDown: pointerDownHandler,
            pointerMove: pointerMoveHandler,
            pointerUp: pointerUpHandler
        };
    }

    /**
     * Setup native joystick blocking
     */
    setupNativeJoystickBlocking() {
        // Block native joystick in left 40% of screen when boating
        const pointerDownHandler = (evt) => {
            if (!this.isVisible) return;
            if (!this.isTouchPointer(evt)) return;
            
            // Check if touch is in left 40% of screen (native joystick area)
            const screenWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const isInJoystickArea = evt.clientX < screenWidth * 0.4;
            
            // Don't block if it's on our joystick (it handles its own events)
            const isOurJoystick = evt.target.closest('.boat-joystick');
            
            if (isInJoystickArea && !isOurJoystick) {
                // Block native joystick
                try {
                    evt.preventDefault();
                    evt.stopPropagation();
                } catch {}
            }
        };
        
        const pointerMoveHandler = (evt) => {
            if (!this.isVisible) return;
            if (!this.isTouchPointer(evt)) return;
            
            const screenWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const isInJoystickArea = evt.clientX < screenWidth * 0.4;
            const isOurJoystick = evt.target.closest('.boat-joystick');
            
            if (isInJoystickArea && !isOurJoystick) {
                try {
                    evt.preventDefault();
                    evt.stopPropagation();
                } catch {}
            }
        };
        
        // Use capture phase to intercept before native handlers
        const capturePassiveFalse = { capture: true, passive: false };
        
        window.addEventListener('pointerdown', pointerDownHandler, capturePassiveFalse);
        window.addEventListener('pointermove', pointerMoveHandler, capturePassiveFalse);
        
        // Store handlers for cleanup
        this._nativeJoystickBlockers = {
            pointerDown: pointerDownHandler,
            pointerMove: pointerMoveHandler
        };
    }

    /**
     * Clear all inputs
     */
    clearAllInputs() {
        this.setInput('w', false);
        this.setInput('a', false);
        this.setInput('s', false);
        this.setInput('d', false);
        this.hideJoystick();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Virtual Joystick Styles */
            .boat-joystick {
                position: fixed;
                pointer-events: none;
                z-index: 9000;
                display: none;
                transform: translate3d(0, 0, 0);
                will-change: transform;
            }
            
            .boat-joystick.is-active {
                display: block;
                pointer-events: auto;
            }
            
            .boat-joystick__base {
                width: 192px;
                height: 192px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid #666;
                position: relative;
                opacity: 0.6;
                transform: translate(-50%, -50%);
            }
            
            .boat-joystick.is-active .boat-joystick__base {
                opacity: 0.8;
            }
            
            .boat-joystick__knob {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #999;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                will-change: transform;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    show() {
        this.isVisible = true;
        document.body.classList.add('boating');
    }

    hide() {
        this.isVisible = false;
        document.body.classList.remove('boating');
        
        // Clear all inputs when hiding
        this.clearAllInputs();
        
        // Cleanup on window blur
        window.addEventListener('blur', () => {
            if (this.isVisible) {
                this.clearAllInputs();
            }
        }, { once: true });
    }
}

// Make it globally available as singleton instance
window.BoatControlsPanel = new BoatControlsPanel();
