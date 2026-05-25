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
        
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.fileRef = file; // Guardar referencia del archivo directamente en el nodo DOM
        
        // Etiqueta numerada
        const badge = document.createElement('div');
        badge.className = 'photo-badge';
        
        // Botón eliminar
        const btnDel = document.createElement('div');
        btnDel.className = 'photo-delete';
        btnDel.innerHTML = '🗑️';
        btnDel.onclick = (event) => {
            event.stopPropagation();
            card.remove(); // Borra solo este elemento sin re-renderizar todo
            updateBadges();
            updateSelectedPhotosArray();
        };
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.loading = "lazy"; // Magia para soportar 70+ fotos sin laggear el navegador
        
        card.appendChild(badge);
        card.appendChild(btnDel);
        card.appendChild(img);
        
        photoGrid.appendChild(card);
    });
    
    updateBadges();
    updateSelectedPhotosArray();
}

function updateBadges() {
    Array.from(photoGrid.children).forEach((card, index) => {
        const badge = card.querySelector('.photo-badge');
        if (badge) {
            badge.textContent = index === 0 ? 'PORTADA' : `#${index + 1}`;
            if (index === 0) {
                badge.style.background = 'var(--primary)';
                badge.style.color = '#000';
            } else {
                badge.style.background = 'rgba(0,0,0,0.7)';
                badge.style.color = 'white';
            }
        }
    });
}

function updateSelectedPhotosArray() {
    selectedPhotos = Array.from(photoGrid.children).map(card => card.fileRef);
    btnNext.disabled = selectedPhotos.length === 0;
}

// Sortable
new Sortable(photoGrid, {
    animation: 150,
    onEnd: function() {
        // Al soltar la foto, solo actualizamos los numeritos y el array final, NO re-renderizamos imágenes
        updateBadges();
        updateSelectedPhotosArray();
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
