import { translations } from './i18n.js';
import { BluetoothService } from './bluetoothService.js';
import { buildPrintBuffer } from './escposBuilder.js';
import { processImageToRaster } from './imageProcessor.js';

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
const bluetooth = new BluetoothService();

function applyTranslations(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('escpos-lang', lang);
    document.getElementById('langToggle').textContent = lang === 'es' ? 'EN' : 'ES';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    document.getElementById('ticketText').placeholder = translations[lang].textPlaceholder;
}

applyTranslations(currentLang);

document.getElementById('langToggle').addEventListener('click', () => {
    applyTranslations(currentLang === 'es' ? 'en' : 'es');
});

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

// UI State Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const uploadInput = document.getElementById('upload');
const imageControls = document.getElementById('imageControls');
const printButton = document.getElementById('printBtn');
const paperWidthSelect = document.getElementById('paperWidth');
const fontSizeSelect = document.getElementById('fontSize');
const autoCutCheckbox = document.getElementById('autoCut');
const ticketTextarea = document.getElementById('ticketText');
const rotateButton = document.getElementById('rotateBtn');
const removeImgButton = document.getElementById('removeImgBtn');
const angleLabel = document.getElementById('angleLabel');
const thresholdRange = document.getElementById('thresholdRange');
const thresholdVal = document.getElementById('thresholdVal');
const previewWrapper = document.querySelector('.preview-wrapper');

let loadedImage = null;
let currentRotation = 0;
let rasterBytesResult = null;

function updateStatus(isConnected, messageKey) {
    statusIndicator.className = `status-badge ${isConnected ? 'connected' : 'disconnected'}`;
    statusText.textContent = translations[currentLang][messageKey] || messageKey;
}

function updatePreviewCanvas() {
    if (!loadedImage) return;
    const maxWidth = parseInt(paperWidthSelect.value);
    const threshold = parseInt(thresholdRange.value);

    const { canvas, rasterBytes } = processImageToRaster(loadedImage, maxWidth, threshold, currentRotation);
    rasterBytesResult = rasterBytes;

    previewWrapper.innerHTML = '';
    previewWrapper.appendChild(canvas);
    canvas.id = 'thermalCanvas';
}

uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            loadedImage = img;
            currentRotation = img.naturalWidth > img.naturalHeight ? 90 : 0;
            angleLabel.textContent = `${currentRotation}°`;
            imageControls.style.display = 'block';
            updatePreviewCanvas();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

rotateButton.addEventListener('click', () => {
    if (!loadedImage) return;
    currentRotation = (currentRotation + 90) % 360;
    angleLabel.textContent = `${currentRotation}°`;
    updatePreviewCanvas();
});

removeImgButton.addEventListener('click', () => {
    loadedImage = null;
    rasterBytesResult = null;
    uploadInput.value = '';
    imageControls.style.display = 'none';
});

thresholdRange.addEventListener('input', () => {
    thresholdVal.textContent = thresholdRange.value;
    if (loadedImage) updatePreviewCanvas();
});

paperWidthSelect.addEventListener('change', () => {
    if (loadedImage) updatePreviewCanvas();
});

printButton.addEventListener('click', async () => {
    const textContent = ticketTextarea.value.trim();
    if (!textContent && !rasterBytesResult) {
        alert(translations[currentLang].alertNoContent);
        return;
    }

    printButton.disabled = true;
    try {
        updateStatus(false, "statusConnecting");
        await bluetooth.connect(() => {
            updateStatus(false, "statusDisconnected");
        });

        updateStatus(true, "statusConnected");
        updateStatus(true, "statusPrinting");

        const printBuffer = buildPrintBuffer({
            text: textContent,
            imageBytes: rasterBytesResult,
            paperWidth: parseInt(paperWidthSelect.value),
            fontSize: fontSizeSelect.value,
            autoCut: autoCutCheckbox.checked
        });

        await bluetooth.sendData(printBuffer);
        updateStatus(true, "statusSuccess");
    } catch (error) {
        console.error(error);
        updateStatus(false, "statusError");
        alert(translations[currentLang].errorPrefix + (error.message === "WEB_BLUETOOTH_NOT_SUPPORTED" ? translations[currentLang].alertNoBluetooth : error.message));
    } finally {
        printButton.disabled = false;
    }
});