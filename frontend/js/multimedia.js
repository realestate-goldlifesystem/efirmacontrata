// frontend/js/multimedia.js

const CLIENT_ID = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOnhQ8CD2gWMdvvYnF2v1FL3yto5sM8i_jV9FmIJa1Os05YwXR5RKSsq22ePlwqQgL/exec';

let userToken = null;
let currentCdr = null;
let propertyData = null; // Para guardar el Folder ID y Descripción
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
                loadPropertyData();
            }
        },
    });
    client.requestAccessToken();
};

async function loadPropertyData() {
    try {
        propertyInfoCard.innerHTML = `<h3>Consultando CRM Inmueble: ${currentCdr}...</h3>`;
        const response = await fetch(`${APPS_SCRIPT_URL}?accion=getMultimediaData&cdr=${currentCdr}`);
        const data = await response.json();
        
        if (data && data.success) {
            propertyData = data;
            propertyInfoCard.innerHTML = `
                <h3>Inmueble: ${currentCdr}</h3>
                <p>✅ Datos cargados. Listo para procesar y subir contenido.</p>
            `;
        } else {
            propertyInfoCard.innerHTML = `<p style="color:var(--danger)">Error: ${data.message || 'No se encontró el CDR en la hoja 1.1'}</p>`;
        }
    } catch (e) {
        console.error(e);
        propertyInfoCard.innerHTML = `<p style="color:var(--danger)">Error de conexión con el CRM (Apps Script).</p>`;
    }
}

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
    const progressContainer = document.getElementById('progress-container');
    const progressLabel = document.getElementById('progress-label');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-fill');
    
    progressContainer.style.display = 'block';
    
    try {
        // 1. Subir Video a YouTube (Resumable Upload)
        progressLabel.textContent = 'Subiendo Video a YouTube...';
        progressFill.style.width = '0%';
        const youtubeId = await uploadVideoToYouTube(selectedVideo, progressPercentage, progressFill);
        
        // 2. Subir Fotos a Google Drive
        progressLabel.textContent = 'Subiendo Fotografías a Drive...';
        progressPercentage.textContent = '';
        progressFill.style.width = '0%';
        const photoIds = await uploadPhotosToDrive(selectedPhotos, progressLabel, progressFill);
        
        // 3. Notificar a Apps Script para generar plantillas
        progressLabel.textContent = 'Creando plantillas PDF/PNG... (puede tardar un minuto)';
        progressFill.style.width = '100%';
        await notifyBackend(youtubeId, photoIds);
        
        // 4. Éxito!
        workspace.style.display = 'none';
        successScreen.style.display = 'block';
        
    } catch (e) {
        alert('❌ Error durante la subida: ' + e.message);
        btnUpload.style.display = 'block';
        btnBack.style.display = 'block';
        progressContainer.style.display = 'none';
    }
});

async function uploadVideoToYouTube(file, percentText, fillBar) {
    if (!userToken) throw new Error("Sesión de Google expirada.");

    // YouTube requiere mínimo Título, Descripción y estado Privado
    const title = `Inmueble ${currentCdr}`;
    const description = propertyData && propertyData.descripcionText ? propertyData.descripcionText : "Video Recorrido Inmueble";

    const metadata = {
        snippet: { title: title, description: description, categoryId: 22 },
        status: { privacyStatus: "private", selfDeclaredMadeForKids: false }
    };

    // 1. Iniciar sesión Resumable (le avisa a YT que le mandaremos un archivo gigante en pedazos)
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': file.size.toString(),
            'X-Upload-Content-Type': file.type
        },
        body: JSON.stringify(metadata)
    });

    if (!initRes.ok) throw new Error('No se pudo iniciar la subida a YouTube: ' + await initRes.text());
    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('YouTube no devolvió la ruta de subida');

    // 2. Enviar en Chunks (Pedazos) de 5MB
    const chunkSize = 5 * 1024 * 1024;
    const totalSize = file.size;
    let offset = 0;

    while (offset < totalSize) {
        const chunkEnd = Math.min(offset + chunkSize, totalSize);
        const chunk = file.slice(offset, chunkEnd);

        const chunkRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${totalSize}` },
            body: chunk
        });

        if (chunkRes.status === 308) { // 308 = "Recibí el pedazo, manda el siguiente"
            offset = chunkEnd;
            const percent = Math.round((offset / totalSize) * 100);
            percentText.textContent = percent + '%';
            fillBar.style.width = percent + '%';
        } else if (chunkRes.ok) { // 200/201 = "Video subido completamente"
            percentText.textContent = '100%';
            fillBar.style.width = '100%';
            const videoData = await chunkRes.json();
            return videoData.id;
        } else {
            throw new Error('Falló la subida de un pedazo del video: ' + await chunkRes.text());
        }
    }
}

async function uploadPhotosToDrive(photosArray, labelEl, fillEl) {
    if (!userToken || !propertyData || !propertyData.fotosFolderId) {
        throw new Error("No hay carpeta de fotografías asignada en el CRM.");
    }
    
    const uploadedIds = [];
    let idx = 1;
    const total = photosArray.length;

    for (const item of photosArray) {
        const file = item.file || item;
        labelEl.textContent = `Subiendo foto ${idx} de ${total} a Drive...`;
        fillEl.style.width = Math.round((idx / total) * 100) + '%';
        
        // Forma "multipart" de Google Drive API (Sube archivo y nombre al mismo tiempo)
        const metadata = {
            name: idx === 1 ? `Portada_${currentCdr}` : `Foto_${idx}_${currentCdr}`,
            parents: [propertyData.fotosFolderId]
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);
        
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${userToken}` },
            body: form
        });
        
        if (res.ok) {
            const data = await res.json();
            uploadedIds.push(data.id);
        } else {
            console.error("Error subiendo foto:", await res.text());
        }
        idx++;
    }
    
    return uploadedIds;
}

async function notifyBackend(youtubeId, photoIds) {
    const payload = {
        accion: 'finalizeMultimedia',
        cdr: currentCdr,
        youtubeId: youtubeId,
        portadaId: photoIds.length > 0 ? photoIds[0] : null
    };
    
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Fallo en el motor del CRM");
}
