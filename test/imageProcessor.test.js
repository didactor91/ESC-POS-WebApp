import test from 'node:test';
import assert from 'node:assert/strict';
import { processImageToRaster } from '../js/imageProcessor.js';

test('processImageToRaster encodes each row left-to-right with a separate raster byte', () => {
    const width = 8;
    const height = 2;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < pixels.length; index += 4) {
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
        pixels[index + 3] = 255;
    }

    for (const [x, y] of [[0, 0], [7, 0], [3, 1]]) {
        const index = (y * width + x) * 4;
        pixels[index] = 0;
        pixels[index + 1] = 0;
        pixels[index + 2] = 0;
    }

    const context = {
        fillRect() {},
        save() {},
        translate() {},
        rotate() {},
        drawImage() {},
        restore() {},
        getImageData() {
            return { data: pixels };
        },
        putImageData() {}
    };
    const canvas = {
        width: 0,
        height: 0,
        getContext() {
            return context;
        }
    };
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { createElement: () => canvas }
    });

    try {
        const { rasterBytes } = processImageToRaster({ width, height }, width, 145, 0);

        assert.deepStrictEqual([...rasterBytes], [
            0x1D, 0x76, 0x30, 0x00,
            0x01, 0x00, 0x02, 0x00,
            0x81, 0x10
        ]);
    } finally {
        if (originalDocument) {
            Object.defineProperty(globalThis, 'document', originalDocument);
        } else {
            delete globalThis.document;
        }
    }
});
