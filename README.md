# ESC/POS WebApp

Web demo for preparing and printing tickets on ESC/POS thermal printers over Bluetooth Low Energy (BLE), directly from the browser. No app or project dependencies need to be installed.

## Features

- Add free-form text and/or an image to a ticket.
- Save, load, and delete reusable text templates in the browser.
- Preview images in black and white and adjust their threshold.
- Rotate images and fit them to 58 mm or 80 mm paper.
- Choose normal or double-height text and enable automatic paper cutting.
- Select a generic, Epson, or Xprinter printer profile with profile-specific initialization and cut commands.
- Retry the last print job after a connection interruption.
- Connect to the printer from the browser and send ESC/POS data.
- Switch between English and Spanish, and light and dark themes.
- Cache core application assets for offline reopening after the initial visit.

## Requirements

- A browser that supports **Web Bluetooth** and a secure context (`localhost` or HTTPS). Support depends on the browser and operating system; Safari on iOS does not natively support Web Bluetooth.
- A BLE thermal printer that exposes the GATT service `000018f0-0000-1000-8000-00805f9b34fb` and writable characteristic `00002af1-0000-1000-8000-00805f9b34fb`, and accepts the ESC/POS commands sent by the demo. Not all Bluetooth printers are compatible.
- Browser permission to select and connect to Bluetooth devices.

## Run locally

This is a static project with no build step. From the project directory, start a local server:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000> in a compatible browser. To access the app from another device, host it on an HTTPS server and open that URL on the device; Web Bluetooth requires a secure context.

## Tests

The project uses Node.js built-in test runner. From the project directory, run:

```bash
npm test
```

The suite checks CP858 text encoding, generated ESC/POS buffers, and matching English/Spanish translation keys.

## Usage

1. Select the paper width and print options.
2. Enter text, select an image, or use both. Save reusable text with **Save Template**; click a saved template to load it, or double-click it to delete it. Use **Clear** to empty the text field.
3. Adjust the image rotation and threshold as needed.
4. Choose a printer profile and paper width, then click **Connect & Print** and select the printer in the browser dialog.
5. If transmission fails or the printer disconnects, use **Retry Last Print** to resend the buffered job.

The printer is selected and the print job is sent when you click the button, using the browser's Web Bluetooth dialog.
Templates are stored in the browser's local storage on the current device. They are not uploaded or synchronized.

## Project structure

```text
.
├── index.html
├── sw.js
├── package.json
├── css/
│   └── styles.css
├── js/
    ├── app.js
    ├── bluetoothService.js
    ├── escposBuilder.js
    ├── i18n.js
    ├── printerProfiles.js
    └── imageProcessor.js
└── test/
    ├── escposBuilder.test.js
    └── i18n.test.js
```

- `app.js`: UI, preferences, and print workflow.
- `bluetoothService.js`: GATT connection and chunked data transfer.
- `escposBuilder.js`: text encoding and ESC/POS buffer construction.
- `imageProcessor.js`: conversion of images to monochrome raster data.
- `i18n.js`: English and Spanish translations.
- `printerProfiles.js`: printer-specific ESC/POS initialization, code page, feed, and cut commands.
- `sw.js`: service worker cache for offline reopening of the application.

## Troubleshooting

- **The browser does not show Bluetooth devices:** check that the browser and operating system are supported, that the page is served from `localhost` or HTTPS, and that Bluetooth is enabled.
- **The printer does not appear or the connection fails:** make sure it is powered on, available for pairing, and implements the GATT UUIDs listed above. ESC/POS support alone does not guarantee compatibility.
- **The printout is cropped or misaligned:** check the configured paper width and the printer's ESC/POS capabilities.
- **On iPhone or iPad:** Safari does not support Web Bluetooth; the app displays a notice with information about an alternative.
- **The print dialog is cancelled or the connection drops:** the app reports a localized cancellation or connection-loss status instead of continuing the print.
