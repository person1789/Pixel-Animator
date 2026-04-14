/**
 * Bundled GIF Encoder — Lightweight LZW-based animated GIF encoder.
 * No external dependencies.
 */

class GIFEncoder {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.frames = [];
        this.delay = 100; // ms
        this.repeat = 0;  // 0 = loop forever
    }

    setDelay(ms) {
        this.delay = ms;
    }

    setRepeat(count) {
        this.repeat = count;
    }

    addFrame(imageData) {
        // imageData: Uint8ClampedArray (RGBA, width*height*4)
        // Quantize to 256-color palette
        const { palette, indexedPixels } = this._quantize(imageData);
        this.frames.push({ palette, indexedPixels, delay: this.delay });
    }

    encode() {
        const bytes = [];

        // GIF Header
        this._writeString(bytes, 'GIF89a');

        // Logical Screen Descriptor
        this._writeShort(bytes, this.width);
        this._writeShort(bytes, this.height);
        bytes.push(0x70); // GCT flag = 0, color res = 7, no sort, no GCT
        bytes.push(0);    // Background color index
        bytes.push(0);    // Pixel aspect ratio

        // Netscape extension for looping
        bytes.push(0x21, 0xFF, 0x0B);
        this._writeString(bytes, 'NETSCAPE2.0');
        bytes.push(0x03, 0x01);
        this._writeShort(bytes, this.repeat);
        bytes.push(0x00);

        for (const frame of this.frames) {
            // Graphic Control Extension
            bytes.push(0x21, 0xF9, 0x04);
            bytes.push(0x08); // Dispose: restore to background, no transparency
            this._writeShort(bytes, Math.round(frame.delay / 10)); // Delay in 1/100ths sec
            bytes.push(0x00); // Transparent color index (none)
            bytes.push(0x00); // Block terminator

            // Image Descriptor
            bytes.push(0x2C);
            this._writeShort(bytes, 0); // Left
            this._writeShort(bytes, 0); // Top
            this._writeShort(bytes, this.width);
            this._writeShort(bytes, this.height);
            bytes.push(0x87); // Local color table, 256 colors, not interlaced

            // Local Color Table (256 entries × 3 bytes)
            for (let i = 0; i < 256; i++) {
                if (i < frame.palette.length) {
                    bytes.push(frame.palette[i][0], frame.palette[i][1], frame.palette[i][2]);
                } else {
                    bytes.push(0, 0, 0);
                }
            }

            // LZW encoded pixel data
            const minCodeSize = 8;
            bytes.push(minCodeSize);
            const lzwData = this._lzwEncode(frame.indexedPixels, minCodeSize);
            
            // Write sub-blocks
            let offset = 0;
            while (offset < lzwData.length) {
                const chunkSize = Math.min(255, lzwData.length - offset);
                bytes.push(chunkSize);
                for (let i = 0; i < chunkSize; i++) {
                    bytes.push(lzwData[offset++]);
                }
            }
            bytes.push(0x00); // Block terminator
        }

        // GIF Trailer
        bytes.push(0x3B);

        return new Uint8Array(bytes);
    }

    /**
     * Simple median-cut color quantization to 256 colors.
     */
    _quantize(rgba) {
        const colorMap = new Map();
        const pixelCount = this.width * this.height;

        // Collect unique colors (downsample by dropping low bits for speed)
        for (let i = 0; i < pixelCount * 4; i += 4) {
            const r = rgba[i] & 0xF8;
            const g = rgba[i + 1] & 0xF8;
            const b = rgba[i + 2] & 0xF8;
            const key = (r << 16) | (g << 8) | b;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }

        // Build palette from most common colors
        let entries = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256);
        const palette = entries.map(([key]) => [
            (key >> 16) & 0xFF,
            (key >> 8) & 0xFF,
            key & 0xFF
        ]);

        // Pad to 256
        while (palette.length < 256) {
            palette.push([0, 0, 0]);
        }

        // Map pixels to palette indices using nearest-color
        const indexedPixels = new Uint8Array(pixelCount);
        for (let i = 0; i < pixelCount; i++) {
            const ri = i * 4;
            const r = rgba[ri];
            const g = rgba[ri + 1];
            const b = rgba[ri + 2];
            indexedPixels[i] = this._nearestColor(palette, r, g, b);
        }

        return { palette, indexedPixels };
    }

    _nearestColor(palette, r, g, b) {
        let minDist = Infinity;
        let bestIdx = 0;
        for (let i = 0; i < palette.length; i++) {
            const dr = r - palette[i][0];
            const dg = g - palette[i][1];
            const db = b - palette[i][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
                if (dist === 0) break;
            }
        }
        return bestIdx;
    }

    /**
     * LZW compression for GIF.
     */
    _lzwEncode(pixels, minCodeSize) {
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;
        const maxCode = 4096;

        // Build initial dictionary
        let dictionary = new Map();
        for (let i = 0; i < clearCode; i++) {
            dictionary.set(String(i), i);
        }

        const output = [];
        let buffer = 0;
        let bufferBits = 0;

        const writeBits = (code, size) => {
            buffer |= (code << bufferBits);
            bufferBits += size;
            while (bufferBits >= 8) {
                output.push(buffer & 0xFF);
                buffer >>= 8;
                bufferBits -= 8;
            }
        };

        writeBits(clearCode, codeSize);

        let current = String(pixels[0]);

        for (let i = 1; i < pixels.length; i++) {
            const next = String(pixels[i]);
            const combined = current + ',' + next;

            if (dictionary.has(combined)) {
                current = combined;
            } else {
                writeBits(dictionary.get(current), codeSize);

                if (nextCode < maxCode) {
                    dictionary.set(combined, nextCode++);
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                } else {
                    // Reset dictionary
                    writeBits(clearCode, codeSize);
                    dictionary = new Map();
                    for (let j = 0; j < clearCode; j++) {
                        dictionary.set(String(j), j);
                    }
                    nextCode = eoiCode + 1;
                    codeSize = minCodeSize + 1;
                }

                current = next;
            }
        }

        writeBits(dictionary.get(current), codeSize);
        writeBits(eoiCode, codeSize);

        // Flush remaining bits
        if (bufferBits > 0) {
            output.push(buffer & 0xFF);
        }

        return output;
    }

    _writeString(bytes, str) {
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }
    }

    _writeShort(bytes, value) {
        bytes.push(value & 0xFF);
        bytes.push((value >> 8) & 0xFF);
    }
}

/**
 * GIF Exporter — exports animation as animated GIF.
 */
export class GIFExporter {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
    }

    /**
     * Export animation as GIF.
     * @param {number} scale - Scale multiplier
     */
    export(scale = 1) {
        const { canvasWidth, canvasHeight, frames, fps } = this.state;
        const w = canvasWidth * scale;
        const h = canvasHeight * scale;
        const delay = Math.round(1000 / fps);

        const encoder = new GIFEncoder(w, h);
        encoder.setDelay(delay);
        encoder.setRepeat(0);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;

        const scaleCanvas = document.createElement('canvas');
        scaleCanvas.width = w;
        scaleCanvas.height = h;
        const sctx = scaleCanvas.getContext('2d');
        sctx.imageSmoothingEnabled = false;

        for (const frame of frames) {
            this.renderer.renderFrameToCanvas(frame, tempCanvas, true);
            sctx.clearRect(0, 0, w, h);
            sctx.drawImage(tempCanvas, 0, 0, w, h);
            const imageData = sctx.getImageData(0, 0, w, h);
            encoder.addFrame(imageData.data);
        }

        const gifData = encoder.encode();
        const blob = new Blob([gifData], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-animator-animation.gif`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
