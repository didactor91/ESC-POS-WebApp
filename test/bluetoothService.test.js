import test from 'node:test';
import assert from 'node:assert/strict';
import { BluetoothService } from '../js/bluetoothService.js';

function withBluetooth(bluetooth, callback) {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { bluetooth }
    });

    return Promise.resolve()
        .then(callback)
        .finally(() => {
            if (originalNavigator) {
                Object.defineProperty(globalThis, 'navigator', originalNavigator);
            } else {
                delete globalThis.navigator;
            }
        });
}

test('connect should report an unselected device when the chooser is cancelled', async () => {
    await withBluetooth({
        requestDevice: async () => {
            throw new DOMException('No device selected', 'NotFoundError');
        }
    }, async () => {
        const service = new BluetoothService();
        await assert.rejects(service.connect(), { message: 'USER_CANCELLED_BLUETOOTH' });
    });
});

test('connect should report when browser permission is denied', async () => {
    await withBluetooth({
        requestDevice: async () => {
            throw new DOMException('Permission denied', 'NotAllowedError');
        }
    }, async () => {
        const service = new BluetoothService();
        await assert.rejects(service.connect(), { message: 'BLUETOOTH_PERMISSION_DENIED' });
    });
});

test('connect should report an incompatible printer when its BLE service is missing', async () => {
    await withBluetooth({
        requestDevice: async () => ({
            addEventListener() {},
            gatt: {
                connected: false,
                async connect() {
                    return {
                        async getPrimaryService() {
                            throw new DOMException('Service not found', 'NotFoundError');
                        }
                    };
                }
            }
        })
    }, async () => {
        const service = new BluetoothService();
        await assert.rejects(service.connect(), { message: 'BLUETOOTH_PRINTER_NOT_COMPATIBLE' });
    });
});

test('sendData preserves bytes across BLE-safe writes without response', async () => {
    const service = new BluetoothService();
    const writes = [];
    service.characteristic = {
        properties: { writeWithoutResponse: true },
        async writeValueWithoutResponse(chunk) {
            writes.push([...chunk]);
        }
    };
    const bytes = Uint8Array.from({ length: 45 }, (_, index) => index);
    const progress = [];

    await service.sendData(bytes, percent => progress.push(percent));

    assert.deepStrictEqual(writes.flat(), [...bytes]);
    assert.ok(writes.every(chunk => chunk.length <= 20));
    assert.strictEqual(progress.at(-1), 100);
});

test('sendData uses acknowledged writes when the characteristic supports them', async () => {
    const service = new BluetoothService();
    const writes = [];
    service.characteristic = {
        properties: { write: true, writeWithoutResponse: true },
        async writeValueWithResponse(chunk) {
            writes.push([...chunk]);
        },
        async writeValueWithoutResponse() {
            assert.fail('Should use acknowledged writes when supported');
        }
    };

    await service.sendData(Uint8Array.from([1, 2, 3]));

    assert.deepStrictEqual(writes, [[1, 2, 3]]);
});
