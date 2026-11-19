import { BluetoothDiagnostics } from './bluetoothDiagnostics.js';

const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export class BluetoothService {
    constructor(diagnostics = new BluetoothDiagnostics()) {
        this.diagnostics = diagnostics;
        this.device = null;
        this.characteristic = null;
        this.lastJobBytes = null;
    }

    async connect(onDisconnectCallback) {
        const bluetooth = this.diagnostics.assertCanRequest();

        if (!this.device) {
            try {
                this.device = await bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [SERVICE_UUID]
                });
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    throw new Error("USER_CANCELLED_BLUETOOTH");
                }
                if (error.name === 'NotAllowedError') {
                    throw new Error("BLUETOOTH_PERMISSION_DENIED");
                }
                if (error.name === 'SecurityError') {
                    throw new Error("BLUETOOTH_INSECURE_CONTEXT");
                }
                throw error;
            }

            this.device.addEventListener('gattserverdisconnected', () => {
                this.characteristic = null;
                if (onDisconnectCallback) onDisconnectCallback();
            });
        }

        if (!this.device.gatt.connected || !this.characteristic) {
            await this._initGATT();
        }
    }

    async _initGATT() {
        const server = await this.device.gatt.connect();
        try {
            const service = await server.getPrimaryService(SERVICE_UUID);
            this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error("BLUETOOTH_PRINTER_NOT_COMPATIBLE");
            }
            throw error;
        }
    }

    async sendData(bytes, onProgress) {
        this.lastJobBytes = bytes; // Guardar en memoria para posibles reintentos
        const CHUNK_SIZE = 20;
        const DELAY_MS = 10;
        const total = bytes.length;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);

            if (!this.characteristic) {
                throw new Error("LOST_CONNECTION_DURING_PRINT");
            }

            let needsDelay = false;
            if (this.characteristic.properties?.write
                && this.characteristic.writeValueWithResponse) {
                await this.characteristic.writeValueWithResponse(chunk);
            } else if (this.characteristic.properties?.writeWithoutResponse
                && this.characteristic.writeValueWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
                needsDelay = true;
            } else if (this.characteristic.writeValue) {
                await this.characteristic.writeValue(chunk);
            } else if (this.characteristic.writeValueWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
                needsDelay = true;
            } else {
                throw new Error("BLUETOOTH_CHARACTERISTIC_NOT_WRITABLE");
            }

            if (onProgress) {
                const percent = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
                onProgress(percent);
            }

            if (needsDelay) {
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
    }

    async retryLastJob(onProgress) {
        if (!this.lastJobBytes) {
            throw new Error("NO_PENDING_JOB");
        }
        return this.sendData(this.lastJobBytes, onProgress);
    }
}