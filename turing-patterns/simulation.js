/**
 * Turing Patterns Explorer
 * WebGL-based Reaction-Diffusion Simulation
 */

class TuringSimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');

        if (!this.gl) {
            alert('WebGL not supported. Please use a modern browser.');
            return;
        }

        // Simulation parameters
        this.params = {
            feedRate: 0.055,
            killRate: 0.062,
            diffusionA: 0.21,
            diffusionB: 0.105,
            simSpeed: 1.0,
            system: 'gray-scott'
        };

        // Visual parameters
        this.visual = {
            colorScheme: 'classic',
            contrast: 1.0,
            brightness: 1.0
        };

        // Tool state
        this.tool = {
            type: 'brush',
            chemical: 'B',
            size: 30,
            strength: 1.0
        };

        // Journey state
        this.journey = {
            type: 'none',
            active: false,
            speed: 1.0,
            time: 0,
            startF: 0,
            startK: 0
        };

        // Simulation state
        this.isRunning = true;
        this.resolution = 512;
        this.mousePos = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;

        // Presets
        this.presets = {
            'gray-scott': [
                { name: 'Mitosis', f: 0.0367, k: 0.0649 },
                { name: 'Coral', f: 0.0545, k: 0.0620 },
                { name: 'Fingerprint', f: 0.0370, k: 0.0610 },
                { name: 'Spirals', f: 0.0180, k: 0.0510 },
                { name: 'Maze', f: 0.0290, k: 0.0570 },
                { name: 'Spots', f: 0.0380, k: 0.0660 },
                { name: 'Stripes', f: 0.0350, k: 0.0600 },
                { name: 'Waves', f: 0.0140, k: 0.0450 },
                { name: 'Solitons', f: 0.0250, k: 0.0550 },
                { name: 'Worms', f: 0.0460, k: 0.0650 },
                { name: 'Holes', f: 0.0390, k: 0.0649 },
                { name: 'Chaos', f: 0.0260, k: 0.0590 }
            ],
            'brusselator': [
                { name: 'Spots', f: 0.04, k: 0.06 },
                { name: 'Stripes', f: 0.035, k: 0.065 },
                { name: 'Spirals', f: 0.02, k: 0.055 },
                { name: 'Waves', f: 0.025, k: 0.058 },
                { name: 'Mixed', f: 0.03, k: 0.062 },
                { name: 'Chaos', f: 0.045, k: 0.052 }
            ],
            'schnakenberg': [
                { name: 'Dots', f: 0.04, k: 0.06 },
                { name: 'Lines', f: 0.03, k: 0.065 },
                { name: 'Mixed', f: 0.035, k: 0.058 },
                { name: 'Sparse', f: 0.02, k: 0.07 },
                { name: 'Dense', f: 0.05, k: 0.055 },
                { name: 'Waves', f: 0.025, k: 0.062 }
            ]
        };

        // Color schemes
        this.colorSchemes = {
            classic: [[0, 0, 0], [255, 255, 255]],
            thermal: [[0, 0, 128], [255, 0, 0]],
            ocean: [[0, 30, 60], [0, 200, 255]],
            forest: [[10, 30, 10], [100, 200, 80]],
            sunset: [[60, 20, 80], [255, 150, 50]],
            neon: [[10, 0, 30], [0, 255, 200]]
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.createShaders();
        this.createTextures();
        this.setupUI();
        this.setupParameterSpace();
        this.loadFromURL();
        this.seedPattern();
        this.animate();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, 600);
        this.canvas.width = this.resolution;
        this.canvas.height = this.resolution;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';

        document.getElementById('resolution').textContent = `${this.resolution}×${this.resolution}`;
    }

    createShaders() {
        const gl = this.gl;

        // Vertex shader (shared)
        const vertexSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Simulation fragment shader (Gray-Scott)
        const simulationSource = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_state;
            uniform vec2 u_resolution;
            uniform float u_feed;
            uniform float u_kill;
            uniform float u_diffusionA;
            uniform float u_diffusionB;
            uniform float u_dt;
            uniform int u_system;

            void main() {
                vec2 texel = 1.0 / u_resolution;

                // Sample neighbors for Laplacian
                vec4 center = texture2D(u_state, v_texCoord);
                vec4 left = texture2D(u_state, v_texCoord + vec2(-texel.x, 0.0));
                vec4 right = texture2D(u_state, v_texCoord + vec2(texel.x, 0.0));
                vec4 up = texture2D(u_state, v_texCoord + vec2(0.0, texel.y));
                vec4 down = texture2D(u_state, v_texCoord + vec2(0.0, -texel.y));

                // Diagonal neighbors for better Laplacian
                vec4 ul = texture2D(u_state, v_texCoord + vec2(-texel.x, texel.y));
                vec4 ur = texture2D(u_state, v_texCoord + vec2(texel.x, texel.y));
                vec4 dl = texture2D(u_state, v_texCoord + vec2(-texel.x, -texel.y));
                vec4 dr = texture2D(u_state, v_texCoord + vec2(texel.x, -texel.y));

                // 9-point Laplacian stencil
                vec4 laplacian = (left + right + up + down) * 0.2
                               + (ul + ur + dl + dr) * 0.05
                               - center;

                float a = center.r;
                float b = center.g;
                float lapA = laplacian.r;
                float lapB = laplacian.g;

                float newA, newB;

                // Gray-Scott model
                float reaction = a * b * b;
                newA = a + (u_diffusionA * lapA - reaction + u_feed * (1.0 - a)) * u_dt;
                newB = b + (u_diffusionB * lapB + reaction - (u_kill + u_feed) * b) * u_dt;

                // Clamp values
                newA = clamp(newA, 0.0, 1.0);
                newB = clamp(newB, 0.0, 1.0);

                gl_FragColor = vec4(newA, newB, 0.0, 1.0);
            }
        `;

        // Render fragment shader
        const renderSource = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_state;
            uniform vec3 u_color1;
            uniform vec3 u_color2;
            uniform float u_contrast;
            uniform float u_brightness;

            void main() {
                vec4 state = texture2D(u_state, v_texCoord);
                float value = state.g; // Chemical B concentration

                // Apply contrast and brightness
                value = (value - 0.5) * u_contrast + 0.5;
                value = value * u_brightness;
                value = clamp(value, 0.0, 1.0);

                // Interpolate colors
                vec3 color = mix(u_color1, u_color2, value);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Brush fragment shader
        const brushSource = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_state;
            uniform vec2 u_brushPos;
            uniform float u_brushSize;
            uniform float u_brushStrength;
            uniform int u_chemical;
            uniform vec2 u_resolution;

            void main() {
                vec4 current = texture2D(u_state, v_texCoord);
                vec2 pos = v_texCoord * u_resolution;
                float dist = distance(pos, u_brushPos);

                if (dist < u_brushSize) {
                    float falloff = 1.0 - (dist / u_brushSize);
                    falloff = falloff * falloff * u_brushStrength;

                    if (u_chemical == 0) {
                        // Chemical A (inhibitor) - usually means erasing B
                        current.g = max(0.0, current.g - falloff);
                    } else {
                        // Chemical B (activator)
                        current.g = min(1.0, current.g + falloff);
                    }
                }

                gl_FragColor = current;
            }
        `;

        // Compile shaders
        this.simulationProgram = this.createProgram(vertexSource, simulationSource);
        this.renderProgram = this.createProgram(vertexSource, renderSource);
        this.brushProgram = this.createProgram(vertexSource, brushSource);

        // Create vertex buffer
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
        }

        return program;
    }

    createTextures() {
        const gl = this.gl;

        // Create two textures for ping-pong rendering
        this.textures = [
            this.createTexture(),
            this.createTexture()
        ];

        // Create framebuffers
        this.framebuffers = [
            this.createFramebuffer(this.textures[0]),
            this.createFramebuffer(this.textures[1])
        ];

        this.currentTexture = 0;
    }

    createTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.resolution, this.resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return texture;
    }

    createFramebuffer(texture) {
        const gl = this.gl;
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        return fb;
    }

    seedPattern() {
        const gl = this.gl;
        const data = new Uint8Array(this.resolution * this.resolution * 4);

        // Fill with chemical A (white = 1.0)
        for (let i = 0; i < this.resolution * this.resolution; i++) {
            data[i * 4] = 255;     // A = 1.0
            data[i * 4 + 1] = 0;   // B = 0.0
            data[i * 4 + 2] = 0;
            data[i * 4 + 3] = 255;
        }

        // Add some seeds of chemical B in center
        const cx = this.resolution / 2;
        const cy = this.resolution / 2;
        const seedRadius = 20;

        for (let y = 0; y < this.resolution; y++) {
            for (let x = 0; x < this.resolution; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Create a few random seed points
                if (dist < seedRadius || Math.random() < 0.001) {
                    const i = (y * this.resolution + x) * 4;
                    data[i + 1] = 255; // B = 1.0
                }
            }
        }

        // Add some additional random clusters
        for (let s = 0; s < 5; s++) {
            const sx = Math.random() * this.resolution;
            const sy = Math.random() * this.resolution;
            for (let y = 0; y < this.resolution; y++) {
                for (let x = 0; x < this.resolution; x++) {
                    const dx = x - sx;
                    const dy = y - sy;
                    if (dx * dx + dy * dy < 100) {
                        const i = (y * this.resolution + x) * 4;
                        data[i + 1] = 255;
                    }
                }
            }
        }

        // Upload to both textures
        for (const texture of this.textures) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.resolution, this.resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
    }

    simulate() {
        if (!this.isRunning) return;

        const gl = this.gl;
        const steps = Math.ceil(this.params.simSpeed * 8);

        for (let i = 0; i < steps; i++) {
            const srcTexture = this.textures[this.currentTexture];
            const dstFramebuffer = this.framebuffers[1 - this.currentTexture];

            gl.bindFramebuffer(gl.FRAMEBUFFER, dstFramebuffer);
            gl.viewport(0, 0, this.resolution, this.resolution);

            gl.useProgram(this.simulationProgram);

            // Set uniforms
            gl.uniform2f(gl.getUniformLocation(this.simulationProgram, 'u_resolution'), this.resolution, this.resolution);
            gl.uniform1f(gl.getUniformLocation(this.simulationProgram, 'u_feed'), this.params.feedRate);
            gl.uniform1f(gl.getUniformLocation(this.simulationProgram, 'u_kill'), this.params.killRate);
            gl.uniform1f(gl.getUniformLocation(this.simulationProgram, 'u_diffusionA'), this.params.diffusionA);
            gl.uniform1f(gl.getUniformLocation(this.simulationProgram, 'u_diffusionB'), this.params.diffusionB);
            gl.uniform1f(gl.getUniformLocation(this.simulationProgram, 'u_dt'), 1.0);

            // Bind source texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, srcTexture);
            gl.uniform1i(gl.getUniformLocation(this.simulationProgram, 'u_state'), 0);

            // Draw
            const posLoc = gl.getAttribLocation(this.simulationProgram, 'a_position');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this.currentTexture = 1 - this.currentTexture;
        }
    }

    render() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.renderProgram);

        // Get color scheme
        const colors = this.colorSchemes[this.visual.colorScheme] || this.colorSchemes.classic;

        gl.uniform3f(gl.getUniformLocation(this.renderProgram, 'u_color1'),
            colors[0][0] / 255, colors[0][1] / 255, colors[0][2] / 255);
        gl.uniform3f(gl.getUniformLocation(this.renderProgram, 'u_color2'),
            colors[1][0] / 255, colors[1][1] / 255, colors[1][2] / 255);
        gl.uniform1f(gl.getUniformLocation(this.renderProgram, 'u_contrast'), this.visual.contrast);
        gl.uniform1f(gl.getUniformLocation(this.renderProgram, 'u_brightness'), this.visual.brightness);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'u_state'), 0);

        const posLoc = gl.getAttribLocation(this.renderProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    applyBrush(x, y) {
        const gl = this.gl;

        const srcTexture = this.textures[this.currentTexture];
        const dstFramebuffer = this.framebuffers[1 - this.currentTexture];

        gl.bindFramebuffer(gl.FRAMEBUFFER, dstFramebuffer);
        gl.viewport(0, 0, this.resolution, this.resolution);

        gl.useProgram(this.brushProgram);

        gl.uniform2f(gl.getUniformLocation(this.brushProgram, 'u_resolution'), this.resolution, this.resolution);
        gl.uniform2f(gl.getUniformLocation(this.brushProgram, 'u_brushPos'), x, this.resolution - y);
        gl.uniform1f(gl.getUniformLocation(this.brushProgram, 'u_brushSize'), this.tool.size);
        gl.uniform1f(gl.getUniformLocation(this.brushProgram, 'u_brushStrength'), this.tool.strength);
        gl.uniform1i(gl.getUniformLocation(this.brushProgram, 'u_chemical'), this.tool.chemical === 'B' ? 1 : 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTexture);
        gl.uniform1i(gl.getUniformLocation(this.brushProgram, 'u_state'), 0);

        const posLoc = gl.getAttribLocation(this.brushProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.currentTexture = 1 - this.currentTexture;
    }

    updateJourney(dt) {
        if (!this.journey.active || this.journey.type === 'none') return;

        this.journey.time += dt * this.journey.speed * 0.001;

        let f, k;
        const t = this.journey.time;

        switch (this.journey.type) {
            case 'linear':
                // Linear interpolation between two points
                const progress = (Math.sin(t * 0.5) + 1) / 2;
                f = 0.02 + progress * 0.04;
                k = 0.045 + progress * 0.025;
                break;

            case 'circular':
                // Circular orbit in parameter space
                const cx = 0.04, cy = 0.058;
                const radius = 0.015;
                f = cx + Math.cos(t) * radius;
                k = cy + Math.sin(t) * radius;
                break;

            case 'figure8':
                // Figure-8 pattern
                f = 0.04 + Math.sin(t) * 0.02;
                k = 0.058 + Math.sin(t * 2) * 0.01;
                break;

            case 'random':
                // Random walk with smooth interpolation
                if (!this.journey.targetF || Math.random() < 0.01) {
                    this.journey.targetF = 0.015 + Math.random() * 0.045;
                    this.journey.targetK = 0.045 + Math.random() * 0.03;
                }
                f = this.params.feedRate + (this.journey.targetF - this.params.feedRate) * 0.02;
                k = this.params.killRate + (this.journey.targetK - this.params.killRate) * 0.02;
                break;
        }

        if (f !== undefined) {
            this.params.feedRate = Math.max(0, Math.min(0.1, f));
            this.params.killRate = Math.max(0, Math.min(0.08, k));
            this.updateUIFromParams();
        }
    }

    animate() {
        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        // FPS calculation
        this.frameCount++;
        if (this.frameCount >= 30) {
            this.fps = Math.round(1000 / dt);
            document.getElementById('fpsCounter').textContent = this.fps;
            this.frameCount = 0;
        }

        // Update journey
        this.updateJourney(dt);

        // Simulate and render
        this.simulate();
        this.render();

        // Update parameter space display
        this.updateParameterSpaceMarker();

        requestAnimationFrame(() => this.animate());
    }

    setupUI() {
        // Section toggles
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.toggle;
                const content = document.getElementById(targetId);
                const icon = header.querySelector('.toggle-icon');

                content.classList.toggle('collapsed');
                icon.textContent = content.classList.contains('collapsed') ? '+' : '−';
            });
        });

        // System selection
        document.getElementById('systemSelect').addEventListener('change', (e) => {
            this.params.system = e.target.value;
            this.updateSystemDescription();
            this.populatePresets();
        });

        // Parameter sliders
        this.setupSlider('feedRate', 'feedRate', (v) => this.params.feedRate = v);
        this.setupSlider('killRate', 'killRate', (v) => this.params.killRate = v);
        this.setupSlider('diffusionA', 'diffusionA', (v) => this.params.diffusionA = v);
        this.setupSlider('diffusionB', 'diffusionB', (v) => this.params.diffusionB = v);
        this.setupSlider('simSpeed', 'simSpeed', (v) => this.params.simSpeed = v);

        // Visual sliders
        this.setupSlider('contrast', 'contrast', (v) => this.visual.contrast = v, 'contrastVal');
        this.setupSlider('brightness', 'brightness', (v) => this.visual.brightness = v, 'brightnessVal');

        // Color scheme
        document.getElementById('colorScheme').addEventListener('change', (e) => {
            this.visual.colorScheme = e.target.value;
        });

        // Tool buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tool.type = btn.dataset.tool;
            });
        });

        // Chemical toggle
        document.querySelectorAll('.toggle-btn[data-chemical]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.toggle-btn[data-chemical]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tool.chemical = btn.dataset.chemical;
            });
        });

        // Brush controls
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.tool.size = parseFloat(e.target.value);
            document.getElementById('brushSizeVal').textContent = this.tool.size;
            this.updateBrushCursor();
        });

        document.getElementById('brushStrength').addEventListener('input', (e) => {
            this.tool.strength = parseFloat(e.target.value);
            document.getElementById('brushStrengthVal').textContent = this.tool.strength.toFixed(1);
        });

        // Journey controls
        document.getElementById('journeyType').addEventListener('change', (e) => {
            this.journey.type = e.target.value;
        });

        document.getElementById('startJourney').addEventListener('click', () => {
            this.journey.active = !this.journey.active;
            this.journey.time = 0;
            document.getElementById('startJourney').textContent = this.journey.active ? 'Stop Journey' : 'Start Journey';
            document.getElementById('startJourney').classList.toggle('active', this.journey.active);
        });

        document.getElementById('journeySpeed').addEventListener('input', (e) => {
            this.journey.speed = parseFloat(e.target.value);
            document.getElementById('journeySpeedVal').textContent = this.journey.speed.toFixed(1);
        });

        // Playback controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.seedPattern());
        document.getElementById('stepBtn').addEventListener('click', () => {
            if (!this.isRunning) {
                this.simulate();
                this.render();
            }
        });

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportImage());
        document.getElementById('shareBtn').addEventListener('click', () => this.copyShareURL());

        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.handleCanvasInteraction(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePos(e);
            if (this.isMouseDown) {
                this.handleCanvasInteraction(e);
            }
        });

        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
        this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.tool.size = Math.max(5, Math.min(100, this.tool.size - e.deltaY * 0.1));
            document.getElementById('brushSize').value = this.tool.size;
            document.getElementById('brushSizeVal').textContent = Math.round(this.tool.size);
            this.updateBrushCursor();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'r':
                case 'R':
                    this.seedPattern();
                    break;
            }
        });

        // Populate presets
        this.populatePresets();
        this.updateBrushCursor();
    }

    setupSlider(sliderId, paramKey, callback, valId) {
        const slider = document.getElementById(sliderId);
        const numInput = document.getElementById(sliderId + 'Num');
        const valDisplay = valId ? document.getElementById(valId) : null;

        const update = (value) => {
            callback(value);
            if (numInput) numInput.value = value;
            if (valDisplay) valDisplay.textContent = value.toFixed(1);
            this.updateParameterSpaceMarker();
            document.getElementById('currentF').textContent = this.params.feedRate.toFixed(4);
            document.getElementById('currentK').textContent = this.params.killRate.toFixed(4);
        };

        slider.addEventListener('input', (e) => update(parseFloat(e.target.value)));
        if (numInput) {
            numInput.addEventListener('input', (e) => {
                slider.value = e.target.value;
                update(parseFloat(e.target.value));
            });
        }
    }

    updateUIFromParams() {
        document.getElementById('feedRate').value = this.params.feedRate;
        document.getElementById('feedRateNum').value = this.params.feedRate.toFixed(4);
        document.getElementById('killRate').value = this.params.killRate;
        document.getElementById('killRateNum').value = this.params.killRate.toFixed(4);
        document.getElementById('currentF').textContent = this.params.feedRate.toFixed(4);
        document.getElementById('currentK').textContent = this.params.killRate.toFixed(4);
    }

    populatePresets() {
        const grid = document.getElementById('presetGrid');
        const presets = this.presets[this.params.system] || this.presets['gray-scott'];

        grid.innerHTML = presets.map((p, i) => `
            <button class="preset-btn" data-index="${i}" title="F: ${p.f}, K: ${p.k}">
                <span class="preset-name">${p.name}</span>
                <span class="preset-values">${p.f}/${p.k}</span>
            </button>
        `).join('');

        grid.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[parseInt(btn.dataset.index)];
                this.animateToParams(preset.f, preset.k);

                grid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.getElementById('patternName').textContent = preset.name;
            });
        });
    }

    animateToParams(targetF, targetK) {
        const startF = this.params.feedRate;
        const startK = this.params.killRate;
        const duration = 1000;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            this.params.feedRate = startF + (targetF - startF) * eased;
            this.params.killRate = startK + (targetK - startK) * eased;
            this.updateUIFromParams();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateSystemDescription() {
        const descriptions = {
            'gray-scott': 'Classic reaction-diffusion system with feed (F) and kill (K) parameters.',
            'brusselator': 'Two-variable autocatalytic system producing oscillations and patterns.',
            'schnakenberg': 'Simplified activator-inhibitor model for pattern formation.'
        };
        document.getElementById('systemDescription').textContent = descriptions[this.params.system];
    }

    setupParameterSpace() {
        const canvas = document.getElementById('parameterSpace');
        const ctx = canvas.getContext('2d');

        // Draw parameter space background
        this.drawParameterSpace(ctx, canvas.width, canvas.height);

        // Click to set parameters
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;

            const f = x * 0.08;
            const k = y * 0.08;

            this.animateToParams(f, k);
        });
    }

    drawParameterSpace(ctx, width, height) {
        // Create gradient showing different pattern regions
        const imageData = ctx.createImageData(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const f = (x / width) * 0.08;
                const k = (1 - y / height) * 0.08;

                // Approximate pattern regions
                let r, g, b;

                const ratio = k / (f + 0.001);

                if (f < 0.02 || k < 0.03) {
                    // Uniform/empty
                    r = 40; g = 40; b = 50;
                } else if (ratio > 1.5 && ratio < 2.5) {
                    // Spots region
                    r = 200; g = 180; b = 50;
                } else if (ratio > 1.2 && ratio < 1.5) {
                    // Stripes region
                    r = 200; g = 120; b = 50;
                } else if (f > 0.04 && k > 0.06) {
                    // Maze region
                    r = 180; g = 60; b = 60;
                } else if (f < 0.025 && k > 0.04) {
                    // Spiral region
                    r = 120; g = 60; b = 160;
                } else {
                    // Mixed/transition
                    r = 80; g = 80; b = 100;
                }

                const i = (y * width + x) * 4;
                imageData.data[i] = r;
                imageData.data[i + 1] = g;
                imageData.data[i + 2] = b;
                imageData.data[i + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Add grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 8; i++) {
            const x = (i / 8) * width;
            const y = (i / 8) * height;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px Inter';
        ctx.fillText('F →', width - 25, height - 5);
        ctx.fillText('K ↑', 5, 12);
    }

    updateParameterSpaceMarker() {
        const canvas = document.getElementById('parameterSpace');
        const ctx = canvas.getContext('2d');

        // Redraw background
        this.drawParameterSpace(ctx, canvas.width, canvas.height);

        // Draw current position
        const x = (this.params.feedRate / 0.08) * canvas.width;
        const y = (1 - this.params.killRate / 0.08) * canvas.height;

        // Crosshair
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        // Circle
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 158, 255, 0.5)';
        ctx.fill();
    }

    handleCanvasInteraction(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.resolution / rect.width;
        const scaleY = this.resolution / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (this.tool.type === 'brush' || this.tool.type === 'eraser') {
            const chemical = this.tool.type === 'eraser' ? 'A' : this.tool.chemical;
            const origChemical = this.tool.chemical;
            this.tool.chemical = chemical;
            this.applyBrush(x, y);
            this.tool.chemical = origChemical;
        } else if (this.tool.type === 'stamp') {
            this.applyStamp(x, y);
        }
    }

    applyStamp(x, y) {
        // Add a circular seed at the clicked position
        const gl = this.gl;
        const data = new Uint8Array(this.resolution * this.resolution * 4);

        // Read current state
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
        gl.readPixels(0, 0, this.resolution, this.resolution, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Add stamp
        const radius = this.tool.size;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const px = Math.floor(x + dx);
                    const py = Math.floor(this.resolution - y + dy);
                    if (px >= 0 && px < this.resolution && py >= 0 && py < this.resolution) {
                        const i = (py * this.resolution + px) * 4;
                        data[i + 1] = 255; // Add chemical B
                    }
                }
            }
        }

        // Upload modified data
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.resolution, this.resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }

    updateMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;

        const cursor = document.getElementById('brushCursor');
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }

    updateBrushCursor() {
        const cursor = document.getElementById('brushCursor');
        const rect = this.canvas.getBoundingClientRect();
        const scale = rect.width / this.resolution;
        const size = this.tool.size * scale * 2;
        cursor.style.width = size + 'px';
        cursor.style.height = size + 'px';
    }

    togglePause() {
        this.isRunning = !this.isRunning;
        document.getElementById('pauseIcon').style.display = this.isRunning ? 'block' : 'none';
        document.getElementById('playIcon').style.display = this.isRunning ? 'none' : 'block';
    }

    exportImage() {
        const multiplier = parseInt(document.getElementById('exportResolution').value);
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.resolution * multiplier;
        exportCanvas.height = this.resolution * multiplier;

        const ctx = exportCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = multiplier > 1;
        ctx.drawImage(this.canvas, 0, 0, exportCanvas.width, exportCanvas.height);

        const link = document.createElement('a');
        link.download = `turing-pattern-${this.params.system}-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    copyShareURL() {
        const params = new URLSearchParams({
            f: this.params.feedRate.toFixed(4),
            k: this.params.killRate.toFixed(4),
            da: this.params.diffusionA.toFixed(2),
            db: this.params.diffusionB.toFixed(3),
            sys: this.params.system,
            color: this.visual.colorScheme
        });

        const url = window.location.origin + window.location.pathname + '?' + params.toString();

        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('shareBtn');
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy Share URL', 2000);
        });
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);

        if (params.has('f')) this.params.feedRate = parseFloat(params.get('f'));
        if (params.has('k')) this.params.killRate = parseFloat(params.get('k'));
        if (params.has('da')) this.params.diffusionA = parseFloat(params.get('da'));
        if (params.has('db')) this.params.diffusionB = parseFloat(params.get('db'));
        if (params.has('sys')) {
            this.params.system = params.get('sys');
            document.getElementById('systemSelect').value = this.params.system;
        }
        if (params.has('color')) {
            this.visual.colorScheme = params.get('color');
            document.getElementById('colorScheme').value = this.visual.colorScheme;
        }

        this.updateUIFromParams();
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new TuringSimulation();
});
