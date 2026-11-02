import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Video,
  Download,
  Music,
  Save,
  FileJson,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Check,
  LayoutGrid,
  Play,
  Palette,
  BookOpen,
  Film,
  Layers,
  ClipboardPaste,
} from "lucide-react";
import {
  AudioVisualizer,
  AudioVisualizerHandle,
} from "./components/AudioVisualizer";
import { OkfMusicogramaProject } from "./types/okf";
import { EXAMPLE_OKF_PROJECTS } from "./data/exampleProjects";

const OKF_MASTER_PROMPT_SNIPPET = `Actúas como un Musicólogo Analista, Pedagogo Musical, Ilustrador Vectorial SVG y Arquitecto Oficial del Estándar OKF (v1.4.0) para la aplicación Sonogramic (https://github.com/nmarafo/Sonogramic), creada por Norberto Martín Afonso. Dirígete siempre a las personas usuarias empleando la norma culta de Canarias con el pronombre «ustedes».

TAREA PRINCIPAL:
1. Escucha y analiza de principio a fin el ARCHIVO DE AUDIO adjunto.
2. Genera el objeto JSON válido que siga el esquema oficial de Sonogramic para construir su musicograma interactivo con escenografía 100 % vectorial SVG alineada matemáticamente con los trayectos.
3. PROTOCOLO OKF DE ESCENOGRAFÍA VECTORIAL SVG ALINEADA CON LOS TRAYECTOS (CERO MAPAS DE BITS):
   - Queda descartada la generación de imágenes de mapa de bits (.png / .jpg / DALL-E / Imagen 3). Toda la escenografía se construye mediante uno o varios SVGs vectoriales detallados cuyos puentes, barandillas, rampas, pilares, arcos y pentagramas coinciden exactamente con las coordenadas físicas de las plataformas y trayectorias de las esferas.
   - OPCIÓN A (Varios SVGs detallados por sección musical, "config.svgMode": "segments"):
     En cada "sliceSpecs[i]", define "svgTheme" ("baroque", "cavern", "canarias", "carnival" o "symphonic"), "recommendedPalette" (4 colores hex), "trajectoryWaypoints" (puntos [{ "time": seg, "y": px }] en el rango [-280, +220] que esculpen el contorno exacto del tramo) y "backgroundSvg" con un escenario vectorial "<svg viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg'>...</svg>" multicapa sin pulsos de escala. El compilador vectorial de Sonogramic ensamblará cada SVG en coordenadas exactas del mundo (viewBox="\${sliceMinX} -960 \${sliceWidth} 1600") haciendo coincidir al milímetro cada puente, rampa, arco parabólico y pilar con el trayecto real de las 3 esferas.
   - OPCIÓN B (Un único SVG panorámico maestro para toda la obra, "config.svgMode": "single", "config.mosaicSlices": 1):
     Unifica toda la partitura visual desde 0 s hasta "durationSeconds" en un solo SVG panorámico continuo donde todos los tramos y puentes forman una única ilustración vectorial continua.
4. PROHIBICIÓN ESTRICTA DE ZOOMS TIPO PULSE:
   - NO incluyas efectos de zoom rítmico ("zooms tipo pulse") en los pulsos musicales ni animaciones "<animate attributeName='r'>" o "<animateTransform type='scale'>" en los cursores SVG. El zoom de cámara se mantiene 100 % estable y las animaciones SVG de los cursores deben usar únicamente rotación suave o traslación interna sin alterar su escala.

INSTRUCCIONES DE ANÁLISIS DEL AUDIO ADJUNTO:
1. Detecta la duración total exacta del audio en segundos ("durationSeconds"), el tempo real en pulsos por minuto ("bpm"), el compás ("timeSignature") y la estructura formal por secciones ("musicalForm").
2. Extrae el carácter emocional ("emotions"), la instrumentación o letra clave, y diseña un concepto de escenario vectorial continuo ("environmentConcept") acorde a la música.
3. Divide la pista de audio en entre 4 y 8 secciones ("sliceSpecs") que coincidan con los cambios reales de sección musical en el audio (indicando "startTime" y "endTime" exactos en segundos).
4. Para cada sección en "sliceSpecs", incluye:
   - "didacticNote": qué ocurre musicalmente en ese tramo del audio (entradas instrumentales, cambios de dinámica f/p, ritmo, melodía).
   - "svgTheme": tema arquitectónico vectorial ("baroque", "cavern", "canarias", "carnival" o "symphonic").
   - "trajectoryWaypoints": array de puntos [{ "time": seg, "y": px }] (con y entre -280 y +220, iniciando y terminando en y: 0 en las fronteras de sección) para guiar con precisión matemática el dibujo de puentes y rampas.
   - "imagePrompt": especificación técnica de los elementos vectoriales SVG (puentes, arcos, ornamentos y relieve) que coinciden con el trayecto de las esferas en este segmento.
   - "recommendedPalette": array de 4 colores hexadecimales acordes a la atmósfera de la sección.
   - "generatedByAgent": true.
   - "backgroundSvg": código XML "<svg viewBox='0 0 1024 1024' width='1024' height='1024' xmlns='http://www.w3.org/2000/svg'>...</svg>" con la atmósfera vectorial multicapa del segmento.
5. En "config", incluye dentro de "ballConfig" (esfera principal), "extraTracksConfig.melody" (registro agudo) y "extraTracksConfig.bass" (registro grave) la propiedad "shape": "custom-svg" con un código XML "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>...</svg>" detallado y sin animaciones de escala tipo pulse.
6. En "musicalStructure.sections", detalla cada sección temporal del audio desde el segundo 0 hasta el final con su foco ("melody", "bass" o "tutti"), energía relativa (0.5 a 3.5), subdivisión rítmica (0.5, 1 o 2), contorno melódico ("ascending", "descending", "arch", "valley", "wave", "staccato_jumps", "sustained_ramp") y estilo de plataforma ("major", "minor", "accelerator", "friction").`;

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [okfProject, setOkfProject] = useState<OkfMusicogramaProject>(
    EXAMPLE_OKF_PROJECTS[0].project,
  );
  const [activeExampleId, setActiveExampleId] = useState<string>(
    EXAMPLE_OKF_PROJECTS[0].id,
  );
  const [completedSteps, setCompletedSteps] = useState<{
    [step: number]: boolean;
  }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "guide" | "slices" | "controls" | "okf-prompt"
  >("guide");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState("");

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
      guideSteps:
        inputData.guideSteps && inputData.guideSteps.length > 0
          ? inputData.guideSteps
          : EXAMPLE_OKF_PROJECTS[0].project.guideSteps,
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
    setCompletedSteps({});

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

  const executeStepAction = (action?: string) => {
    if (!action || action === "none") return;
    if (action === "upload_audio") {
      audioInputRef.current?.click();
    } else if (action === "download_layouts") {
      visualizerRef.current?.downloadAllSliceLayouts();
    } else if (action === "upload_batch_images") {
      batchImagesInputRef.current?.click();
    } else if (action === "preview_playback") {
      visualizerRef.current?.play();
    } else if (action === "record_full_video") {
      visualizerRef.current?.startFullVideoCapture();
    } else if (action === "export_project_json") {
      handleProjectExport();
    }
  };

  const readySlicesCount = (vState.bgReadySlices || []).filter(Boolean).length;
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
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 text-xs font-medium transition-all cursor-pointer"
              title="Cargar archivo .json con las indicaciones, pasos y estructura del musicograma"
            >
              <FileJson className="w-4 h-4 text-purple-400" />
              <span>1. Cargar JSON OKF</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
              title="Pegar directamente el código JSON generado con el Prompt Maestro OKF"
            >
              <ClipboardPaste className="w-4 h-4 text-sky-400" />
              <span>Pegar JSON</span>
            </button>

            <button
              onClick={() => batchImagesInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 text-xs font-medium transition-all cursor-pointer"
              title="Subir uno o varios archivos .svg personalizados para los tramos del musicograma"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>
                2. Subir SVGs ({readySlicesCount}/{totalSlicesCount})
              </span>
            </button>

            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 text-sky-200 border border-sky-500/40 text-xs font-medium transition-all cursor-pointer"
              title="Subir archivo de audio (.mp3, .wav, .ogg) para sincronizar con el musicograma"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>
                {audioFile ? "Cambiar Audio" : "3. Subir Audio (Opcional)"}
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
                onStateChange={(newState) =>
                  setVState((prev) => ({ ...prev, ...newState }))
                }
              />
            </div>

            {/* Video Capture & Project Export Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
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
                  <button
                    onClick={() => visualizerRef.current?.downloadMasterSvg()}
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

          {/* Right Column: Interactive OKF Panel (Guide Steps, Slices & Images, Controls, OKF Prompt) (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
            {/* Tabs Navigation */}
            <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
              <button
                onClick={() => setActiveTab("guide")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "guide"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pasos ({okfProject.guideSteps?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("slices")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "slices"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  SVGs ({readySlicesCount}/{totalSlicesCount})
                </span>
              </button>

              <button
                onClick={() => setActiveTab("controls")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "controls"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Ajustes</span>
              </button>

              <button
                onClick={() => setActiveTab("okf-prompt")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "okf-prompt"
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Prompt OKF</span>
              </button>
            </div>

            {/* Tab 1: Guide Steps from the JSON */}
            {activeTab === "guide" && (
              <div className="p-4 space-y-3 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100">
                    Indicaciones y Pasos del JSON OKF
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Marquen cada paso al completarlo
                  </span>
                </div>

                {(okfProject.guideSteps || []).map((gs) => {
                  const isDone = !!completedSteps[gs.step];
                  return (
                    <div
                      key={gs.step}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDone
                          ? "bg-emerald-950/25 border-emerald-500/40"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) =>
                            setCompletedSteps((prev) => ({
                              ...prev,
                              [gs.step]: e.target.checked,
                            }))
                          }
                          className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-500 cursor-pointer"
                        />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-100">
                              Paso {gs.step}: {gs.title}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                              {gs.phase}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {gs.instruction}
                          </p>
                          {gs.didacticTip && (
                            <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                              💡 {gs.didacticTip}
                            </p>
                          )}
                          {gs.targetAction && gs.targetAction !== "none" && (
                            <div className="pt-1">
                              <button
                                onClick={() => {
                                  executeStepAction(gs.targetAction);
                                  setCompletedSteps((prev) => ({
                                    ...prev,
                                    [gs.step]: true,
                                  }));
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-medium transition-colors cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Ejecutar acción del Paso {gs.step}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Slices & Trajectory-Aligned SVG Management */}
            {activeTab === "slices" && (
              <div className="p-4 space-y-3 max-h-[620px] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      Escenografía Vectorial SVG Alineada con los Trayectos
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cada puente, rampa, barandilla y arco en el SVG coincide
                      exactamente (1:1) con el trayecto físico de las esferas.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() =>
                        visualizerRef.current?.setMosaicSlices(
                          totalSlicesCount === 1
                            ? okfProject.sliceSpecs?.length || 6
                            : 1,
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 text-sky-200 border border-sky-500/40 text-xs font-medium cursor-pointer"
                      title="Alternar entre 1 único SVG panorámico para toda la obra o múltiples SVGs por sección musical"
                    >
                      {totalSlicesCount === 1
                        ? `Cambiar a ${okfProject.sliceSpecs?.length || 6} SVGs por Sección`
                        : "Unificar en 1 SVG Panorámico"}
                    </button>
                    <button
                      onClick={() =>
                        visualizerRef.current?.restoreOkfBackgrounds()
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-medium cursor-pointer"
                      title="Recompilar y restaurar los SVGs vectoriales alineados con los trayectos del JSON OKF"
                    >
                      ✨ Recompilar SVGs OKF
                    </button>
                    <button
                      onClick={() => batchImagesInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir SVGs</span>
                    </button>
                  </div>
                </div>

                {Array.from({ length: totalSlicesCount }).map((_, idx) => {
                  const spec = okfProject.sliceSpecs?.[idx];
                  const isReady = vState.bgReadySlices?.[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                        isReady
                          ? "bg-emerald-950/20 border-emerald-500/40"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            if (spec)
                              visualizerRef.current?.seekTo(spec.startTime);
                          }}
                          className="text-left text-xs font-bold text-slate-100 hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          {totalSlicesCount === 1
                            ? `Escenario Panorámico Único · ${okfProject.metadata.title}`
                            : spec?.title || `Segmento ${idx + 1}`}
                        </button>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isReady
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isReady
                            ? "✒️ SVG Alineado 1:1"
                            : "📐 Pendiente"}
                        </span>
                      </div>

                      {spec && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-sky-300 font-mono">
                            <span>
                              ⏱{" "}
                              {totalSlicesCount === 1
                                ? `0s – ${okfProject.metadata.durationSeconds}s`
                                : `${spec.startTime}s – ${spec.endTime}s`}
                            </span>
                            <span>· {spec.musicalSection}</span>
                            {spec.dynamicsAndTempo && (
                              <span>· {spec.dynamicsAndTempo}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300">
                            {spec.didacticNote}
                          </p>
                          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-400 font-mono leading-relaxed">
                            <span className="text-purple-400 font-semibold">
                              Arquitectura SVG del Trayecto:{" "}
                            </span>
                            {spec.imagePrompt}
                          </div>
                        </>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-medium cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {isReady ? "Sustituir SVG" : "Subir SVG"}
                          </span>
                          <input
                            type="file"
                            accept=".svg,image/svg+xml,image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                visualizerRef.current?.replaceSlice(
                                  idx,
                                  e.target.files[0],
                                );
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>

                        <button
                          onClick={() =>
                            visualizerRef.current?.downloadSliceLayout(idx)
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                          title="Descargar el archivo .SVG vectorial detallado de este tramo con puentes y trayectos exactos"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar SVG Exacto</span>
                        </button>

                        {spec?.imagePrompt && (
                          <button
                            onClick={() =>
                              copyToClipboard(
                                spec.imagePrompt,
                                `slice-prompt-${idx}`,
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                          >
                            {copiedId === `slice-prompt-${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">
                                  Copiado
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Indicación</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Visual & Camera Controls (100% Zero-AI) */}
            {activeTab === "controls" && (
              <div className="p-4 space-y-4 max-h-[620px] overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-100">
                  Cámara, Plataformas y Esferas (Sin IA)
                </h3>

                {/* Zoom */}
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs font-medium text-slate-400 w-28">
                    Zoom ({vState.zoom.toFixed(2)}x)
                  </span>
                  <input
                    type="range"
                    min="0.25"
                    max="1.25"
                    step="0.05"
                    value={vState.zoom}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      visualizerRef.current?.setZoom(val);
                      setVState((prev) => ({ ...prev, zoom: val }));
                    }}
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
                  <span className="text-xs font-medium text-slate-400 w-28">
                    Suavidad Cámara ({Math.round(vState.cameraSmoothness * 100)}
                    %)
                  </span>
                  <input
                    type="range"
                    min="0.0"
                    max="0.98"
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
                            handleSphereGraphicUpload(
                              "main",
                              e.target.files[0],
                            );
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
            )}

            {/* Tab 4: OKF Master Prompt & Schema Info */}
            {activeTab === "okf-prompt" && (
              <div className="p-4 space-y-3 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100">
                    Prompt Maestro OKF (Generar JSON Externamente)
                  </h3>
                  <button
                    onClick={() =>
                      copyToClipboard(OKF_MASTER_PROMPT_SNIPPET, "master-okf")
                    }
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === "master-okf" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Prompt OKF</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Copien este prompt en cualquier asistente externo (NotebookLM,
                  Gemini, Claude, ChatGPT) para generar el{" "}
                  <strong className="text-white">archivo .JSON</strong> de
                  cualquier obra musical con sus pasos, segmentos e iconos SVG,
                  y péguenlo aquí con el botón{" "}
                  <strong className="text-sky-300">«Pegar JSON»</strong>.
                </p>

                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {OKF_MASTER_PROMPT_SNIPPET}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Mandatory Attribution (AGPL-3.0 Sec 7b / CC BY-SA 4.0) */}
        <footer className="w-full mt-12 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
          <p>
            <strong className="text-slate-200">Sonogramic (OKF v1.3.0)</strong>{" "}
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

      {/* Modal to Paste Raw JSON OKF */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Pegar JSON OKF del Musicograma
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Peguen aquí el bloque JSON generado siguiendo el estándar OKF de
              Sonogramic:
            </p>
            <textarea
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder='{\n  "okfVersion": "1.3.0",\n  "metadata": { ... }\n}'
              className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteJsonConfirm}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white cursor-pointer"
              >
                Cargar Musicograma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
