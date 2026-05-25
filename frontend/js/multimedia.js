// frontend/js/multimedia.js

const CLIENT_ID = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec';

let userToken = null;
let currentCdr = null;
let propertyData = null;
let selectedVideo = null;
let selectedPhotos = [];

// Elementos del DOM
const loginSection = document.getElementById('login-section');
const workspace = document.getElementById('upload-workspace');
const propertyInfoCard = document.getElementById('property-info-card');
const videoDropZone = document.getElementById('video-drop-zone');
const videoInput = document.getElementById('video-input');
const videoFilename = document.getElementById('video-filename');
const photoDropZone = document.getElementById('photo-drop-zone');
const photoInput = document.getElementById('photo-input');
const photoGrid = document.getElementById('photo-grid');
const btnUpload = document.getElementById('btn-upload');
const progressContainer = document.getElementById('progress-container');
const progressLabel = document.getElementById('progress-label');
const progressPercentage = document.getElementById('progress-percentage');
const progressFill = document.getElementById('progress-fill');
const successScreen = document.getElementById('success-screen');

// 1. Obtener CDR de la URL
function getCdrFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cdr') || 'REG_TEST_001'; // Fallback para pruebas
}

currentCdr = getCdrFromUrl();

// 2. Callback de Google Sign-In
window.handleCredentialResponse = function(response) {
    // Para poder subir a YouTube, necesitamos un Access Token, no solo un ID Token.
    // Usaremos el Google Identity Services implicit flow para pedir el scope de YouTube.
    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                userToken = tokenResponse.access_token;
                loginSection.style.display = 'none';
                workspace.style.display = 'block';
                loadPropertyData();
            }
        },
    });
    client.requestAccessToken();
};

// 3. Cargar Datos del CRM (Apps Script)
async function loadPropertyData() {
    try {
        // En MVP, simulamos o hacemos petición real
        propertyInfoCard.innerHTML = `
            <h3>Inmueble: ${currentCdr}</h3>
            <p>Por favor selecciona el video y las fotos correspondientes a este registro.</p>
        `;
        // Aquí iría el fetch a Apps Script para obtener la Descripción Oficial y el folderId
    } catch (e) {
        console.error(e);
        propertyInfoCard.innerHTML = `<p style="color:red">Error cargando datos del inmueble.</p>`;
    }
}

// 4. Lógica de Video (Drag & Drop)
videoDropZone.addEventListener('click', () => videoInput.click());
videoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); videoDropZone.classList.add('dragover'); });
videoDropZone.addEventListener('dragleave', () => videoDropZone.classList.remove('dragover'));
videoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleVideoSelect(e.dataTransfer.files[0]);
});
videoInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleVideoSelect(e.target.files[0]);
});

function handleVideoSelect(file) {
    if (!file.type.startsWith('video/')) return alert('Debe ser un archivo de video.');
    selectedVideo = file;
    videoFilename.textContent = file.name + ` (${(file.size / (1024*1024)).toFixed(2)} MB)`;
    checkReady();
}

// 5. Lógica de Fotos (Drag & Drop y Sortable)
photoDropZone.addEventListener('click', () => photoInput.click());
photoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); photoDropZone.classList.add('dragover'); });
photoDropZone.addEventListener('dragleave', () => photoDropZone.classList.remove('dragover'));
photoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    photoDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handlePhotosSelect(e.dataTransfer.files);
});
photoInput.addEventListener('change', (e) => {
    if (e.target.files.length) handlePhotosSelect(e.target.files);
});

function handlePhotosSelect(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        selectedPhotos.push(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.innerHTML = `<img src="${e.target.result}" alt="Foto">`;
            card.fileRef = file; // Guardar referencia al archivo real
            photoGrid.appendChild(card);
        };
        reader.readAsDataURL(file);
    });
    checkReady();
}

// Inicializar SortableJS para arrastrar
new Sortable(photoGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: function() {
        // Reordenar array original basado en el DOM
        const newArray = [];
        Array.from(photoGrid.children).forEach(card => newArray.push(card.fileRef));
        selectedPhotos = newArray;
    }
});

function checkReady() {
    btnUpload.disabled = !(selectedVideo && selectedPhotos.length > 0);
}

// 6. Proceso de Subida Principal
btnUpload.addEventListener('click', async () => {
    btnUpload.style.display = 'none';
    progressContainer.style.display = 'block';
    
    try {
        // 1. Subir Video a YouTube (Resumable Upload)
        progressLabel.textContent = 'Subiendo Video a YouTube...';
        const youtubeId = await uploadVideoToYouTube(selectedVideo);
        
        // 2. Subir Fotos a Google Drive
        progressLabel.textContent = 'Subiendo Fotografías a Drive...';
        const photoIds = await uploadPhotosToDrive(selectedPhotos);
        
        // 3. Notificar a Apps Script para generar plantillas
        progressLabel.textContent = 'Generando plantillas y notificando...';
        await notifyBackend(youtubeId, photoIds);
        
        // 4. Éxito!
        workspace.style.display = 'none';
        successScreen.style.display = 'block';
        
    } catch (e) {
        alert('Error durante la subida: ' + e.message);
        btnUpload.style.display = 'block';
        progressContainer.style.display = 'none';
    }
});

async function uploadVideoToYouTube(file) {
    // Implementación del chunking resumable upload...
    // Retornamos un ID falso por ahora para el esqueleto
    return new Promise(resolve => setTimeout(() => resolve('YOUTUBE_ID_TEST'), 2000));
}

async function uploadPhotosToDrive(files) {
    // Implementación de subida múltiple a Drive...
    return new Promise(resolve => setTimeout(() => resolve(['FILE_ID_1', 'FILE_ID_2']), 2000));
}

async function notifyBackend(youtubeId, photoIds) {
    // Fetch POST a APPS_SCRIPT_URL
    return new Promise(resolve => setTimeout(resolve, 1000));
}
