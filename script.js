document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const imageUpload = document.getElementById('image-upload');
    const uploadLabel = document.getElementById('upload-label');
    const cameraButton = document.getElementById('camera-button');
    const statusDiv = document.getElementById('status');
    const resultsContainer = document.getElementById('results-container');
    const originalImage = document.getElementById('original-image');
    const depthMapCanvas = document.getElementById('depth-map-canvas');
    const cameraView = document.getElementById('camera-view');
    const videoFeed = document.getElementById('video-feed');
    const snapButton = document.getElementById('snap-button');
    const closeCameraButton = document.getElementById('close-camera-button');

    let depthEstimator = null;
    let stream = null;

    // --- Carga del Modelo de IA ---
    async function loadModel() {
        statusDiv.textContent = 'Cargando modelo de IA...';
        depthEstimator = await window.pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
        statusDiv.textContent = 'Modelo cargado. Selecciona una imagen o activa la cámara.';
        uploadLabel.textContent = 'Seleccionar Archivo';
        uploadLabel.classList.remove('disabled');
        cameraButton.classList.remove('disabled');
    }
    loadModel();

    // --- Procesamiento de la Imagen ---
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
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            videoFeed.srcObject = stream;
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            statusDiv.textContent = "Error: No se pudo acceder a la cámara.";
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

    closeCameraButton.addEventListener('click', () => closeCamera());

    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraView.classList.add('hidden');
    }

    // --- Lógica de IA ---
    async function processImage(imageUrl) {
        if (!depthEstimator) {
            statusDiv.textContent = 'El modelo de IA no está listo.';
            return;
        }
        statusDiv.textContent = 'Analizando profundidad...';
        
        try {
            const output = await depthEstimator(imageUrl);
            
            // =================================================================
            // **AQUÍ ESTÁ LA CLAVE**
            // Imprimimos el objeto 'output' COMPLETO para ver qué nos da la IA.
            console.log('--- RADIOGRAFÍA DEL OUTPUT DE LA IA ---');
            console.log(output);
            // =================================================================

            // El resto del código que fallaba está comentado para que no se rompa
            // y podamos ver la salida de la consola.
            // statusDiv.textContent = 'Procesamiento completo. El debug está en la consola.';
            // if (output && output.predicted_depth) {
            //     drawDepthMap(output.predicted_depth);
            // }

        } catch (error) {
            console.error('Error durante la estimación de profundidad:', error);
            statusDiv.textContent = `Error al procesar la imagen: ${error.message}`;
        }
    }
});
