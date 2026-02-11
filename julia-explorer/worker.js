/**
 * Web Worker for Julia Set / Mandelbrot / Burning Ship computation
 */

self.onmessage = function(e) {
    const { type, width, height, cReal, cImag, maxIter, bounds, colorScheme, fractalType } = e.data;

    const imageData = new Uint8ClampedArray(width * height * 4);

    const xMin = bounds.xMin;
    const xMax = bounds.xMax;
    const yMin = bounds.yMin;
    const yMax = bounds.yMax;

    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const x0 = xMin + px * xScale;
            const y0 = yMax - py * yScale; // Flip y for canvas coordinates

            let zx, zy, cx, cy;
            let iter = 0;

            if (type === 'julia' || type === 'burning-julia') {
                // Julia set: z starts at the point, c is fixed
                zx = x0;
                zy = y0;
                cx = cReal;
                cy = cImag;
            } else {
                // Mandelbrot: z starts at 0, c is the point
                zx = 0;
                zy = 0;
                cx = x0;
                cy = y0;
            }

            let zx2 = zx * zx;
            let zy2 = zy * zy;

            // Iteration loop
            while (zx2 + zy2 < 4 && iter < maxIter) {
                if (type === 'burning-julia' || type === 'burning-mandelbrot') {
                    // Burning Ship: z = (|Re(z)| + i|Im(z)|)² + c
                    zx = Math.abs(zx);
                    zy = Math.abs(zy);
                }

                // z = z² + c
                const xtemp = zx2 - zy2 + cx;
                zy = 2 * zx * zy + cy;
                zx = xtemp;

                zx2 = zx * zx;
                zy2 = zy * zy;
                iter++;
            }

            // Smooth coloring using normalized iteration count
            let smoothIter = iter;
            if (iter < maxIter) {
                const log_zn = Math.log(zx2 + zy2) / 2;
                const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
                smoothIter = iter + 1 - nu;
            }

            // Get color
            const idx = (py * width + px) * 4;
            const color = getColor(smoothIter, maxIter, iter === maxIter, colorScheme);
            imageData[idx] = color[0];
            imageData[idx + 1] = color[1];
            imageData[idx + 2] = color[2];
            imageData[idx + 3] = 255;
        }

        // Report progress every 50 rows
        if (py % 50 === 0) {
            self.postMessage({ type: 'progress', progress: py / height });
        }
    }

    self.postMessage({ type: 'complete', imageData: imageData });
};

function getColor(iter, maxIter, bounded, scheme) {
    // Interior points are black
    if (bounded) {
        return [0, 0, 0];
    }

    const t = iter / maxIter;

    switch (scheme) {
        case 'classic':
            // Blue to white
            const b = Math.floor(255 * Math.pow(t, 0.5));
            return [b * 0.3, b * 0.5, Math.min(255, b + 50)];

        case 'fire':
            // Black → red → orange → yellow → white
            if (t < 0.25) {
                const s = t * 4;
                return [Math.floor(255 * s), 0, 0];
            } else if (t < 0.5) {
                const s = (t - 0.25) * 4;
                return [255, Math.floor(128 * s), 0];
            } else if (t < 0.75) {
                const s = (t - 0.5) * 4;
                return [255, 128 + Math.floor(127 * s), Math.floor(64 * s)];
            } else {
                const s = (t - 0.75) * 4;
                return [255, 255, 64 + Math.floor(191 * s)];
            }

        case 'ocean':
            // Dark blue → cyan → white
            const o1 = Math.floor(50 + 205 * t);
            const o2 = Math.floor(80 + 175 * t);
            const o3 = Math.floor(120 + 135 * t);
            return [o1 * 0.3, o2, o3];

        case 'neon':
            // Black → magenta → cyan → green
            const h = (t * 270 + 300) % 360;
            return hslToRgb(h, 100, 50 * Math.min(1, t * 2));

        case 'grayscale':
            const g = Math.floor(255 * t);
            return [g, g, g];

        case 'rainbow':
            // HSL rainbow
            const hue = t * 360;
            return hslToRgb(hue, 100, 50);

        default:
            return [Math.floor(255 * t), Math.floor(255 * t), Math.floor(255 * t)];
    }
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
        Math.floor((r + m) * 255),
        Math.floor((g + m) * 255),
        Math.floor((b + m) * 255)
    ];
}
