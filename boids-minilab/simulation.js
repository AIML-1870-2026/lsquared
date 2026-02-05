/**
 * Boids Simulation - Main Controller
 * Handles simulation loop, UI controls, and visualization
 */

class Simulation {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('boidCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Simulation state
        this.boids = [];
        this.obstacles = [];
        this.isPaused = false;
        this.isAddingObstacle = false;
        this.mousePos = null;

        // Performance tracking
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateInterval = 500;
        this.lastFpsUpdate = 0;

        // Parameters with defaults
        this.params = {
            separationWeight: 1.5,
            alignmentWeight: 1.0,
            cohesionWeight: 1.0,
            neighborRadius: 75,
            maxSpeed: 4.0,
            boidCount: 150,
            boundaryMode: 'wrap',
            perceptionAngle: 360,
            mouseInteraction: 'none',
            showTrails: false,
            theme: 'minimal'
        };

        // Presets configuration
        this.presets = {
            schooling: {
                separationWeight: 0.8,
                alignmentWeight: 2.5,
                cohesionWeight: 1.5,
                neighborRadius: 100,
                maxSpeed: 3.5
            },
            chaotic: {
                separationWeight: 2.0,
                alignmentWeight: 0.3,
                cohesionWeight: 0.3,
                neighborRadius: 40,
                maxSpeed: 6.0
            },
            tight: {
                separationWeight: 1.2,
                alignmentWeight: 1.5,
                cohesionWeight: 2.5,
                neighborRadius: 80,
                maxSpeed: 4.0
            }
        };

        // Initialize
        this.initializeBoids();
        this.setupEventListeners();
        this.updateUI();

        // Start animation loop
        this.animate();
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 600;
    }

    /**
     * Initialize boids with random positions
     */
    initializeBoids() {
        this.boids = [];
        for (let i = 0; i < this.params.boidCount; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.boids.push(new Boid(x, y, this.params));
        }
    }

    /**
     * Adjust boid count dynamically
     */
    adjustBoidCount(newCount) {
        const currentCount = this.boids.length;

        if (newCount > currentCount) {
            // Add new boids
            for (let i = currentCount; i < newCount; i++) {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                this.boids.push(new Boid(x, y, this.params));
            }
        } else if (newCount < currentCount) {
            // Remove excess boids
            this.boids.splice(newCount);
        }
    }

    /**
     * Setup all event listeners for UI controls
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Pause/Resume button
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.initializeBoids();
            this.obstacles = [];
        });

        // Preset buttons
        document.querySelectorAll('.preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetName = e.target.dataset.preset;
                this.applyPreset(presetName);
            });
        });

        // Slider controls
        this.setupSlider('separation', 'separationWeight');
        this.setupSlider('alignment', 'alignmentWeight');
        this.setupSlider('cohesion', 'cohesionWeight');
        this.setupSlider('neighborRadius', 'neighborRadius');
        this.setupSlider('maxSpeed', 'maxSpeed');

        // Boid count slider
        const boidCountSlider = document.getElementById('boidCountSlider');
        boidCountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('boidCountSliderValue').textContent = value;
            this.params.boidCount = value;
            this.adjustBoidCount(value);
        });

        // Boundary mode toggle
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.params.boundaryMode = e.target.dataset.mode;
            });
        });

        // Feature toggles
        document.querySelectorAll('[data-feature]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feature = e.target.dataset.feature;
                const value = e.target.dataset.value;

                // Update active state for this feature group
                document.querySelectorAll(`[data-feature="${feature}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');

                // Apply feature setting
                switch (feature) {
                    case 'perception':
                        this.params.perceptionAngle = parseInt(value);
                        break;
                    case 'mouse':
                        this.params.mouseInteraction = value;
                        break;
                    case 'trails':
                        this.params.showTrails = value === 'on';
                        break;
                    case 'theme':
                        this.params.theme = value;
                        document.body.className = value !== 'minimal' ? `theme-${value}` : '';
                        break;
                }
            });
        });

        // Obstacle controls
        document.getElementById('addObstacleBtn').addEventListener('click', (e) => {
            this.isAddingObstacle = !this.isAddingObstacle;
            e.target.classList.toggle('active', this.isAddingObstacle);
        });

        document.getElementById('clearObstaclesBtn').addEventListener('click', () => {
            this.obstacles = [];
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = null;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.isAddingObstacle) {
                const rect = this.canvas.getBoundingClientRect();
                this.obstacles.push({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    radius: 25
                });
            }
        });
    }

    /**
     * Setup a slider control
     */
    setupSlider(sliderId, paramName) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId + 'Value');

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = value.toFixed(1);
            this.params[paramName] = value;
        });
    }

    /**
     * Apply a preset configuration
     */
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        // Update parameters
        Object.assign(this.params, preset);

        // Update UI sliders
        this.updateUI();
    }

    /**
     * Update UI to reflect current parameters
     */
    updateUI() {
        document.getElementById('separation').value = this.params.separationWeight;
        document.getElementById('separationValue').textContent = this.params.separationWeight.toFixed(1);

        document.getElementById('alignment').value = this.params.alignmentWeight;
        document.getElementById('alignmentValue').textContent = this.params.alignmentWeight.toFixed(1);

        document.getElementById('cohesion').value = this.params.cohesionWeight;
        document.getElementById('cohesionValue').textContent = this.params.cohesionWeight.toFixed(1);

        document.getElementById('neighborRadius').value = this.params.neighborRadius;
        document.getElementById('neighborRadiusValue').textContent = this.params.neighborRadius;

        document.getElementById('maxSpeed').value = this.params.maxSpeed;
        document.getElementById('maxSpeedValue').textContent = this.params.maxSpeed.toFixed(1);
    }

    /**
     * Update metrics display
     */
    updateMetrics() {
        document.getElementById('fps').textContent = this.fps;
        document.getElementById('boidCount').textContent = this.boids.length;

        // Calculate average speed
        let totalSpeed = 0;
        let totalNeighbors = 0;

        for (const boid of this.boids) {
            totalSpeed += boid.getSpeed();
            totalNeighbors += boid.neighborCount;
        }

        const avgSpeed = (totalSpeed / this.boids.length).toFixed(1);
        const avgNeighbors = (totalNeighbors / this.boids.length).toFixed(1);

        document.getElementById('avgSpeed').textContent = avgSpeed;
        document.getElementById('avgNeighbors').textContent = avgNeighbors;
    }

    /**
     * Main animation loop
     */
    animate() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        if (!this.isPaused) {
            this.update();
        }

        this.render();
        this.updateMetrics();

        requestAnimationFrame(() => this.animate());
    }

    /**
     * Update simulation state
     */
    update() {
        // Update each boid
        for (const boid of this.boids) {
            boid.flock(this.boids, this.obstacles, this.mousePos, this.canvas.width, this.canvas.height);
        }

        for (const boid of this.boids) {
            boid.update(this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Render the simulation
     */
    render() {
        const ctx = this.ctx;
        const theme = this.params.theme;

        // Clear or fade for trails effect
        if (this.params.showTrails) {
            ctx.fillStyle = theme === 'neon' ? 'rgba(0, 0, 5, 0.15)' :
                            theme === 'nature' ? 'rgba(10, 26, 10, 0.15)' :
                            'rgba(13, 17, 23, 0.15)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = theme === 'neon' ? '#000005' :
                            theme === 'nature' ? '#0a1a0a' :
                            '#0d1117';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw obstacles
        for (const obstacle of this.obstacles) {
            ctx.beginPath();
            ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);

            if (theme === 'neon') {
                ctx.fillStyle = '#1a1a2a';
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff00ff';
            } else if (theme === 'nature') {
                ctx.fillStyle = '#1a2f1a';
                ctx.strokeStyle = '#4a7c4a';
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = '#1a1a2e';
                ctx.strokeStyle = '#e94560';
                ctx.lineWidth = 2;
            }

            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw mouse interaction indicator
        if (this.mousePos && this.params.mouseInteraction !== 'none') {
            ctx.beginPath();
            ctx.arc(this.mousePos.x, this.mousePos.y, 150, 0, Math.PI * 2);
            ctx.strokeStyle = this.params.mouseInteraction === 'attract' ?
                'rgba(78, 204, 163, 0.3)' : 'rgba(233, 69, 96, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw boids
        for (const boid of this.boids) {
            boid.draw(ctx, theme);
        }

        // Draw boundary indicator for bounce mode
        if (this.params.boundaryMode === 'bounce') {
            ctx.strokeStyle = theme === 'neon' ? 'rgba(0, 255, 255, 0.2)' :
                              theme === 'nature' ? 'rgba(124, 179, 66, 0.2)' :
                              'rgba(233, 69, 96, 0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 20, this.canvas.width - 40, this.canvas.height - 40);
        }
    }
}

// Initialize simulation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Simulation();
});
