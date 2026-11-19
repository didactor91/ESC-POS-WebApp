export function processImageToRaster(imageElement, maxWidth, threshold, rotationDegrees) {
    const isRotated = rotationDegrees === 90 || rotationDegrees === 270;
    const imageWidth = imageElement.naturalWidth || imageElement.width;
    const imageHeight = imageElement.naturalHeight || imageElement.height;
    const srcW = isRotated ? imageHeight : imageWidth;
    const srcH = isRotated ? imageWidth : imageHeight;

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

    const rasterBytes = canvasToRaster(ctx, width, height, threshold);

    return { canvas, rasterBytes };
}

export function processTextToRaster(text, maxWidth, fontSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontHeight = 24;
    const lineHeight = 30;
    const verticalScale = fontSize === 'tall' ? 2 : 1;
    ctx.font = `${fontHeight}px sans-serif`;
    ctx.textBaseline = 'top';

    const lines = [];
    for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
        if (!paragraph) {
            lines.push('');
            continue;
        }

        let line = '';
        for (const character of paragraph) {
            const candidate = line + character;
            if (line && ctx.measureText(candidate).width > maxWidth) {
                lines.push(line);
                line = character;
            } else {
                line = candidate;
            }
        }
        lines.push(line);
    }

    canvas.width = maxWidth;
    canvas.height = Math.ceil(lines.length * lineHeight * verticalScale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontHeight}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.save();
    ctx.scale(1, verticalScale);
    lines.forEach((line, index) => ctx.fillText(line, 0, index * lineHeight));
    ctx.restore();

    return { canvas, rasterBytes: canvasToRaster(ctx, canvas.width, canvas.height, 145) };
}

function canvasToRaster(ctx, width, height, threshold) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    const bytesW = Math.ceil(width / 8);
    let rasterBuffer = [
        0x1D, 0x76, 0x30, 0x00,
        bytesW & 0xFF, (bytesW >> 8) & 0xFF,
        height & 0xFF, (height >> 8) & 0xFF
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
    return new Uint8Array(rasterBuffer);
}