document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a Elementos del DOM ---
    const imageUpload = document.getElementById('image-upload');
    const uploadLabel = document.getElementById('upload-label');
    const statusDiv = document.getElementById('status');
    const resultsContainer = document.getElementById('results-container');
    const originalImage = document.getElementById('original-image');
    const depthMapCanvas = document.getElementById('depth-map-canvas');

    let depthEstimator = null;

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
        statusDiv.textContent = 'Modelo cargado. Selecciona una imagen para empezar.';
        uploadLabel.textContent = 'Seleccionar Imagen';
        uploadLabel.classList.remove('disabled');
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

    async function processImage(imageUrl) {
        if (!depthEstimator) {
            statusDiv.textContent = 'El modelo de IA no está listo. Espera un momento.';
            return;
        }
        statusDiv.textContent = 'Analizando profundidad... Esto puede tardar unos segundos.';
        
        try {
            const output = await depthEstimator(imageUrl);
            statusDiv.textContent = 'Procesamiento completo. Dibujando mapa de profundidad...';
            
            // La magia de dibujar en el canvas
            drawDepthMap(output);

            statusDiv.textContent = '¡Listo!';
        } catch (error) {
            console.error('Error durante la estimación de profundidad:', error);
            statusDiv.textContent = `Error: ${error.message}`;
        }
    }

    function drawDepthMap(depthData) {
        const { width, height, data } = depthData.predicted_depth;
        
        // Ajustamos el tamaño del canvas a la imagen
        depthMapCanvas.width = width;
        depthMapCanvas.height = height;
        
        const ctx = depthMapCanvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);

        // Normalizamos los datos de profundidad (de su rango original a 0-255)
        let minDepth = Infinity;
        let maxDepth = -Infinity;
        for (let i = 0; i < data.length; i++) {
            if (data[i] < minDepth) minDepth = data[i];
            if (data[i] > maxDepth) maxDepth = data[i];
        }
        const range = maxDepth - minDepth;

        // Rellenamos el buffer de la imagen píxel a píxel
        for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - minDepth) / range;
            const grayscale = Math.floor(normalized * 255);
            
            const pixelIndex = i * 4;
            imageData.data[pixelIndex] = grayscale;     // R
            imageData.data[pixelIndex + 1] = grayscale; // G
            imageData.data[pixelIndex + 2] = grayscale; // B
            imageData.data[pixelIndex + 3] = 255;       // A (opacidad)
        }

        // Pintamos la imagen final en el canvas
        ctx.putImageData(imageData, 0, 0);
    }
});
