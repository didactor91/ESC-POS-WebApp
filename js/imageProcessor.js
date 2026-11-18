export function processImageToRaster(imageElement, maxWidth, threshold, rotationDegrees) {
    const isRotated = rotationDegrees === 90 || rotationDegrees === 270;
    const srcW = isRotated ? imageElement.naturalHeight : imageElement.naturalWidth;
    const srcH = isRotated ? imageElement.naturalWidth : imageElement.naturalHeight;

    const scale = maxWidth / srcW;
    const width = maxWidth;
    const height = Math.floor(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotationDegrees * Math.PI) / 180);

    const drawW = isRotated ? height : width;
    const drawH = isRotated ? width : height;
    ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    const bytesW = Math.ceil(width / 8);
    const bytesH = height;

    let rasterBuffer = [
        0x1D, 0x76, 0x30, 0x00,
        bytesW & 0xFF, (bytesW >> 8) & 0xFF,
        bytesH & 0xFF, (bytesH >> 8) & 0xFF
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < bytesW; x++) {
            let byte = 0;
            for (let b = 0; b < 8; b++) {
                const pxX = (x * 8) + b;
                if (pxX < width) {
                    const idx = (y * width + pxX) * 4;
                    const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
                    const isBlack = gray < threshold;

                    if (isBlack) {
                        byte |= (1 << (7 - b));
                        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 0;
                    } else {
                        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 255;
                    }
                    pixels[idx + 3] = 255;
                }
            }
            rasterBuffer.push(byte);
        }
    }

    ctx.putImageData(imgData, 0, 0);
    return {
        canvas,
        rasterBytes: new Uint8Array(rasterBuffer)
    };
}