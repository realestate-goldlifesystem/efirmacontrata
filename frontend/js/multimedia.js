// frontend/js/multimedia.js

const CLIENT_ID = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec';

let userToken = null;
let currentCdr = null;
let selectedVideo = null;
let selectedPhotos = [];

// Elementos
const loginSection = document.getElementById('login-section');
const workspace = document.getElementById('upload-workspace');
const successScreen = document.getElementById('success-screen');

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');

const btnNext = document.getElementById('btn-next');
const btnBack = document.getElementById('btn-back');
const btnUpload = document.getElementById('btn-upload');

const videoDropZone = document.getElementById('video-drop-zone');
const videoInput = document.getElementById('video-input');
const videoFilename = document.getElementById('video-filename');

const photoDropZone = document.getElementById('photo-drop-zone');
const photoInput = document.getElementById('photo-input');
const photoGrid = document.getElementById('photo-grid');

const propertyInfoCard = document.getElementById('property-info-card');

function getCdrFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cdr') || 'REG_TEST_001';
}

currentCdr = getCdrFromUrl();

// Login
window.handleCredentialResponse = function(response) {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                userToken = tokenResponse.access_token;
                loginSection.style.display = 'none';
                workspace.style.display = 'block';
                propertyInfoCard.innerHTML = `<h3>Inmueble: ${currentCdr}</h3><p>Listo para subir contenido.</p>`;
            }
        },
    });
    client.requestAccessToken();
};

// Navegación Pasos
btnNext.addEventListener('click', () => {
    step1.classList.remove('active');
    step2.classList.add('active');
    dot1.classList.remove('active');
    dot2.classList.add('active');
});

btnBack.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    dot2.classList.remove('active');
    dot1.classList.add('active');
});

// Lógica Video
videoDropZone.addEventListener('click', () => videoInput.click());
videoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); videoDropZone.classList.add('dragover'); });
videoDropZone.addEventListener('dragleave', () => videoDropZone.classList.remove('dragover'));
videoDropZone.addEventListener('drop', (e) => {
    e.preventDefault(); videoDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleVideoSelect(e.dataTransfer.files[0]);
});
videoInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleVideoSelect(e.target.files[0]);
});

function handleVideoSelect(file) {
    if (!file.type.startsWith('video/')) return alert('Debe ser un video.');
    selectedVideo = file;
    videoFilename.textContent = `${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`;
    btnUpload.disabled = false; // Como el video es el último paso, habilita el botón final
}

// Lógica Fotos
photoDropZone.addEventListener('click', () => photoInput.click());
photoDropZone.addEventListener('dragover', (e) => { e.preventDefault(); photoDropZone.classList.add('dragover'); });
photoDropZone.addEventListener('dragleave', () => photoDropZone.classList.remove('dragover'));
photoDropZone.addEventListener('drop', (e) => {
    e.preventDefault(); photoDropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handlePhotosSelect(e.dataTransfer.files);
});
photoInput.addEventListener('change', (e) => {
    if (e.target.files.length) handlePhotosSelect(e.target.files);
});

function handlePhotosSelect(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        selectedPhotos.push(file);
        renderPhotos();
    });
}

function renderPhotos() {
    photoGrid.innerHTML = '';
    selectedPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            
            // Etiqueta numerada
            const badge = document.createElement('div');
            badge.className = 'photo-badge';
            badge.textContent = index === 0 ? 'PORTADA' : `#${index + 1}`;
            
            // Botón eliminar
            const btnDel = document.createElement('div');
            btnDel.className = 'photo-delete';
            btnDel.innerHTML = '🗑️';
            btnDel.onclick = (event) => {
                event.stopPropagation();
                selectedPhotos.splice(index, 1);
                renderPhotos();
            };
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            card.appendChild(badge);
            card.appendChild(btnDel);
            card.appendChild(img);
            
            photoGrid.appendChild(card);
        };
        reader.readAsDataURL(file);
    });
    // Como las fotos son el paso 1, habilita el botón Siguiente
    btnNext.disabled = selectedPhotos.length === 0;
}

// Sortable
new Sortable(photoGrid, {
    animation: 150,
    onEnd: function(evt) {
        // Reordenar array original
        const item = selectedPhotos.splice(evt.oldIndex, 1)[0];
        selectedPhotos.splice(evt.newIndex, 0, item);
        renderPhotos(); // Re-renderizar para actualizar los numeritos
    }
});

// Subida
btnUpload.addEventListener('click', async () => {
    btnUpload.style.display = 'none';
    btnBack.style.display = 'none';
    document.getElementById('progress-container').style.display = 'block';
    
    setTimeout(() => {
        workspace.style.display = 'none';
        successScreen.style.display = 'block';
    }, 3000); // Simulado para visualizar éxito
});
