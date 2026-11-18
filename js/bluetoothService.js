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
    }

    async _initGATT() {
        const server = await this.device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    }

    async sendData(bytes, onProgress) {
        const CHUNK_SIZE = 256;
        const DELAY_MS = 10;

        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + CHUNK_SIZE);
            if (this.characteristic.writeValueWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } else {
                await this.characteristic.writeValue(chunk);
            }
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    async reconnect(attemptsLeft, onReconnectSuccess) {
        if (attemptsLeft <= 0 || !this.device) return false;
        await new Promise(r => setTimeout(r, 2500));
        try {
            await this._initGATT();
            if (onReconnectSuccess) onReconnectSuccess();
            return true;
        } catch (error) {
            return this.reconnect(attemptsLeft - 1, onReconnectSuccess);
        }
    }
}