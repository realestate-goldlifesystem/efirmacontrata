// frontend/js/multimedia.js

const CLIENT_ID = '825455387668-asnkq57s4voon63c38b41e4q8qvc0b2e.apps.googleusercontent.com';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxpJ8w_XR5dUhIv1VTuV3ZDjHm-vtz13B5RlyfiLqI9ypZnIuzuUL39_GDHpBisL2oW/exec';

let userToken = null;      // token de DRIVE (fotos). Se pide al iniciar sesión.
let youtubeToken = null;   // token de YOUTUBE (video). Se pide al subir, y solo si hay video.
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

/**
 * Pide el permiso de YouTube, en una ventana SEPARADA de la de Drive.
 *
 * ⚠️ Hay que llamarla SIN await delante, como primera cosa dentro de un clic:
 * los navegadores solo dejan abrir la ventana de Google si nace de un gesto del
 * usuario. El ejecutor de la Promise corre en el acto, así que la ventana se
 * abre todavía "dentro" del clic aunque luego se espere el resultado.
 *
 * Por eso no se encadena justo después del login de Drive: esa segunda ventana
 * ya no vendría de un clic y el navegador la bloquearía.
 */
function pedirTokenYoutube() {
    return new Promise((resolve, reject) => {
        if (youtubeToken) return resolve(youtubeToken);
        const client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            // 'youtube' cubre subir el video, meterlo en las playlists y poner
            // la miniatura. No hace falta 'youtube.upload'.
            scope: 'https://www.googleapis.com/auth/youtube',
            include_granted_scopes: false,
            // Si la cuenta ya dio el permiso, no vuelve a mostrar la pantalla.
            prompt: '',
            callback: (r) => {
                if (r && r.access_token) { youtubeToken = r.access_token; resolve(youtubeToken); }
                else reject(new Error('YouTube no dio permiso' + (r && r.error ? ': ' + r.error : '.')));
            },
            error_callback: (err) => reject(new Error(
                'No se pudo abrir la autorización de YouTube' +
                (err && err.type === 'popup_failed_to_open' ? ' (el navegador bloqueó la ventana: permite ventanas emergentes para esta página)' : '') +
                (err && err.type === 'popup_closed' ? ' (se cerró la ventana antes de aceptar)' : '') + '.'
            ))
        });
        client.requestAccessToken();
    });
}

// Login. Una SOLA ventana: la del permiso de Drive.
//
// Antes había además el botón "Iniciar sesión con Google" (g_id_signin), cuya
// respuesta no se usaba: solo servía para abrir esta misma ventana. Resultado:
// el agente elegía su cuenta dos veces seguidas para entrar. Si hay video, la
// de YouTube sigue aparte porque Google no deja pedirla junto con Drive.
window.iniciarSesionDrive = function() {
    const boton = document.getElementById('btn-entrar');
    if (boton) { boton.disabled = true; boton.querySelector('span').textContent = 'Abriendo Google...'; }
    const restaurarBoton = () => {
        if (boton) { boton.disabled = false; boton.querySelector('span').textContent = 'Continuar con Google'; }
    };

    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        // SOLO Drive. Desde sep-2026 Google rechaza pedir permisos de YouTube y
        // de Drive en la MISMA ventana ("Error 400: invalid_request — scopes
        // that cannot be requested together: youtube, drive.file"), y eso
        // bloqueaba la carga entera. YouTube se pide aparte, con su propio clic:
        // ver pedirTokenYoutube().
        scope: 'https://www.googleapis.com/auth/drive.file',
        // ⚠️ NO QUITAR. Por defecto Google SUMA a la petición los permisos que la
        // cuenta ya concedió antes, y volvería a mezclar YouTube con Drive.
        include_granted_scopes: false,
        // Sin esto Google vuelve a mostrar la pantalla de permisos en cada
        // entrada. Con '' se salta si la cuenta ya los concedió: la ventana se
        // abre y se cierra sola.
        prompt: '',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                userToken = tokenResponse.access_token;
                loginSection.style.display = 'none';
                loadingScreen.style.display = 'block';
                loadPropertyData();
            } else {
                restaurarBoton();
            }
        },
        error_callback: (err) => {
            restaurarBoton();
            if (err && err.type === 'popup_failed_to_open') {
                alert('El navegador bloqueó la ventana de Google. Permite ventanas emergentes para esta página y vuelve a intentar.');
            }
        }
    });
    client.requestAccessToken();
};

function conectarBotonEntrar() {
    const boton = document.getElementById('btn-entrar');
    if (boton) boton.addEventListener('click', () => window.iniciarSesionDrive());
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectarBotonEntrar);
else conectarBotonEntrar();

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

// ==========================================
// BORRADOR DE LA SELECCIÓN (antes de pulsar subir)
// ==========================================
// Todo lo que el propietario arma —fotos, orden, TOP 10 y qué video eligió—
// vive solo en la memoria de la página. Si el celular cierra la pestaña por
// falta de memoria, o la recarga, se perdía el trabajo entero y tocaba volver
// a escoger y reordenar 40 fotos.
//
// Las FOTOS se guardan completas en IndexedDB (pesan poco y así al volver ya
// están puestas). El VIDEO no: copiar 500 MB al navegador se demora y llena el
// teléfono; de él solo se recuerda cuál era, para pedirlo de nuevo por nombre.
const BD_BORRADOR = 'goldlife_multimedia';
const ALMACEN_BORRADOR = 'borradores';

function abrirBD() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(BD_BORRADOR, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(ALMACEN_BORRADOR)) db.createObjectStore(ALMACEN_BORRADOR);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function conBorrador(modo, accion) {
    try {
        const db = await abrirBD();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(ALMACEN_BORRADOR, modo);
            const req = accion(tx.objectStore(ALMACEN_BORRADOR));
            tx.oncomplete = () => resolve(req && req.result);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn('Borrador no disponible: ' + e.message);
        return null;
    }
}

let guardadoPendiente = null;
function guardarBorrador() {
    // Se espera un momento: reordenar arrastrando dispara muchos cambios seguidos.
    clearTimeout(guardadoPendiente);
    guardadoPendiente = setTimeout(async () => {
        if (isUploading) return;
        if (!selectedPhotos.length && !selectedVideo) return;
        const datos = {
            fotos: selectedPhotos.map(f => ({ blob: f, nombre: f.name, tipo: f.type, lastModified: f.lastModified })),
            top10: selectedTop10Indices.slice(),
            videoNombre: selectedVideo ? selectedVideo.name : null,
            guardadoEn: Date.now()
        };
        await conBorrador('readwrite', tienda => tienda.put(datos, currentCdr));
    }, 400);
}

async function borrarBorrador() {
    clearTimeout(guardadoPendiente);
    await conBorrador('readwrite', tienda => tienda.delete(currentCdr));
}

/**
 * Devuelve la selección guardada de este inmueble, o null. Se descarta sola a
 * los 7 días para no revivir fotos de una carga vieja.
 */
async function leerBorrador() {
    const datos = await conBorrador('readonly', tienda => tienda.get(currentCdr));
    if (!datos || !datos.fotos || !datos.fotos.length) return null;
    if (Date.now() - (datos.guardadoEn || 0) > 7 * 24 * 60 * 60 * 1000) {
        await borrarBorrador();
        return null;
    }
    return datos;
}

async function restaurarBorrador() {
    const datos = await leerBorrador();
    if (!datos) return;

    const archivos = datos.fotos.map(f => new File([f.blob], f.nombre, { type: f.tipo, lastModified: f.lastModified }));
    handlePhotosSelect(archivos);
    top10Guardado = datos.top10 || null;

    const aviso = document.getElementById('aviso-borrador');
    if (aviso) {
        aviso.style.display = 'block';
        aviso.querySelector('.texto').textContent =
            `Recuperamos tu selección anterior: ${archivos.length} foto(s)` +
            (datos.videoNombre ? `. El video "${datos.videoNombre}" hay que elegirlo de nuevo.` : '.');
    }
}

// TOP 10 elegido antes del corte; se vuelve a aplicar al pintar esa pantalla.
let top10Guardado = null;

function conectarDescartarBorrador() {
    const btn = document.getElementById('btn-descartar-borrador');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        await borrarBorrador();
        photoGrid.innerHTML = '';
        selectedTop10Indices = [];
        top10Guardado = null;
        updateBadges();
        selectedPhotos = [];
        btnNext1.disabled = true;
        document.getElementById('aviso-borrador').style.display = 'none';
    });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectarDescartarBorrador);
else conectarDescartarBorrador();

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
    restaurarBorrador();
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

    // Si veníamos de una selección recuperada, se respeta el TOP 10 que ya
    // había elegido en vez de dejarlo solo con la portada.
    if (top10Guardado && top10Guardado.length) {
        top10Guardado.forEach(i => {
            if (i > 0 && i < selectedPhotos.length && selectedTop10Indices.indexOf(i) === -1) {
                selectedTop10Indices.push(i);
            }
        });
        top10Guardado = null;
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
            guardarBorrador();
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

    // Si es el mismo archivo de un intento que se cortó, se avisa para que el
    // propietario sepa que NO va a empezar de cero.
    const progresoVideo = leerProgreso();
    if (progresoVideo.videoClave === claveArchivo(file) && (progresoVideo.uploadUrl || progresoVideo.youtubeId)) {
        videoFilename.textContent += progresoVideo.youtubeId
            ? ' — ya estaba subido, no se repite'
            : ' — se retomará donde quedó';
    }

    btnUpload.disabled = false; // Como el video es el último paso, habilita el botón final
    actualizarBotonSubir();
    guardarBorrador();
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
    guardarBorrador();
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

// --- PANTALLA ENCENDIDA MIENTRAS SUBE ---
// El archivo está en el celular del propietario: lo manda el navegador, no la
// nube. Si el teléfono bloquea la pantalla, el sistema congela la página y la
// subida se corta desde cero. Wake Lock evita ese bloqueo mientras dura la
// carga, y se vuelve a pedir si el usuario cambia de app y regresa (el
// navegador lo suelta al pasar a segundo plano).
let bloqueoPantalla = null;

async function mantenerPantallaEncendida() {
    if (!('wakeLock' in navigator)) return false;   // navegador viejo: sigue igual que antes
    try {
        bloqueoPantalla = await navigator.wakeLock.request('screen');
        bloqueoPantalla.addEventListener('release', () => { bloqueoPantalla = null; });
        return true;
    } catch (e) {
        console.warn('No se pudo mantener la pantalla encendida:', e.message);
        return false;
    }
}

async function soltarPantalla() {
    try { if (bloqueoPantalla) await bloqueoPantalla.release(); } catch (e) {}
    bloqueoPantalla = null;
}

document.addEventListener('visibilitychange', () => {
    if (isUploading && !bloqueoPantalla && document.visibilityState === 'visible') {
        mantenerPantallaEncendida();
    }
});

window.addEventListener('beforeunload', (e) => {
    if (isUploading) {
        e.preventDefault();
        e.returnValue = 'La subida está en progreso. Si sales, se cancelará.';
    }
});

btnUpload.addEventListener('click', async () => {
    // YouTube se pide AQUÍ y antes de cualquier await: es lo que mantiene la
    // ventana de Google "dentro" del clic para que el navegador no la bloquee.
    // Sin video (Ciencuadras) ni siquiera se pregunta por YouTube.
    //
    // El bloqueo de pantalla también se pide aquí, antes de cualquier await: el
    // navegador solo lo concede mientras el clic sigue "vivo". Si se pide más
    // abajo devuelve NotAllowedError y el celular se seguiría apagando.
    const promesaPantalla = mantenerPantallaEncendida();

    let promesaYoutube = null;
    if (selectedVideo && !youtubeToken) {
        promesaYoutube = pedirTokenYoutube();
        promesaYoutube.catch(() => {});   // el error se trata abajo, al esperarla
    }

    // La portada se comprueba ANTES de empezar: si se avisara a mitad del
    // proceso ya habría fotos subidas y cancelar dejaría el registro a medias.
    if (!esModoSoloVideo() && selectedPhotos.length > 0) {
        const primera = selectedPhotos[0].file || selectedPhotos[0];
        // Convertir un HEIC tarda unos segundos: se avisa en la propia etiqueta
        // de progreso para que no parezca que el botón no responde.
        const etiqueta = document.getElementById('progress-label');
        const caja = document.getElementById('progress-container');
        if (pareceHeic(primera) && caja) caja.style.display = 'block';
        const ok = await portadaEsUtilizable(primera, etiqueta);
        if (!ok) { if (caja) caja.style.display = 'none'; await soltarPantalla(); return; }
    }

    btnUpload.style.display = 'none';
    btnBack2.style.display = 'none';
    const progressContainer = document.getElementById('progress-container');
    const progressLabel = document.getElementById('progress-label');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-fill');
    
    progressContainer.style.display = 'block';
    isUploading = true;
    await promesaPantalla;
    
    try {
        // 1. Subir Video a YouTube (Resumable Upload).
        //    Sin video se salta el paso entero: el backend ya trata el id como
        //    opcional (no escribe el link, no marca CHECK YT y no genera la
        //    miniatura), asi que el resto del proceso sigue igual.
        let youtubeId = null;
        if (selectedVideo) {
            // Esperar el permiso de YouTube que se pidió al pulsar el botón. Si
            // se rechaza o se cierra la ventana, salta al catch y el botón vuelve
            // a aparecer: otro clic abre la ventana de nuevo.
            if (promesaYoutube) {
                progressLabel.textContent = 'Esperando el permiso de YouTube...';
                await promesaYoutube;
            }
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

        // Terminó de verdad: se borra la memoria para que la próxima carga de
        // este inmueble (una renovación, por ejemplo) empiece limpia.
        limpiarProgreso();
        await borrarBorrador();
        
        // 4. Éxito!
        isUploading = false;
        await soltarPantalla();
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
        await soltarPantalla();
        alert('❌ Error durante la subida: ' + e.message);
        btnUpload.style.display = 'block';
        btnBack2.style.display = 'block';
        progressContainer.style.display = 'none';
    }
});

let uploadedYoutubeId = null;

// ==========================================
// MEMORIA DE LA CARGA (para reanudar)
// ==========================================
// Todo lo pesado lo sube el celular del propietario. Si se corta (pantalla
// bloqueada, cambio de app, red), antes había que empezar de CERO: un video de
// 500 MB subido al 90% se perdía entero.
//
// Aquí se recuerda, por inmueble: la sesión de subida del video y por dónde iba,
// y las fotos que ya quedaron en Drive. Al volver a entrar y elegir el MISMO
// archivo, continúa en vez de repetir. El archivo en sí no se puede guardar en
// el navegador, por eso hay que volver a elegirlo.
const CLAVE_PROGRESO = 'multimedia_progreso_' + currentCdr;

function claveArchivo(file) {
    return `${file.name}|${file.size}|${file.lastModified || 0}`;
}

function leerProgreso() {
    try { return JSON.parse(localStorage.getItem(CLAVE_PROGRESO) || '{}') || {}; }
    catch (e) { return {}; }
}

function guardarProgreso(cambios) {
    try { localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ ...leerProgreso(), ...cambios })); }
    catch (e) { /* modo privado o sin espacio: se sigue sin memoria */ }
}

function limpiarProgreso() {
    try { localStorage.removeItem(CLAVE_PROGRESO); } catch (e) {}
}

/**
 * Borra un archivo que ESTA MISMA carga subió en un intento anterior y que ya
 * no hace parte de la selección (el propietario cambió o quitó esa foto). Con
 * el permiso drive.file solo se pueden tocar archivos creados por esta página,
 * así que no hay forma de borrar nada más del Drive del agente.
 */
async function borrarDeDrive(fileId) {
    try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
    } catch (e) {
        console.warn('No se pudo borrar la foto sobrante ' + fileId + ': ' + e.message);
    }
}

/**
 * Le pregunta a YouTube cuántos bytes recibió ya de esta sesión.
 * Devuelve {completo:false, offset:N} o {completo:true, videoId:'...'},
 * o null si la sesión ya no sirve (caducó o se borró).
 */
async function consultarAvanceVideo(uploadUrl, totalSize) {
    let res;
    try {
        res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Range': `bytes */${totalSize}` }
        });
    } catch (e) {
        return null;   // sin red: se tratará como sesión no disponible
    }
    if (res.status === 308) {
        const rango = res.headers.get('Range');          // "bytes=0-524287"
        const hasta = rango ? parseInt(rango.split('-')[1], 10) : -1;
        return { completo: false, offset: isNaN(hasta) ? 0 : hasta + 1 };
    }
    if (res.ok) {
        try {
            const datos = await res.json();
            if (datos && datos.id) return { completo: true, videoId: datos.id };
        } catch (e) {}
        return null;
    }
    return null;   // 404 / 410: la sesión caducó, toca empezar de nuevo
}

async function uploadVideoToYouTube(file, percentText, fillBar) {
    if (!youtubeToken) throw new Error("Falta el permiso de YouTube. Vuelve a pulsar PROCESAR Y SUBIR.");

    if (uploadedYoutubeId) {
        percentText.textContent = '100% (Recuperado)';
        fillBar.style.width = '100%';
        return uploadedYoutubeId;
    }

    // ¿Este mismo video ya se subió completo en un intento anterior?
    const progreso = leerProgreso();
    const clave = claveArchivo(file);

    // Cambió de video después de haber subido otro completo: ese primero quedó
    // en el canal, privado y sin inmueble que lo use. Se borra aquí, que es
    // cuando hay permiso de YouTube a mano. Nunca se toca un video ya guardado
    // en el registro: en ese momento la memoria ya se borró (limpiarProgreso).
    if (progreso.youtubeId && progreso.videoClave && progreso.videoClave !== clave) {
        percentText.textContent = 'Quitando el video anterior...';
        try {
            await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${progreso.youtubeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${youtubeToken}` }
            });
        } catch (e) {
            console.warn('No se pudo borrar el video anterior: ' + e.message);
        }
        guardarProgreso({ youtubeId: null, uploadUrl: null, videoClave: null });
        progreso.youtubeId = null; progreso.uploadUrl = null; progreso.videoClave = null;
    }
    if (progreso.videoClave === clave && progreso.youtubeId) {
        percentText.textContent = '100% (ya estaba subido)';
        fillBar.style.width = '100%';
        uploadedYoutubeId = progreso.youtubeId;
        return progreso.youtubeId;
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

    const totalSize = file.size;
    let uploadUrl = null;
    let offset = 0;

    // 1. Reanudar la sesión anterior de ESTE mismo archivo, si sigue viva.
    if (progreso.videoClave === clave && progreso.uploadUrl) {
        percentText.textContent = 'Retomando la subida anterior...';
        const avance = await consultarAvanceVideo(progreso.uploadUrl, totalSize);
        if (avance && avance.completo) {
            uploadedYoutubeId = avance.videoId;
            guardarProgreso({ youtubeId: avance.videoId });
            percentText.textContent = '100% (ya estaba subido)';
            fillBar.style.width = '100%';
            try { await addVideoToPlaylists(avance.videoId); } catch (err) { console.error('Error en playlists:', err); }
            return avance.videoId;
        }
        if (avance) {
            uploadUrl = progreso.uploadUrl;
            offset = avance.offset;
            const pct = Math.round((offset / totalSize) * 100);
            percentText.textContent = pct + '% (continuando)';
            fillBar.style.width = pct + '%';
        }
    }

    // 2. Sesión nueva (primer intento, archivo distinto o sesión caducada).
    if (!uploadUrl) {
        const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${youtubeToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Length': totalSize.toString(),
                'X-Upload-Content-Type': file.type
            },
            body: JSON.stringify(metadata)
        });

        if (!initRes.ok) throw new Error('No se pudo iniciar la subida a YouTube: ' + await initRes.text());
        uploadUrl = initRes.headers.get('Location');
        if (!uploadUrl) throw new Error('YouTube no devolvió la ruta de subida');

        // Se guarda ANTES de mandar nada: si el celular se bloquea a mitad del
        // primer pedazo, al volver ya se sabe a qué sesión reengancharse.
        guardarProgreso({ videoClave: clave, uploadUrl: uploadUrl, youtubeId: null });
    }

    // 3. Enviar en Chunks (Pedazos) de 5MB, reintentando los cortes de red.
    const chunkSize = 5 * 1024 * 1024;
    const MAX_REINTENTOS = 5;
    let reintentos = 0;

    while (offset < totalSize) {
        const chunkEnd = Math.min(offset + chunkSize, totalSize);
        const chunk = file.slice(offset, chunkEnd);

        let chunkRes;
        try {
            chunkRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${totalSize}` },
                body: chunk
            });
        } catch (errRed) {
            // Se cayó la red en mitad del pedazo. Se le pregunta a YouTube hasta
            // dónde alcanzó a recibir y se sigue desde ahí, sin repetir lo demás.
            if (++reintentos > MAX_REINTENTOS) {
                throw new Error('Se perdió la conexión durante la subida del video. Vuelve a entrar y pulsa subir: continuará donde iba.');
            }
            percentText.textContent = `Reintentando (${reintentos}/${MAX_REINTENTOS})...`;
            await new Promise(r => setTimeout(r, 2000 * reintentos));
            const avance = await consultarAvanceVideo(uploadUrl, totalSize);
            if (avance && avance.completo) {
                uploadedYoutubeId = avance.videoId;
                guardarProgreso({ youtubeId: avance.videoId });
                try { await addVideoToPlaylists(avance.videoId); } catch (err) { console.error('Error en playlists:', err); }
                return avance.videoId;
            }
            if (avance) offset = avance.offset;
            continue;
        }

        reintentos = 0;

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
            guardarProgreso({ youtubeId: videoData.id });
            return videoData.id;
        } else if (chunkRes.status >= 500) {
            // Falla temporal de Google: se reconsulta el avance y se reintenta.
            if (++reintentos > MAX_REINTENTOS) {
                throw new Error('YouTube no respondió bien a varios intentos. Vuelve a pulsar subir: continuará donde iba.');
            }
            await new Promise(r => setTimeout(r, 2000 * reintentos));
            const avance = await consultarAvanceVideo(uploadUrl, totalSize);
            if (avance && avance.completo) {
                uploadedYoutubeId = avance.videoId;
                guardarProgreso({ youtubeId: avance.videoId });
                try { await addVideoToPlaylists(avance.videoId); } catch (err) { console.error('Error en playlists:', err); }
                return avance.videoId;
            }
            if (avance) offset = avance.offset;
        } else {
            throw new Error('Falló la subida de un pedazo del video: ' + await chunkRes.text());
        }
    }
}

// Calidad del JPEG de la portada. Recortar obliga a recodificar (no existe
// recorte sin pérdida en el navegador), así que se usa 0.95: visualmente
// indistinguible del original y sin el peso desmedido de 1.0.
const CALIDAD_PORTADA = 0.95;

// Conversor de HEIC. Se carga BAJO DEMANDA: pesa más de 1 MB (lleva un
// decodificador en WebAssembly) y la inmensa mayoría de cargas no lo necesitan,
// porque iOS ya entrega JPEG al subir. Solo se descarga si aparece un HEIC que
// el navegador no sabe leer.
const URL_CONVERSOR_HEIC = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
let promesaConversorHeic = null;

function pareceHeic(file) {
    const tipo = (file.type || '').toLowerCase();
    const nombre = (file.name || '').toLowerCase();
    return tipo.indexOf('heic') !== -1 || tipo.indexOf('heif') !== -1 ||
           nombre.endsWith('.heic') || nombre.endsWith('.heif');
}

/** Descarga el conversor una sola vez, aunque se le llame varias veces. */
function cargarConversorHeic() {
    if (window.heic2any) return Promise.resolve(true);
    if (promesaConversorHeic) return promesaConversorHeic;

    promesaConversorHeic = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = URL_CONVERSOR_HEIC;
        s.onload = () => resolve(!!window.heic2any);
        // Si el CDN no responde no se rompe la subida: se sigue sin conversión
        // y el aviso previo ya le habrá dicho al usuario qué puede pasar.
        s.onerror = () => { console.warn('No se pudo descargar el conversor HEIC.'); resolve(false); };
        document.head.appendChild(s);
    });
    return promesaConversorHeic;
}

/**
 * Convierte un HEIC a JPEG conservando la resolución.
 * Devuelve null si no se pudo, para que quien llame decida qué hacer.
 */
async function convertirHeicAJpeg(file) {
    const listo = await cargarConversorHeic();
    if (!listo || !window.heic2any) return null;
    try {
        const blob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: CALIDAD_PORTADA });
        const uno = Array.isArray(blob) ? blob[0] : blob;   // devuelve array si el HEIC trae varias imágenes
        if (!uno) return null;
        const nombre = (file.name || 'portada').replace(/\.(heic|heif)$/i, '') + '.jpg';
        return new File([uno], nombre, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (e) {
        console.warn('Falló la conversión del HEIC:', e);
        return null;
    }
}

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
    if (!file) return file;
    const esImagen = (file.type || '').indexOf('image/') === 0;
    if (!esImagen && !pareceHeic(file)) return file;

    let bitmap = null;
    try {
        // imageOrientation 'from-image' respeta el EXIF. Sin esto, las fotos
        // tomadas en vertical con el móvil se dibujan giradas en el canvas.
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
        // Chrome, Firefox y Edge no saben decodificar HEIC. Como la portada SÍ
        // tiene que entrar en la plantilla de Slides, que tampoco lo entiende,
        // se convierte con una librería antes de rendirse.
        if (pareceHeic(file)) {
            const convertido = await convertirHeicAJpeg(file);
            if (convertido) {
                try {
                    bitmap = await createImageBitmap(convertido, { imageOrientation: 'from-image' });
                    file = convertido;
                } catch (e2) {
                    console.warn('El HEIC convertido tampoco se pudo leer:', e2);
                    return file;
                }
            } else {
                console.warn('No se pudo convertir el HEIC de portada, se sube tal cual.');
                return file;
            }
        } else {
            console.warn('No se pudo leer la portada para recortarla, se sube tal cual:', e);
            return file;
        }
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
async function portadaEsUtilizable(file, labelEl) {
    if (!file || !pareceHeic(file)) return true;

    // ¿Sabe este navegador decodificarlo por sí solo? (Safari e iOS, sí)
    try {
        const bm = await createImageBitmap(file);
        bm.close && bm.close();
        return true;
    } catch (e) { /* sigue abajo: hay que convertirlo */ }

    // No sabe. Se intenta con el conversor antes de molestar al usuario: en la
    // práctica esto resuelve el caso y no llega a ver ningún aviso.
    if (labelEl) labelEl.textContent = 'Preparando la portada (HEIC)...';
    const convertido = await convertirHeicAJpeg(file);
    if (convertido) return true;

    // Solo si tampoco se pudo convertir (CDN caído, HEIC corrupto) se avisa.
    return confirm(
        'La foto de portada está en formato HEIC (de iPhone) y no se ha podido ' +
        'convertir en este navegador.\n\n' +
        'Las demás fotos se suben sin problema, pero el DISEÑO DE PORTADA que ' +
        'genera el sistema puede quedar sin la imagen.\n\n' +
        'Recomendación: elige como portada una foto .jpg, o abre esta página ' +
        'desde un iPhone o Safari.\n\n' +
        '¿Continuar de todas formas?'
    );
}

async function uploadPhotosToDrive(photosArray, top10Indices, labelEl, fillEl) {
    if (!userToken || !propertyData || !propertyData.fotosFolderId) {
        throw new Error("No hay carpeta de fotografías asignada en el CRM.");
    }
    
    const uploadedIds = [];
    const top10UploadedMeta = []; // Para guardar los ids que necesitamos copiar al top 10
    
    let idx = 1;
    const total = photosArray.length;

    // Fotos que ya quedaron en Drive en un intento anterior de ESTE inmueble.
    // Sin esto, un corte a la mitad obligaba a resubirlas todas y además dejaba
    // duplicados en la carpeta.
    //
    // Se guarda la POSICIÓN además del id: el nombre del archivo depende del
    // puesto (2-Portada, 3-Foto...). Si el propietario reordena o agrega fotos
    // al volver, reutilizar el id a secas dejaría dos archivos con el mismo
    // nombre y el TOP 10 apuntando al equivocado.
    const fotosPrevias = leerProgreso().fotos || {};
    const clavesUsadas = new Set();

    // 1. Subir todas a la carpeta principal
    for (const item of photosArray) {
        let file = item.file || item;
        const claveFoto = claveArchivo(file);
        clavesUsadas.add(claveFoto);
        const baseName = idx === 1 ? `2-Portada_${currentCdr}` : `${idx + 1}-Foto_${currentCdr}`;
        const photoName = `${baseName}.jpg`;

        const previa = fotosPrevias[claveFoto];
        // La portada se sube recortada en 1:1. Si una foto entra o sale de ese
        // primer puesto, el archivo de Drive ya no sirve: hay que volver a subirla.
        const cambiaPortada = previa && (previa.pos === 1) !== (idx === 1);

        if (previa && previa.id && !cambiaPortada) {
            let idPrevio = previa.id;
            if (previa.pos !== idx) {
                // Solo cambió de puesto: se renombra en Drive (instantáneo) en
                // vez de volver a subir el archivo.
                labelEl.textContent = `Foto ${idx} de ${total}: reordenando la ya subida...`;
                const resRename = await fetch(`https://www.googleapis.com/drive/v3/files/${idPrevio}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: photoName })
                });
                if (!resRename.ok) idPrevio = null;   // no se pudo: se sube de nuevo más abajo
            } else {
                labelEl.textContent = `Foto ${idx} de ${total}: ya estaba subida`;
            }

            if (idPrevio) {
                fillEl.style.width = Math.round((idx / total) * 100) + '%';
                uploadedIds.push(idPrevio);
                fotosPrevias[claveFoto] = { id: idPrevio, pos: idx };
                guardarProgreso({ fotos: fotosPrevias });
                const topPosPrevio = top10Indices.indexOf(idx - 1);
                if (topPosPrevio !== -1) {
                    top10UploadedMeta.push({ id: idPrevio, name: `TOP_${topPosPrevio + 1}_${baseName}.jpg` });
                }
                idx++;
                continue;
            }
        }

        // Cambió de/a portada, o falló el renombrado: la copia vieja sobra.
        if (previa && previa.id) {
            await borrarDeDrive(previa.id);
            delete fotosPrevias[claveFoto];
        }

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
            fotosPrevias[claveFoto] = { id: data.id, pos: idx };
            guardarProgreso({ fotos: fotosPrevias });

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
    
    // 1b. Fotos de un intento anterior que ya NO están en la selección: se
    //     borran de Drive para no dejar sobras en la carpeta del inmueble.
    const sobrantes = Object.keys(fotosPrevias).filter(k => !clavesUsadas.has(k));
    if (sobrantes.length) {
        labelEl.textContent = 'Quitando fotos descartadas...';
        for (const clave of sobrantes) {
            if (fotosPrevias[clave] && fotosPrevias[clave].id) await borrarDeDrive(fotosPrevias[clave].id);
            delete fotosPrevias[clave];
        }
        guardarProgreso({ fotos: fotosPrevias });
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
        // El backend lo usa SOLO para poner la miniatura en YouTube.
        userToken: youtubeToken
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
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${youtubeToken}` } });
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
                headers: { 'Authorization': `Bearer ${youtubeToken}`, 'Content-Type': 'application/json' },
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
                headers: { 'Authorization': `Bearer ${youtubeToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snippet: { playlistId: pId, resourceId: { kind: 'youtube#video', videoId: videoId } }
                })
            });
        }
    }
}
