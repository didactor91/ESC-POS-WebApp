export function encodeCP858(str) {
    const map = {
        'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
        'Á': 0xB5, 'É': 0x90, 'Í': 0xD6, 'Ó': 0xE0, 'Ú': 0xE9,
        'ñ': 0xA4, 'Ñ': 0xA5, 'ü': 0x81, 'Ü': 0x9A,
        'º': 0xA7, 'ª': 0xA6, '¿': 0xA8, '¡': 0xAD, '€': 0xD5
    };
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (map[ch] !== undefined) {
            bytes.push(map[ch]);
        } else {
            const code = str.charCodeAt(i);
            bytes.push(code < 128 ? code : 0x3F);
        }
    }
    return bytes;
}

export function buildPrintBuffer({ text, imageBytes, paperWidth, fontSize, autoCut }) {
    let buffer = [];

    // Initialize printer & Code Page 858
    buffer.push(0x1B, 0x40);
    buffer.push(0x1B, 0x74, 0x13);

    // Font size
    if (fontSize === 'tall') {
        buffer.push(0x1D, 0x21, 0x01);
    } else {
        buffer.push(0x1D, 0x21, 0x00);
    }

    // Text payload
    const cleanedText = text.replace(/\r\n/g, '\n').trim();
    if (cleanedText.length > 0) {
        buffer.push(...encodeCP858(cleanedText + '\n\n'));
    }

    // Image raster payload
    if (imageBytes) {
        buffer.push(0x1B, 0x61, 0x01); // Center align
        buffer.push(...imageBytes);
        buffer.push(0x1B, 0x61, 0x00); // Left align
    }

    // Feed & Cut
    buffer.push(0x1B, 0x64, 0x04);
    if (autoCut) {
        buffer.push(0x1D, 0x56, 0x00);
    }

    return new Uint8Array(buffer);
}