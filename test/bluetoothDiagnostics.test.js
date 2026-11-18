import test from 'node:test';
import assert from 'node:assert/strict';
import { BluetoothDiagnostics } from '../js/bluetoothDiagnostics.js';

test('getStatus should identify an insecure context', async () => {
    const diagnostics = new BluetoothDiagnostics({
        isSecureContext: false,
        navigator: { bluetooth: { getAvailability: async () => true } }
    });

    assert.strictEqual(await diagnostics.getStatus(), 'insecure');
    assert.throws(() => diagnostics.assertCanRequest(), {
        message: 'BLUETOOTH_INSECURE_CONTEXT'
    });
});

test('getStatus should identify a browser without Web Bluetooth', async () => {
    const diagnostics = new BluetoothDiagnostics({
        isSecureContext: true,
        navigator: {}
    });

    assert.strictEqual(await diagnostics.getStatus(), 'unsupported');
    assert.throws(() => diagnostics.assertCanRequest(), {
        message: 'WEB_BLUETOOTH_NOT_SUPPORTED'
    });
});

test('getStatus should report when the Bluetooth adapter is unavailable', async () => {
    const diagnostics = new BluetoothDiagnostics({
        isSecureContext: true,
        navigator: { bluetooth: { getAvailability: async () => false } }
    });

    assert.strictEqual(await diagnostics.getStatus(), 'unavailable');
});

test('getStatus should report available when the adapter is on', async () => {
    const diagnostics = new BluetoothDiagnostics({
        isSecureContext: true,
        navigator: { bluetooth: { getAvailability: async () => true } }
    });

    assert.strictEqual(await diagnostics.getStatus(), 'available');
});

test('getStatus should remain usable when getAvailability is not implemented', async () => {
    const diagnostics = new BluetoothDiagnostics({
        isSecureContext: true,
        navigator: { bluetooth: {} }
    });

    assert.strictEqual(await diagnostics.getStatus(), 'unknown');
    assert.deepStrictEqual(diagnostics.assertCanRequest(), {});
});
