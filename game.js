class Ball {
    constructor(game, container) {
        this.game = game;
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'target';
        
        // Adjust size based on screen size
        const isMobile = window.innerWidth <= 768;
        this.currentSize = isMobile ? 
            Math.random() * 60 + 140 : // Mobile: 140-200px (was 120-180px)
            Math.random() * 80 + 170;  // Desktop: 170-250px (was 150-230px)
            
        this.lifespan = Math.random() * 3500 + 3000; // Increased lifespan 3-6.5 seconds (was 2.5-5.5s)
        this.position = { x: 0, y: 0 };
        this.shrinkInterval = null;
        this.container.appendChild(this.element);
        
        // Use touchstart and touchend for mobile
        this.element.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double-firing of events
            if (!this.game.isPaused) {
                this.element.classList.add('pressed');
            }
        });
        
        this.element.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.game.isPaused) {
                this.element.classList.remove('pressed');
                this.handleClick();
            }
        });
        
        // Keep mouse events for desktop
        this.element.addEventListener('mousedown', () => {
            if (!this.game.isPaused) {
                this.element.classList.add('pressed');
            }
        });
        
        this.element.addEventListener('click', () => {
            if (!this.game.isPaused) {
                this.handleClick();
            }
        });
        
        this.game.playPopSound();
        this.spawn();
    }

    spawn() {
        // Find a valid position
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
            this.generateRandomPosition();
            attempts++;
        } while (this.isOverlapping() && attempts < maxAttempts);

        // Set position and size
        this.element.style.width = `${this.currentSize}px`;
        this.element.style.height = `${this.currentSize}px`;
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
        
        // Start shrinking animation
        this.startShrinking();
        
        // Set timeout to add warning shake - start warning 1.5s before disappearing
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.classList.add('warning');
            }
        }, this.lifespan - 1500); // Increased warning time from 1.2s to 1.5s
        
        // Set timeout to remove the ball if not clicked
        this.removalTimeout = setTimeout(() => {
            this.miss(true); // Timeout miss
        }, this.lifespan);
    }

    generateRandomPosition() {
        const rect = this.container.getBoundingClientRect();
        const maxX = rect.width;
        const maxY = rect.height;
        const padding = this.currentSize / 2 + 20; // Add padding from edges
        
        this.position = {
            x: Math.random() * (maxX - padding * 2) + padding,
            y: Math.random() * (maxY - padding * 2) + padding
        };
    }

    isOverlapping() {
        const minDistance = this.currentSize * 1.5;
        
        for (const ball of this.game.balls) {
            if (ball === this) continue;
            
            const dx = this.position.x - ball.position.x;
            const dy = this.position.y - ball.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    }

    createHitAnimation() {
        const hitElement = document.createElement('div');
        hitElement.className = 'hit-animation';
        hitElement.style.width = `${this.currentSize}px`;
        hitElement.style.height = `${this.currentSize}px`;
        hitElement.style.left = `${this.position.x}px`;
        hitElement.style.top = `${this.position.y}px`;
        hitElement.style.setProperty('--random', Math.random());
        return hitElement;
    }

    showFloatingScore(scoreResult) {
        // Create the score element
        const scoreElement = document.createElement('div');
        scoreElement.className = 'floating-score';
        
        // Display points
        scoreElement.textContent = `+${scoreResult.points}`;
        
        // If there's bonus text, display it
        if (scoreResult.bonusText) {
            // Add a line break and the bonus text
            const bonusElement = document.createElement('div');
            bonusElement.className = 'bonus-text';
            bonusElement.textContent = scoreResult.bonusText;
            scoreElement.appendChild(bonusElement);
        }
        
        // Position the score above the ball
        scoreElement.style.left = `${this.position.x}px`;
        scoreElement.style.top = `${this.position.y - this.currentSize/2}px`;
        
        this.container.appendChild(scoreElement);
        
        // Remove the score element after animation
        setTimeout(() => {
            if (scoreElement.parentNode) {
                scoreElement.parentNode.removeChild(scoreElement);
            }
        }, 1000);
    }

    showMissText() {
        const missElement = document.createElement('div');
        missElement.className = 'miss-text';
        missElement.textContent = 'MISS';
        
        // Position the miss text above the ball
        missElement.style.left = `${this.position.x}px`;
        missElement.style.top = `${this.position.y - this.currentSize/2}px`;
        
        this.container.appendChild(missElement);
        
        // Remove the miss text after animation
        setTimeout(() => {
            if (missElement.parentNode) {
                missElement.parentNode.removeChild(missElement);
            }
        }, 1000);
    }

    handleClick() {
        // Clear the removal timeout
        clearTimeout(this.removalTimeout);
        
        // Stop shrinking animation
        this.stopShrinking();
        
        // Check for paused state
        if (this.game.isPaused) return;
        
        // Remove pressed class if it was added
        this.element.classList.remove('pressed');
        
        // Hit
        this.element.className = 'target hit';
        
        // Create and add hit animation
        const hitElement = this.createHitAnimation();
        this.container.appendChild(hitElement);
        
        const scoreResult = this.game.addScore();
        this.showFloatingScore(scoreResult);
        this.game.playHitSound();
        
        // Remove the ball after a short delay to allow for press animation
        setTimeout(() => {
            this.remove();
            this.game.spawnNewBall();
        }, 50);
        
        // Remove the hit animation after it completes
        setTimeout(() => {
            if (hitElement.parentNode) {
                hitElement.parentNode.removeChild(hitElement);
            }
        }, 1500);
    }

    stopShrinking() {
        if (this.shrinkInterval) {
            clearInterval(this.shrinkInterval);
            this.shrinkInterval = null;
        }
    }

    startShrinking() {
        // Initial size is this.currentSize
        let currentSize = this.currentSize;
        const minSize = this.currentSize * 0.7; // Shrink to 70% of original size (was 60%)
        const shrinkRate = (this.currentSize - minSize) / this.lifespan;
        const startTime = Date.now();
        
        this.shrinkInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= this.lifespan) {
                clearInterval(this.shrinkInterval);
                return;
            }
            
            // Calculate new size with eased shrinking
            const progress = elapsed / this.lifespan;
            const easedProgress = progress < 0.7 ? progress * 0.7 : progress; // Shrink slower in the first 70% of time
            currentSize = this.currentSize - (this.currentSize - minSize) * easedProgress;
            
            // Don't shrink beyond minimum size
            if (currentSize < minSize) {
                currentSize = minSize;
            }
            
            // Update element size
            this.element.style.width = `${currentSize}px`;
            this.element.style.height = `${currentSize}px`;
        }, 50); // Update every 50ms
    }

    miss(isTimeout = true) {
        clearTimeout(this.removalTimeout);
        
        this.element.className = 'target miss';
        this.showMissText();
        
        // Reset streak for both timeout and active misses
        this.game.handleMiss();
        
        // Only play miss sound if it's not a timeout
        if (!isTimeout) {
            this.game.playMissSound();
        }
        
        // Remove the ball after miss animation completes
        setTimeout(() => {
            this.remove();
            this.game.spawnNewBall();
        }, 500);
    }

    remove() {
        clearTimeout(this.removalTimeout);
        
        if (this.element.parentNode) {
            this.container.removeChild(this.element);
        }
        this.game.removeBall(this);
    }
}

class Game {
    constructor() {
        this.score = 0;
        this.streak = 0;
        this.currentStreakLevel = 'Normal';
        this.scoreElement = document.getElementById('score');
        this.streakElement = document.getElementById('streak');
        this.pauseScoreElement = document.getElementById('pauseScore');
        this.pauseStreakElement = document.getElementById('pauseStreak');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.resumeButton = document.getElementById('resumeButton');
        this.gameContainer = document.querySelector('.game-container');
        this.videoBackground = document.querySelector('.background-video');
        this.videoSource = document.getElementById('videoSource');
        this.pauseButton = document.getElementById('pauseButton');
        this.soundButton = document.getElementById('soundButton');
        
        // Environment selection buttons
        this.startJungleButton = document.getElementById('startJungleButton');
        this.startArcticButton = document.getElementById('startArcticButton');
        this.pauseJungleButton = document.getElementById('pauseJungleButton');
        this.pauseArcticButton = document.getElementById('pauseArcticButton');
        
        this.balls = [];
        // Adjust maxBalls based on screen size
        const isMobile = window.innerWidth <= 768;
        this.maxBalls = isMobile ? 3 : 4; // Fewer balls on mobile
        this.gameStarted = false;
        this.isPaused = false;
        this.isMuted = false;
        this.environment = 'jungle'; // Default environment
        
        // Initialize sounds
        // Common sound effects
        this.hitSound = new Audio('assets/hit.m4a');
        this.missSound = new Audio('assets/miss.m4a');
        this.popSound = new Audio('assets/pop.m4a');
        
        // Environment-specific background music
        this.backgroundSounds = {
            jungle: new Audio('assets/bg.m4a'),
            arctic: new Audio('assets/arctic_bg.m4a')
        };
        
        // Configure background music
        this.backgroundSounds.jungle.loop = true;
        this.backgroundSounds.jungle.volume = 0.2;
        this.backgroundSounds.arctic.loop = true;
        this.backgroundSounds.arctic.volume = 0.2;
        
        // Configure sound effects
        this.hitSound.volume = 0.3; // Reduced from 0.5
        this.missSound.volume = 0.3;
        this.popSound.volume = 0.5;
        
        // Preload sound effects
        this.hitSound.load();
        this.missSound.load();
        this.popSound.load();
        
        // Initialize video
        this.initVideo();
        
        // Add event listeners for sound state
        this.setupSoundHandlers();
        
        // Setup control buttons
        this.setupControlButtons();
        
        // Setup environment buttons
        this.setupEnvironmentButtons();
        
        // Start screen is already in HTML
        this.setupStartScreen();
        
        // Add resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Add touch event prevention
        this.gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling while playing
        }, { passive: false });
        
        // Create streak progress bar
        this.createStreakProgress();
    }

    initVideo() {
        // Set up the ended event listener
        this.videoBackground.addEventListener('ended', () => {
            if (this.gameStarted && !this.isPaused) {
                this.videoBackground.play().catch(console.error);
            }
        });
    }
    
    setupEnvironmentButtons() {
        // Start screen environment buttons
        this.startJungleButton.addEventListener('click', () => {
            this.setEnvironment('jungle', 'start');
        });
        
        this.startArcticButton.addEventListener('click', () => {
            this.setEnvironment('arctic', 'start');
        });
        
        // Pause screen environment buttons
        this.pauseJungleButton.addEventListener('click', () => {
            this.setEnvironment('jungle', 'pause');
        });
        
        this.pauseArcticButton.addEventListener('click', () => {
            this.setEnvironment('arctic', 'pause');
        });
        
        // Set initial active states
        this.updateEnvironmentButtonStates();
    }
    
    setEnvironment(environment, source) {
        if (this.environment === environment) return;
        
        this.environment = environment;
        
        // Update video source
        const videoUrl = environment === 'jungle' ? 'assets/video.mp4' : 'assets/arctic.mp4';
        this.videoSource.src = videoUrl;
        
        // Reload the video
        this.videoBackground.load();
        
        // If game is running, play the video
        if (this.gameStarted && !this.isPaused) {
            this.videoBackground.play().catch(console.error);
        }
        
        // If sound was playing, switch to new environment sound
        const wasPlaying = !this.backgroundSounds[this.environment === 'jungle' ? 'arctic' : 'jungle'].paused;
        
        // Pause all sounds
        this.pauseAllSounds();
        
        // If game is running and not paused and sound was playing, play new background music
        if (this.gameStarted && !this.isPaused && wasPlaying && !this.isMuted) {
            this.backgroundSounds[this.environment].play().catch(console.error);
        }
        
        // Update button states
        this.updateEnvironmentButtonStates();
    }
    
    updateEnvironmentButtonStates() {
        // Start screen buttons
        this.startJungleButton.classList.toggle('active', this.environment === 'jungle');
        this.startArcticButton.classList.toggle('active', this.environment === 'arctic');
        
        // Pause screen buttons
        this.pauseJungleButton.classList.toggle('active', this.environment === 'jungle');
        this.pauseArcticButton.classList.toggle('active', this.environment === 'arctic');
    }

    setupStartScreen() {
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => this.startGame());
    }

    setupSoundHandlers() {
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.gameStarted && !this.isPaused) {
                this.resumeBackgroundMusic();
            } else if (document.visibilityState === 'hidden' && this.gameStarted) {
                // Pause sounds when tab is hidden
                this.pauseAllSounds();
            }
        });

        // Handle page focus
        window.addEventListener('focus', () => {
            if (this.gameStarted && !this.isPaused) {
                this.resumeBackgroundMusic();
            }
        });

        // Handle audio context
        document.addEventListener('click', () => {
            if (this.gameStarted && !this.isPaused && this.isSoundPaused('background') && !this.isMuted) {
                this.resumeBackgroundMusic();
            }
        });
    }

    isSoundPaused(soundType) {
        if (soundType === 'background') {
            return this.backgroundSounds[this.environment].paused;
        } else if (soundType === 'hit') {
            return this.hitSound.paused;
        } else if (soundType === 'miss') {
            return this.missSound.paused;
        } else if (soundType === 'pop') {
            return this.popSound.paused;
        }
        return true;
    }

    resumeBackgroundMusic() {
        if (this.gameStarted && !this.isPaused && this.backgroundSounds[this.environment].paused && !this.isMuted) {
            this.backgroundSounds[this.environment].play()
                .then(() => {
                    console.log('Background music resumed');
                })
                .catch(error => {
                    console.log('Failed to resume background music:', error);
                    // Try again after a short delay
                    setTimeout(() => this.resumeBackgroundMusic(), 1000);
                });
        }
    }

    pauseAllSounds() {
        // Pause all background music only
        for (const env in this.backgroundSounds) {
            if (!this.backgroundSounds[env].paused) {
                this.backgroundSounds[env].pause();
            }
        }
    }

    startGame() {
        // Hide start screen
        document.getElementById('startScreen').classList.add('hidden');
        this.gameStarted = true;
        
        // Ensure video is playing
        this.videoBackground.play().catch(console.error);
        
        // Add click/touch listener for misses
        this.gameContainer.addEventListener('click', (e) => {
            if (e.target === this.gameContainer && this.gameStarted && !this.isPaused) {
                this.handleGlobalMiss(e);
            }
        });
        
        // Add touch listener for misses
        this.gameContainer.addEventListener('touchend', (e) => {
            if (e.target === this.gameContainer && this.gameStarted && !this.isPaused) {
                const touch = e.changedTouches[0];
                this.handleGlobalMiss(touch);
            }
        });
        
        // Start background music
        if (!this.isMuted) {
            this.backgroundSounds[this.environment].play()
                .then(() => {
                    console.log('Background music started successfully');
                })
                .catch(error => {
                    console.log('Background music failed to play:', error);
                    if (!this.isPaused) {
                        setTimeout(() => this.resumeBackgroundMusic(), 1000);
                    }
                });
        }
        
        // Spawn initial balls
        for (let i = 0; i < this.maxBalls; i++) {
            this.spawnNewBall();
        }
    }

    handleGlobalMiss(e) {
        // Player clicked outside any ball - count as an active miss
        this.playMissSound();
        
        // Find the closest ball and make it miss
        let closestBall = null;
        let closestDistance = Infinity;
        const rect = this.gameContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        for (const ball of this.balls) {
            const dx = x - ball.position.x;
            const dy = y - ball.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBall = ball;
            }
        }
        
        if (closestBall) {
            closestBall.miss(false); // Active miss
        }
        
        // Show miss text at clicked position
        const missElement = document.createElement('div');
        missElement.className = 'miss-text';
        missElement.textContent = 'MISS';
        
        missElement.style.left = `${x}px`;
        missElement.style.top = `${y}px`;
        
        this.gameContainer.appendChild(missElement);
        
        // Remove the miss text after animation
        setTimeout(() => {
            if (missElement.parentNode) {
                missElement.parentNode.removeChild(missElement);
            }
        }, 1000);
    }

    setupControlButtons() {
        // Pause button setup
        this.pauseButton.addEventListener('click', () => {
            this.togglePause();
        });

        // Sound button setup
        this.soundButton.addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Resume button setup
        this.resumeButton.addEventListener('click', () => {
            this.togglePause(); // Resume the game
        });
    }

    togglePause() {
        if (!this.gameStarted) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Pause the game
            this.pauseGame();
            // Change pause button to play icon
            this.pauseButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
            this.pauseButton.classList.add('active');
            
            // Show pause overlay
            this.pauseOverlay.classList.add('visible');
            
            // Update pause overlay score
            this.pauseScoreElement.textContent = this.score;
            this.pauseStreakElement.textContent = this.streak;
            
            // Update environment button states
            this.updateEnvironmentButtonStates();
        } else {
            // Resume the game
            this.resumeGame();
            // Change play button back to pause icon
            this.pauseButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
            this.pauseButton.classList.remove('active');
            
            // Hide pause overlay
            this.pauseOverlay.classList.remove('visible');
        }
    }

    toggleSound() {
        this.isMuted = !this.isMuted;
        
        // Update sound mute states for background music only
        this.backgroundSounds.jungle.muted = this.isMuted;
        this.backgroundSounds.arctic.muted = this.isMuted;
        
        // Update sound button icon
        if (this.isMuted) {
            this.soundButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
            `;
            this.soundButton.classList.add('active');
        } else {
            this.soundButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
            `;
            this.soundButton.classList.remove('active');
        }
    }

    pauseGame() {
        // Stop all ball removal timeouts
        for (const ball of this.balls) {
            clearTimeout(ball.removalTimeout);
        }
        
        // Pause all sounds
        this.pauseAllSounds();
        
        // Pause the background video
        this.videoBackground.pause();
    }

    resumeGame() {
        // Resume background music if not muted
        if (!this.isMuted) {
            this.backgroundSounds[this.environment].play().catch(console.error);
        }
        
        // Resume the background video
        this.videoBackground.play().catch(console.error);
        
        // Restart all balls with new timeouts
        for (const ball of this.balls) {
            // Remove any existing warning class
            ball.element.classList.remove('warning');
            
            // Set a new timeout for each ball
            clearTimeout(ball.removalTimeout);
            
            // Standard 2s timeout when resuming (increased from 1.5s)
            const remainingTime = 2000;
            
            // Add warning shake 1.2s before disappearing
            setTimeout(() => {
                if (ball.element.parentNode) {
                    ball.element.classList.add('warning');
                }
            }, remainingTime - 1200);
            
            // Set the removal timeout
            ball.removalTimeout = setTimeout(() => {
                ball.miss(true); // Timeout miss
            }, remainingTime);
        }
    }

    playHitSound() {
        if (!this.gameStarted || this.isPaused) return;
        
        // Create a new Audio instance for each hit
        const hitSound = new Audio('assets/hit.m4a');
        hitSound.volume = 0.3; // Reduced from 0.5
        hitSound.muted = this.isMuted;
        hitSound.play().catch(console.error);
    }

    playMissSound() {
        if (!this.gameStarted || this.isPaused) return;
        
        // Create a new Audio instance for each miss
        const missSound = new Audio('assets/miss.m4a');
        missSound.volume = 0.3;
        missSound.muted = this.isMuted;
        missSound.play().catch(console.error);
    }

    playPopSound() {
        if (!this.gameStarted || this.isPaused) return;
        
        // Create a new Audio instance for each pop
        const popSound = new Audio('assets/pop.m4a');
        popSound.volume = 0.5;
        popSound.muted = this.isMuted;
        popSound.play().catch(console.error);
    }

    spawnNewBall() {
        if (this.balls.length < this.maxBalls && this.gameStarted && !this.isPaused) {
            const ball = new Ball(this, this.gameContainer);
            this.balls.push(ball);
        }
    }

    removeBall(ball) {
        const index = this.balls.indexOf(ball);
        if (index > -1) {
            this.balls.splice(index, 1);
        }
    }

    addScore() {
        // Calculate points and bonus based on streak
        let points = 10; // Default points (streak 1-4)
        let bonusText = 'Normal';
        
        // Store old streak level for comparison
        const oldStreakLevel = this.getStreakLevel(this.streak);
        
        // Determine points and bonus based on streak tier
        if (this.streak >= 19) { // Check before incrementing
            points = 30;
            bonusText = 'Firestorm! 🔥🔥';
        } else if (this.streak >= 9) {
            points = 20;
            bonusText = 'Hot Streak! 🔥';
        } else if (this.streak >= 4) {
            points = 15;
            bonusText = 'Combo!';
        }
        
        this.score += points;
        this.streak++;
        this.updateScore();
        this.updateStreakProgress();
        
        // Check if we're entering a new streak level
        const newStreakLevel = this.getStreakLevel(this.streak);
        if (newStreakLevel !== oldStreakLevel) {
            this.announceStreakLevel(newStreakLevel);
            this.currentStreakLevel = newStreakLevel;
        }
        
        return {
            points: points,
            bonusText: bonusText
        };
    }

    getStreakLevel(streak) {
        if (streak >= 20) return 'Firestorm! 🔥🔥';
        if (streak >= 10) return 'Hot Streak! 🔥';
        if (streak >= 5) return 'Combo!';
        return 'Normal';
    }

    announceStreakLevel(level) {
        // Remove any existing announcement
        const existingAnnouncement = document.querySelector('.streak-announcement');
        if (existingAnnouncement) {
            existingAnnouncement.remove();
        }

        // Only announce if it's not "Normal"
        if (level === 'Normal') return;

        // Create and show the announcement
        const announcement = document.createElement('div');
        announcement.className = 'streak-announcement';
        announcement.textContent = level;
        document.body.appendChild(announcement);

        // Remove the announcement after animation
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 2000);
    }

    handleMiss() {
        // Check if we're losing a streak level
        const oldLevel = this.currentStreakLevel;
        this.streak = 0;
        this.currentStreakLevel = 'Normal';
        this.updateScore();
        this.updateStreakProgress();
        
        // If we lost a special streak level, show "Streak Lost!"
        if (oldLevel !== 'Normal') {
            const announcement = document.createElement('div');
            announcement.className = 'streak-announcement';
            announcement.textContent = 'Streak Lost! 💔';
            document.body.appendChild(announcement);
            
            // Remove the announcement after animation
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 2000);
        }
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.streakElement.textContent = this.streak;
    }

    handleResize() {
        // Update maxBalls based on new screen size
        const isMobile = window.innerWidth <= 768;
        this.maxBalls = isMobile ? 3 : 4;
        
        // Adjust existing balls if needed
        while (this.balls.length > this.maxBalls) {
            const ball = this.balls[this.balls.length - 1];
            ball.remove();
        }
    }

    createStreakProgress() {
        // Create container
        this.streakProgress = document.createElement('div');
        this.streakProgress.className = 'streak-progress';
        
        // Create label
        this.streakLabel = document.createElement('div');
        this.streakLabel.className = 'streak-label';
        this.streakLabel.textContent = 'Normal';
        
        // Create progress bar
        this.progressBarContainer = document.createElement('div');
        this.progressBarContainer.className = 'progress-bar';
        
        this.progressFill = document.createElement('div');
        this.progressFill.className = 'progress-fill';
        
        // Assemble elements
        this.progressBarContainer.appendChild(this.progressFill);
        this.streakProgress.appendChild(this.streakLabel);
        this.streakProgress.appendChild(this.progressBarContainer);
        document.body.appendChild(this.streakProgress);
        
        // Initialize progress
        this.updateStreakProgress();
    }

    updateStreakProgress() {
        let nextThreshold, progress;
        
        if (this.streak < 5) {
            // Progress to Combo (0-4)
            nextThreshold = 5;
            progress = (this.streak / nextThreshold) * 100;
            this.streakLabel.textContent = `Normal (${this.streak}/${nextThreshold})`;
        } else if (this.streak < 10) {
            // Progress to Hot Streak (5-9)
            nextThreshold = 10;
            progress = (this.streak / nextThreshold) * 100;
            this.streakLabel.textContent = `Combo! (${this.streak}/${nextThreshold})`;
        } else if (this.streak < 20) {
            // Progress to Firestorm (10-19)
            nextThreshold = 20;
            progress = (this.streak / nextThreshold) * 100;
            this.streakLabel.textContent = `Hot Streak! 🔥 (${this.streak}/${nextThreshold})`;
        } else {
            // Firestorm (20+)
            progress = 100;
            this.streakLabel.textContent = `Firestorm! 🔥🔥 (${this.streak})`;
        }
        
        this.progressFill.style.width = `${progress}%`;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 