import { translations } from './i18n.js';
import { BluetoothDiagnostics } from './bluetoothDiagnostics.js';
import { BluetoothService } from './bluetoothService.js';
import { buildPrintBuffer, canEncodeCP858 } from './escposBuilder.js';
import { processImageToRaster, processTextToRaster } from './imageProcessor.js';

// --- Theme & Language Init ---
(function() {
    const savedTheme = localStorage.getItem('escpos-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    const savedLang = localStorage.getItem('escpos-lang') || 'es';
    document.documentElement.setAttribute('lang', savedLang);
})();

let currentLang = localStorage.getItem('escpos-lang') || 'es';
const bluetoothDiagnostics = new BluetoothDiagnostics();
const bluetooth = new BluetoothService(bluetoothDiagnostics);
const bluetoothNotice = document.getElementById('bluetoothNotice');

function applyTranslations(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('escpos-lang', lang);
    document.getElementById('langToggle').textContent = lang === 'es' ? 'EN' : 'ES';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        if (translations[lang][key]) el.setAttribute('aria-label', translations[lang][key]);
    });
    document.getElementById('ticketText').placeholder = translations[lang].textPlaceholder;
    renderTemplatesList();
    refreshBluetoothNotice();
}

async function refreshBluetoothNotice() {
    try {
        const status = await bluetoothDiagnostics.getStatus();
        const messageKey = {
            available: 'bluetoothCompatibilityNotice',
            unavailable: 'bluetoothUnavailable',
            unsupported: 'alertNoBluetooth',
            insecure: 'bluetoothInsecureContext',
            unknown: 'bluetoothCompatibilityNotice'
        }[status];
        bluetoothNotice.textContent = translations[currentLang][messageKey];
    } catch (error) {
        console.error('Bluetooth availability check failed:', error);
        bluetoothNotice.textContent = translations[currentLang].bluetoothStatusCheckFailed;
    }
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
function syncThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.textContent = isDark ? '☀️' : '🌙';
}
syncThemeIcon();

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('escpos-theme', nextTheme);
    syncThemeIcon();
});

// iOS Warning check
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS && !navigator.bluetooth) {
    document.getElementById('iosAlert').style.display = 'block';
}

// UI Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const uploadInput = document.getElementById('upload');
const imageControls = document.getElementById('imageControls');
const printButton = document.getElementById('printBtn');
const retryButton = document.getElementById('retryBtn');
const paperWidthSelect = document.getElementById('paperWidth');
const fontSizeSelect = document.getElementById('fontSize');
const printerProfileSelect = document.getElementById('printerProfile');
const autoCutCheckbox = document.getElementById('autoCut');
const ticketTextarea = document.getElementById('ticketText');
const rotateButton = document.getElementById('rotateBtn');
const removeImgButton = document.getElementById('removeImgBtn');
const angleLabel = document.getElementById('angleLabel');
const thresholdRange = document.getElementById('thresholdRange');
const thresholdVal = document.getElementById('thresholdVal');
const previewWrapper = document.querySelector('.preview-wrapper');
const drawingCanvas = document.getElementById('drawingCanvas');
const clearDrawingButton = document.getElementById('clearDrawingBtn');
const cameraPreview = document.getElementById('cameraPreview');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const cameraSelectLabel = document.getElementById('cameraSelectLabel');
const cameraSelect = document.getElementById('cameraSelect');
const cameraStatus = document.getElementById('cameraStatus');
const startCameraButton = document.getElementById('startCameraBtn');
const capturePhotoButton = document.getElementById('capturePhotoBtn');
const stopCameraButton = document.getElementById('stopCameraBtn');
const retakePhotoButton = document.getElementById('retakePhotoBtn');
const inputTabs = [...document.querySelectorAll('.input-tab')];
const templatesContainer = document.getElementById('templatesContainer');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const clearTextBtn = document.getElementById('clearTextBtn');

applyTranslations(currentLang);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshBluetoothNotice();
});

document.getElementById('langToggle').addEventListener('click', () => {
    applyTranslations(currentLang === 'es' ? 'en' : 'es');
});

let loadedImage = null;
let currentRotation = 0;
let rasterBytesResult = null;
let rasterSource = null;
let cameraStream = null;
let cameraRequestId = 0;
let isDrawing = false;

function updateStatus(isConnected, messageKey) {
    statusIndicator.className = `status-badge ${isConnected ? 'connected' : 'disconnected'}`;
    statusText.textContent = translations[currentLang][messageKey] || messageKey;
}

// --- Local Templates Management ---
function getSavedTemplates() {
    try {
        return JSON.parse(localStorage.getItem('escpos-templates')) || {};
    } catch {
        return {};
    }
}

function renderTemplatesList() {
    templatesContainer.innerHTML = '';
    const templates = getSavedTemplates();
    const keys = Object.keys(templates);

    if (keys.length === 0) return;

    keys.forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-chip';
        btn.textContent = `📋 ${name}`;
        btn.title = translations[currentLang].templateButtonTitle;
        btn.onclick = () => { ticketTextarea.value = templates[name]; };
        btn.ondblclick = () => {
            const message = translations[currentLang].confirmDeleteTemplate.replace('{name}', name);
            if (confirm(message)) {
                delete templates[name];
                localStorage.setItem('escpos-templates', JSON.stringify(templates));
                renderTemplatesList();
            }
        };
        templatesContainer.appendChild(btn);
    });
}

saveTemplateBtn.addEventListener('click', () => {
    const text = ticketTextarea.value.trim();
    if (!text) return alert(translations[currentLang].alertNoContent);
    const name = prompt(translations[currentLang].promptTemplateName);
    if (!name) return;

    const templates = getSavedTemplates();
    templates[name] = text;
    localStorage.setItem('escpos-templates', JSON.stringify(templates));
    renderTemplatesList();
});

clearTextBtn.addEventListener('click', () => { ticketTextarea.value = ''; });
renderTemplatesList();

function stopCamera() {
    cameraRequestId++;
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
    cameraPlaceholder.hidden = false;
    startCameraButton.hidden = rasterSource === 'camera' && Boolean(rasterBytesResult);
    startCameraButton.disabled = false;
    capturePhotoButton.disabled = true;
    stopCameraButton.hidden = true;
}

async function updateCameraOptions(selectedDeviceId) {
    try {
        const cameras = (await navigator.mediaDevices.enumerateDevices())
            .filter(device => device.kind === 'videoinput');
        cameraSelect.replaceChildren();
        cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label
                || translations[currentLang].cameraOption.replace('{number}', String(index + 1));
            cameraSelect.appendChild(option);
        });
        const hasMultipleCameras = cameras.length > 1;
        cameraSelect.hidden = !hasMultipleCameras;
        cameraSelectLabel.hidden = !hasMultipleCameras;
        if (selectedDeviceId && cameras.some(camera => camera.deviceId === selectedDeviceId)) {
            cameraSelect.value = selectedDeviceId;
        }
    } catch (error) {
        console.error('Could not enumerate cameras:', error);
    }
}

function getRasterTabId(source) {
    return {
        upload: 'imageTab',
        drawing: 'drawTab',
        camera: 'cameraTab'
    }[source];
}

function syncImageControlsVisibility(tab = inputTabs.find(inputTab => inputTab.classList.contains('active'))) {
    imageControls.style.display = rasterBytesResult && getRasterTabId(rasterSource) === tab?.id
        ? 'block'
        : 'none';
}

function clearImageSelection() {
    loadedImage = null;
    rasterBytesResult = null;
    rasterSource = null;
    currentRotation = 0;
    uploadInput.value = '';
    angleLabel.textContent = '0°';
    previewWrapper.replaceChildren();
    imageControls.style.display = 'none';
    drawingContext.fillStyle = '#FFFFFF';
    drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    cameraStatus.textContent = '';
    cameraStatus.hidden = true;
    retakePhotoButton.hidden = true;
    startCameraButton.hidden = false;
    startCameraButton.disabled = false;
}

function activateInputTab(tab, moveFocus = false) {
    const activeTab = inputTabs.find(inputTab => inputTab.classList.contains('active'));
    const targetRasterSource = {
        imageTab: 'upload',
        drawTab: 'drawing',
        cameraTab: 'camera'
    }[tab.id];

    if (activeTab !== tab && targetRasterSource && rasterSource && rasterSource !== targetRasterSource) {
        clearImageSelection();
    }

    inputTabs.forEach(inputTab => {
        const isSelected = inputTab === tab;
        inputTab.classList.toggle('active', isSelected);
        inputTab.setAttribute('aria-selected', String(isSelected));
        inputTab.tabIndex = isSelected ? 0 : -1;
        document.getElementById(inputTab.getAttribute('aria-controls')).hidden = !isSelected;
    });
    if (tab.id !== 'cameraTab') stopCamera();
    syncImageControlsVisibility(tab);
    if (moveFocus) tab.focus();
}

inputTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateInputTab(tab));
    tab.addEventListener('keydown', event => {
        let nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % inputTabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + inputTabs.length) % inputTabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = inputTabs.length - 1;
        else return;
        event.preventDefault();
        activateInputTab(inputTabs[nextIndex], true);
    });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopCamera();
});
window.addEventListener('pagehide', stopCamera);

// --- Image Processing ---
function updatePreviewCanvas() {
    if (!loadedImage) return;
    const maxWidth = parseInt(paperWidthSelect.value);
    const threshold = parseInt(thresholdRange.value);

    const { canvas, rasterBytes } = processImageToRaster(loadedImage, maxWidth, threshold, currentRotation);
    rasterBytesResult = rasterBytes;

    previewWrapper.innerHTML = '';
    previewWrapper.appendChild(canvas);
    canvas.id = 'thermalCanvas';
    syncImageControlsVisibility();
}

function updateDrawingRaster() {
    loadedImage = drawingCanvas;
    rasterSource = 'drawing';
    currentRotation = 0;
    angleLabel.textContent = '0°';
    updatePreviewCanvas();
}

uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;
            rasterSource = 'upload';
            currentRotation = img.naturalWidth > img.naturalHeight ? 90 : 0;
            angleLabel.textContent = `${currentRotation}°`;
            updatePreviewCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

const drawingContext = drawingCanvas.getContext('2d');
drawingContext.fillStyle = '#FFFFFF';
drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
drawingContext.lineWidth = 6;
drawingContext.lineCap = 'round';
drawingContext.lineJoin = 'round';
drawingContext.strokeStyle = '#000000';

function getDrawingPoint(event) {
    const bounds = drawingCanvas.getBoundingClientRect();
    return {
        x: (event.clientX - bounds.left) * drawingCanvas.width / bounds.width,
        y: (event.clientY - bounds.top) * drawingCanvas.height / bounds.height
    };
}

drawingCanvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    const point = getDrawingPoint(event);
    drawingCanvas.setPointerCapture(event.pointerId);
    drawingContext.beginPath();
    drawingContext.moveTo(point.x, point.y);
    drawingContext.lineTo(point.x, point.y);
    drawingContext.stroke();
    isDrawing = true;
});

drawingCanvas.addEventListener('pointermove', event => {
    if (!isDrawing) return;
    const point = getDrawingPoint(event);
    drawingContext.lineTo(point.x, point.y);
    drawingContext.stroke();
});

function finishDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    updateDrawingRaster();
}

drawingCanvas.addEventListener('pointerup', finishDrawing);
drawingCanvas.addEventListener('pointercancel', finishDrawing);

clearDrawingButton.addEventListener('click', () => {
    drawingContext.fillStyle = '#FFFFFF';
    drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    if (rasterSource === 'drawing') {
        clearImageSelection();
    }
});

async function startCamera(deviceId = cameraSelect.value || null) {
    if (!navigator.mediaDevices?.getUserMedia) {
        alert(translations[currentLang].cameraUnsupported);
        return;
    }

    const requestId = ++cameraRequestId;
    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = null;
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
    cameraPlaceholder.hidden = false;
    startCameraButton.disabled = true;
    capturePhotoButton.disabled = true;
    stopCameraButton.hidden = true;
    cameraStatus.hidden = true;
    retakePhotoButton.hidden = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: deviceId
                ? { deviceId: { exact: deviceId } }
                : { facingMode: { ideal: 'environment' } },
            audio: false
        });
        if (requestId !== cameraRequestId
            || document.getElementById('cameraPanel').hidden
            || document.visibilityState === 'hidden') {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        cameraStream = stream;
        cameraPreview.srcObject = cameraStream;
        await cameraPreview.play();
        if (requestId !== cameraRequestId) return;
        cameraPreview.hidden = false;
        cameraPlaceholder.hidden = true;
        startCameraButton.hidden = true;
        capturePhotoButton.disabled = false;
        stopCameraButton.hidden = false;
        const activeDeviceId = cameraStream.getVideoTracks()[0]?.getSettings().deviceId;
        await updateCameraOptions(activeDeviceId);
    } catch (error) {
        if (requestId !== cameraRequestId) return;
        stopCamera();
        const messageKey = error.name === 'NotAllowedError' || error.name === 'SecurityError'
            ? 'cameraPermissionDenied'
            : error.name === 'NotFoundError' || error.name === 'OverconstrainedError'
                ? 'cameraNotFound'
                : 'cameraError';
        alert(translations[currentLang][messageKey]);
    }
}

startCameraButton.addEventListener('click', () => startCamera());
cameraSelect.addEventListener('change', () => {
    if (cameraStream) startCamera(cameraSelect.value);
});
stopCameraButton.addEventListener('click', () => {
    stopCamera();
    cameraStatus.textContent = '';
    cameraStatus.hidden = true;
});
retakePhotoButton.addEventListener('click', () => {
    clearImageSelection();
    startCamera(cameraSelect.value || null);
});
navigator.mediaDevices?.addEventListener?.('devicechange', () => {
    const activeDeviceId = cameraStream?.getVideoTracks()[0]?.getSettings().deviceId;
    updateCameraOptions(activeDeviceId);
});

capturePhotoButton.addEventListener('click', () => {
    if (!cameraStream || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
        alert(translations[currentLang].cameraError);
        return;
    }

    const photoCanvas = document.createElement('canvas');
    photoCanvas.width = cameraPreview.videoWidth;
    photoCanvas.height = cameraPreview.videoHeight;
    photoCanvas.getContext('2d').drawImage(cameraPreview, 0, 0);
    loadedImage = photoCanvas;
    rasterSource = 'camera';
    currentRotation = photoCanvas.width > photoCanvas.height ? 90 : 0;
    angleLabel.textContent = `${currentRotation}°`;
    stopCamera();
    startCameraButton.hidden = true;
    cameraStatus.textContent = translations[currentLang].cameraPhotoReady;
    cameraStatus.hidden = false;
    retakePhotoButton.hidden = false;
    updatePreviewCanvas();
    imageControls.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

rotateButton.addEventListener('click', () => {
    if (!loadedImage) return;
    currentRotation = (currentRotation + 90) % 360;
    angleLabel.textContent = `${currentRotation}°`;
    updatePreviewCanvas();
});

removeImgButton.addEventListener('click', () => {
    clearImageSelection();
});

thresholdRange.addEventListener('input', () => {
    thresholdVal.textContent = thresholdRange.value;
    if (loadedImage) updatePreviewCanvas();
});

paperWidthSelect.addEventListener('change', () => {
    if (loadedImage) updatePreviewCanvas();
});

// --- Print Execution Flow ---
async function executePrint(bufferTask) {
    printButton.disabled = true;
    retryButton.style.display = 'none';
    try {
        updateStatus(false, "statusConnecting");
        await bluetooth.connect(() => {
            updateStatus(false, "statusDisconnected");
            retryButton.style.display = 'block';
        });

        updateStatus(true, "statusConnected");
        updateStatus(true, "statusPrinting");

        await bluetooth.sendData(bufferTask, (percent) => {
            printButton.textContent = translations[currentLang].sendingProgress.replace('{percent}', percent);
        });

        if (rasterBytesResult) clearImageSelection();
        updateStatus(true, "statusSuccess");
        printButton.innerHTML = `🖨️ <span data-i18n="printBtnText">${translations[currentLang].printBtnText}</span>`;
    } catch (error) {
        console.error(error);
        updateStatus(false, "statusError");
        let errorMessage = error.message;
        if (error.message === "WEB_BLUETOOTH_NOT_SUPPORTED") {
            errorMessage = translations[currentLang].alertNoBluetooth;
        } else if (error.message === "BLUETOOTH_INSECURE_CONTEXT") {
            errorMessage = translations[currentLang].bluetoothInsecureContext;
        } else if (error.message === "BLUETOOTH_PERMISSION_DENIED") {
            errorMessage = translations[currentLang].bluetoothPermissionDenied;
        } else if (error.message === "USER_CANCELLED_BLUETOOTH") {
            errorMessage = translations[currentLang].userCancelled;
        } else if (error.message === "BLUETOOTH_PRINTER_NOT_COMPATIBLE") {
            errorMessage = translations[currentLang].printerNotCompatible;
        } else if (error.message === "LOST_CONNECTION_DURING_PRINT") {
            errorMessage = translations[currentLang].lostConnection;
        }
        alert(translations[currentLang].errorPrefix + errorMessage);
        printButton.innerHTML = `🖨️ <span data-i18n="printBtnText">${translations[currentLang].printBtnText}</span>`;
        if (bluetooth.lastJobBytes) {
            retryButton.style.display = 'block'; // Mostrar botón de reintento si falló a mitad
        }
    } finally {
        printButton.disabled = false;
    }
}

printButton.addEventListener('click', async () => {
    const textContent = ticketTextarea.value.trim();
    if (!textContent && !rasterBytesResult) {
        alert(translations[currentLang].alertNoContent);
        return;
    }

    const textRasterBytes = textContent && !canEncodeCP858(textContent)
        ? processTextToRaster(textContent, parseInt(paperWidthSelect.value), fontSizeSelect.value).rasterBytes
        : null;

    const printBuffer = buildPrintBuffer({
        text: textContent,
        textRasterBytes,
        imageBytes: rasterBytesResult,
        paperWidth: parseInt(paperWidthSelect.value),
        fontSize: fontSizeSelect.value,
        autoCut: autoCutCheckbox.checked,
        profileKey: printerProfileSelect.value
    });

    await executePrint(printBuffer);
});

retryButton.addEventListener('click', async () => {
    retryButton.style.display = 'none';
    await executePrint(bluetooth.lastJobBytes);
});