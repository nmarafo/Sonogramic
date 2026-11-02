import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Video,
  Download,
  Music,
  Save,
  FileJson,
  Copy,
  Check,
  LayoutGrid,
  Palette,
  BookOpen,
  Film,
  ClipboardPaste,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AudioVisualizer,
  AudioVisualizerHandle,
} from "./components/AudioVisualizer";
import { OkfMusicogramaProject } from "./types/okf";
import { EXAMPLE_OKF_PROJECTS } from "./data/exampleProjects";

const OKF_MASTER_PROMPT_SNIPPET = `Actúas como un Musicólogo Analista, Pedagogo Musical, Arquitecto Vectorial SVG y Especialista Oficial del Estándar OKF (Open Knowledge Framework v1.4.0) para la aplicación Sonogramic (https://github.com/nmarafo/Sonogramic), creada por Norberto Martín Afonso. Dirígete siempre a las personas usuarias empleando la norma culta de Canarias con el pronombre «ustedes».

REGLAS CRÍTICAS DE DISEÑO (OKF v1.4.0 — SVGs ANIMADOS EN EL MISMO JSON, SIN TEXTOS, SIN DIBUJAR LA RUTA DE LAS ESFERAS Y CERO PULSE ZOOMS):
1. TODOS LOS SVGs DEBEN IR INCLUIDOS Y SER ANIMADOS DENTRO DEL MISMO ARCHIVO .JSON GENERADO:
   - NO generes archivos de imagen mapa de bits (.png, .jpg, .webp, Imagen 3, DALL-E) ni archivos externos sueltos.
   - Todo el arte visual debe ir incrustado como código XML "<svg>...</svg>" directamente dentro del único objeto JSON devuelto:
     a) Escenografías vectoriales animadas por tramo en "sliceSpecs[i].backgroundSvg" (con etiquetas "<animate>" y "<animateTransform>" para el balanceo de árboles/flores, chorros de fuentes, ondas en el agua, nubes, aves, antorchas o cristales brillantes).
     b) Cursores vectoriales en "config.ballConfig.svgContent" (Principal), "config.extraTracksConfig.melody.svgContent" (Melodía/Agudos) y "config.extraTracksConfig.bass.svgContent" (Bajo/Graves).
2. PROHIBICIÓN DE TEXTOS Y DE LÍNEAS DE RUTA (ELEMENTOS ESCENOGRÁFICOS PARA EL SALTO DE LAS ESFERAS):
   - PROHIBIDO incluir etiquetas "<text>" o rótulos escritos dentro de los SVGs.
   - Los SVGs NO deben dibujar las líneas ni las curvas de la ruta real de las esferas. En su lugar, deben dibujar elementos escenográficos animados en torno a esas rutas (copas de árboles en flor, fuentes de mármol con chorros de agua, puentes arqueados, nubes soleadas, nenúfares, setas luminiscentes, cristales, balcones canarios, tambores de carnaval, etc.) dispuestos en los puntos de rebote ("trajectoryWaypoints") para que parezca que las 3 esferas saltan directamente sobre esos elementos dibujados.
   - Define en cada "sliceSpecs[i]" el tema arquitectónico "svgTheme" ("baroque", "cavern", "canarias", "carnival" o "symphonic"), la paleta "recommendedPalette" (4 colores hexadecimales) y los puntos de control de altura "trajectoryWaypoints": [{ "time": seg, "y": px }] (con "y" entre -280 y +220, empezando y terminando en "y": 0 en las fronteras de cada segmento para garantizar unión continua sin saltos).
   - Puedes configurar varios SVGs por sección ("config.svgMode": "segments", "config.mosaicSlices": N entre 4 y 8) o un único SVG panorámico para toda la obra ("config.svgMode": "single", "config.mosaicSlices": 1).
3. PROHIBICIÓN ESTRICTA DE ZOOMS TIPO PULSE EN LOS PULSOS:
   - Está terminantemente prohibido incluir efectos de bombeo o zoom de cámara en los pulsos ("zooms tipo pulse"), así como animaciones de escala en los cursores de las esferas. El zoom de cámara es 100 % fijo y estable.

INSTRUCCIONES DE ANÁLISIS DEL AUDIO ADJUNTO:
1. Detecta la duración total exacta del audio en segundos ("durationSeconds"), el tempo real en pulsos por minuto ("bpm"), el compás ("timeSignature") y la estructura formal por secciones ("musicalForm").
2. Extrae el carácter emocional ("emotions"), la instrumentación o letra clave, y diseña un concepto de escenario vectorial continuo ("environmentConcept") acorde a la música.
3. Divide la pista de audio en entre 4 y 8 secciones ("sliceSpecs") que coincidan con los cambios reales de sección musical en el audio ("startTime" y "endTime" exactos en segundos).
4. En "musicalStructure.sections", detalla cada sección temporal del audio desde el segundo 0 hasta el final con su foco ("melody", "bass" o "tutti"), energía relativa (0.5 a 3.5), subdivisión rítmica (0.5, 1 o 2), contorno melódico ("ascending", "descending", "arch", "valley", "wave", "staccato_jumps", "sustained_ramp") y estilo de plataforma ("major", "minor", "accelerator", "friction").

ESTRUCTURA JSON OFICIAL A DEVOLVER (UN ÚNICO BLOQUE JSON CON TODOS LOS SVGs INCLUIDOS):

{
  "$schema": "https://raw.githubusercontent.com/nmarafo/Sonogramic/main/schema/schema_sonogramic_musicograma.json",
  "okfVersion": "1.4.0",
  "metadata": {
    "id": "urn:okf:musicograma:audio-analizado-svg:2026",
    "title": "Título de la obra o pista analizada",
    "composer": "Compositor, artista o agrupación",
    "musicalPeriodOrGenre": "Estilo o periodo musical",
    "educationalStage": "Primaria / ESO / Bachillerato",
    "durationSeconds": 90,
    "bpm": 120,
    "timeSignature": "4/4",
    "musicalForm": "Intro - A - B - A' - Coda",
    "pedagogicalObjectives": [
      "Objetivo didáctico 1 vinculado a la escucha activa y a los trayectos vectoriales.",
      "Objetivo didáctico 2 sobre estructura formal, timbre o dinámica."
    ],
    "emotions": ["Emoción 1", "Emoción 2", "Emoción 3"],
    "environmentConcept": "Descripción de la escenografía vectorial continua cuyos puentes, arcos y relieves coinciden exactamente con los trayectos de las esferas."
  },
  "sliceSpecs": [
    {
      "index": 0,
      "title": "Segmento 1: [Nombre de la sección]",
      "startTime": 0,
      "endTime": 15,
      "musicalSection": "Intro / Tema A",
      "dynamicsAndTempo": "f — Allegro",
      "didacticNote": "Explicación musical de lo que suena entre startTime y endTime.",
      "imagePrompt": "Escenografía vectorial SVG alineada con el trayecto: [descripción detallada de los puentes, pilares, relieves y elementos temáticos que acompañan la curva melódica].",
      "recommendedPalette": ["#0f172a", "#38bdf8", "#fbbf24", "#f472b6"],
      "svgTheme": "symphonic",
      "trajectoryWaypoints": [
        { "time": 0, "y": 0 },
        { "time": 5, "y": -140 },
        { "time": 10, "y": 60 },
        { "time": 15, "y": 0 }
      ],
      "generatedByAgent": true,
      "backgroundSvg": "<svg viewBox=\\"0 0 1600 1000\\" width=\\"1600\\" height=\\"1000\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><linearGradient id=\\"sky_0\\" x1=\\"0%\\" y1=\\"0%\\" x2=\\"0%\\" y2=\\"100%\\"><stop offset=\\"0%\\" stop-color=\\"#0f172a\\"/><stop offset=\\"60%\\" stop-color=\\"#1e293b\\"/><stop offset=\\"100%\\" stop-color=\\"#334155\\"/></linearGradient></defs><rect width=\\"1600\\" height=\\"1000\\" fill=\\"url(#sky_0)\\"/><circle cx=\\"320\\" cy=\\"220\\" r=\\"90\\" fill=\\"#fbbf24\\" fill-opacity=\\"0.28\\"/><path d=\\"M 0 640 Q 400 560 800 620 T 1600 640 L 1600 1000 L 0 1000 Z\\" fill=\\"#1e293b\\" fill-opacity=\\"0.7\\"/></svg>"
    }
  ],
  "config": {
    "zoom": 0.85,
    "platformOpacity": 0.32,
    "bgOffsetY": 0,
    "cameraSmoothness": 0.85,
    "mosaicSlices": 6,
    "svgMode": "segments",
    "userKeywords": "Palabras clave de la escenografía vectorial",
    "ballConfig": {
      "shape": "custom-svg",
      "color": "dynamic",
      "effect": "glow",
      "rotate": true,
      "opacity": 1.0,
      "label": "Esfera Principal",
      "svgContent": "<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"42\\" fill=\\"#fbbf24\\" stroke=\\"#ffffff\\" stroke-width=\\"4\\"/><polygon points=\\"50,14 61,38 87,38 66,54 74,79 50,63 26,79 34,54 13,38 39,38\\" fill=\\"#0f172a\\"/></svg>"
    },
    "extraTracksConfig": {
      "melody": {
        "shape": "custom-svg",
        "color": "#38bdf8",
        "effect": "glow",
        "rotate": false,
        "opacity": 0.95,
        "label": "Melodía (Agudos)",
        "svgContent": "<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"36\\" fill=\\"#38bdf8\\" fill-opacity=\\"0.3\\" stroke=\\"#38bdf8\\" stroke-width=\\"3\\"/><circle cx=\\"44\\" cy=\\"62\\" r=\\"10\\" fill=\\"#ffffff\\"/><path d=\\"M 54 62 L 54 24 L 74 30 L 74 42 L 54 36\\" fill=\\"#ffffff\\" stroke=\\"#ffffff\\" stroke-width=\\"3\\"/></svg>"
      },
      "bass": {
        "shape": "custom-svg",
        "color": "#a855f7",
        "effect": "glow",
        "rotate": true,
        "opacity": 0.9,
        "label": "Bajo (Graves)",
        "svgContent": "<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><polygon points=\\"50,8 88,29 88,71 50,92 12,71 12,29\\" fill=\\"#a855f7\\" stroke=\\"#f3e8ff\\" stroke-width=\\"4\\"/><circle cx=\\"50\\" cy=\\"50\\" r=\\"18\\" fill=\\"#0f172a\\" stroke=\\"#fbbf24\\" stroke-width=\\"3\\"/></svg>"
      }
    }
  },
  "musicalStructure": {
    "sections": [
      {
        "startTime": 0,
        "endTime": 15,
        "label": "Sección 1",
        "focus": "melody",
        "energy": 1.4,
        "subdivision": 1,
        "melodicContour": "ascending",
        "platformStyle": "major"
      }
    ]
  }
}`;

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [okfProject, setOkfProject] = useState<OkfMusicogramaProject>(
    EXAMPLE_OKF_PROJECTS[0].project,
  );
  const [activeExampleId, setActiveExampleId] = useState<string>(
    EXAMPLE_OKF_PROJECTS[0].id,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState("");
  const [hideSvgButtons, setHideSvgButtons] = useState(false);
  const [hidePlaybackBar, setHidePlaybackBar] = useState(false);

  const [vState, setVState] = useState<{
    isPlaying: boolean;
    isRecording: boolean;
    hasRecording: boolean;
    isAnalyzing: boolean;
    emotions?: string[];
    environmentConcept?: string;
    bgImageCount?: number;
    bgReadySlices?: boolean[];
    currentTime?: number;
    duration?: number;
    zoom: number;
    zoomVariation: number;
    platformOpacity: number;
    bgOffsetY: number;
    cameraSmoothness: number;
    ballShape: string;
    ballColor: string;
    ballEffect: string;
    ballRotate: boolean;
    ballOpacity: number;
    userKeywords: string;
    extraTracksConfig: {
      melody: {
        shape: string;
        color: string;
        effect: string;
        rotate: boolean;
        opacity: number;
      };
      bass: {
        shape: string;
        color: string;
        effect: string;
        rotate: boolean;
        opacity: number;
      };
    };
  }>({
    isPlaying: false,
    isRecording: false,
    hasRecording: false,
    isAnalyzing: false,
    zoom: EXAMPLE_OKF_PROJECTS[0].project.config.zoom ?? 0.85,
    zoomVariation: 0.85,
    platformOpacity:
      EXAMPLE_OKF_PROJECTS[0].project.config.platformOpacity ?? 0.85,
    bgOffsetY: EXAMPLE_OKF_PROJECTS[0].project.config.bgOffsetY ?? 0.0,
    cameraSmoothness:
      EXAMPLE_OKF_PROJECTS[0].project.config.cameraSmoothness ?? 0.82,
    ballShape:
      EXAMPLE_OKF_PROJECTS[0].project.config.ballConfig?.shape || "custom-svg",
    ballColor:
      EXAMPLE_OKF_PROJECTS[0].project.config.ballConfig?.color || "dynamic",
    ballEffect:
      EXAMPLE_OKF_PROJECTS[0].project.config.ballConfig?.effect || "glow",
    ballRotate:
      EXAMPLE_OKF_PROJECTS[0].project.config.ballConfig?.rotate ?? true,
    ballOpacity:
      EXAMPLE_OKF_PROJECTS[0].project.config.ballConfig?.opacity ?? 1.0,
    userKeywords: EXAMPLE_OKF_PROJECTS[0].project.config.userKeywords || "",
    extraTracksConfig: {
      melody: {
        shape:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.melody
            ?.shape || "custom-svg",
        color:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.melody
            ?.color || "#38bdf8",
        effect:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.melody
            ?.effect || "glow",
        rotate:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.melody
            ?.rotate ?? false,
        opacity:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.melody
            ?.opacity ?? 0.95,
      },
      bass: {
        shape:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.bass
            ?.shape || "custom-svg",
        color:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.bass
            ?.color || "#a855f7",
        effect:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.bass
            ?.effect || "glow",
        rotate:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.bass
            ?.rotate ?? true,
        opacity:
          EXAMPLE_OKF_PROJECTS[0].project.config.extraTracksConfig?.bass
            ?.opacity ?? 0.9,
      },
    },
  });

  const visualizerRef = useRef<AudioVisualizerHandle>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const batchImagesInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyImportedJsonObject = (inputData: any) => {
    // Normalize legacy project JSON or OKF JSON
    const normalized: OkfMusicogramaProject = {
      okfVersion: inputData.okfVersion || "1.3.0",
      metadata: inputData.metadata || {
        title: inputData.audioName || "Proyecto Musicograma Importado",
        composer: "Autor Personalizado",
        durationSeconds: inputData.data?.duration || 90,
        bpm: 120,
        emotions: inputData.data?.emotions || ["Personalizado"],
        environmentConcept:
          inputData.data?.environmentConcept ||
          "Escenario personalizado cargado desde JSON",
      },
      sliceSpecs:
        inputData.sliceSpecs && inputData.sliceSpecs.length > 0
          ? inputData.sliceSpecs
          : Array.from({
              length:
                inputData.config?.mosaicSlices ||
                inputData.data?.bgImagesBase64?.length ||
                6,
            }).map((_, idx, arr) => {
              const dur = inputData.data?.duration || 90;
              const segDur = dur / arr.length;
              return {
                index: idx,
                title: `Segmento ${idx + 1}`,
                startTime: Math.round(idx * segDur),
                endTime: Math.round((idx + 1) * segDur),
                musicalSection: `Sección ${idx + 1}`,
                didacticNote:
                  "Escenografía vectorial SVG compilada y alineada matemáticamente con los trayectos de este tramo.",
                imagePrompt:
                  "Escenario vectorial SVG multicapa con puentes, barandillas, arcos de soporte y curvas de trayectoria exactas en coordenadas del mundo.",
              };
            }),
      config: {
        zoom: inputData.config?.zoom ?? 0.85,
        platformOpacity: inputData.config?.platformOpacity ?? 0.35,
        bgOffsetY: inputData.config?.bgOffsetY ?? 0,
        cameraSmoothness: inputData.config?.cameraSmoothness ?? 0.82,
        svgMode: inputData.config?.svgMode || "segments",
        masterSceneSvg: inputData.config?.masterSceneSvg,
        mosaicSlices:
          inputData.config?.svgMode === "single"
            ? 1
            : inputData.config?.mosaicSlices ||
              inputData.sliceSpecs?.length ||
              inputData.data?.bgImagesBase64?.length ||
              6,
        userKeywords: inputData.config?.userKeywords || "",
        ballConfig: {
          shape:
            inputData.config?.ballConfig?.shape === "ai-generated"
              ? "custom-svg"
              : inputData.config?.ballConfig?.shape || "circle",
          color: inputData.config?.ballConfig?.color || "dynamic",
          effect: inputData.config?.ballConfig?.effect || "glow",
          rotate: inputData.config?.ballConfig?.rotate ?? true,
          opacity: inputData.config?.ballConfig?.opacity ?? 1.0,
          svgContent: inputData.config?.ballConfig?.svgContent || "",
          label: inputData.config?.ballConfig?.label || "Esfera Principal",
        },
        extraTracksConfig: {
          melody: {
            shape:
              inputData.config?.extraTracksConfig?.melody?.shape ===
              "ai-generated"
                ? "custom-svg"
                : inputData.config?.extraTracksConfig?.melody?.shape ||
                  "square",
            color:
              inputData.config?.extraTracksConfig?.melody?.color || "#38bdf8",
            effect:
              inputData.config?.extraTracksConfig?.melody?.effect || "glow",
            rotate:
              inputData.config?.extraTracksConfig?.melody?.rotate ?? true,
            opacity:
              inputData.config?.extraTracksConfig?.melody?.opacity ?? 0.95,
            svgContent:
              inputData.config?.extraTracksConfig?.melody?.svgContent || "",
          },
          bass: {
            shape:
              inputData.config?.extraTracksConfig?.bass?.shape ===
              "ai-generated"
                ? "custom-svg"
                : inputData.config?.extraTracksConfig?.bass?.shape || "hexagon",
            color:
              inputData.config?.extraTracksConfig?.bass?.color || "#a855f7",
            effect: inputData.config?.extraTracksConfig?.bass?.effect || "glow",
            rotate: inputData.config?.extraTracksConfig?.bass?.rotate ?? true,
            opacity: inputData.config?.extraTracksConfig?.bass?.opacity ?? 0.9,
            svgContent:
              inputData.config?.extraTracksConfig?.bass?.svgContent || "",
          },
        },
      },
      musicalStructure: inputData.musicalStructure,
      data: inputData.data,
      audioBase64: inputData.audioBase64,
      audioType: inputData.audioType,
      audioName: inputData.audioName,
    };

    // If the JSON embeds audioBase64, reconstruct the File
    if (inputData.audioBase64) {
      try {
        const byteCharacters = atob(
          inputData.audioBase64.split(",")[1] || inputData.audioBase64,
        );
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: inputData.audioType || "audio/mp3",
        });
        const parsedFile = new File(
          [blob],
          inputData.audioName || "audio_importado.mp3",
          { type: inputData.audioType || "audio/mp3" },
        );
        setAudioFile(parsedFile);
      } catch (e) {
        console.warn("No se pudo reconstruir el audio embebido:", e);
      }
    }

    setOkfProject(normalized);
    setActiveExampleId("custom");

    setVState((prev) => ({
      ...prev,
      zoom: normalized.config.zoom,
      platformOpacity: normalized.config.platformOpacity,
      bgOffsetY: normalized.config.bgOffsetY,
      cameraSmoothness: normalized.config.cameraSmoothness,
      ballShape: normalized.config.ballConfig.shape,
      ballColor: normalized.config.ballConfig.color,
      ballEffect: normalized.config.ballConfig.effect,
      ballRotate: normalized.config.ballConfig.rotate,
      ballOpacity: normalized.config.ballConfig.opacity,
      userKeywords: normalized.config.userKeywords || "",
      extraTracksConfig: {
        melody: {
          shape: normalized.config.extraTracksConfig.melody.shape,
          color: normalized.config.extraTracksConfig.melody.color,
          effect: normalized.config.extraTracksConfig.melody.effect,
          rotate: normalized.config.extraTracksConfig.melody.rotate,
          opacity: normalized.config.extraTracksConfig.melody.opacity,
        },
        bass: {
          shape: normalized.config.extraTracksConfig.bass.shape,
          color: normalized.config.extraTracksConfig.bass.color,
          effect: normalized.config.extraTracksConfig.bass.effect,
          rotate: normalized.config.extraTracksConfig.bass.rotate,
          opacity: normalized.config.extraTracksConfig.bass.opacity,
        },
      },
    }));
  };

  // Expose OKF Programmatic API on window
  useEffect(() => {
    (window as any).applyOkfMusicogramaConfig = (jsonData: any) => {
      applyImportedJsonObject(jsonData);
    };
    (window as any).exportOkfMusicogramaProject = () => {
      return visualizerRef.current?.exportProject();
    };
    (window as any).startFullMusicogramaVideoCapture = () => {
      return visualizerRef.current?.startFullVideoCapture();
    };
  }, [okfProject, audioFile]);

  const handleJsonFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        applyImportedJsonObject(parsed);
        setShowPasteModal(false);
        setPastedJsonText("");
      } catch (err) {
        console.error(err);
        alert(
          "El archivo seleccionado no es un JSON válido. Verifique la sintaxis del archivo.",
        );
      }
    };
    reader.readAsText(file);
  };

  const handlePasteJsonConfirm = () => {
    if (!pastedJsonText.trim()) return;
    try {
      const cleaned = pastedJsonText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      applyImportedJsonObject(parsed);
      setShowPasteModal(false);
      setPastedJsonText("");
    } catch (err) {
      alert(
        "El texto pegado no es un bloque JSON válido. Asegúrese de copiar únicamente el objeto JSON.",
      );
    }
  };

  const handleProjectExport = () => {
    if (!visualizerRef.current) return;
    const data = visualizerRef.current.exportProject();
    if (!data) return;

    const saveJsonBlob = (payload: any) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (okfProject.metadata.title || "musicograma_okf")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      a.download = `proyecto_${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (audioFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const audioBase64 = e.target?.result as string;
        saveJsonBlob({
          ...data,
          audioBase64,
          audioType: audioFile.type,
          audioName: audioFile.name,
        });
      };
      reader.readAsDataURL(audioFile);
    } else {
      saveJsonBlob(data);
    }
  };

  const handleSphereGraphicUpload = (
    track: "main" | "melody" | "bass",
    file: File,
  ) => {
    if (!visualizerRef.current) return;
    const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      if (track === "main") {
        visualizerRef.current?.setBallConfig({
          shape: "custom-svg",
          svgContent: content,
        });
        setVState((prev) => ({ ...prev, ballShape: "custom-svg" }));
      } else {
        visualizerRef.current?.setExtraTrackConfig(track, {
          shape: "custom-svg",
          svgContent: content,
        });
        setVState((prev) => ({
          ...prev,
          extraTracksConfig: {
            ...prev.extraTracksConfig,
            [track]: {
              ...prev.extraTracksConfig[track],
              shape: "custom-svg",
            },
          },
        }));
      }
    };
    if (isSvg) reader.readAsText(file);
    else reader.readAsDataURL(file);
  };

  const totalSlicesCount =
    vState.bgImageCount || okfProject.config.mosaicSlices || 6;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-purple-500/30">
      {/* Hidden file inputs */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setAudioFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleJsonFileImport(f);
          e.target.value = "";
        }}
      />
      <input
        ref={batchImagesInputRef}
        type="file"
        accept=".svg,image/svg+xml,image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            visualizerRef.current?.replaceSlicesBatch(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Header */}
        <header className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-sky-500/20 border border-purple-500/30 rounded-2xl text-purple-400 shadow-lg">
              <Music className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                  Sonogramic OKF
                </h1>
                <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  100 % Vectorial SVG · Sin Zoom Pulse · OKF v1.4.0
                </span>
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                Reproductor y capturador de vídeo de musicogramas con{" "}
                <strong className="text-slate-200">
                  Escenografía Vectorial SVG Alineada 1:1 con los Trayectos
                </strong>{" "}
                (1 o varios SVGs).
              </p>
            </div>
          </div>

          {/* Primary Input Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => {
                copyToClipboard(OKF_MASTER_PROMPT_SNIPPET, "header-master-okf");
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Copiar el Prompt Maestro OKF v1.4.0 para generar el archivo .JSON con todos los SVGs integrados"
            >
              {copiedId === "header-master-okf" ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">¡Prompt Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Copiar Prompt Maestro OKF</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 text-xs font-medium transition-all cursor-pointer"
              title="Cargar un archivo .json desde su equipo o pegar directamente el código JSON generado"
            >
              <FileJson className="w-4 h-4 text-purple-400" />
              <span>1. Cargar / Pegar JSON</span>
            </button>

            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 text-sky-200 border border-sky-500/40 text-xs font-medium transition-all cursor-pointer"
              title="Subir archivo de audio (.mp3, .wav, .ogg) para sincronizar con el musicograma"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>
                {audioFile ? "Cambiar Audio" : "2. Subir Audio (Opcional)"}
              </span>
            </button>
          </div>
        </header>

        {/* Example OKF Recipes Selector Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold">Recetas JSON OKF de Ejemplo:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLE_OKF_PROJECTS.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  applyImportedJsonObject(ex.project);
                  setActiveExampleId(ex.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 ${
                  activeExampleId === ex.id
                    ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                }`}
              >
                <span>{ex.shortTitle}</span>
                <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded bg-black/25">
                  {ex.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Canvas Player & Video Capture Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Active Metadata Banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">
                    {okfProject.metadata.title}
                  </h2>
                  {okfProject.metadata.timeSignature && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                      Compás {okfProject.metadata.timeSignature} ·{" "}
                      {okfProject.metadata.bpm} BPM
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {okfProject.metadata.composer}{" "}
                  {okfProject.metadata.musicalPeriodOrGenre
                    ? `· ${okfProject.metadata.musicalPeriodOrGenre}`
                    : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {audioFile ? (
                  <span className="text-xs bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[160px]">
                      {audioFile.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    Modo JSON Autónomo (Síntesis Rítmica)
                  </span>
                )}
              </div>
            </div>

            {/* Visualizer Canvas */}
            <div className="relative">
              {vState.isAnalyzing && (
                <div className="absolute inset-0 z-20 flex border border-slate-700 bg-slate-900/85 backdrop-blur-sm rounded-2xl flex-col items-center justify-center p-6 text-center">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-base font-semibold text-slate-100">
                    Sincronizando frecuencias del audio con el JSON OKF...
                  </p>
                </div>
              )}
              <AudioVisualizer
                ref={visualizerRef}
                audioFile={audioFile}
                okfProject={okfProject}
                hideSvgButtons={hideSvgButtons}
                hidePlaybackBar={hidePlaybackBar}
                onToggleSvgButtons={() => setHideSvgButtons((v) => !v)}
                onTogglePlaybackBar={() => setHidePlaybackBar((v) => !v)}
                onStateChange={(newState) =>
                  setVState((prev) => ({ ...prev, ...newState }))
                }
              />
            </div>

            {/* Video Capture & Project Export Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              {/* Visibility Toggles for SVG Buttons & Playback Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Visibilidad en el Reproductor:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setHideSvgButtons((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      hideSvgButtons
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                    title="Ocultar o mostrar los botones de tramos y descarga SVG en el reproductor"
                  >
                    {hideSvgButtons ? (
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {hideSvgButtons
                        ? "Mostrar Botones SVG"
                        : "Ocultar Botones SVG"}
                    </span>
                  </button>

                  <button
                    onClick={() => setHidePlaybackBar((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      hidePlaybackBar
                        ? "bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                    title="Ocultar o mostrar la barra de reproducción inferior (cuando está oculta pueden hacer clic en el lienzo para reproducir/pausar)"
                  >
                    {hidePlaybackBar ? (
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {hidePlaybackBar
                        ? "Mostrar Barra de Reproducción"
                        : "Ocultar Barra de Reproducción"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() =>
                      visualizerRef.current?.startFullVideoCapture()
                    }
                    disabled={vState.isAnalyzing || vState.isRecording}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                    title="Rebobina al inicio, reproduce todo el musicograma y descarga automáticamente el vídeo al terminar"
                  >
                    <Film className="w-4 h-4" />
                    <span>
                      Capturar Musicograma Completo (Auto-Vídeo Inicio a Fin)
                    </span>
                  </button>

                  {!vState.isRecording ? (
                    <button
                      onClick={() => visualizerRef.current?.startRecording()}
                      disabled={vState.isAnalyzing}
                      className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/30 text-xs font-medium transition-all cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Grabar Tramo</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => visualizerRef.current?.stopRecording()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-semibold animate-pulse cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 bg-white rounded-xs" />
                      <span>Detener y Generar Vídeo</span>
                    </button>
                  )}

                  {vState.hasRecording && (
                    <button
                      onClick={() => visualizerRef.current?.exportVideo()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Vídeo (.webm)</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!hideSvgButtons && (
                    <>
                      <button
                        onClick={() =>
                          visualizerRef.current?.downloadMasterSvg()
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                        title="Descargar 1 único archivo .SVG panorámico con toda la obra y todos los trayectos exactos"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>1 SVG Completo</span>
                      </button>

                      <button
                        onClick={() =>
                          visualizerRef.current?.downloadAllSliceLayouts()
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                        title="Descargar los archivos .SVG detallados con trayectos exactos de todos los segmentos"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>SVGs por Tramo</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleProjectExport}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    title="Guardar proyecto completo (.json) con escenografía SVG y configuración"
                  >
                    <Save className="w-3.5 h-3.5 text-purple-400" />
                    <span>Guardar Proyecto (.json)</span>
                  </button>
                </div>
              </div>

              {/* Didactic Summary & Emotions */}
              {okfProject.metadata.pedagogicalObjectives &&
                okfProject.metadata.pedagogicalObjectives.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-purple-300">
                        Estructura Formal:
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
                        {okfProject.metadata.musicalForm || "Libre"}
                      </span>
                      {(okfProject.metadata.emotions || []).map((em, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        >
                          {em}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 italic">
                      «{okfProject.metadata.environmentConcept}»
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: Ajustes Panel Only (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
            {/* Single Tab Header: Ajustes */}
            <div className="border-b border-slate-800 bg-slate-950/60 p-1">
              <div className="py-2 px-3 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow flex items-center justify-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Ajustes</span>
              </div>
            </div>

            {/* Visual & Camera Controls (100% Zero-AI) */}
            <div className="p-4 space-y-4 max-h-[620px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-100">
                Cámara, Plataformas y Esferas (Sin IA)
              </h3>

              {/* Zoom Base */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-36">
                  Zoom Base ({vState.zoom.toFixed(2)}x)
                </span>
                <input
                  type="range"
                  min="0.68"
                  max="2.50"
                  step="0.02"
                  value={Math.max(0.68, vState.zoom)}
                  onChange={(e) => {
                    const val = Math.max(0.68, parseFloat(e.target.value));
                    visualizerRef.current?.setZoom(val);
                    setVState((prev) => ({ ...prev, zoom: val }));
                  }}
                  title="Tope mínimo en 0.68x (100 % de la altura del SVG de fondo, sin bandas negras superior ni inferior)"
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Smooth Dynamic Zoom Changes */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-36">
                  Cambios de Zoom ({Math.round(vState.zoomVariation * 100)}%)
                </span>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={vState.zoomVariation}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    visualizerRef.current?.setZoomVariation(val);
                    setVState((prev) => ({ ...prev, zoomVariation: val }));
                  }}
                  title="Regula el ámbito de los acercamientos y alejamientos suaves de cámara entre planos panorámicos y primeros planos (0% = zoom fijo, 150% = máximo contraste cinematográfico)"
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Platform Opacity */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-28">
                  Opacidad Plataformas (
                  {Math.round(vState.platformOpacity * 100)}%)
                </span>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={vState.platformOpacity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    visualizerRef.current?.setPlatformOpacity(val);
                    setVState((prev) => ({
                      ...prev,
                      platformOpacity: val,
                    }));
                  }}
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Vertical Offset */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-28">
                  Ajuste Vertical ({vState.bgOffsetY}px)
                </span>
                <input
                  type="range"
                  min="-1000"
                  max="1000"
                  step="10"
                  value={vState.bgOffsetY}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    visualizerRef.current?.setBgOffsetY(val);
                    setVState((prev) => ({ ...prev, bgOffsetY: val }));
                  }}
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Camera Smoothness */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-36">
                  Suavidad Cámara ({Math.round(vState.cameraSmoothness * 100)}
                  %)
                </span>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={vState.cameraSmoothness}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    visualizerRef.current?.setCameraSmoothness(val);
                    setVState((prev) => ({
                      ...prev,
                      cameraSmoothness: val,
                    }));
                  }}
                  title="0% = la cámara sigue rígidamente cada salto vertical de la esfera; 100% = cámara estabilizada en el horizonte panorámico y transiciones de zoom ultra suaves"
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Mosaic Slices Count */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-400 w-28">
                  Nº Segmentos ({totalSlicesCount})
                </span>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={totalSlicesCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    visualizerRef.current?.setMosaicSlices(val);
                  }}
                  className="flex-1 accent-purple-500"
                />
              </div>

              {/* Main Sphere Config */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 uppercase">
                    Esfera Principal
                  </span>
                  <label className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer">
                    Subir SVG / PNG
                    <input
                      type="file"
                      accept=".svg,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleSphereGraphicUpload("main", e.target.files[0]);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={vState.ballShape}
                    onChange={(e) => {
                      const val = e.target.value;
                      visualizerRef.current?.setBallConfig({ shape: val });
                      setVState((prev) => ({ ...prev, ballShape: val }));
                    }}
                    className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700"
                  >
                    <option value="custom-svg">
                      Icono SVG / Imagen del JSON
                    </option>
                    <option value="circle">Círculo</option>
                    <option value="square">Cuadrado</option>
                    <option value="hexagon">Hexágono</option>
                    <option value="star">Estrella</option>
                    <option value="music-note">Nota Musical</option>
                  </select>

                  <select
                    value={vState.ballEffect}
                    onChange={(e) => {
                      const val = e.target.value;
                      visualizerRef.current?.setBallConfig({ effect: val });
                      setVState((prev) => ({ ...prev, ballEffect: val }));
                    }}
                    className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700"
                  >
                    <option value="glow">Brillo y Estela</option>
                    <option value="outline">Borde Minimalista</option>
                    <option value="none">Sin Efecto</option>
                  </select>
                </div>
              </div>

              {/* Auxiliary Spheres (Melody & Bass) */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <span className="text-xs font-bold text-purple-300 uppercase block">
                  Esferas Auxiliares (Melodía y Bajo)
                </span>

                {(["melody", "bass"] as const).map((track) => (
                  <div
                    key={track}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        {track === "melody"
                          ? "🎵 Pista Melodía (Agudos)"
                          : "🎸 Pista Bajo (Graves)"}
                      </span>
                      <label className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 cursor-pointer">
                        Subir SVG / PNG
                        <input
                          type="file"
                          accept=".svg,image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleSphereGraphicUpload(
                                track,
                                e.target.files[0],
                              );
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={
                          vState.extraTracksConfig[track]?.shape || "circle"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          visualizerRef.current?.setExtraTrackConfig(track, {
                            shape: val,
                          });
                          setVState((prev) => ({
                            ...prev,
                            extraTracksConfig: {
                              ...prev.extraTracksConfig,
                              [track]: {
                                ...prev.extraTracksConfig[track],
                                shape: val,
                              },
                            },
                          }));
                        }}
                        className="flex-1 text-xs bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700"
                      >
                        <option value="custom-svg">SVG / Imagen</option>
                        <option value="circle">Círculo</option>
                        <option value="square">Cuadrado</option>
                        <option value="hexagon">Hexágono</option>
                        <option value="star">Estrella</option>
                        <option value="music-note">Nota Musical</option>
                      </select>

                      <input
                        type="color"
                        value={
                          vState.extraTracksConfig[track]?.color || "#ffffff"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          visualizerRef.current?.setExtraTrackConfig(track, {
                            color: val,
                          });
                          setVState((prev) => ({
                            ...prev,
                            extraTracksConfig: {
                              ...prev.extraTracksConfig,
                              [track]: {
                                ...prev.extraTracksConfig[track],
                                color: val,
                              },
                            },
                          }));
                        }}
                        className="w-7 h-7 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Mandatory Attribution (AGPL-3.0 Sec 7b / CC BY-SA 4.0) */}
        <footer className="w-full mt-12 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
          <p>
            <strong className="text-slate-200">Sonogramic (OKF v1.4.0)</strong>{" "}
            — Creado por{" "}
            <a
              href="https://github.com/nmarafo"
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:underline font-medium"
            >
              Norberto Martín Afonso
            </a>
            .
          </p>
          <p className="text-[11px] text-slate-500 max-w-3xl mx-auto">
            Distribuido bajo licencia{" "}
            <a
              href="https://github.com/nmarafo/Sonogramic/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 underline"
            >
              GNU Affero General Public License v3.0 (AGPL-3.0-or-later, Sección
              7b)
            </a>{" "}
            y{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.es"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 underline"
            >
              Creative Commons CC BY-SA 4.0
            </a>
            .
          </p>
        </footer>
      </div>

      {/* Modal to Load File or Paste Raw JSON OKF */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Cargar o Pegar JSON OKF del Musicograma
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Opción 1: Cargar archivo .JSON desde el equipo */}
            <div className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-purple-200">
                  Opción A · Cargar archivo .JSON desde su equipo
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seleccionen un archivo <code className="text-slate-300">.json</code> guardado en su ordenador (con los SVGs integrados).
                </p>
              </div>
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-md shadow-purple-600/20 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo .JSON</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                o bien
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>

            {/* Opción 2: Pegar código JSON directamente */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold text-sky-200">
                    Opción B · Pegar el código JSON directamente
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Peguen aquí el bloque JSON devuelto por su asistente tras usar el Prompt Maestro OKF:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setPastedJsonText(text);
                      } catch {
                        // Ignore clipboard permission errors
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-200 border border-sky-500/40 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-sky-400" />
                    <span>Pegar del Portapapeles</span>
                  </button>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        OKF_MASTER_PROMPT_SNIPPET,
                        "modal-master-okf",
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === "modal-master-okf" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Prompt Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Copiar Prompt Maestro OKF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <textarea
                value={pastedJsonText}
                onChange={(e) => setPastedJsonText(e.target.value)}
                placeholder='{\n  "okfVersion": "1.4.0",\n  "metadata": { ... }\n}'
                className="w-full h-56 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteJsonConfirm}
                disabled={!pastedJsonText.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer transition-all"
              >
                Cargar JSON Pegado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
