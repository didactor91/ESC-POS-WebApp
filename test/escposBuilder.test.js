import test from 'node:test';
import assert from 'node:assert';
import { encodeCP858, buildPrintBuffer } from '../js/escposBuilder.js';

test('encodeCP858 should correctly translate Spanish characters to CP858 byte values', () => {
    // 'á' maps to 0xA0, 'ñ' maps to 0xA4, and standard 'a' maps to 97 (0x61).
    const encoded = encodeCP858('aáñ');
    assert.deepStrictEqual(encoded, [97, 0xA0, 0xA4]);
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