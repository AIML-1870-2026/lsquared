/**
 * Boid class representing a single agent in the flocking simulation
 * Implements Reynolds' three rules: Separation, Alignment, Cohesion
 */
class Boid {
    constructor(x, y, params) {
        this.position = { x, y };
        this.velocity = {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4
        };
        this.acceleration = { x: 0, y: 0 };
        this.params = params;
        this.neighborCount = 0;

        // Trail history for motion trails feature
        this.trail = [];
        this.maxTrailLength = 15;
    }

    /**
     * Get the angle the boid is facing based on velocity
     */
    getAngle() {
        return Math.atan2(this.velocity.y, this.velocity.x);
    }

    /**
     * Get the current speed of the boid
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    }

    /**
     * Calculate all steering forces and update acceleration
     */
    flock(boids, obstacles, mousePos, canvasWidth, canvasHeight) {
        const separation = this.separate(boids);
        const alignment = this.align(boids);
        const cohesion = this.cohere(boids);

        // Apply weights from parameters
        separation.x *= this.params.separationWeight;
        separation.y *= this.params.separationWeight;
        alignment.x *= this.params.alignmentWeight;
        alignment.y *= this.params.alignmentWeight;
        cohesion.x *= this.params.cohesionWeight;
        cohesion.y *= this.params.cohesionWeight;

        // Apply forces
        this.acceleration.x = separation.x + alignment.x + cohesion.x;
        this.acceleration.y = separation.y + alignment.y + cohesion.y;

        // Obstacle avoidance
        if (obstacles && obstacles.length > 0) {
            const avoidance = this.avoidObstacles(obstacles);
            this.acceleration.x += avoidance.x * 2.5;
            this.acceleration.y += avoidance.y * 2.5;
        }

        // Mouse interaction
        if (mousePos && this.params.mouseInteraction !== 'none') {
            const mouseForce = this.respondToMouse(mousePos);
            this.acceleration.x += mouseForce.x;
            this.acceleration.y += mouseForce.y;
        }
    }

    /**
     * Check if another boid is within perception (considering cone vision)
     */
    isInPerception(other) {
        const dx = other.position.x - this.position.x;
        const dy = other.position.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.params.neighborRadius || distance === 0) {
            return false;
        }

        // If using cone perception (180 degrees)
        if (this.params.perceptionAngle < 360) {
            const angle = Math.atan2(dy, dx);
            const heading = this.getAngle();
            let diff = angle - heading;

            // Normalize to -PI to PI
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;

            const halfCone = (this.params.perceptionAngle / 2) * (Math.PI / 180);
            if (Math.abs(diff) > halfCone) {
                return false;
            }
        }

        return true;
    }

    /**
     * Separation: Steer to avoid crowding local flockmates
     */
    separate(boids) {
        const steer = { x: 0, y: 0 };
        let count = 0;
        const desiredSeparation = this.params.neighborRadius * 0.4;

        for (const other of boids) {
            const dx = this.position.x - other.position.x;
            const dy = this.position.y - other.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && distance < desiredSeparation && this.isInPerception(other)) {
                // Calculate vector pointing away from neighbor
                const diffX = dx / distance;
                const diffY = dy / distance;

                // Weight by distance (closer = stronger)
                steer.x += diffX / distance;
                steer.y += diffY / distance;
                count++;
            }
        }

        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
        }

        return steer;
    }

    /**
     * Alignment: Steer towards the average heading of local flockmates
     */
    align(boids) {
        const avgVelocity = { x: 0, y: 0 };
        let count = 0;

        for (const other of boids) {
            if (this.isInPerception(other)) {
                avgVelocity.x += other.velocity.x;
                avgVelocity.y += other.velocity.y;
                count++;
            }
        }

        if (count > 0) {
            avgVelocity.x /= count;
            avgVelocity.y /= count;

            // Steer towards average velocity
            return {
                x: (avgVelocity.x - this.velocity.x) * 0.05,
                y: (avgVelocity.y - this.velocity.y) * 0.05
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Cohesion: Steer to move toward the average position of local flockmates
     */
    cohere(boids) {
        const centerOfMass = { x: 0, y: 0 };
        let count = 0;

        for (const other of boids) {
            if (this.isInPerception(other)) {
                centerOfMass.x += other.position.x;
                centerOfMass.y += other.position.y;
                count++;
            }
        }

        this.neighborCount = count;

        if (count > 0) {
            centerOfMass.x /= count;
            centerOfMass.y /= count;

            // Steer towards center of mass
            return {
                x: (centerOfMass.x - this.position.x) * 0.005,
                y: (centerOfMass.y - this.position.y) * 0.005
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Avoid obstacles by steering away from them
     */
    avoidObstacles(obstacles) {
        const steer = { x: 0, y: 0 };

        for (const obstacle of obstacles) {
            const dx = this.position.x - obstacle.x;
            const dy = this.position.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const avoidRadius = obstacle.radius + 30;

            if (distance < avoidRadius && distance > 0) {
                const strength = 1 - (distance / avoidRadius);
                steer.x += (dx / distance) * strength * 2;
                steer.y += (dy / distance) * strength * 2;
            }
        }

        return steer;
    }

    /**
     * Respond to mouse position (attract or repel)
     */
    respondToMouse(mousePos) {
        const dx = mousePos.x - this.position.x;
        const dy = mousePos.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseRadius = 150;

        if (distance < mouseRadius && distance > 0) {
            const strength = (1 - distance / mouseRadius) * 0.5;

            if (this.params.mouseInteraction === 'attract') {
                return {
                    x: (dx / distance) * strength,
                    y: (dy / distance) * strength
                };
            } else if (this.params.mouseInteraction === 'repel') {
                return {
                    x: -(dx / distance) * strength * 2,
                    y: -(dy / distance) * strength * 2
                };
            }
        }

        return { x: 0, y: 0 };
    }

    /**
     * Update position based on velocity and acceleration
     */
    update(canvasWidth, canvasHeight) {
        // Store position for trail
        if (this.params.showTrails) {
            this.trail.push({ x: this.position.x, y: this.position.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        } else {
            this.trail = [];
        }

        // Update velocity
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;

        // Limit speed
        const speed = this.getSpeed();
        if (speed > this.params.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.params.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.params.maxSpeed;
        }

        // Ensure minimum speed
        const minSpeed = 0.5;
        if (speed < minSpeed) {
            this.velocity.x = (this.velocity.x / speed) * minSpeed;
            this.velocity.y = (this.velocity.y / speed) * minSpeed;
        }

        // Update position
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Handle boundaries
        this.handleBoundaries(canvasWidth, canvasHeight);

        // Reset acceleration
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    /**
     * Handle boundary behavior (wrap or bounce)
     */
    handleBoundaries(width, height) {
        const margin = 20;

        if (this.params.boundaryMode === 'wrap') {
            // Toroidal wrapping
            if (this.position.x < 0) this.position.x = width;
            if (this.position.x > width) this.position.x = 0;
            if (this.position.y < 0) this.position.y = height;
            if (this.position.y > height) this.position.y = 0;
        } else {
            // Bounce off edges
            if (this.position.x < margin) {
                this.position.x = margin;
                this.velocity.x *= -0.8;
            }
            if (this.position.x > width - margin) {
                this.position.x = width - margin;
                this.velocity.x *= -0.8;
            }
            if (this.position.y < margin) {
                this.position.y = margin;
                this.velocity.y *= -0.8;
            }
            if (this.position.y > height - margin) {
                this.position.y = height - margin;
                this.velocity.y *= -0.8;
            }
        }
    }

    /**
     * Draw the boid on the canvas
     */
    draw(ctx, theme) {
        const angle = this.getAngle();
        const speed = this.getSpeed();
        const size = 8;

        // Draw trail if enabled
        if (this.params.showTrails && this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);

            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }

            const gradient = ctx.createLinearGradient(
                this.trail[0].x, this.trail[0].y,
                this.position.x, this.position.y
            );

            if (theme === 'neon') {
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.5)');
            } else if (theme === 'nature') {
                gradient.addColorStop(0, 'rgba(124, 179, 66, 0)');
                gradient.addColorStop(1, 'rgba(124, 179, 66, 0.5)');
            } else {
                gradient.addColorStop(0, 'rgba(233, 69, 96, 0)');
                gradient.addColorStop(1, 'rgba(233, 69, 96, 0.5)');
            }

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(angle);

        // Draw boid as triangle
        ctx.beginPath();

        if (theme === 'nature') {
            // Bird-like shape for nature theme
            ctx.moveTo(size, 0);
            ctx.quadraticCurveTo(-size * 0.5, -size * 0.6, -size, -size * 0.3);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, size * 0.3);
            ctx.quadraticCurveTo(-size * 0.5, size * 0.6, size, 0);
            ctx.closePath();

            // Color based on speed
            const hue = 80 + (speed / this.params.maxSpeed) * 40;
            ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        } else if (theme === 'neon') {
            // Glowing triangle for neon theme
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, -size * 0.6);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, size * 0.6);
            ctx.closePath();

            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${180 + (speed / this.params.maxSpeed) * 120}, 100%, 50%)`;
            ctx.fillStyle = `hsl(${180 + (speed / this.params.maxSpeed) * 120}, 100%, 60%)`;
        } else {
            // Simple triangle for minimal theme
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, -size * 0.6);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, size * 0.6);
            ctx.closePath();

            // Color based on speed
            const brightness = 50 + (speed / this.params.maxSpeed) * 30;
            ctx.fillStyle = `hsl(350, 80%, ${brightness}%)`;
        }

        ctx.fill();
        ctx.restore();
    }
}
