document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const imageUpload = document.getElementById('image-upload');
    const uploadLabel = document.getElementById('upload-label');
    const cameraButton = document.getElementById('camera-button');
    const statusDiv = document.getElementById('status');
    const resultsContainer = document.getElementById('results-container');
    const originalImage = document.getElementById('original-image');
    const depthMapCanvas = document.getElementById('depth-map-canvas');

    // Elementos de la cámara
    const cameraView = document.getElementById('camera-view');
    const videoFeed = document.getElementById('video-feed');
    const snapButton = document.getElementById('snap-button');
    const closeCameraButton = document.getElementById('close-camera-button');

    let depthEstimator = null;
    let stream = null;

    // --- Carga del Modelo de IA ---
    async function loadModel() {
        statusDiv.textContent = 'Cargando modelo de IA (sólo la primera vez)...';
        depthEstimator = await window.pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
            progress_callback: data => {
                if (data.status === 'progress') {
                    statusDiv.textContent = `Cargando modelo... ${data.progress.toFixed(1)}%`;
                }
            }
        });
        statusDiv.textContent = 'Modelo cargado. Selecciona una imagen o activa la cámara.';
        uploadLabel.textContent = 'Seleccionar Archivo';
        uploadLabel.classList.remove('disabled');
        cameraButton.classList.remove('disabled');
    }
    loadModel();

    // --- Procesamiento de la Imagen (Subida de Archivo) ---
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            resultsContainer.classList.remove('hidden');
            processImage(e.target.result);
        };
        reader.readAsDataURL(file);
    });

    // --- Lógica de la Cámara ---
    cameraButton.addEventListener('click', async () => {
        cameraView.classList.remove('hidden');
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prioriza la cámara trasera en móviles
            });
            videoFeed.srcObject = stream;
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            statusDiv.textContent = "Error: No se pudo acceder a la cámara. Asegúrate de dar permisos.";
            cameraView.classList.add('hidden');
        }
    });

    snapButton.addEventListener('click', () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoFeed.videoWidth;
        tempCanvas.height = videoFeed.videoHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(videoFeed, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const imageDataUrl = tempCanvas.toDataURL('image/jpeg');
        originalImage.src = imageDataUrl;
        resultsContainer.classList.remove('hidden');
        
        processImage(imageDataUrl);
        closeCamera();
    });

    closeCameraButton.addEventListener('click', () => {
        closeCamera();
    });

    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraView.classList.add('hidden');
    }

    // --- Lógica de IA y Dibujado en Canvas ---
    async function processImage(imageUrl) {
        if (!depthEstimator) {
            statusDiv.textContent = 'El modelo de IA no está listo. Espera un momento.';
            return;
        }
        statusDiv.textContent = 'Analizando profundidad... Esto puede tardar unos segundos.';
        
        try {
            const output = await depthEstimator(imageUrl);
            statusDiv.textContent = 'Procesamiento completo. Dibujando mapa de profundidad...';
            drawDepthMap(output.predicted_depth);
            statusDiv.textContent = '¡Listo!';
        } catch (error) {
            console.error('Error durante la estimación de profundidad:', error);
            statusDiv.textContent = `Error: ${error.message}`;
        }
    }

    function drawDepthMap(tensor) {
        // **CORRECCIÓN DEL BUG:** Extraemos las dimensiones correctamente del tensor
        const [_, height, width] = tensor.dims;
        const data = tensor.data;
        
        depthMapCanvas.width = width;
        depthMapCanvas.height = height;
        
        const ctx = depthMapCanvas.getContext('2d');
        // **CORRECCIÓN DEL BUG:** Usamos las dimensiones enteras para crear la imagen
        const imageData = ctx.createImageData(Math.round(width), Math.round(height));

        let minDepth = Infinity;
        let maxDepth = -Infinity;
        for (let i = 0; i < data.length; i++) {
            if (data[i] < minDepth) minDepth = data[i];
            if (data[i] > maxDepth) maxDepth = data[i];
        }
        const range = maxDepth - minDepth;

        for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - minDepth) / range;
            const grayscale = Math.floor(normalized * 255);
            const pixelIndex = i * 4;
            imageData.data[pixelIndex] = grayscale;
            imageData.data[pixelIndex + 1] = grayscale;
            imageData.data[pixelIndex + 2] = grayscale;
            imageData.data[pixelIndex + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    }
});
