// frontend/js/multimedia.js

const CLIENT_ID = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

let userToken = null;
let currentCdr = null;
let propertyData = null; // Para guardar el Folder ID y Descripción
let selectedVideo = null;
let selectedPhotos = [];

// Elementos
const loginSection = document.getElementById('login-section');
const workspace = document.getElementById('upload-workspace');
const successScreen = document.getElementById('success-screen');
const loadingScreen = document.getElementById('loading-screen');
const blockScreen = document.getElementById('block-screen');
const blockMessage = document.getElementById('block-message');

const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');
const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const dot3 = document.getElementById('dot-3');

const btnNext1 = document.getElementById('btn-next-1');
const btnNext2 = document.getElementById('btn-next-2');
const btnBack1 = document.getElementById('btn-back-1');
const btnBack2 = document.getElementById('btn-back-2');
const btnUpload = document.getElementById('btn-upload');

const top10Grid = document.getElementById('top10-grid');
const top10Counter = document.getElementById('top10-counter');
let selectedTop10Indices = [];

const videoDropZone = document.getElementById('video-drop-zone');
const videoInput = document.getElementById('video-input');
const videoFilename = document.getElementById('video-filename');

const photoDropZone = document.getElementById('photo-drop-zone');
const photoInput = document.getElementById('photo-input');
const photoGrid = document.getElementById('photo-grid');

const propertyInfoCard = document.getElementById('property-info-card');

function getCdrFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('cdr') || 'REG_TEST_001';
}

currentCdr = getCdrFromUrl();

// Login
window.handleCredentialResponse = function(response) {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                userToken = tokenResponse.access_token;
                loginSection.style.display = 'none';
                loadingScreen.style.display = 'block';
                loadPropertyData();
            }
        },
    });
    client.requestAccessToken();
};

async function loadPropertyData() {
    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?accion=getMultimediaData&id=${currentCdr}`);
        const data = await response.json();
        
        loadingScreen.style.display = 'none';
        
        if (data && data.success) {
            propertyData = data;
            
            if (data.hasPreviousMedia) {
                document.getElementById('decision-screen').style.display = 'block';
                document.getElementById('btn-reutilizar').onclick = handleReutilizar;
                document.getElementById('btn-subir-nuevo').onclick = handleSubirNuevo;
            } else {
                showWorkspace();
            }
        } else {
            blockMessage.innerHTML = data.message || 'No se encontró el registro en el CRM.';
            blockScreen.style.display = 'block';
        }
    } catch (e) {
        console.error(e);
        loadingScreen.style.display = 'none';
        blockMessage.innerHTML = 'Error de conexión con el CRM (Apps Script).';
        blockScreen.style.display = 'block';
    }
}

function showWorkspace() {
    document.getElementById('decision-screen').style.display = 'none';
    const avisoCc = esVideoOpcional()
        ? '<p style="color:#B45309;font-weight:bold;">🤝 Inmueble de la alianza Ciencuadras — el video es opcional.</p>'
        : '';
    propertyInfoCard.innerHTML = `
        <h3>Inmueble ID: ${currentCdr}</h3>
        <p>✅ Datos cargados. Listo para procesar y subir contenido.</p>
        ${avisoCc}
    `;
    workspace.style.display = 'block';
    aplicarVideoOpcional();
    if (esModoSoloVideo()) activarModoSoloVideo();
}

async function handleReutilizar() {
    document.getElementById('decision-screen').style.display = 'none';
    loadingScreen.style.display = 'block';
    document.querySelector('#loading-screen h3').textContent = "Restaurando Multimedia...";
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'reutilizarMultimedia', id: currentCdr })
        });
        const resData = await response.json();
        
        loadingScreen.style.display = 'none';
        
        if (resData.success) {
            successScreen.style.display = 'block';
            successScreen.querySelector('p').innerHTML = "Material anterior reutilizado con éxito.<br>El portal ha quedado cerrado nuevamente.";
        } else {
            alert('Error: ' + resData.message);
            blockScreen.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
        loadingScreen.style.display = 'none';
        blockMessage.innerHTML = 'Error de conexión durante la restauración.';
        blockScreen.style.display = 'block';
    }
}

function handleSubirNuevo() {
    showWorkspace();
}


// Navegación Pasos
btnNext1.addEventListener('click', () => {
    step1.classList.remove('active');
    step2.classList.add('active');
    dot1.classList.remove('active');
    dot2.classList.add('active');
    renderTop10Grid();
});

btnBack1.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    dot2.classList.remove('active');
    dot1.classList.add('active');
});

btnNext2.addEventListener('click', () => {
    step2.classList.remove('active');
    step3.classList.add('active');
    dot2.classList.remove('active');
    dot3.classList.add('active');
});

btnBack2.addEventListener('click', () => {
    step3.classList.remove('active');
    step2.classList.add('active');
    dot3.classList.remove('active');
    dot2.classList.add('active');
});

// Lógica de Renderizado y Selección TOP 10
function renderTop10Grid() {
    top10Grid.innerHTML = '';
    selectedTop10Indices = [];
    
    // Por defecto, la foto índice 0 siempre es TOP 1 (Portada)
    if (selectedPhotos.length > 0) {
        selectedTop10Indices.push(0);
    }
    
    selectedPhotos.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card top10-card';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.loading = "lazy";
        
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.border = '3px solid transparent';
        overlay.style.transition = 'all 0.2s';
        
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '5px';
        badge.style.left = '5px';
        badge.style.background = 'rgba(0,0,0,0.7)';
        badge.style.color = 'white';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = 'bold';
        badge.style.padding = '3px 8px';
        badge.style.borderRadius = '4px';
        badge.textContent = index === 0 ? 'PORTADA' : `#${index + 1}`;
        
        card.appendChild(img);
        card.appendChild(overlay);
        card.appendChild(badge);
        
        // Asignamos variables al card para poder actualizarlos luego
        card.overlayRef = overlay;
        card.badgeRef = badge;
        card.originalIndex = index;
        
        card.onclick = () => {
            if (index === 0) return; // La portada no se puede desseleccionar
            
            const pos = selectedTop10Indices.indexOf(index);
            if (pos !== -1) {
                selectedTop10Indices.splice(pos, 1);
            } else {
                const maxAllowed = Math.min(10, selectedPhotos.length);
                if (selectedTop10Indices.length >= maxAllowed) return; // No dejar seleccionar más
                selectedTop10Indices.push(index);
            }
            
            // Re-evaluar visuales de todos
            updateAllTop10Visuals();
            updateTop10Counter();
        };
        
        top10Grid.appendChild(card);
    });
    
    updateAllTop10Visuals();
    updateTop10Counter();
}

function updateAllTop10Visuals() {
    Array.from(top10Grid.children).forEach(card => {
        const idx = card.originalIndex;
        const pos = selectedTop10Indices.indexOf(idx);
        
        if (pos !== -1) {
            card.overlayRef.style.border = '3px solid var(--primary)';
            card.badgeRef.style.background = 'var(--primary)';
            card.badgeRef.style.color = '#000';
            if (idx === 0) {
                card.badgeRef.textContent = '⭐ PORTADA (TOP 1)';
            } else {
                card.badgeRef.textContent = `⭐ TOP ${pos + 1}`;
            }
        } else {
            card.overlayRef.style.border = '3px solid transparent';
            card.badgeRef.style.background = 'rgba(0,0,0,0.7)';
            card.badgeRef.style.color = 'white';
            card.badgeRef.textContent = `#${idx + 1}`;
        }
    });
}

function updateTop10Counter() {
    const maxAllowed = Math.min(10, selectedPhotos.length);
    top10Counter.textContent = `Seleccionadas: ${selectedTop10Indices.length} / ${maxAllowed}`;
    btnNext2.disabled = selectedTop10Indices.length !== maxAllowed;
}

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
    actualizarBotonSubir();
}

/**
 * Los inmuebles de la alianza Ciencuadras no traen video de entrada, así que
 * ahí el paso es opcional y se puede terminar sin él. En el resto sigue siendo
 * obligatorio: el botón solo se habilita al elegir el archivo.
 */
function esVideoOpcional() {
    return !!(propertyData && propertyData.videoOpcional);
}

/**
 * Segunda visita para subir SOLO el vídeo.
 *
 * Ocurre cuando el inmueble ya cargó fotos pero se quedó sin vídeo — el caso de
 * Ciencuadras, que no lo entregan de entrada. Antes el candado bloqueaba la
 * entrada y no había forma de añadirlo después.
 */
function esModoSoloVideo() {
    return !!(propertyData && propertyData.modoSoloVideo);
}

/** Deja la pantalla en el paso de vídeo, sin pedir fotos ni TOP 10. */
function activarModoSoloVideo() {
    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.add('active');
    if (dot1) dot1.classList.remove('active');
    if (dot2) dot2.classList.remove('active');
    if (dot3) dot3.classList.add('active');

    // Volver al paso 2 no tiene sentido aquí: no se pasó por él.
    if (btnBack2) btnBack2.style.display = 'none';

    const titulo = document.getElementById('titulo-paso-3');
    if (titulo) titulo.textContent = 'Cargar el video que faltaba';

    const aviso = document.getElementById('aviso-video-opcional');
    if (aviso) {
        aviso.style.display = 'block';
        aviso.innerHTML =
            '<strong>Este inmueble ya tiene sus fotos cargadas.</strong><br>' +
            'Solo falta el video. Al subirlo se genera la miniatura y se completa ' +
            'la publicación; las fotos y las portadas ya creadas no se tocan.';
    }
    actualizarBotonSubir();
}

function actualizarBotonSubir() {
    if (esModoSoloVideo()) {
        // Aquí el vídeo es lo ÚNICO que se viene a subir: sin él no hay nada
        // que hacer, así que no se permite continuar en blanco.
        btnUpload.disabled = !selectedVideo;
        btnUpload.textContent = selectedVideo ? '🚀 SUBIR VIDEO' : 'Selecciona el video';
        return;
    }
    if (selectedVideo) {
        btnUpload.disabled = false;
        btnUpload.textContent = '🚀 PROCESAR Y SUBIR';
    } else if (esVideoOpcional()) {
        btnUpload.disabled = false;
        // El texto dice explícitamente que se va sin video, para que nadie
        // termine sin video por descuido creyendo que lo habia adjuntado.
        btnUpload.textContent = '🚀 PROCESAR Y SUBIR (sin video)';
    } else {
        btnUpload.disabled = true;
        btnUpload.textContent = '🚀 PROCESAR Y SUBIR';
    }
}

/** Pinta el aviso y ajusta el título cuando el video no es obligatorio. */
function aplicarVideoOpcional() {
    const aviso = document.getElementById('aviso-video-opcional');
    const titulo = document.getElementById('titulo-paso-3');
    if (esVideoOpcional()) {
        if (aviso) aviso.style.display = 'block';
        if (titulo) titulo.textContent = 'Paso 3: Video Recorrido (opcional)';
    } else {
        if (aviso) aviso.style.display = 'none';
        if (titulo) titulo.textContent = 'Paso 3: Video Recorrido';
    }
    actualizarBotonSubir();
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
    btnNext1.disabled = selectedPhotos.length === 0;
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
let isUploading = false;

window.addEventListener('beforeunload', (e) => {
    if (isUploading) {
        e.preventDefault();
        e.returnValue = 'La subida está en progreso. Si sales, se cancelará.';
    }
});

btnUpload.addEventListener('click', async () => {
    // La portada se comprueba ANTES de empezar: si se avisara a mitad del
    // proceso ya habría fotos subidas y cancelar dejaría el registro a medias.
    if (!esModoSoloVideo() && selectedPhotos.length > 0) {
        const primera = selectedPhotos[0].file || selectedPhotos[0];
        if (!(await portadaEsUtilizable(primera))) return;
    }

    btnUpload.style.display = 'none';
    btnBack2.style.display = 'none';
    const progressContainer = document.getElementById('progress-container');
    const progressLabel = document.getElementById('progress-label');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-fill');
    
    progressContainer.style.display = 'block';
    isUploading = true;
    
    try {
        // 1. Subir Video a YouTube (Resumable Upload).
        //    Sin video se salta el paso entero: el backend ya trata el id como
        //    opcional (no escribe el link, no marca CHECK YT y no genera la
        //    miniatura), asi que el resto del proceso sigue igual.
        let youtubeId = null;
        if (selectedVideo) {
            progressLabel.textContent = 'Subiendo Video a YouTube...';
            progressFill.style.width = '0%';
            youtubeId = await uploadVideoToYouTube(selectedVideo, progressPercentage, progressFill);
        } else {
            progressLabel.textContent = 'Sin video: se continúa con las fotografías...';
            progressFill.style.width = '0%';
        }
        
        // 2. Subir Fotos a Google Drive y organizar TOP 10.
        //    En modo solo vídeo se salta: las fotos ya están de la carga
        //    anterior y volver a subirlas las duplicaría.
        let photoIds = [];
        if (!esModoSoloVideo()) {
            progressLabel.textContent = 'Subiendo Fotografías a Drive...';
            progressPercentage.textContent = '';
            progressFill.style.width = '0%';
            photoIds = await uploadPhotosToDrive(selectedPhotos, selectedTop10Indices, progressLabel, progressFill);
        }
        
        // 3. Notificar a Apps Script para generar plantillas
        progressLabel.textContent = 'Creando plantillas PDF/PNG... (puede tardar un minuto)';
        progressFill.style.width = '100%';
        await notifyBackend(youtubeId, photoIds);
        
        // 4. Éxito!
        isUploading = false;
        workspace.style.display = 'none';
        successScreen.style.display = 'block';
        
        let seconds = 5;
        const closeBtn = document.getElementById('btn-close-success');
        if (closeBtn) {
            closeBtn.textContent = `Cerrando pestaña en ${seconds}s...`;
            const timer = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(timer);
                    window.close();
                } else {
                    closeBtn.textContent = `Cerrando pestaña en ${seconds}s...`;
                }
            }, 1000);
        }
        
    } catch (e) {
        isUploading = false;
        alert('❌ Error durante la subida: ' + e.message);
        btnUpload.style.display = 'block';
        btnBack2.style.display = 'block';
        progressContainer.style.display = 'none';
    }
});

let uploadedYoutubeId = null;

async function uploadVideoToYouTube(file, percentText, fillBar) {
    if (!userToken) throw new Error("Sesión de Google expirada.");

    if (uploadedYoutubeId) {
        percentText.textContent = '100% (Recuperado)';
        fillBar.style.width = '100%';
        return uploadedYoutubeId;
    }

    // YouTube requiere mínimo Título, Descripción y estado Privado
    let title = `Inmueble ${currentCdr}`;
    if (propertyData && propertyData.tituloText) {
        title = propertyData.tituloText;
    }
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
            
            try {
                percentText.textContent = 'Agregando a playlists...';
                await addVideoToPlaylists(videoData.id);
            } catch (err) {
                console.error('Error en playlists:', err);
            }
            
            uploadedYoutubeId = videoData.id;
            return videoData.id;
        } else {
            throw new Error('Falló la subida de un pedazo del video: ' + await chunkRes.text());
        }
    }
}

// Calidad del JPEG de la portada. Recortar obliga a recodificar (no existe
// recorte sin pérdida en el navegador), así que se usa 0.95: visualmente
// indistinguible del original y sin el peso desmedido de 1.0.
const CALIDAD_PORTADA = 0.95;

/**
 * Deja la PORTADA en cuadrado 1:1, recortando por el centro.
 *
 * Si ya viene cuadrada se devuelve el archivo TAL CUAL, sin pasar por el canvas:
 * volver a comprimir un JPG que ya está bien solo le quita calidad.
 *
 * Devuelve el original ante cualquier problema (formato que el navegador no sabe
 * decodificar, canvas bloqueado). Vale más subir la foto sin recortar que perderla.
 */
async function recortarPortadaCuadrada(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) return file;

    let bitmap = null;
    try {
        // imageOrientation 'from-image' respeta el EXIF. Sin esto, las fotos
        // tomadas en vertical con el móvil se dibujan giradas en el canvas.
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
        console.warn('No se pudo leer la portada para recortarla, se sube tal cual:', e);
        return file;
    }

    const { width: w, height: h } = bitmap;
    if (!w || !h) { bitmap.close && bitmap.close(); return file; }

    // Ya es 1:1 y ya es JPEG: se devuelve tal cual, sin recomprimir.
    if (w === h && file.type === 'image/jpeg') {
        bitmap.close && bitmap.close();
        return file;
    }

    // A partir de aquí se pasa por el canvas en dos casos:
    //  · no es cuadrada  -> se recorta al centro
    //  · es cuadrada pero NO es JPEG (un PNG, p. ej.) -> el recorte es cero y
    //    solo se recodifica. Sin esto se subía un PNG con nombre .jpg: en la
    //    prueba del 31-08 la portada pesaba 2,33 MB frente a ~0,1 MB del resto.
    //
    // En ambos casos se conserva la RESOLUCIÓN ORIGINAL: no se reescala a ningún
    // tamaño fijo. Una foto 4:3 de iPhone (4032x3024) sale 3024x3024.
    const lado = Math.min(w, h);
    const sx = Math.round((w - lado) / 2);   // recorte centrado
    const sy = Math.round((h - lado) / 2);

    try {
        const canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        // Recorte 1:1 sin reescalado: origen y destino miden lo mismo.
        ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, lado, lado);
        bitmap.close && bitmap.close();

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', CALIDAD_PORTADA)
        );
        if (!blob) return file;

        return new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (e) {
        console.warn('Falló el recorte de la portada, se sube tal cual:', e);
        bitmap.close && bitmap.close();
        return file;
    }
}

/**
 * Avisa si la PORTADA es un HEIC que este navegador no sabe convertir.
 *
 * Solo importa en la portada: es la única foto que se inserta en la plantilla de
 * Slides para generar el diseño, y Slides no entiende HEIC. Con el resto de
 * fotos basta el renombrado a .jpg, que ya funciona en los portales porque miran
 * el contenido y no el nombre.
 *
 * Safari y iOS sí decodifican HEIC, así que ahí se convierte y no se avisa nada.
 * Chrome, Firefox y Edge en Windows/Android no pueden, y ahí conviene decirlo
 * ANTES de subir: si no, el diseño sale sin la foto y no se entiende por qué.
 *
 * @returns {Promise<boolean>} true si se puede continuar.
 */
async function portadaEsUtilizable(file) {
    if (!file) return true;
    const nombre = (file.name || '').toLowerCase();
    const pareceHeic = (file.type || '').indexOf('heic') !== -1 ||
                       (file.type || '').indexOf('heif') !== -1 ||
                       nombre.endsWith('.heic') || nombre.endsWith('.heif');
    if (!pareceHeic) return true;

    // ¿Sabe este navegador decodificarlo? Si sí, se convertirá sin problema.
    try {
        const bm = await createImageBitmap(file);
        bm.close && bm.close();
        return true;
    } catch (e) {
        return confirm(
            'La foto de portada está en formato HEIC (de iPhone) y este navegador ' +
            'no puede convertirla.\n\n' +
            'Las demás fotos se suben sin problema, pero el DISEÑO DE PORTADA que ' +
            'genera el sistema puede quedar sin la imagen.\n\n' +
            'Recomendación: elige como portada una foto .jpg, o abre esta página ' +
            'desde un iPhone o Safari.\n\n' +
            '¿Continuar de todas formas?'
        );
    }
}

async function uploadPhotosToDrive(photosArray, top10Indices, labelEl, fillEl) {
    if (!userToken || !propertyData || !propertyData.fotosFolderId) {
        throw new Error("No hay carpeta de fotografías asignada en el CRM.");
    }
    
    const uploadedIds = [];
    const top10UploadedMeta = []; // Para guardar los ids que necesitamos copiar al top 10
    
    let idx = 1;
    const total = photosArray.length;

    // 1. Subir todas a la carpeta principal
    for (const item of photosArray) {
        let file = item.file || item;

        // Solo la portada va en 1:1. Las demás conservan su encuadre original.
        if (idx === 1) {
            labelEl.textContent = 'Ajustando la portada a formato cuadrado...';
            file = await recortarPortadaCuadrada(file);
        }

        labelEl.textContent = `Subiendo foto ${idx} de ${total} a Drive...`;
        fillEl.style.width = Math.round((idx / total) * 100) + '%';
        
        // El nombre lleva .jpg desde el origen. Antes se subían sin extensión
        // ("2-Portada_YB383511" a secas) y Drive las mostraba sin tipo; además
        // el normalizador del backend detecta imágenes POR extensión, así que
        // un archivo sin ninguna nunca entraba y se quedaba así para siempre.
        const baseName = idx === 1 ? `2-Portada_${currentCdr}` : `${idx + 1}-Foto_${currentCdr}`;
        const photoName = `${baseName}.jpg`;
        const metadata = {
            name: photoName,
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
            
            // Si esta foto (índice 0-based) es del TOP 10, la anotamos
            const topPos = top10Indices.indexOf(idx - 1);
            if (topPos !== -1) {
                // Renombramos con el orden en que fue elegida
                const topRank = topPos + 1;
                // Se parte de baseName para que la extensión quede al FINAL:
                // usar photoName daría "TOP_1_2-Portada_CDR.jpg" solo por suerte
                // del orden, y cualquier sufijo futuro la dejaría en medio.
                const newName = `TOP_${topRank}_${baseName}.jpg`;
                top10UploadedMeta.push({ id: data.id, name: newName });
            }
        } else {
            console.error("Error subiendo foto:", await res.text());
        }
        idx++;
    }
    
    // 2. Buscar subcarpeta "TOP 10" existente y copiar fotos
    if (top10UploadedMeta.length > 0) {
        labelEl.textContent = 'Organizando subcarpeta TOP 10...';
        fillEl.style.width = '100%';
        
        // Buscar la carpeta "TOP 10" (creada previamente por el backend)
        const q = `mimeType='application/vnd.google-apps.folder' and name='TOP 10' and '${propertyData.fotosFolderId}' in parents and trashed=false`;
        const resSearch = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        if (resSearch.ok) {
            const searchData = await resSearch.json();
            if (searchData.files && searchData.files.length > 0) {
                const top10FolderId = searchData.files[0].id;
                
                // Copiar archivos a la carpeta existente
                for (const meta of top10UploadedMeta) {
                    await fetch(`https://www.googleapis.com/drive/v3/files/${meta.id}/copy`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: meta.name,
                            parents: [top10FolderId]
                        })
                    });
                }
            } else {
                console.error("No se encontró la carpeta 'TOP 10' preexistente en Drive.");
            }
        } else {
            console.error("Error buscando la carpeta TOP 10:", await resSearch.text());
        }
    }
    
    return uploadedIds;
}

async function notifyBackend(youtubeId, photoIds) {
    const payload = {
        accion: 'finalizeMultimedia',
        id: currentCdr,
        youtubeId: youtubeId,
        // En modo solo vídeo no se subieron fotos, así que no hay portadaId que
        // mandar: el backend recupera la portada anterior desde Drive.
        portadaId: photoIds.length > 0 ? photoIds[0] : null,
        soloVideo: esModoSoloVideo(),
        userToken: userToken
    };
    
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Fallo en el motor del CRM");
}

async function addVideoToPlaylists(videoId) {
    if (!propertyData) return;
    
    const tipo = propertyData.tipoNegocio || '';
    const habs = propertyData.habitaciones || '';
    
    let targetPlaylists = [];
    const isArriendo = tipo.includes('Arriendo') || tipo.includes('Administración') || tipo.includes('Corretaje') || tipo.includes('Admi-Venta') || tipo.includes('Vendi-Renta');
    const isVenta = tipo.includes('Venta') || tipo.includes('Admi-Venta') || tipo.includes('Vendi-Renta');
    
    const buildPlaylistName = (prefix, isArriendoType) => {
        if (!habs || habs === '') return `${prefix} Locales`;
        let num = parseInt(habs);
        if (isNaN(num)) return `${prefix} Locales`;
        
        let habsStr = num === 1 ? '1 habitacion' : `${num} habitaciones`;
        if (!isArriendoType) {
            habsStr = num === 1 ? '1 Habitacion' : `${num} Habitaciones`;
        }
        return `${prefix} ${habsStr}`;
    };
    
    if (isArriendo) targetPlaylists.push(buildPlaylistName('🏢 ARRIENDO:', true));
    if (isVenta) targetPlaylists.push(buildPlaylistName('🏠 VENTA:', false));
    
    if (targetPlaylists.length === 0) return;
    
    let existingPlaylists = [];
    let nextPageToken = '';
    do {
        const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50${nextPageToken ? '&pageToken='+nextPageToken : ''}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${userToken}` } });
        if (!res.ok) break;
        const data = await res.json();
        if (data.items) existingPlaylists = existingPlaylists.concat(data.items);
        nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);
    
    for (const pName of targetPlaylists) {
        let pId = null;
        const found = existingPlaylists.find(p => p.snippet.title === pName);
        if (found) {
            pId = found.id;
        } else {
            const createRes = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snippet: { title: pName, description: `Inmuebles clasificados automáticamente como ${pName}` },
                    status: { privacyStatus: 'unlisted' }
                })
            });
            if (createRes.ok) {
                const createData = await createRes.json();
                pId = createData.id;
            } else {
                continue;
            }
        }
        
        if (pId) {
            await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snippet: { playlistId: pId, resourceId: { kind: 'youtube#video', videoId: videoId } }
                })
            });
        }
    }
}
