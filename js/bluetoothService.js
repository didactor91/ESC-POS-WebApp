const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export class BluetoothService {
    constructor() {
        this.device = null;
        this.characteristic = null;
    }

    async connect(onDisconnectCallback) {
        if (!navigator.bluetooth) {
            throw new Error("WEB_BLUETOOTH_NOT_SUPPORTED");
        }

        try {
            if (!this.device) {
                this.device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [SERVICE_UUID]
                });
                this.device.addEventListener('gattserverdisconnected', () => {
                    this.characteristic = null;
                    if (onDisconnectCallback) onDisconnectCallback();
                });
            }

            if (!this.device.gatt.connected || !this.characteristic) {
                await this._initGATT();
            }
        } catch (error) {
            // Si el usuario cancela el selector de dispositivos
            if (error.name === 'NotFoundError') {
                throw new Error("USER_CANCELLED_BLUETOOTH");
            }
            throw error;
        }
    }

    async _initGATT() {
        const server = await this.device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    }

    async sendData(bytes, onProgress) {
        const CHUNK_SIZE = 256;
        const DELAY_MS = 10;
        const total = bytes.length;

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);

            if (!this.characteristic) {
                throw new Error("LOST_CONNECTION_DURING_PRINT");
            }

            if (this.characteristic.writeValueWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } else {
                await this.characteristic.writeValue(chunk);
            }

            if (onProgress) {
                const percent = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
                onProgress(percent);
            }

            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }
}