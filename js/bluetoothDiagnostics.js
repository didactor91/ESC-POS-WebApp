export class BluetoothDiagnostics {
    constructor(environment = globalThis) {
        this.environment = environment;
    }

    assertCanRequest() {
        if (this.environment.isSecureContext === false) {
            throw new Error('BLUETOOTH_INSECURE_CONTEXT');
        }

        const bluetooth = this.environment.navigator?.bluetooth;
        if (!bluetooth) {
            throw new Error('WEB_BLUETOOTH_NOT_SUPPORTED');
        }

        return bluetooth;
    }

    async getStatus() {
        if (this.environment.isSecureContext === false) {
            return 'insecure';
        }

        const bluetooth = this.environment.navigator?.bluetooth;
        if (!bluetooth) {
            return 'unsupported';
        }

        if (typeof bluetooth.getAvailability !== 'function') {
            return 'unknown';
        }

        return await bluetooth.getAvailability() ? 'available' : 'unavailable';
    }
}
