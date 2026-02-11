/**
 * Julia Set Explorer - Main Application
 */

class JuliaExplorer {
    constructor() {
        // Canvas setup
        this.juliaCanvas = document.getElementById('juliaCanvas');
        this.juliaCtx = this.juliaCanvas.getContext('2d');
        this.mandelbrotCanvas = document.getElementById('mandelbrotCanvas');
        this.mandelbrotCtx = this.mandelbrotCanvas.getContext('2d');

        // Parameters
        this.params = {
            cReal: -0.75,
            cImag: 0.11,
            maxIter: 200,
            colorScheme: 'classic',
            fractalType: 'julia' // 'julia' or 'burning-julia'
        };

        // View state
        this.juliaBounds = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
        this.mandelbrotBounds = { xMin: -2.5, xMax: 1, yMin: -1.5, yMax: 1.5 };
        this.zoom = 1;

        // Interaction state
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragBoundsStart = null;
        this.isSliderDragging = false;
        this.splitView = false;

        // Animation state
        this.animation = {
            type: 'none',
            active: false,
            speed: 1,
            time: 0
        };

        // Workers
        this.juliaWorker = null;
        this.mandelbrotWorker = null;
        this.pendingRender = false;

        // Initialize
        this.initWorkers();
        this.setupCanvas();
        this.setupEventListeners();
        this.render();
    }

    initWorkers() {
        // Create workers from inline script
        const workerCode = document.getElementById('workerScript')?.textContent;

        // Fallback: fetch worker.js
        this.juliaWorker = new Worker('worker.js');
        this.mandelbrotWorker = new Worker('worker.js');

        this.juliaWorker.onmessage = (e) => this.handleWorkerMessage(e, 'julia');
        this.mandelbrotWorker.onmessage = (e) => this.handleWorkerMessage(e, 'mandelbrot');
    }

    handleWorkerMessage(e, type) {
        if (e.data.type === 'progress') {
            const pct = Math.round(e.data.progress * 100);
            document.getElementById('renderStatus').textContent = `Rendering ${type}: ${pct}%`;
        } else if (e.data.type === 'complete') {
            const canvas = type === 'julia' ? this.juliaCanvas : this.mandelbrotCanvas;
            const ctx = type === 'julia' ? this.juliaCtx : this.mandelbrotCtx;

            const imageData = new ImageData(e.data.imageData, canvas.width, canvas.height);
            ctx.putImageData(imageData, 0, 0);

            document.getElementById('renderStatus').textContent = '';
            this.pendingRender = false;
        }
    }

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Size based on container
        let width, height;
        if (this.splitView) {
            width = Math.floor(rect.width / 2);
            height = Math.floor(rect.height);
        } else {
            width = Math.floor(rect.width);
            height = Math.floor(rect.height);
        }

        // Apply device pixel ratio for crisp rendering
        this.juliaCanvas.width = width * dpr;
        this.juliaCanvas.height = height * dpr;
        this.juliaCanvas.style.width = width + 'px';
        this.juliaCanvas.style.height = height + 'px';

        this.mandelbrotCanvas.width = width * dpr;
        this.mandelbrotCanvas.height = height * dpr;
        this.mandelbrotCanvas.style.width = width + 'px';
        this.mandelbrotCanvas.style.height = height + 'px';

        // Adjust bounds to maintain aspect ratio
        const aspect = width / height;
        if (aspect > 1) {
            this.juliaBounds.xMin = -2 * aspect / this.zoom;
            this.juliaBounds.xMax = 2 * aspect / this.zoom;
            this.juliaBounds.yMin = -2 / this.zoom;
            this.juliaBounds.yMax = 2 / this.zoom;
        } else {
            this.juliaBounds.xMin = -2 / this.zoom;
            this.juliaBounds.xMax = 2 / this.zoom;
            this.juliaBounds.yMin = -2 / aspect / this.zoom;
            this.juliaBounds.yMax = 2 / aspect / this.zoom;
        }
    }

    setupEventListeners() {
        // C-value sliders
        const realSlider = document.getElementById('realSlider');
        const imagSlider = document.getElementById('imagSlider');

        realSlider.addEventListener('input', (e) => {
            this.params.cReal = parseFloat(e.target.value);
            this.updateCDisplay();
            if (!this.isSliderDragging) this.render();
        });

        realSlider.addEventListener('mousedown', () => this.isSliderDragging = true);
        realSlider.addEventListener('mouseup', () => {
            this.isSliderDragging = false;
            this.render();
        });

        imagSlider.addEventListener('input', (e) => {
            this.params.cImag = parseFloat(e.target.value);
            this.updateCDisplay();
            if (!this.isSliderDragging) this.render();
        });

        imagSlider.addEventListener('mousedown', () => this.isSliderDragging = true);
        imagSlider.addEventListener('mouseup', () => {
            this.isSliderDragging = false;
            this.render();
        });

        // Iteration slider
        document.getElementById('iterSlider').addEventListener('input', (e) => {
            this.params.maxIter = parseInt(e.target.value);
            document.getElementById('iterValue').textContent = this.params.maxIter;
        });

        document.getElementById('iterSlider').addEventListener('change', () => this.render());

        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.params.cReal = parseFloat(btn.dataset.real);
                this.params.cImag = parseFloat(btn.dataset.imag);
                this.updateSliders();
                this.updateCDisplay();
                this.resetView();
                this.render();
            });
        });

        // Color scheme
        document.getElementById('colorScheme').addEventListener('change', (e) => {
            this.params.colorScheme = e.target.value;
            this.render();
        });

        // Fractal type
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.params.fractalType = btn.dataset.mode === 'burning' ? 'burning-julia' : 'julia';
                this.render();
            });
        });

        // View mode
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.splitView = btn.dataset.view === 'split';
                this.updateSplitView();
            });
        });

        // Animation
        document.getElementById('animationType').addEventListener('change', (e) => {
            this.animation.type = e.target.value;
        });

        document.getElementById('animateBtn').addEventListener('click', () => {
            this.animation.active = !this.animation.active;
            document.getElementById('animateBtn').textContent = this.animation.active ? 'Stop' : 'Play';
            document.getElementById('animateBtn').classList.toggle('active', this.animation.active);
            if (this.animation.active) {
                this.animate();
            }
        });

        document.getElementById('animSpeed').addEventListener('input', (e) => {
            this.animation.speed = parseFloat(e.target.value);
            document.getElementById('animSpeedVal').textContent = this.animation.speed.toFixed(1);
        });

        // Export
        document.getElementById('downloadBtn').addEventListener('click', () => this.exportImage());
        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
            this.render();
        });

        // Canvas interactions - Julia
        this.juliaCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'julia'));
        this.juliaCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, 'julia'));
        this.juliaCanvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.juliaCanvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.juliaCanvas.addEventListener('wheel', (e) => this.handleWheel(e, 'julia'));
        this.juliaCanvas.addEventListener('dblclick', (e) => this.showOrbit(e));

        // Canvas interactions - Mandelbrot
        this.mandelbrotCanvas.addEventListener('click', (e) => this.handleMandelbrotClick(e));
        this.mandelbrotCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, 'mandelbrot'));

        // Orbit modal
        document.getElementById('closeOrbit').addEventListener('click', () => {
            document.getElementById('orbitModal').style.display = 'none';
        });

        document.getElementById('orbitPlay').addEventListener('click', () => this.animateOrbit());

        // Window resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });

        // Initial display update
        this.updateCDisplay();
    }

    updateCDisplay() {
        const sign = this.params.cImag >= 0 ? '+' : '';
        document.getElementById('cValue').textContent =
            `c = ${this.params.cReal.toFixed(3)} ${sign} ${this.params.cImag.toFixed(3)}i`;
        document.getElementById('realValue').textContent = this.params.cReal.toFixed(3);
        document.getElementById('imagValue').textContent = this.params.cImag.toFixed(3);
    }

    updateSliders() {
        document.getElementById('realSlider').value = this.params.cReal;
        document.getElementById('imagSlider').value = this.params.cImag;
    }

    updateSplitView() {
        const container = document.getElementById('canvasContainer');

        if (this.splitView) {
            container.classList.add('split');
            this.mandelbrotCanvas.style.display = 'block';
            document.getElementById('splitHint').style.display = 'block';
            document.getElementById('crosshair').style.display = 'block';
        } else {
            container.classList.remove('split');
            this.mandelbrotCanvas.style.display = 'none';
            document.getElementById('splitHint').style.display = 'none';
            document.getElementById('crosshair').style.display = 'none';
        }

        this.setupCanvas();
        this.render();
    }

    resetView() {
        this.zoom = 1;
        this.setupCanvas();
        document.getElementById('zoomLevel').textContent = '1.0';
    }

    render() {
        if (this.pendingRender) return;
        this.pendingRender = true;

        // Render Julia set
        this.juliaWorker.postMessage({
            type: this.params.fractalType,
            width: this.juliaCanvas.width,
            height: this.juliaCanvas.height,
            cReal: this.params.cReal,
            cImag: this.params.cImag,
            maxIter: this.params.maxIter,
            bounds: this.juliaBounds,
            colorScheme: this.params.colorScheme
        });

        // Render Mandelbrot if in split view
        if (this.splitView) {
            this.mandelbrotWorker.postMessage({
                type: this.params.fractalType === 'burning-julia' ? 'burning-mandelbrot' : 'mandelbrot',
                width: this.mandelbrotCanvas.width,
                height: this.mandelbrotCanvas.height,
                cReal: 0,
                cImag: 0,
                maxIter: this.params.maxIter,
                bounds: this.mandelbrotBounds,
                colorScheme: this.params.colorScheme
            });

            this.updateCrosshair();
        }
    }

    updateCrosshair() {
        const crosshair = document.getElementById('crosshair');
        const rect = this.mandelbrotCanvas.getBoundingClientRect();

        // Convert c to pixel coordinates
        const xRange = this.mandelbrotBounds.xMax - this.mandelbrotBounds.xMin;
        const yRange = this.mandelbrotBounds.yMax - this.mandelbrotBounds.yMin;

        const px = ((this.params.cReal - this.mandelbrotBounds.xMin) / xRange) * rect.width;
        const py = ((this.mandelbrotBounds.yMax - this.params.cImag) / yRange) * rect.height;

        crosshair.style.left = px + 'px';
        crosshair.style.top = py + 'px';
    }

    handleMouseDown(e, canvasType) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.dragBoundsStart = { ...this.juliaBounds };
        this.juliaCanvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e, canvasType) {
        const canvas = canvasType === 'julia' ? this.juliaCanvas : this.mandelbrotCanvas;
        const bounds = canvasType === 'julia' ? this.juliaBounds : this.mandelbrotBounds;
        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor coordinates
        const xRange = bounds.xMax - bounds.xMin;
        const yRange = bounds.yMax - bounds.yMin;
        const realCoord = bounds.xMin + (x / rect.width) * xRange;
        const imagCoord = bounds.yMax - (y / rect.height) * yRange;

        const sign = imagCoord >= 0 ? '+' : '';
        document.getElementById('cursorCoords').textContent =
            `${realCoord.toFixed(4)} ${sign} ${imagCoord.toFixed(4)}i`;

        // Handle panning
        if (this.isDragging && canvasType === 'julia') {
            const dx = (e.clientX - this.dragStart.x) / rect.width;
            const dy = (e.clientY - this.dragStart.y) / rect.height;

            const xShift = dx * xRange;
            const yShift = dy * yRange;

            this.juliaBounds.xMin = this.dragBoundsStart.xMin - xShift;
            this.juliaBounds.xMax = this.dragBoundsStart.xMax - xShift;
            this.juliaBounds.yMin = this.dragBoundsStart.yMin + yShift;
            this.juliaBounds.yMax = this.dragBoundsStart.yMax + yShift;
        }
    }

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.juliaCanvas.style.cursor = 'crosshair';
            this.render();
        }
    }

    handleWheel(e, canvasType) {
        e.preventDefault();

        const canvas = this.juliaCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate zoom factor
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        this.zoom *= (1 / zoomFactor);

        // Zoom centered on cursor
        const xRange = this.juliaBounds.xMax - this.juliaBounds.xMin;
        const yRange = this.juliaBounds.yMax - this.juliaBounds.yMin;

        const mouseX = this.juliaBounds.xMin + (x / rect.width) * xRange;
        const mouseY = this.juliaBounds.yMax - (y / rect.height) * yRange;

        const newXRange = xRange * zoomFactor;
        const newYRange = yRange * zoomFactor;

        this.juliaBounds.xMin = mouseX - (x / rect.width) * newXRange;
        this.juliaBounds.xMax = mouseX + (1 - x / rect.width) * newXRange;
        this.juliaBounds.yMin = mouseY - (1 - y / rect.height) * newYRange;
        this.juliaBounds.yMax = mouseY + (y / rect.height) * newYRange;

        document.getElementById('zoomLevel').textContent = this.zoom.toFixed(1);

        this.render();
    }

    handleMandelbrotClick(e) {
        const rect = this.mandelbrotCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xRange = this.mandelbrotBounds.xMax - this.mandelbrotBounds.xMin;
        const yRange = this.mandelbrotBounds.yMax - this.mandelbrotBounds.yMin;

        this.params.cReal = this.mandelbrotBounds.xMin + (x / rect.width) * xRange;
        this.params.cImag = this.mandelbrotBounds.yMax - (y / rect.height) * yRange;

        this.updateSliders();
        this.updateCDisplay();
        this.render();
    }

    animate() {
        if (!this.animation.active || this.animation.type === 'none') return;

        this.animation.time += 0.02 * this.animation.speed;

        let cReal, cImag;

        switch (this.animation.type) {
            case 'circle':
                // Circle in complex plane
                const radius = 0.7885;
                cReal = radius * Math.cos(this.animation.time);
                cImag = radius * Math.sin(this.animation.time);
                break;

            case 'spiral':
                // Spiral inward/outward
                const r = 0.5 + 0.3 * Math.sin(this.animation.time * 0.5);
                cReal = r * Math.cos(this.animation.time);
                cImag = r * Math.sin(this.animation.time);
                break;

            case 'lemniscate':
                // Figure-8 (lemniscate of Bernoulli)
                const t = this.animation.time;
                const a = 0.8;
                const denom = 1 + Math.sin(t) * Math.sin(t);
                cReal = a * Math.cos(t) / denom;
                cImag = a * Math.sin(t) * Math.cos(t) / denom;
                break;
        }

        if (cReal !== undefined) {
            this.params.cReal = cReal;
            this.params.cImag = cImag;
            this.updateSliders();
            this.updateCDisplay();
            this.render();
        }

        requestAnimationFrame(() => this.animate());
    }

    showOrbit(e) {
        const rect = this.juliaCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xRange = this.juliaBounds.xMax - this.juliaBounds.xMin;
        const yRange = this.juliaBounds.yMax - this.juliaBounds.yMin;

        const z0Real = this.juliaBounds.xMin + (x / rect.width) * xRange;
        const z0Imag = this.juliaBounds.yMax - (y / rect.height) * yRange;

        // Calculate orbit
        this.currentOrbit = this.calculateOrbit(z0Real, z0Imag);

        // Update modal
        const sign = z0Imag >= 0 ? '+' : '';
        document.getElementById('orbitPoint').textContent =
            `${z0Real.toFixed(4)} ${sign} ${z0Imag.toFixed(4)}i`;
        document.getElementById('orbitIters').textContent = this.currentOrbit.length;
        document.getElementById('orbitStatus').textContent =
            this.currentOrbit.escaped ? 'Escaped' : 'Bounded';
        document.getElementById('orbitStatus').style.color =
            this.currentOrbit.escaped ? '#ff4444' : '#44ff44';

        // Draw orbit
        this.drawOrbit(this.currentOrbit.points, false);

        // Show modal
        document.getElementById('orbitModal').style.display = 'flex';
    }

    calculateOrbit(z0Real, z0Imag) {
        const points = [{ real: z0Real, imag: z0Imag }];
        let zReal = z0Real;
        let zImag = z0Imag;
        let escaped = false;

        for (let i = 0; i < this.params.maxIter; i++) {
            // z = z² + c
            const zReal2 = zReal * zReal;
            const zImag2 = zImag * zImag;

            if (zReal2 + zImag2 > 4) {
                escaped = true;
                break;
            }

            const newReal = zReal2 - zImag2 + this.params.cReal;
            const newImag = 2 * zReal * zImag + this.params.cImag;

            zReal = newReal;
            zImag = newImag;

            points.push({ real: zReal, imag: zImag });
        }

        return { points, escaped };
    }

    drawOrbit(points, animated) {
        const canvas = document.getElementById('orbitCanvas');
        const ctx = canvas.getContext('2d');
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, size, size);

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size/2, 0);
        ctx.lineTo(size/2, size);
        ctx.moveTo(0, size/2);
        ctx.lineTo(size, size/2);
        ctx.stroke();

        // Draw escape circle
        ctx.strokeStyle = '#444';
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/4, 0, Math.PI * 2);
        ctx.stroke();

        // Scale factor (show -2 to 2)
        const scale = size / 4;

        // Draw orbit path
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const px = size/2 + points[i].real * scale;
            const py = size/2 - points[i].imag * scale;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw points
        for (let i = 0; i < points.length; i++) {
            const px = size/2 + points[i].real * scale;
            const py = size/2 - points[i].imag * scale;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);

            // Color: green while bounded, transitioning to red
            const t = i / points.length;
            const r = Math.floor(t * 255);
            const g = Math.floor((1 - t) * 255);
            ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
            ctx.fill();
        }

        // Highlight start point
        ctx.beginPath();
        ctx.arc(size/2 + points[0].real * scale, size/2 - points[0].imag * scale, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }

    animateOrbit() {
        if (!this.currentOrbit) return;

        const points = this.currentOrbit.points;
        let i = 0;

        const animate = () => {
            if (i >= points.length) return;

            this.drawOrbit(points.slice(0, i + 1), true);
            i++;

            setTimeout(() => requestAnimationFrame(animate), 100);
        };

        animate();
    }

    exportImage() {
        const multiplier = parseInt(document.getElementById('exportRes').value);

        if (multiplier === 1) {
            // Direct download
            const link = document.createElement('a');
            link.download = `julia-${this.params.cReal.toFixed(3)}_${this.params.cImag.toFixed(3)}.png`;
            link.href = this.juliaCanvas.toDataURL('image/png');
            link.click();
        } else {
            // High-res render
            document.getElementById('renderStatus').textContent = 'Rendering HD...';

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = this.juliaCanvas.width * multiplier;
            exportCanvas.height = this.juliaCanvas.height * multiplier;

            // Create temporary worker for HD render
            const hdWorker = new Worker('worker.js');

            hdWorker.onmessage = (e) => {
                if (e.data.type === 'progress') {
                    const pct = Math.round(e.data.progress * 100);
                    document.getElementById('renderStatus').textContent = `Rendering HD: ${pct}%`;
                } else if (e.data.type === 'complete') {
                    const ctx = exportCanvas.getContext('2d');
                    const imageData = new ImageData(e.data.imageData, exportCanvas.width, exportCanvas.height);
                    ctx.putImageData(imageData, 0, 0);

                    const link = document.createElement('a');
                    link.download = `julia-${this.params.cReal.toFixed(3)}_${this.params.cImag.toFixed(3)}-${multiplier}x.png`;
                    link.href = exportCanvas.toDataURL('image/png');
                    link.click();

                    document.getElementById('renderStatus').textContent = '';
                    hdWorker.terminate();
                }
            };

            hdWorker.postMessage({
                type: this.params.fractalType,
                width: exportCanvas.width,
                height: exportCanvas.height,
                cReal: this.params.cReal,
                cImag: this.params.cImag,
                maxIter: this.params.maxIter,
                bounds: this.juliaBounds,
                colorScheme: this.params.colorScheme
            });
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.explorer = new JuliaExplorer();
});
