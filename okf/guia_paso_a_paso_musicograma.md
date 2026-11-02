# Guía Paso a Paso: Cómo Crear un Musicograma con SVGs Detallados Alineados con los Trayectos y Exportar el Vídeo en Sonogramic

> **Autor**: Norberto Martín Afonso  
> **Aplicación Web (100 % Sin IA · 100 % Vectorial SVG)**: `https://nmarafo.github.io/Sonogramic/`

---

## 🎯 Resumen del Flujo de Trabajo

**Sonogramic v2.1.0 (OKF v1.4.0)** sustituye las antiguas imágenes mapa de bits (`.png`/`.jpg`) por **uno o varios SVGs vectoriales ultradetallados cuyos puentes, balaustradas, rampas, pilares románicos, pentagramas y arcos parabólicos coinciden exactamente con los trayectos de las esferas**, manteniendo además un **zoom de cámara 100 % estable (sin molestos zooms tipo *pulse* en los pulsos)**:

---

### Paso 1: Obtener o Cargar el Archivo `.JSON` OKF Vectorial

Tienen dos formas de empezar:
1. **Con los 4 Proyectos OKF Integrados en la Aplicación**:
   - En la barra superior de **Sonogramic**, hagan clic en cualquiera de las recetas OKF de demostración:
     - *Vivaldi — La Primavera* (`svgTheme: "baroque"`)
     - *Grieg — El Rey de la Montaña* (`svgTheme: "cavern"`)
     - *Folclore Canario — Isa Parrandera* (`svgTheme: "canarias"`)
     - *Carnaval de Las Palmas de GC — Batucada* (`svgTheme: "carnival"`)
2. **Con cualquier Agente de IA externo (NotebookLM, Gemini, ChatGPT, Claude)**:
   - Copien el [**Prompt Maestro OKF v1.4.0**](prompt_maestro_okf_sonogramic.md), adjunten su archivo de audio y pidan el archivo `.json` del musicograma.
   - Cárguenlo con **«1. Cargar JSON OKF»** o péguenlo directamente en **«Pegar JSON»**.

---

### Paso 2: Sincronizar el Archivo de Audio (Opcional) y Compilación Vectorial 1:1

- Al cargar el archivo `.json`, el compilador determinista de **Sonogramic** (`svgTrajectoryCompiler.ts`) calcula todas las plataformas y las trayectorias de las 3 esferas (*Principal*, *Melodía* y *Bajo*) y **genera automáticamente en memoria los SVGs detallados en coordenadas exactas del mundo (`viewBox="${sliceMinX} -960 ${sliceWorldWidth} 1600"`)**.
- Si suben su archivo de audio (`.mp3`, `.wav`, `.ogg`, `.m4a`) con **«3. Subir Audio»**, el motor **Web Audio API** detecta los ataques reales de graves (`< 150 Hz`) y agudos (`> 800 Hz`), recalcula las plataformas y **re-compila al instante los SVGs** para que todos los puentes, pilares y curvas del dibujo coincidan exactamente con los botes del audio real.

---

### Paso 3: Elegir entre Varios SVGs por Sección o 1 SVG Panorámico Único (y Descargar/Editar `.svg`)

En la barra superior o en la pestaña **«SVGs»** del panel derecho disponen de control total sobre la escenografía vectorial:

1. **Conmutar entre `N SVGs por Sección` y `1 SVG Panorámico Único`**:
   - **Varios SVGs (`N SVGs por Sección`)**: Divide la obra en los segmentos formales de `sliceSpecs` (`Segmento 1` a `Segmento N`), cada uno con su propia paleta, arquitectura temática (`baroque`, `cavern`, `canarias`, `carnival`, `symphonic`) y puenteado exacto, unidos sin costuras en `y = 0`.
   - **Un Único SVG (`1 SVG Panorámico Único`)**: Funde toda la obra de principio a fin en un solo lienzo SVG panorámico continuo.
2. **Descargar o Personalizar los Archivos `.svg`**:
   - Pulsen **«1 SVG Completo»** para descargar un único archivo `.svg` panorámico de toda la obra con los trayectos y puentes dibujados.
   - Pulsen **«SVGs por Tramo»** (o el botón `📐 SVG` de cada tarjeta) para descargar los archivos `.svg` individuales de cada sección.
   - Pueden abrir cualquiera de esos `.svg` en **Inkscape, Adobe Illustrator o Figma**, añadir detalles artísticos respetando las coordenadas de los puentes y volver a subirlos con **«2. Subir SVGs»**.

---

### Paso 4: Reproducir sin Zooms Tipo Pulse y Capturar el Vídeo HD (`.webm`)

1. **Cámara Suave y Zoom 100 % Estable**:
   - El deslizador **«Zoom Cámara»** ajusta el encuadre fijo sin que existan bombeos ni *pulse zooms* en los pulsos musicales.
   - El deslizador **«Opacidad Plataformas»** viene ajustado por defecto al `32 %` (`0.32`) para que las esferas rueden directamente sobre los tableros y barandillas dibujados en el SVG.
2. **Capturar el Vídeo de Principio a Fin**:
   - Pulsen **«🎬 Capturar Musicograma Completo (Auto-Vídeo Inicio a Fin)»**.
   - La aplicación rebobinará al instante `00:00`, reproducirá el musicograma completo a **60 FPS** junto con el audio y descargará automáticamente el **archivo de vídeo en alta definición (`.webm`)**.
