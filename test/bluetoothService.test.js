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
