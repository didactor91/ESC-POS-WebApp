import test from 'node:test';
import assert from 'node:assert';
import { translations } from '../js/i18n.js';

test('i18n dictionaries should have matching keys in both EN and ES', () => {
    const enKeys = Object.keys(translations.en).sort();
    const esKeys = Object.keys(translations.es).sort();

    assert.deepStrictEqual(
        enKeys,
        esKeys,
        "Las claves de traducción entre Inglés y Español no coinciden exactamente."
    );
});