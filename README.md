# ESC/POS WebApp

Web demo for preparing and printing tickets on ESC/POS thermal printers over Bluetooth Low Energy (BLE), directly from the browser. No app or project dependencies need to be installed.

## Features

- Add free-form text and/or an image to a ticket.
- Organize ticket inputs into tabs for text, images, freehand drawing, and camera capture.
- Draw with a mouse or touchscreen, or take a photo and convert it to a monochrome print image.
- Print CP858 characters such as `ç` directly; text with unsupported characters such as emoji is rendered as a monochrome image.
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
- Camera capture requires browser support for `getUserMedia`, a secure context (`localhost` or HTTPS), and permission to use the camera.
- Web Bluetooth permissions are managed by the browser and requested when the user selects a printer. A webpage cannot turn on Bluetooth or grant Android permissions itself.
- A BLE thermal printer that exposes the GATT service `000018f0-0000-1000-8000-00805f9b34fb` and writable characteristic `00002af1-0000-1000-8000-00805f9b34fb`, and accepts the ESC/POS commands sent by the demo. Image printing, drawing, camera photos, and text rendered as an image require support for the `GS v 0` raster command. Not all Bluetooth printers are compatible.
- Classic Bluetooth (SPP) printers are not accessible through this web app. Supporting them requires an Android-native app or native bridge.
- Browser permission to select and connect to Bluetooth devices.

## Run locally

This is a static project with no build step. From the project directory, start a local server:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000> in a compatible browser. To access the app from another device, host it on an HTTPS server and open that URL on the device; Web Bluetooth and camera capture require a secure context.

## Tests

The project uses Node.js built-in test runner. From the project directory, run:

```bash
npm test
```

The suite checks CP858 text encoding, generated ESC/POS buffers, raster row encoding, Bluetooth availability diagnostics, connection error handling, and matching English/Spanish translation keys.

## Usage

1. Select the paper width and print options.
2. Use the **Text**, **Image**, **Draw**, or **Camera** tab to add ticket content. Text can be combined with an image, drawing, or photo. Save reusable text with **Save Template**; click a saved template to load it, or double-click it to delete it.
3. In **Draw**, sign with a mouse or touchscreen. In **Camera**, start the camera and capture a photo. Camera access requires HTTPS or localhost and browser permission; the camera stops when you capture a photo or leave the tab.
4. Adjust the image rotation and threshold as needed.
5. Choose a printer profile and paper width, then click **Connect & Print** and select the printer in the browser dialog.
6. If transmission fails or the printer disconnects, use **Retry Last Print** to resend the buffered job.

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
    ├── bluetoothDiagnostics.js
    ├── bluetoothService.js
    ├── escposBuilder.js
    ├── i18n.js
    ├── printerProfiles.js
    └── imageProcessor.js
└── test/
    ├── bluetoothDiagnostics.test.js
    ├── bluetoothService.test.js
    ├── escposBuilder.test.js
    └── i18n.test.js
```

- `app.js`: UI, preferences, and print workflow.
- `bluetoothDiagnostics.js`: secure-context, Web Bluetooth support, and adapter-availability checks. Android permissions remain managed by the browser.
- `bluetoothService.js`: GATT connection and chunked data transfer.
- `escposBuilder.js`: text encoding and ESC/POS buffer construction.
- `imageProcessor.js`: conversion of images and text to monochrome raster data.
- `i18n.js`: English and Spanish translations.
- `printerProfiles.js`: printer-specific ESC/POS initialization, code page, feed, and cut commands.
- `sw.js`: service worker cache for offline reopening of the application.

## Troubleshooting

- **The browser does not show Bluetooth devices:** check that the browser and operating system are supported, that the page is served from `localhost` or HTTPS, and that Bluetooth is enabled.
- **The camera cannot start:** use a browser with camera support on `localhost` or HTTPS, allow camera permission, and check that another app is not using the camera.
- **The printer does not appear or the connection fails:** make sure it is powered on, available for pairing, and implements the GATT UUIDs listed above. ESC/POS support alone does not guarantee compatibility.
- **The printout is cropped or misaligned:** check the configured paper width and the printer's ESC/POS capabilities.
- **Images, drawings, camera photos, or emoji text print as characters or garbled output:** the printer may not support the `GS v 0` raster command used for these contents. Check the exact printer model and its ESC/POS command support; changing the paper width does not resolve an unsupported raster command.
- **On iPhone or iPad:** Safari does not support Web Bluetooth; the app displays a notice with information about an alternative.
- **The printer does not appear on Android:** this app connects to compatible BLE printers, not classic Bluetooth (SPP) printers. Make sure Bluetooth is enabled, grant the browser nearby-device access (and location access on older Android versions), and use a supported browser from an HTTPS page.
- **The print dialog is cancelled or the connection drops:** select a device in the browser dialog. If a selected printer is reported as incompatible, it does not expose the BLE service and writable characteristic this app requires.
