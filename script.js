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
                video: { facingMode: 'environment' }
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
            
            if (output && output.predicted_depth) {
                drawDepthMap(output.predicted_depth);
                statusDiv.textContent = '¡Listo!';
            } else {
                throw new Error("La salida del modelo de IA no es válida.");
            }

        } catch (error) {
            console.error('Error durante la estimación de profundidad:', error);
            statusDiv.textContent = `Error al procesar la imagen: ${error.message}`;
        }
    }

    function drawDepthMap(tensor) {
        console.log('--- DEBUG: Objeto TENSOR RECIBIDO ---', tensor);

        let height, width, data;

        // Caso 1: formato Tensor clásico con dims
        if (tensor.dims && tensor.data) {
            [, height, width] = tensor.dims;
            data = tensor.data;

        // Caso 2: formato objeto con height, width, data
        } else if ('height' in tensor && 'width' in tensor && 'data' in tensor) {
            height = tensor.height;
            width = tensor.width;
            data = tensor.data;

        // Caso 3: ya es un ImageData listo
        } else if (tensor instanceof ImageData) {
            depthMapCanvas.width = tensor.width;
            depthMapCanvas.height = tensor.height;
            const ctx = depthMapCanvas.getContext("2d");
            ctx.putImageData(tensor, 0, 0);
            return;

        } else {
            console.error("Formato de tensor no soportado:", tensor);
            statusDiv.textContent = "Error: formato de salida inesperado del modelo.";
            return;
        }

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            console.error("Dimensiones inválidas recibidas del tensor:", {width, height});
            statusDiv.textContent = "Error: La IA devolvió dimensiones de imagen inválidas.";
            return;
        }

        depthMapCanvas.width = Math.round(width);
        depthMapCanvas.height = Math.round(height);

        const ctx = depthMapCanvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);

        let minDepth = Infinity;
        let maxDepth = -Infinity;
        for (let i = 0; i < data.length; i++) {
            if (data[i] < minDepth) minDepth = data[i];
            if (data[i] > maxDepth) maxDepth = data[i];
        }
        const range = maxDepth - minDepth;

        for (let i = 0; i < data.length; i++) {
            const normalized = range > 0 ? (data[i] - minDepth) / range : 0;
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
