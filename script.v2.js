// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("App initializing...");
    let timer;
    try {
        timer = new PomodoroTimer();
    } catch (e) {
        console.error("Failed to initialize Timer:", e);
    }

    try {
        window.bgAnimation = new BackgroundAnimation();
    } catch (e) {
        console.error("Animation failed:", e);
    }

    const splash = document.getElementById('splash-screen');
    const splashGrid = document.querySelector('.splash-grid');
    const container = document.querySelector('.glass-container');

    // Splash Grid Auto-Scaling (The "Perfect Fit" Engine)
    const adjustSplashScaling = () => {
        if (!splashGrid) return;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const isMobile = vw < 600;

        if (isMobile) {
            splashGrid.style.transform = 'none';
            splashGrid.style.width = '90%';
            
            const gridHeight = splashGrid.scrollHeight;
            const containerHeight = vh * 0.55; // Use 55% of screen height for grid
            
            if (gridHeight > containerHeight) {
                const scale = containerHeight / gridHeight;
                splashGrid.style.transform = `scale(${Math.min(scale, 1)})`;
                splashGrid.style.transformOrigin = 'center center';
                console.log(`Auto-Scaling Splash Grid: ${scale.toFixed(2)}`);
            } else {
                splashGrid.style.transform = 'none';
            }
        } else {
            splashGrid.style.transform = 'none';
        }
    };

    const handleSplashCardClick = (card, customTimer = null) => {
        console.log("Splash Card clicked:", customTimer ? customTimer.name : card.dataset.work || card.dataset.mode);

        if (timer) {
            try {
                timer.toggleFullScreen();
            } catch (e) { console.warn("Fullscreen failed", e); }
        }

        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                document.body.classList.remove('splash-active');
            }, 500);
        }

        if (container) {
            container.style.display = 'flex';
            void container.offsetWidth; // Trigger reflow
            container.style.opacity = '1';
        }

        if (timer) {
            if (customTimer) {
                timer.selectCustomTimer(customTimer);
                timer.start();
            } else if (card.dataset.mode === 'zen') {
                const zenBtn = document.getElementById('zen-mode-btn');
                if (zenBtn) timer.setMode(zenBtn);
            } else {
                const workMins = card.dataset.work;
                const modeBtn = document.querySelector(`.mode-btn[data-work="${workMins}"]`);
                if (modeBtn) timer.setMode(modeBtn);
                timer.start();
            }
        }
    };

    // Inject Custom Timers
    if (timer && timer.customTimers && timer.customTimers.length > 0 && splashGrid) {
        timer.customTimers.forEach(ct => {
            const el = document.createElement('button');
            el.className = 'splash-card custom-card';
            el.dataset.customId = ct.id;
            el.innerHTML = `
                <div class="card-icon">⭐</div>
                <div class="card-content">
                    <h3>${ct.name}</h3>
                    <p>${ct.work}-${ct.break}</p>
                </div>
            `;
            el.addEventListener('click', () => handleSplashCardClick(el, ct));
            splashGrid.appendChild(el);
        });
    }

    const staticCards = document.querySelectorAll('.splash-card:not(.custom-card)');
    staticCards.forEach(card => {
        card.addEventListener('click', () => handleSplashCardClick(card));
    });

    // Initial scale
    setTimeout(adjustSplashScaling, 100);
    window.addEventListener('resize', adjustSplashScaling);

    // Universal Exit Button Listener
    const exitToMenuBtn = document.getElementById('zen-exit-btn');
    if (exitToMenuBtn) {
        exitToMenuBtn.addEventListener('click', () => {
            if (timer) {
                if (timer.isZenMode) timer.stopZenMode();
                else timer.pause();
                
                // Return to Splash
                if (splash && container) {
                    container.style.opacity = '0';
                    setTimeout(() => {
                        container.style.display = 'none';
                        splash.style.display = 'flex';
                        void splash.offsetWidth;
                        splash.style.opacity = '1';
                        document.body.classList.add('splash-active');
                        adjustSplashScaling(); // Re-scale
                    }, 500);
                }
            }
        });
    }

    // Mark as initial splash active
    document.body.classList.add('splash-active');
});

class PomodoroTimer {
    constructor() {
        // Configuration
        this.workDuration = 25 * 60;
        this.breakDuration = 5 * 60;

        // Custom Timers State
        this.customTimers = this.loadCustomTimers();
        this.activeCustomTimerId = null;
        this.pendingMode = null;

        // State
        this.currentTime = this.workDuration;
        this.isWorkTime = true;
        this.isRunning = false;
        this.timerId = null;

        // Sound System (Lightweight)
        this.soundManager = new SimpleSoundManager();

        // Theme Init: ALWAYS start as Campfire (User Request)
        this.userPreferredTheme = 'campfire';
        document.body.dataset.theme = 'campfire';

        // DOM Elements
        this.timerElement = document.getElementById('timer');
        this.statusElement = document.getElementById('status-indicator');
        this.controlHintElement = document.getElementById('control-hint');
        this.progressRing = document.querySelector('.progress-ring__circle');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.body = document.body;

        // SVG Circle Stats
        if (this.progressRing) {
            this.radius = this.progressRing.r.baseVal.value;
            this.circumference = 2 * Math.PI * this.radius;
        }

        this.init();
    }

    init() {
        this.updateDateDisplay();
        this.updateClockDisplay();
        this.updateInstructions();

        // Setup initial UI
        this.updateDisplay();
        this.setupEventListeners();

        // Setup Progress Ring
        if (this.progressRing) {
            this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
            this.progressRing.style.strokeDashoffset = 0;
        }

        // Update Date every minute
        setInterval(() => this.updateDateDisplay(), 60000);
        // Update Clock every second
        setInterval(() => this.updateClockDisplay(), 1000);
    }

    updateInstructions() {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const instruction = document.querySelector('.instruction');
        if (instruction) {
            if (isTouch) {
                instruction.innerHTML = 'Tap <span class="key-hint">Timer</span> to <span id="control-hint">Start</span>';
            } else {
                instruction.innerHTML = 'Press <span class="key-hint">Space</span> to <span id="control-hint">Start</span>';
            }
            // Re-fetch control-hint element as it was just overwritten
            this.controlHintElement = document.getElementById('control-hint');
        }
    }

    updateDateDisplay() {
        const dateElement = document.getElementById('date-display');
        if (dateElement) {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            dateElement.textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
        }
    }

    updateClockDisplay() {
        const clockElement = document.getElementById('clock-display');
        if (clockElement) {
            clockElement.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
        }
    }

    // applyUserTheme removed to enforce Campfire default

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            // Ignore if user is typing in an input or if a button is focused (to avoid double-fire)
            if (e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                (e.code === 'Space' && e.target.tagName === 'BUTTON')) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isZenMode) {
                    this.toggleZenSound();
                } else {
                    this.toggleTimer();
                }
            } else if (e.code === 'Tab') {
                e.preventDefault();
                this.cycleModes();
            } else if (e.code === 'KeyF') {
                const container = document.querySelector('.glass-container');
                const isTimerPage = container && window.getComputedStyle(container).display !== 'none';

                if (isTimerPage) {
                    e.preventDefault();
                    this.toggleFullScreen();
                }
            } else if (e.code === 'Escape') {
                const settingsModal = document.getElementById('theme-modal');
                const customModal = document.getElementById('custom-timer-modal');
                let handled = false;

                if (settingsModal && settingsModal.classList.contains('visible')) {
                    e.preventDefault();
                    settingsModal.classList.remove('visible');
                    setTimeout(() => settingsModal.classList.add('hidden'), 300);
                    handled = true;
                }

                if (customModal && customModal.classList.contains('visible')) {
                    e.preventDefault();
                    customModal.classList.remove('visible');
                    setTimeout(() => customModal.classList.add('hidden'), 300);
                    handled = true;
                }

                if (!handled && document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
        });

        const skipBtn = document.getElementById('skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.switchMode();
            });
        }

        const timerView = document.getElementById('timer-view');
        if (timerView) {
            timerView.style.cursor = 'pointer';
            
            let lastTap = 0;
            let touchStartY = 0;
            let touchStartX = 0;

            const handleInteraction = (e) => {
                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;

                // 1. Double Tap Detection
                if (now - lastTap < DOUBLE_TAP_DELAY) {
                    console.log("Double Tap detected - Skipping");
                    if (this.isZenMode) {
                        this.stopZenMode();
                    } else {
                        this.switchMode();
                    }
                    this.vibrate(100);
                    lastTap = 0;
                    return;
                }
                lastTap = now;

                // 2. Single Tap Action
                setTimeout(() => {
                    if (lastTap === now) {
                        if (this.isZenMode) {
                            this.toggleZenSound();
                        } else {
                            this.toggleTimer();
                        }
                        this.vibrate(50);
                    }
                }, DOUBLE_TAP_DELAY);
            };

            timerView.addEventListener('click', (e) => {
                // Ignore clicks if they were actually swipes (handled by touch events)
                if (e.pointerType === 'touch') return; 
                handleInteraction(e);
            });

            timerView.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            timerView.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                const SWIPE_THRESHOLD = 50;

                if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
                    if (deltaY > 0) {
                        // Swipe Down - Reset
                        console.log("Swipe Down - Resetting");
                        this.resetTimerState();
                        this.vibrate([50, 30, 50]);
                    } else {
                        // Swipe Up - Settings
                        console.log("Swipe Up - Settings");
                        const settingsBtn = document.getElementById('settings-btn');
                        if (settingsBtn) settingsBtn.click();
                        this.vibrate(50);
                    }
                } else if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
                    // Swipe Left/Right - Cycle Modes
                    console.log("Swipe Horizontal - Cycling Modes");
                    this.cycleModes();
                    this.vibrate(50);
                } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                    // It's a tap
                    handleInteraction(e);
                }
            });
        }

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullScreen();
            });
        }

        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.mode-btn'); // Handle clicks on children if any
                if (!target) return;

                if (target.id === 'custom-timer-btn') {
                    this.openCustomTimerModal();
                } else {
                    this.setMode(target);
                }
            });
        });

        // Custom Timer Modal Listeners
        this.setupCustomTimerListeners();

        // Theme Modal Logic
        const settingsBtn = document.getElementById('settings-btn');
        const modal = document.getElementById('theme-modal');
        const closeBtn = document.getElementById('close-modal');
        const themeBtns = document.querySelectorAll('.theme-btn');

        if (settingsBtn && modal) {
            settingsBtn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                modal.classList.add('visible');

                // Initialize Volume Slider
                const volumeSlider = document.getElementById('volume-slider');
                if (volumeSlider && this.soundManager) {
                    volumeSlider.value = this.soundManager.volume * 100;
                }

                // Initialize Noise Controls
                if (this.soundManager) {
                    const noiseVolumeSlider = document.getElementById('noise-volume-slider');
                    if (noiseVolumeSlider) {
                        noiseVolumeSlider.value = this.soundManager.noiseVolume * 100;
                    }

                    const toggleBtn = document.getElementById('noise-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.textContent = this.soundManager.isPlayingNoise ? 'Stop' : 'Play';
                        if (this.soundManager.isPlayingNoise) toggleBtn.classList.add('active');
                    }
                }
            });
        }

        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            let lastBeep = 0;
            volumeSlider.addEventListener('input', (e) => {
                const val = e.target.value / 100;
                this.soundManager.setVolume(val);

                // Throttled beep: Play max once every 150ms to avoid machine-gun effect
                // But ensures feedback while sliding
                const now = Date.now();
                if (now - lastBeep > 150) {
                    // Play a short, distinct blip
                    this.soundManager.playTone(600, 'sine', 0.1);
                    lastBeep = now;
                }
            });

            // Ensure one final beep on release if not just played
            volumeSlider.addEventListener('change', () => {
                const now = Date.now();
                if (now - lastBeep > 150) {
                    this.soundManager.playTone(600, 'sine', 0.1);
                }
            });
        }

        // Ambient Sound Listeners
        const noiseToggleBtn = document.getElementById('noise-toggle-btn');
        if (noiseToggleBtn) {
            noiseToggleBtn.addEventListener('click', () => {
                if (!this.soundManager) return;
                const isPlaying = !this.soundManager.isPlayingNoise;
                this.soundManager.toggleNoise(isPlaying);

                noiseToggleBtn.textContent = isPlaying ? 'Stop' : 'Play';
                noiseToggleBtn.classList.toggle('active', isPlaying);
            });
        }

        const noiseVolumeSlider = document.getElementById('noise-volume-slider');
        if (noiseVolumeSlider) {
            noiseVolumeSlider.addEventListener('input', (e) => {
                if (!this.soundManager) return;
                const val = e.target.value / 100;
                this.soundManager.setNoiseVolume(val);
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('visible');
                setTimeout(() => modal.classList.add('hidden'), 300);
            });
        }

        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.setTheme(theme);
                this.userPreferredTheme = theme; // Update preference
                if (modal) {
                    modal.classList.remove('visible');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                }
            });
        });
    }

    setTheme(themeName) {
        document.body.dataset.theme = themeName;
        localStorage.setItem('focusFlowTheme', themeName);
        if (window.bgAnimation) {
            window.bgAnimation.updateTheme(themeName);
        }
    }

    toggleFullScreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const requestMethod = document.documentElement.requestFullscreen || 
                                document.documentElement.webkitRequestFullscreen || 
                                document.documentElement.mozRequestFullScreen || 
                                document.documentElement.msRequestFullscreen;
            
            if (requestMethod) {
                requestMethod.call(document.documentElement).then(() => {
                    if (navigator.keyboard && navigator.keyboard.lock) {
                        navigator.keyboard.lock(['Escape']).catch(e => console.log('Keyboard lock failed:', e));
                    }
                }).catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                console.log("Fullscreen API is not supported on this device/browser.");
                // For iOS, we can't do true fullscreen via JS on elements, but PWA handles it.
            }
        } else {
            const exitMethod = document.exitFullscreen || 
                             document.webkitExitFullscreen || 
                             document.mozCancelFullScreen || 
                             document.msExitFullscreen;
            if (exitMethod) {
                exitMethod.call(document);
            }
        }
    }

    cycleModes() {
        const buttons = Array.from(this.modeButtons);
        const activeIndex = buttons.findIndex(btn => btn.classList.contains('active'));
        const nextIndex = (activeIndex + 1) % buttons.length;
        this.setMode(buttons[nextIndex]);
    }

    setMode(targetBtn) {
        // Safety check for click target
        const btn = targetBtn.closest ? targetBtn.closest('.mode-btn') : targetBtn;
        if (!btn) return;

        // Visual Update (Always happen immediately for feedback)
        this.modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Check for Zen Mode
        if (btn.dataset.mode === 'zen') {
            this.startZenMode();
            return;
        }

        // If we were in Zen Mode, exit it first
        if (this.isZenMode) {
            this.stopZenMode();
        }

        // Parse Durations
        let workMins = parseInt(btn.dataset.work);
        let breakMins = parseInt(btn.dataset.break);

        if (isNaN(workMins)) workMins = 25;
        if (isNaN(breakMins)) breakMins = 5;

        const newWorkDuration = workMins * 60;
        const newBreakDuration = breakMins * 60;

        if (this.isRunning) {
            // Queue the switch
            this.pendingMode = {
                type: 'standard',
                workDuration: newWorkDuration,
                breakDuration: newBreakDuration
            };
            console.log("Mode switch queued:", this.pendingMode);
        } else {
            // Immediate Switch
            this.pendingMode = null;
            this.workDuration = newWorkDuration;
            this.breakDuration = newBreakDuration;
            this.activeCustomTimerId = null;
            this.resetTimerState();
        }
    }

    startZenMode() {
        if (this.isZenMode) return;

        console.log("Entering Zen Mode");
        this.isZenMode = true;
        this.pause(); // Stop any active timer
        this.isRunning = false; // Ensure state is clear

        // UI Changes
        document.body.classList.add('zen-mode-active');
        document.title = "Zen Mode - Focus Flow";

        // Start Rain Animation
        if (typeof ZenMode !== 'undefined') {
            ZenMode.start();
        }

        // Start Rain Sound (if available)
        if (this.soundManager) {
            // Ensure noise is playing
            if (!this.soundManager.isPlayingNoise) {
                this.soundManager.toggleNoise(true);
                // Update UI toggle button if exists
                const toggleBtn = document.getElementById('noise-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Stop';
                    toggleBtn.classList.add('active');
                }
            }
        }
    }

    stopZenMode() {
        if (!this.isZenMode) return;

        console.log("Exiting Zen Mode");
        this.isZenMode = false;

        // UI Changes
        document.body.classList.remove('zen-mode-active');
        document.title = "Focus Flow"; // Will be updated by timer display shortly

        // Stop Rain Animation
        if (typeof ZenMode !== 'undefined') {
            ZenMode.stop();
        }

        // Note: We deliberately do NOT stop the sound automatically. 
        // User might want to keep listening while working.
    }

    toggleZenSound() {
        if (!this.soundManager) return;

        // Toggle state
        const isPlaying = !this.soundManager.isPlayingNoise;
        this.soundManager.toggleNoise(isPlaying);

        // Sync UI Button if it exists (in the modal)
        const toggleBtn = document.getElementById('noise-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = isPlaying ? 'Stop' : 'Play';
            toggleBtn.classList.toggle('active', isPlaying);
        }
    }

    toggleTimer() {
        if (this.pendingMode) {
            // User confirmed the switch by pressing Start/Space
            this.applyPendingMode();
            this.start();
        } else if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.controlHintElement.textContent = 'Pause';
        this.soundManager.playStart();

        // Track strictly when this session started
        if (!this.sessionStartTime) {
            this.sessionStartTime = Date.now();
        }

        console.log("Timer Started. CurrentTime:", this.currentTime);

        this.timerId = setInterval(() => {
            console.log("Tick. CurrentTime:", this.currentTime);
            if (this.currentTime > 0) {
                this.currentTime--;
                this.updateDisplay();
                this.updateProgress();
            } else {
                console.log("Timer Expired naturally.");
                this.switchMode();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        this.controlHintElement.textContent = 'Resume';
        clearInterval(this.timerId);
        // Do NOT clear sessionStartTime here; we might resume. 
        // Only clear if we switch modes prematurely.
    }

    switchMode() {
        this.pause();
        this.soundManager.playComplete();

        // If we finish naturally, any pending manual switch is invalid/cancelled
        if (this.pendingMode) {
            console.log("Pending mode cancelled due to natural timer expiry.");
            this.pendingMode = null;
            this.restoreActiveButtonState();
        }

        // Logic simplified: No Stats Counting anymore.

        if (this.isWorkTime) {
            // FINISHED WORK
            console.log("Work finished.");
        } else {
            // FINISHED BREAK
            console.log("Break finished.");
        }

        // Reset for next phase
        this.sessionStartTime = null;
        this.isWorkTime = !this.isWorkTime;

        if (this.isWorkTime) {
            this.currentTime = this.workDuration;
            this.statusElement.textContent = 'Work Time';
            this.body.classList.remove('break-mode');
        } else {
            // Check if break is enabled
            if (this.breakDuration > 0) {
                this.currentTime = this.breakDuration;
                this.statusElement.textContent = 'Break Time';
                this.body.classList.add('break-mode');
            } else {
                // No Break: Loop back to work but PAUSE? 
                // Or just Stop?
                // Let's reset to work and pause.
                this.isWorkTime = true;
                this.currentTime = this.workDuration;
                this.statusElement.textContent = 'Work Time';
                this.body.classList.remove('break-mode');

                this.updateDisplay();
                this.updateProgress();
                this.controlHintElement.textContent = 'Start';
                return; // Do NOT auto-start
            }
        }

        this.updateDisplay();
        this.updateProgress();
        this.controlHintElement.textContent = 'Start';
        this.start();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;

        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.timerElement.textContent = formattedTime;
        document.title = `${formattedTime} - Focus Flow`;
    }

    updateProgress() {
        if (!this.progressRing) return;
        const totalTime = this.isWorkTime ? this.workDuration : this.breakDuration;
        const progress = this.currentTime / totalTime;
        const offset = this.circumference - (progress * this.circumference);

        this.progressRing.style.strokeDashoffset = offset;
    }

    // Helper to reset state to start of a session (Work)
    resetTimerState() {
        this.pause();
        this.isWorkTime = true;
        this.currentTime = this.workDuration;
        this.statusElement.textContent = 'Work Time';
        this.body.classList.remove('break-mode');
        this.controlHintElement.textContent = 'Start';

        this.updateDisplay();
        this.updateProgress();
    }

    applyPendingMode() {
        if (!this.pendingMode) return;

        this.workDuration = this.pendingMode.workDuration;
        this.breakDuration = this.pendingMode.breakDuration;

        if (this.pendingMode.type === 'custom') {
            this.activeCustomTimerId = this.pendingMode.customId;
        } else {
            this.activeCustomTimerId = null;
        }

        this.pendingMode = null;
        this.resetTimerState();
    }

    restoreActiveButtonState() {
        this.modeButtons.forEach(btn => btn.classList.remove('active'));

        if (this.activeCustomTimerId) {
            const customBtn = document.getElementById('custom-timer-btn');
            if (customBtn) customBtn.classList.add('active');
        } else {
            // Convert workDuration back to minutes to find matching button
            const workMins = Math.floor(this.workDuration / 60);
            const btn = document.querySelector(`.mode-btn[data-work="${workMins}"]`);
            if (btn) btn.classList.add('active');
        }
    }
    // Custom Timer Methods
    loadCustomTimers() {
        try {
            const saved = localStorage.getItem('pomodoroCustomTimers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load custom timers", e);
            return [];
        }
    }

    saveCustomTimers() {
        localStorage.setItem('pomodoroCustomTimers', JSON.stringify(this.customTimers));
    }

    setupCustomTimerListeners() {
        const modal = document.getElementById('custom-timer-modal');
        const closeBtn = document.getElementById('close-custom-modal');
        const addBtn = document.getElementById('add-new-timer-btn');
        const saveBtn = document.getElementById('save-new-timer-btn');
        const cancelBtn = document.getElementById('cancel-new-timer-btn');
        const listView = document.getElementById('custom-timer-list-view');
        const formView = document.getElementById('new-timer-form');

        if (!modal) return;

        // Close Modal
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('visible');
        });

        // Add New -> Show Form
        addBtn.addEventListener('click', () => {
            listView.classList.add('hidden');
            formView.classList.remove('hidden');
            // Reset form
            document.getElementById('new-timer-name').value = '';
            document.getElementById('new-timer-work').value = '25';
            document.getElementById('new-timer-break').value = '5';
            document.getElementById('new-timer-has-break').checked = true;
        });

        // Cancel -> Show List
        cancelBtn.addEventListener('click', () => {
            formView.classList.add('hidden');
            listView.classList.remove('hidden');
        });

        // Save
        saveBtn.addEventListener('click', () => {
            this.handleSaveCustomTimer();
        });

        // Checkbox toggle logic
        const breakCheck = document.getElementById('new-timer-has-break');
        const breakInput = document.getElementById('new-timer-break');
        breakCheck.addEventListener('change', (e) => {
            breakInput.disabled = !e.target.checked;
            if (!e.target.checked) breakInput.value = 0;
            else if (breakInput.value == 0) breakInput.value = 5;
        });
    }

    openCustomTimerModal() {
        const modal = document.getElementById('custom-timer-modal');
        const listView = document.getElementById('custom-timer-list-view');
        const formView = document.getElementById('new-timer-form');

        this.renderCustomTimerList();

        listView.classList.remove('hidden');
        formView.classList.add('hidden');
        modal.classList.remove('hidden');
        modal.classList.add('visible');
    }

    renderCustomTimerList() {
        const container = document.getElementById('custom-timers-list');
        container.innerHTML = '';

        if (this.customTimers.length === 0) {
            container.innerHTML = '<p class="empty-state">No custom timers yet.</p>';
            return;
        }

        this.customTimers.forEach(timer => {
            const item = document.createElement('div');
            item.className = 'custom-timer-item';

            const breakText = timer.hasBreak ? `• ${timer.break}m Break` : '• No Break';

            item.innerHTML = `
                <div class="timer-info">
                    <h4>${timer.name}</h4>
                    <p>${timer.work}m Work ${breakText}</p>
                </div>
                <div class="timer-actions">
                    <button class="delete-btn" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button class="secondary-btn play-custom-btn">Select</button>
                </div>
            `;

            // Handle Clicks
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCustomTimer(timer.id);
            });

            item.querySelector('.play-custom-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectCustomTimer(timer);
            });

            // Also click on whole item
            item.addEventListener('click', () => {
                this.selectCustomTimer(timer);
            });

            container.appendChild(item);
        });
    }

    handleSaveCustomTimer() {
        const nameInput = document.getElementById('new-timer-name');
        const workInput = document.getElementById('new-timer-work');
        const breakInput = document.getElementById('new-timer-break');
        const hasBreakInput = document.getElementById('new-timer-has-break');

        const name = nameInput.value.trim() || 'Custom Timer';
        const work = parseInt(workInput.value) || 25;
        let breakTime = parseInt(breakInput.value) || 5;
        const hasBreak = hasBreakInput.checked;

        if (!hasBreak) breakTime = 0;

        const newTimer = {
            id: Date.now(),
            name,
            work,
            break: breakTime,
            hasBreak
        };

        this.customTimers.push(newTimer);
        this.saveCustomTimers();

        // Return to list view
        document.getElementById('new-timer-form').classList.add('hidden');
        document.getElementById('custom-timer-list-view').classList.remove('hidden');
        this.renderCustomTimerList();
    }

    deleteCustomTimer(id) {
        if (confirm('Delete this timer?')) {
            this.customTimers = this.customTimers.filter(t => t.id !== id);
            this.saveCustomTimers();
            this.renderCustomTimerList();
        }
    }

    selectCustomTimer(timer) {
        // Visual Update
        this.modeButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById('custom-timer-btn').classList.add('active');

        // Close Modal
        document.getElementById('custom-timer-modal').classList.add('hidden');
        document.getElementById('custom-timer-modal').classList.remove('visible');

        const newWorkDuration = timer.work * 60;
        const newBreakDuration = timer.break * 60;

        if (this.isRunning) {
            // Queue switch
            this.pendingMode = {
                type: 'custom',
                workDuration: newWorkDuration,
                breakDuration: newBreakDuration,
                customId: timer.id
            };
            console.log("Custom timer switch queued:", this.pendingMode);
        } else {
            // Immediate
            this.pendingMode = null;
            this.workDuration = newWorkDuration;
            this.breakDuration = newBreakDuration;
            this.activeCustomTimerId = timer.id;
            this.resetTimerState();
        }
    }

    vibrate(pattern) {
        if ("vibrate" in navigator) {
            navigator.vibrate(pattern);
        }
    }
}

// Lightweight Sound Manager (No External Files)
class SimpleSoundManager {
    constructor() {
        this.ctx = null;
        this.volume = parseFloat(localStorage.getItem('focusFlowVolume')) || 0.5;

        // Ambient Noise State
        this.noiseVolume = parseFloat(localStorage.getItem('focusFlowNoiseVolume')) || 0.5;
        this.isPlayingNoise = false;

        // Crossfade Loop State
        this.rainBuffer = null;
        this.nextStartTime = 0;
        this.schedulerTimer = null;
        this.activeSources = []; // Keep track of playing sources to stop them

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        } catch (e) {
            console.warn("Audio not supported");
        }
    }

    setVolume(val) {
        this.volume = val;
        localStorage.setItem('focusFlowVolume', val);
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Ambient Noise Methods
    setNoiseVolume(val) {
        this.noiseVolume = val;
        localStorage.setItem('focusFlowNoiseVolume', val);
        // Update all currently active gains
        this.activeSources.forEach(sourceObj => {
            try {
                // Smoothly transition volume
                sourceObj.gainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
            } catch (e) { }
        });
    }

    async loadRainBuffer() {
        if (this.rainBuffer) return this.rainBuffer;

        try {
            // Check if Base64 data is available (loaded from rain_sound.js)
            if (typeof RAIN_SOUND_BASE64 === 'undefined') {
                throw new Error("RAIN_SOUND_BASE64 not found. Make sure rain_sound.js is loaded.");
            }

            // Decode Base64
            const binaryString = window.atob(RAIN_SOUND_BASE64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer);
            this.rainBuffer = audioBuffer;
            return audioBuffer;
        } catch (error) {
            console.error("Error loading rain sound:", error);
            alert("Could not load rain sound data. Please check the console.");
            return null;
        }
    }

    async toggleNoise(enable) {
        this.resume();
        if (!this.ctx) return;

        if (enable) {
            if (this.isPlayingNoise) return; // Already playing

            const buffer = await this.loadRainBuffer();
            if (!buffer) return;
            if (!enable && !this.isPlayingNoise) return; // Stopped while loading

            this.isPlayingNoise = true;
            this.nextStartTime = this.ctx.currentTime + 0.1; // Start quickly
            this.activeSources = [];

            // Start the scheduler loop
            this.scheduleLookahead();
        } else {
            this.isPlayingNoise = false;

            // Stop scheduler
            if (this.schedulerTimer) {
                clearTimeout(this.schedulerTimer);
                this.schedulerTimer = null;
            }

            // Fade out and stop all active sources
            this.activeSources.forEach(sourceObj => {
                try {
                    const { source, gainNode } = sourceObj;
                    gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, this.ctx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
                    source.stop(this.ctx.currentTime + 1.0);
                } catch (e) { }
            });

            // Clear array after fade out time (approx)
            setTimeout(() => {
                this.activeSources = [];
            }, 1000);
        }
    }

    scheduleLookahead() {
        if (!this.isPlayingNoise) return;

        // Schedule overlaps
        // Overlap duration: 5 seconds for very smooth blend
        const overlap = 5;
        const bufferDuration = this.rainBuffer.duration;

        // If buffer is too short, reduce overlap
        const safeOverlap = Math.min(overlap, bufferDuration / 2);

        while (this.nextStartTime < this.ctx.currentTime + 0.5) {
            this.playSegment(this.nextStartTime, safeOverlap);
            this.nextStartTime += (bufferDuration - safeOverlap);
        }

        this.schedulerTimer = setTimeout(() => {
            this.scheduleLookahead();
        }, 100);
    }

    playSegment(time, overlap) {
        // Create nodes
        const source = this.ctx.createBufferSource();
        source.buffer = this.rainBuffer;

        const gainNode = this.ctx.createGain();

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(time);

        // Envelope for this segment to handle crossfading
        // 1. Fade In (at start of segment)
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(this.noiseVolume, time + overlap);

        // 2. Sustain (middle) needs no event data, it holds value

        // 3. Fade Out (at end of segment, which is start + duration)
        const endTime = time + this.rainBuffer.duration;
        gainNode.gain.setValueAtTime(this.noiseVolume, endTime - overlap);
        gainNode.gain.linearRampToValueAtTime(0, endTime);

        // Auto-cleanup
        source.stop(endTime);

        const sourceObj = { source, gainNode };
        this.activeSources.push(sourceObj);

        // Remove from list when done
        setTimeout(() => {
            const index = this.activeSources.indexOf(sourceObj);
            if (index > -1) {
                this.activeSources.splice(index, 1);
            }
        }, (endTime - this.ctx.currentTime) * 1000 + 200);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        // Adjust gain based on volume
        // Simple linear volume control. For more natural, use exponential, but linear is fine here.
        const peakGain = 0.1 * this.volume;

        gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(peakGain, this.ctx.currentTime + startTime + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration); // Decay

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration + 0.1);
    }

    playStart() {
        this.resume();
        // Pleasant ascending chime
        this.playTone(523.25, 'sine', 0.6, 0); // C5
        this.playTone(659.25, 'sine', 0.6, 0.1); // E5
    }

    playComplete() {
        this.resume();
        // Success chord
        this.playTone(523.25, 'sine', 0.5, 0);
        this.playTone(659.25, 'sine', 0.5, 0.1);
        this.playTone(783.99, 'sine', 1.0, 0.2); // G5
    }
}


class BackgroundAnimation {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.particles = [];
        this.theme = 'campfire'; // Default
        this.rotation = 0; // For Galaxy

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.updateTheme('campfire');
        this.animate();
    }

    updateTheme(themeName) {
        this.theme = themeName;
        this.particles = []; // Reset particles

        // Initialize particles based on theme interaction
        if (this.theme === 'forest') {
            for (let i = 0; i < 60; i++) this.particles.push(this.createParticle());
        } else if (this.theme === 'midnight') {
            for (let i = 0; i < 800; i++) this.particles.push(this.createStar());
        }
    }

    getColors() {
        const style = getComputedStyle(document.body);
        return {
            work: style.getPropertyValue('--accent-work').trim(),
            break: style.getPropertyValue('--accent-break').trim()
        };
    }

    createParticle() {
        // Forest Bubbles: Faster, larger variance
        return {
            x: Math.random() * this.width,
            y: this.height + Math.random() * 100,
            size: Math.random() * 5 + 2, // Bigger
            speedY: Math.random() * 2 + 1, // Faster
            opacity: Math.random() * 0.5 + 0.2
        };
    }

    createStar() {
        // Galaxy Stars
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (this.width < this.height ? this.width : this.height) / 1.5;
        return {
            x: Math.random() * this.width, // Base position (will be overridden in galaxy mode)
            y: Math.random() * this.height,
            angle: angle,
            distance: distance,
            size: Math.random() * 2,
            opacity: Math.random(),
            flickerSpeed: Math.random() * 0.03
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.updateTheme(this.theme); // Reset
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        switch (this.theme) {
            case 'campfire':
                this.drawWaves(true); // Warm
                break;
            case 'cyberpunk':
                this.drawGrid();
                break;
            case 'forest':
                this.drawParticles();
                break;
            case 'midnight':
                this.drawGalaxy();
                break;
            default:
                this.drawWaves(true);
        }

        requestAnimationFrame(() => this.animate());
    }

    // Animation Modes
    drawWaves(warm) {
        const colors = this.getColors();
        const baseColor = warm ? 'rgba(239, 68, 68, 0.05)' : colors.work;

        // Simple Sine Waves
        const time = Date.now() * 0.001;
        this.ctx.fillStyle = colors.work ? this.hexToRgba(colors.work, 0.05) : baseColor;

        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height);
            for (let x = 0; x < this.width; x += 5) {
                this.ctx.lineTo(x, this.height / 2 + Math.sin(x * 0.005 + time + i) * 50);
            }
            this.ctx.lineTo(this.width, this.height);
            this.ctx.fill();
        }
    }

    drawGrid() {
        const colors = this.getColors();
        this.ctx.strokeStyle = this.hexToRgba(colors.break, 0.2);
        this.ctx.lineWidth = 1;
        const time = (Date.now() * 0.05) % 50;

        // Horizontals
        for (let y = time; y < this.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        // Verticals
        for (let x = 0; x < this.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
    }

    drawParticles() {
        const colors = this.getColors();
        this.ctx.fillStyle = this.hexToRgba(colors.work, 0.4);

        this.particles.forEach(p => {
            p.y -= p.speedY;
            if (p.y < -10) p.y = this.height + 10;

            this.ctx.globalAlpha = p.opacity;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawGalaxy() {
        this.ctx.fillStyle = '#ffffff';
        this.rotation += 0.0005; // Slow rotation
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        this.particles.forEach(p => {
            // Spiral calculation
            const currentAngle = p.angle + this.rotation;
            // Add some "arms" effect by clustering? Keep simple for now.
            const x = centerX + Math.cos(currentAngle) * p.distance;
            const y = centerY + Math.sin(currentAngle) * p.distance;

            // Twinkle
            p.opacity += p.flickerSpeed;
            if (p.opacity > 1 || p.opacity < 0.2) p.flickerSpeed *= -1;

            this.ctx.globalAlpha = p.opacity;
            this.ctx.beginPath();
            this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    hexToRgba(hex, alpha) {
        // Simple hex parser
        if (!hex) return `rgba(100,100,100,${alpha})`;
        let c = hex.replace('#', '');
        if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
}
