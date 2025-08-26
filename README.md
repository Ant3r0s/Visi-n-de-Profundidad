# Visión de Profundidad 🧠

## Descripción

Visión de Profundidad es una aplicación web experimental que utiliza un modelo de inteligencia artificial de última generación para estimar la profundidad de una imagen bidimensional. La aplicación analiza una fotografía subida por el usuario y genera un "mapa de profundidad", una representación en escala de grises donde los píxeles más claros indican objetos cercanos a la cámara y los más oscuros, objetos lejanos.

Todo el procesamiento se realiza íntegramente en el navegador del usuario, garantizando que las imágenes nunca abandonan su dispositivo.

## Tecnología

* **Motor de IA:** La aplicación se basa en la librería `Transformers.js` (de Xenova) para ejecutar modelos de IA directamente en el cliente.
* **Modelo de Estimación de Profundidad:** Utiliza un modelo pre-entrenado de la familia `Depth Anything` (en este caso, `Xenova/depth-anything-small-hf`), que ha sido optimizado para un rendimiento eficiente en el navegador.
* **Renderizado:** La visualización del mapa de profundidad se realiza mediante el dibujado de los datos crudos (tensores) devueltos por la IA sobre un elemento `<canvas>` de HTML5.

## Uso

1.  **Carga Inicial:** Al abrir la página, se descargará en la caché del navegador el modelo de IA. El estado se mostrará en pantalla.
2.  **Seleccionar Imagen:** Utilice el botón para seleccionar un archivo de imagen (`.jpg`, `.png`, etc.) de su dispositivo.
3.  **Procesamiento:** La imagen original se mostrará a la izquierda. La aplicación comenzará a procesarla para inferir la profundidad.
4.  **Resultado:** A la derecha, aparecerá el mapa de profundidad generado, listo para ser visualizado o guardado.
