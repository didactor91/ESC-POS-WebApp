import { PRINTER_PROFILES } from './printerProfiles.js';

const CP858_CHARACTERS = {
    'á': 0xA0, 'é': 0x82, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
    'Á': 0xB5, 'É': 0x90, 'Í': 0xD6, 'Ó': 0xE0, 'Ú': 0xE9,
    'ñ': 0xA4, 'Ñ': 0xA5, 'ü': 0x81, 'Ü': 0x9A, 'ç': 0x87, 'Ç': 0x80,
    'º': 0xA7, 'ª': 0xA6, '¿': 0xA8, '¡': 0xAD, '€': 0xD5
};

export function canEncodeCP858(str) {
    for (const ch of str) {
        if (ch.charCodeAt(0) >= 128 && CP858_CHARACTERS[ch] === undefined) {
            return false;
        }
    }
    return true;
}

export function encodeCP858(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (CP858_CHARACTERS[ch] !== undefined) {
            bytes.push(CP858_CHARACTERS[ch]);
        } else {
            const code = str.charCodeAt(i);
            bytes.push(code < 128 ? code : 0x3F);
        }
    }
    return bytes;
}

export function buildPrintBuffer({ text, textRasterBytes, imageBytes, paperWidth, fontSize, autoCut, profileKey }) {
    const profile = PRINTER_PROFILES[profileKey] || PRINTER_PROFILES.generic;
    let buffer = [];

    // Initialize & Code Page
    buffer.push(...profile.init);
    buffer.push(...profile.codePage);

    // Font size
    if (fontSize === 'tall') {
        buffer.push(0x1D, 0x21, 0x01);
    } else {
        buffer.push(0x1D, 0x21, 0x00);
    }

    // Text payload
    const cleanedText = text.replace(/\r\n/g, '\n').trim();
    if (cleanedText.length > 0 && textRasterBytes) {
        buffer.push(0x1B, 0x61, 0x00, ...textRasterBytes);
    } else if (cleanedText.length > 0) {
        buffer.push(...encodeCP858(cleanedText + '\n\n'));
    }

    // Image raster payload
    if (imageBytes) {
        buffer.push(0x1B, 0x61, 0x01); // Center
        buffer.push(...imageBytes);
        buffer.push(0x1B, 0x61, 0x00); // Left
    }

    // Feed & Cut based on profile
    buffer.push(...profile.feed);
    if (autoCut) {
        buffer.push(...profile.cut);
    }

    return new Uint8Array(buffer);
}