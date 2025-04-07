class Ball {
    constructor(game, container) {
        this.game = game;
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'target';
        this.isActive = false;
        this.currentSize = 200;
        this.shrinkSpeed = Math.random() * 0.3 + 0.2;
        this.shrinkInterval = null;
        this.position = { x: 0, y: 0 };
        this.activeThreshold = Math.random() * 100 + 50; // Random size between 50 and 150
        this.container.appendChild(this.element);
        
        this.element.addEventListener('click', () => this.handleClick());
        this.spawn();
    }

    spawn() {
        this.currentSize = 200;
        this.isActive = false;
        this.element.className = 'target';
        this.activeThreshold = Math.random() * 100 + 50; // New random threshold each spawn
        
        // Try to find a valid position
        let attempts = 0;
        const maxAttempts = 20; // Increased from 10 to 20 for better positioning
        
        do {
            this.generateRandomPosition();
            attempts++;
        } while (this.isOverlapping() && attempts < maxAttempts);

        this.element.style.width = `${this.currentSize}px`;
        this.element.style.height = `${this.currentSize}px`;
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;

        this.shrinkSpeed = Math.random() * 0.3 + 0.2;
        this.startShrinking();
    }

    generateRandomPosition() {
        const rect = this.container.getBoundingClientRect();
        const maxX = rect.width - this.currentSize;
        const maxY = rect.height - this.currentSize;
        
        this.position = {
            x: Math.random() * maxX + (this.currentSize / 2),
            y: Math.random() * maxY + (this.currentSize / 2)
        };
    }

    isOverlapping() {
        const minDistance = this.currentSize * 1.5; // Increased from 1.2 to 1.5 for more spacing
        
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

    startShrinking() {
        this.shrinkInterval = setInterval(() => {
            this.currentSize -= this.shrinkSpeed;
            this.element.style.width = `${this.currentSize}px`;
            this.element.style.height = `${this.currentSize}px`;

            if (this.currentSize <= this.activeThreshold && !this.isActive) {
                this.element.className = 'target active';
                this.isActive = true;
            }

            if (this.currentSize <= 0) {
                this.stopShrinking();
                this.remove();
                this.game.spawnNewBall();
            }
        }, 16);
    }

    stopShrinking() {
        if (this.shrinkInterval) {
            clearInterval(this.shrinkInterval);
            this.shrinkInterval = null;
        }
    }

    showFloatingScore(points) {
        const scoreElement = document.createElement('div');
        scoreElement.className = 'floating-score';
        scoreElement.textContent = `+${points}`;
        
        // Position the score above the ball
        scoreElement.style.left = `${this.position.x}px`;
        scoreElement.style.top = `${this.position.y - this.currentSize}px`;
        
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
        missElement.style.top = `${this.position.y - this.currentSize}px`;
        
        this.container.appendChild(missElement);
        
        // Remove the miss text after animation
        setTimeout(() => {
            if (missElement.parentNode) {
                missElement.parentNode.removeChild(missElement);
            }
        }, 1000);
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

    handleClick() {
        if (this.isActive) {
            this.stopShrinking();
            this.element.className = 'target hit';
            
            // Create and add hit animation
            const hitElement = this.createHitAnimation();
            this.container.appendChild(hitElement);
            
            const points = this.game.addScore();
            this.showFloatingScore(points);
            this.game.playHitSound();
            
            // Remove the ball immediately
            this.remove();
            this.game.spawnNewBall();
            
            // Remove the hit animation after it completes
            setTimeout(() => {
                if (hitElement.parentNode) {
                    hitElement.parentNode.removeChild(hitElement);
                }
            }, 2500); // Match new animation duration
        } else {
            this.game.playMissSound();
            this.element.className = 'target miss';
            this.showMissText();
            // Remove the ball after miss animation completes
            setTimeout(() => {
                this.remove();
                this.game.spawnNewBall();
            }, 500); // Match miss animation duration
        }
    }

    remove() {
        this.stopShrinking();
        this.container.removeChild(this.element);
        this.game.removeBall(this);
    }
}

class Game {
    constructor() {
        this.score = 0;
        this.streak = 0;
        this.scoreElement = document.getElementById('score');
        this.streakElement = document.getElementById('streak');
        this.gameContainer = document.querySelector('.game-container');
        this.balls = [];
        this.maxBalls = 6; // Number of balls on screen at once
        this.gameStarted = false;
        
        // Initialize sounds
        this.sounds = {
            background: new Audio('assets/bg.m4a'),
            hit: new Audio('assets/hit.m4a'),
            miss: new Audio('assets/miss.m4a')
        };
        
        // Configure background music
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.2; // Keep background music subtle
        
        // Configure sound effects
        this.sounds.hit.volume = 0.5;
        this.sounds.miss.volume = 0.3;
        
        // Preload sound effects
        this.sounds.hit.load();
        this.sounds.miss.load();
        
        // Add event listeners for sound state
        this.setupSoundHandlers();
        
        this.createStartScreen();
    }

    setupSoundHandlers() {
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.gameStarted) {
                this.resumeBackgroundMusic();
            }
        });

        // Handle page focus
        window.addEventListener('focus', () => {
            if (this.gameStarted) {
                this.resumeBackgroundMusic();
            }
        });

        // Handle audio context
        document.addEventListener('click', () => {
            if (this.gameStarted && this.sounds.background.paused) {
                this.resumeBackgroundMusic();
            }
        });
    }

    resumeBackgroundMusic() {
        if (this.gameStarted && this.sounds.background.paused) {
            this.sounds.background.play()
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

    createStartScreen() {
        // Create start screen
        this.startScreen = document.createElement('div');
        this.startScreen.className = 'start-screen';
        
        // Create start button
        const startButton = document.createElement('button');
        startButton.className = 'start-button';
        startButton.textContent = 'START GAME';
        
        // Add button to start screen
        this.startScreen.appendChild(startButton);
        this.gameContainer.appendChild(this.startScreen);
        
        // Add click handler
        startButton.addEventListener('click', () => this.startGame());
    }

    startGame() {
        // Hide start screen
        this.startScreen.classList.add('hidden');
        this.gameStarted = true;
        
        // Start background music
        this.sounds.background.play()
            .then(() => {
                console.log('Background music started successfully');
            })
            .catch(error => {
                console.log('Background music failed to play:', error);
                // Try again after a short delay
                setTimeout(() => this.resumeBackgroundMusic(), 1000);
            });
        
        // Spawn initial balls
        for (let i = 0; i < this.maxBalls; i++) {
            this.spawnNewBall();
        }
    }

    playHitSound() {
        if (!this.gameStarted) return;
        this.sounds.hit.currentTime = 0; // Reset to start
        this.sounds.hit.play().catch(error => {
            console.log('Hit sound failed to play:', error);
            // Try to play again with a new instance if the first attempt fails
            const hitSound = new Audio('assets/hit.m4a');
            hitSound.volume = 0.5;
            hitSound.play().catch(console.error);
        });
    }

    playMissSound() {
        if (!this.gameStarted) return;
        this.sounds.miss.currentTime = 0; // Reset to start
        this.sounds.miss.play().catch(error => {
            console.log('Miss sound failed to play:', error);
            // Try to play again with a new instance if the first attempt fails
            const missSound = new Audio('assets/miss.m4a');
            missSound.volume = 0.3;
            missSound.play().catch(console.error);
        });
    }

    spawnNewBall() {
        if (this.balls.length < this.maxBalls && this.gameStarted) {
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
        const points = 1 * (1 + Math.floor(this.streak / 3));
        this.score += points;
        this.streak++;
        this.updateScore();
        return points;
    }

    handleMiss() {
        this.streak = 0;
        this.updateScore();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.streakElement.textContent = this.streak;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 