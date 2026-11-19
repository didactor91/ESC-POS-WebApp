import test from 'node:test';
import assert from 'node:assert';
import { canEncodeCP858, encodeCP858, buildPrintBuffer } from '../js/escposBuilder.js';

test('encodeCP858 should correctly translate Spanish characters to CP858 byte values', () => {
    // 'á' maps to 0xA0, 'ñ' maps to 0xA4, and standard 'a' maps to 97 (0x61).
    const encoded = encodeCP858('aáñ');
    assert.deepStrictEqual(encoded, [97, 0xA0, 0xA4]);
});

test('encodeCP858 supports cedilla characters and identifies text needing rasterization', () => {
    assert.deepStrictEqual(encodeCP858('çÇ'), [0x87, 0x80]);
    assert.strictEqual(canEncodeCP858('açñ'), true);
    assert.strictEqual(canEncodeCP858('Hola 😀'), false);
});

test('buildPrintBuffer uses raster text instead of encoding unsupported characters as question marks', () => {
    const rasterText = [0x1D, 0x76, 0x30, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80];
    const buffer = buildPrintBuffer({
        text: 'Hola 😀',
        textRasterBytes: rasterText,
        imageBytes: null,
        paperWidth: 384,
        fontSize: 'normal',
        autoCut: false,
        profileKey: 'generic'
    });

    const rasterIndex = buffer.findIndex((byte, index) =>
        byte === rasterText[0] && rasterText.every((rasterByte, offset) => buffer[index + offset] === rasterByte)
    );
    assert.notStrictEqual(rasterIndex, -1);
    assert.strictEqual(buffer.includes(0x3F), false);
});

test('buildPrintBuffer forwards image raster bytes unchanged', () => {
    const imageBytes = Uint8Array.from([
        0x1D, 0x76, 0x30, 0x00,
        0x01, 0x00, 0x02, 0x00,
        0x81, 0x10
    ]);
    const buffer = buildPrintBuffer({
        text: '',
        imageBytes,
        paperWidth: 384,
        fontSize: 'normal',
        autoCut: false,
        profileKey: 'generic'
    });
    const alignCenterIndex = buffer.findIndex((byte, index) =>
        byte === 0x1B && buffer[index + 1] === 0x61 && buffer[index + 2] === 0x01
    );

    assert.notStrictEqual(alignCenterIndex, -1);
    assert.deepStrictEqual(
        [...buffer.slice(alignCenterIndex + 3, alignCenterIndex + 3 + imageBytes.length)],
        [...imageBytes]
    );
});

test('buildPrintBuffer should generate correct command sequence for generic profile', () => {
    const buffer = buildPrintBuffer({
        text: 'Test',
        imageBytes: null,
        paperWidth: 384,
        fontSize: 'normal',
        autoCut: true,
        profileKey: 'generic'
    });

    assert.ok(buffer instanceof Uint8Array);
    // Debe contener el comando inicializador ESC @ (0x1B, 0x40)
    assert.strictEqual(buffer[0], 0x1B);
    assert.strictEqual(buffer[1], 0x40);
    // Debe terminar con el comando de corte automático total (0x1D, 0x56, 0x00)
    assert.strictEqual(buffer[buffer.length - 3], 0x1D);
    assert.strictEqual(buffer[buffer.length - 2], 0x56);
    assert.strictEqual(buffer[buffer.length - 1], 0x00);
});