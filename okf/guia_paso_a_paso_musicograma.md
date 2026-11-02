# Guía Paso a Paso: Cómo Crear un Musicograma con JSON + Imágenes y Exportar el Vídeo en Sonogramic

> **Autor**: Norberto Martín Afonso  
> **Aplicación Web (100 % Sin IA)**: `https://nmarafo.github.io/Sonogramic/`

---

## 🎯 Resumen del Flujo de Trabajo

**Sonogramic** ha sido diseñado para que la aplicación de reproducción y grabación sea **100 % determinista, rápida, privada y libre de llamadas a Inteligencia Artificial**. Ustedes tienen el control absoluto de los recursos visuales y sonoros siguiendo estos **4 pasos**:

---

### Paso 1: Obtener o Cargar el Archivo `.JSON` con las Indicaciones y Pasos

Tienen dos formas de empezar:
1. **Con cualquier Agente de IA externo (NotebookLM, Gemini, ChatGPT, Claude)**:
   - Copien el [**Prompt Maestro OKF**](prompt_maestro_okf_sonogramic.md) y pidan a su IA externa el musicograma de la obra que deseen trabajar en el aula (ej. *"La Primavera de Vivaldi, primeros 90 segundos"* o *"En la gruta del rey de la montaña de Grieg"*).
   - Guarden el bloque JSON devuelto como un archivo `.json` (por ejemplo, `mi_musicograma.json`) y cárguenlo en **Sonogramic** (o péguenlo directamente en el modal **«📋 Pegar JSON OKF»** de la aplicación).
2. **Con los Ejemplos OKF Integrados en la Aplicación**:
   - En la pantalla principal de **Sonogramic**, hagan clic en cualquiera de las recetas OKF de demostración (*Vivaldi — La Primavera*, *Grieg — Peer Gynt* o *Folclore Canario — Isa Parrandera*).

---

### Paso 2: Cargar el Archivo de Audio (Opcional o Sincronizado)

- Al cargar el archivo `.json`, **Sonogramic** construye inmediatamente el escenario de plataformas, aplica los iconos vectoriales SVG de las tres esferas y muestra el **Panel de Indicaciones y Pasos (`guideSteps`)** junto con las tarjetas de los **Segmentos (`1..N`)**.
- Si suben a continuación su archivo de audio (`.mp3`, `.wav`, `.ogg`, `.m4a`), el motor matemático local del navegador (**Web Audio API**, sin IA) analizará las frecuencias graves (`< 150 Hz`) y agudas (`> 800 Hz`) para sincronizar cada bote y rampa con el audio real, conservando intactas todas las indicaciones, segmentos y configuraciones de su `.json`.
- Si aún no disponen del archivo de audio, pueden previsualizar y grabar igualmente el musicograma utilizando el **Sintetizador Rítmico Web Audio** integrado que sigue el tempo (`BPM`) y la estructura del JSON.

---

### Paso 3: Descargar Plantillas Guía (Opcional) e Introducir sus Imágenes

En el panel **«🖼️ Segmentos e Imágenes del Musicograma (`sliceSpecs`)»** verán cada tramo horizontal de la obra:

1. **Descargar Plantilla Guía del Segmento (`📐 Plantilla`)**:
   - Descarga un lienzo de `1024 × 1024 px` con fondo negro y los rectángulos blancos exactos de las plataformas por donde pasan las esferas en ese segmento.
   - Pueden usar esa plantilla como guía en cualquier editor gráfico (Photoshop, GIMP, Krita, Canva) o como imagen de referencia en un generador externo junto con el **`imagePrompt`** que incluye la tarjeta del segmento en el JSON.
2. **Introducir las Imágenes en la Aplicación**:
   - **Por Lote (Recomendado)**: Pulsen **«🖼️ Subir Imágenes en Lote (Segmentos 1..N)»** y seleccionen todas sus imágenes a la vez (`segmento1.jpg`, `segmento2.jpg`, ...). La aplicación las colocará en orden automáticamente.
   - **Individualmente por Segmento**: En cada tarjeta de segmento o en la barra inferior del reproductor, pulsen **«Subir Imagen/Vídeo»** para asignar cualquier archivo `.jpg`, `.png`, `.webp`, `.svg` o `.mp4`/`.webm`.
   - **Para las Esferas (Principal, Melodía y Bajo)**: Además de las formas geométricas y de los iconos SVG animados que ya vienen dentro del JSON OKF (`svgContent`), pueden subir cualquier imagen `.png`/`.svg` con fondo transparente para personalizar cada esfera.

---

### Paso 4: Capturar la Reproducción del Musicograma y Descargar el Vídeo

Una vez cargadas sus imágenes y el JSON:
1. Ajusten, si lo desean, el **Zoom**, la **Opacidad de Plataformas** (pueden bajarla a `0.0`–`0.2` si sus imágenes ya muestran los caminos dibujados) y la **Suavidad de Cámara**.
2. Pulsen el botón **«🎬 Capturar Musicograma Completo (Auto-Vídeo)»** (o **«🔴 Grabar Vídeo»** para grabar un fragmento manual).
3. La aplicación rebobinará al instante `00:00`, reproducirá el musicograma completo capturando el lienzo a **60 fotogramas por segundo** junto con el audio, detendrá la grabación automáticamente al finalizar la pieza y les devolverá el **archivo de vídeo en alta definición (`.webm`)** listo para descargar.
4. Asimismo, pueden pulsar **«💾 Guardar Proyecto Completo (`.json`)»** para exportar un único archivo `.json` que conserva el JSON OKF, la trayectoria física, las imágenes en Base64 y el audio.
