import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Play,
  Pause,
  Download,
  Upload,
  LayoutGrid,
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { OkfMusicogramaProject, OkfSliceSpec } from "../types/okf";
import {
  compileDetailedSliceSvg,
  compileFullMasterSvg,
  TrajectoryCompilerInput,
} from "../utils/svgTrajectoryCompiler";

export interface AudioVisualizerHandle {
  play: () => Promise<void>;
  pause: () => void;
  rewind: () => void;
  seekTo: (seconds: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  startFullVideoCapture: () => Promise<void>;
  exportVideo: () => void;
  downloadSliceLayout: (index: number) => void;
  downloadAllSliceLayouts: () => void;
  downloadMasterSvg: () => void;
  downloadSlice: (index: number) => void;
  replaceSlice: (index: number, file: File) => void;
  replaceSlicesBatch: (files: FileList | File[]) => void;
  restoreOkfBackgrounds: () => void;
  harmonizeAllSlicesColors: () => Promise<void>;
  setMosaicSlices: (count: number) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  setZoomVariation: (val: number) => void;
  setPlatformOpacity: (op: number) => void;
  setBgOffsetY: (offset: number) => void;
  getBgImagesCount: () => number;
  exportProject: () => any;
  setBallConfig: (config: any) => void;
  setCameraSmoothness: (val: number) => void;
  setExtraTrackConfig: (trackId: string, config: any) => void;
  setUserKeywords: (keywords: string) => void;
}

interface AudioVisualizerProps {
  audioFile: File | null;
  okfProject: OkfMusicogramaProject | null;
  hideSvgButtons?: boolean;
  hidePlaybackBar?: boolean;
  onToggleSvgButtons?: () => void;
  onTogglePlaybackBar?: () => void;
  onStateChange: (state: {
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
  }) => void;
}

const base64ToBlob = (base64Str: string, contentType = "image/jpeg") => {
  const base64Data = base64Str.includes(",")
    ? base64Str.split(",")[1]
    : base64Str;
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const stripSvgPulseZoomAnimations = (svgText: string): string => {
  if (!svgText.trim().startsWith("<svg")) return svgText;
  return svgText
    .replace(/<animate\b[^>]*\battributeName=["']r["'][^>]*>[\s\S]*?<\/animate>/gi, "")
    .replace(/<animate\b[^>]*\battributeName=["']r["'][^>]*\/?>/gi, "")
    .replace(/<animateTransform\b[^>]*\btype=["']scale["'][^>]*>[\s\S]*?<\/animateTransform>/gi, "")
    .replace(/<animateTransform\b[^>]*\btype=["']scale["'][^>]*\/?>/gi, "")
    .replace(/scale\([^)]+\)/gi, "scale(1)");
};

const preloadCustomGraphic = (
  content: string,
  callback: (img: HTMLImageElement, url: string) => void,
) => {
  if (!content) return;
  let url = content;
  let isBlobUrl = false;

  if (content.trim().startsWith("<svg")) {
    const cleanedSvg = stripSvgPulseZoomAnimations(content);
    const blob = new Blob([cleanedSvg], { type: "image/svg+xml" });
    url = URL.createObjectURL(blob);
    isBlobUrl = true;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.style.position = "absolute";
  img.style.left = "-1000px";
  img.style.top = "-1000px";
  img.style.width = "100px";
  img.style.height = "100px";
  img.style.pointerEvents = "none";
  img.style.zIndex = "-9999";

  img.onload = () => {
    document.body.appendChild(img);
    callback(img, isBlobUrl ? url : "");
  };
  img.onerror = () => {
    if (isBlobUrl) URL.revokeObjectURL(url);
  };
  img.src = url;
};

const svgStringToBlobUrl = (svgStr: string): string => {
  // Ensure scene SVGs contain zero <text> tags
  let normalizedSvg = svgStr
    .trim()
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, "")
    .replace(/<text\b[^>]*\/?>/gi, "");
  if (!normalizedSvg.includes("xmlns=")) {
    normalizedSvg = normalizedSvg.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }
  if (!normalizedSvg.includes("width=")) {
    normalizedSvg = normalizedSvg.replace(
      "<svg",
      '<svg width="1024" height="1024"',
    );
  }
  const blob = new Blob([normalizedSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
  return URL.createObjectURL(blob);
};

const createMountedSvgImage = (
  blobUrl: string,
  onReady: () => void,
): HTMLImageElement => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.style.position = "fixed";
  img.style.left = "-9999px";
  img.style.top = "-9999px";
  img.style.width = "64px";
  img.style.height = "64px";
  img.style.opacity = "0.01";
  img.style.pointerEvents = "none";
  img.style.zIndex = "-9999";
  img.onload = () => {
    let stage = document.getElementById("sonogramic-animated-svg-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "sonogramic-animated-svg-stage";
      stage.style.position = "fixed";
      stage.style.left = "-9999px";
      stage.style.top = "-9999px";
      stage.style.width = "1px";
      stage.style.height = "1px";
      stage.style.overflow = "hidden";
      stage.style.pointerEvents = "none";
      document.body.appendChild(stage);
    }
    stage.appendChild(img);
    onReady();
  };
  img.src = blobUrl;
  return img;
};

const buildImageElementFromOkfSlice = (
  spec: OkfSliceSpec,
  onReady: () => void,
): HTMLImageElement | null => {
  const rawSource = spec.imageUrl || spec.backgroundSvg;
  if (!rawSource || !rawSource.trim()) return null;

  let src = rawSource.trim();
  if (src.startsWith("<svg")) {
    src = svgStringToBlobUrl(src);
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => onReady();
  img.onerror = () => {
    if (
      spec.imageUrl &&
      spec.backgroundSvg &&
      spec.backgroundSvg.trim().startsWith("<svg") &&
      !img.dataset.fallbackApplied
    ) {
      img.dataset.fallbackApplied = "true";
      img.src = svgStringToBlobUrl(spec.backgroundSvg);
    }
  };
  img.src = src;
  return img;
};

const isMediaReady = (media: any) => {
  if (!media) return false;
  if (media instanceof HTMLVideoElement) {
    return media.readyState >= 2 && media.videoWidth > 0;
  }
  return media.complete && media.naturalWidth > 0;
};

export const AudioVisualizer = forwardRef<
  AudioVisualizerHandle,
  AudioVisualizerProps
>(
  (
    {
      audioFile,
      okfProject,
      hideSvgButtons = false,
      hidePlaybackBar = false,
      onToggleSvgButtons,
      onTogglePlaybackBar,
      onStateChange,
    },
    ref,
  ) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [slicesInfo, setSlicesInfo] = useState<{
    count: number;
    ready: boolean[];
  }>({ count: 0, ready: [] });

  const isPlayingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const autoExportOnStopRef = useRef(false);
  const recordedBlobRef = useRef<Blob | null>(null);
  const isAnalyzingRef = useRef(false);
  const emotionsRef = useRef<string[]>([]);
  const environmentConceptRef = useRef<string>("");
  const sliceSpecsRef = useRef<OkfSliceSpec[]>([]);

  // Virtual clock when playing JSON without an external audio file
  const virtualTimeRef = useRef<number>(0);
  const lastWallTimeRef = useRef<number>(0);
  const lastSynthBeatIdxRef = useRef<number>(-1);

  const userZoomRef = useRef<number>(0.85);
  const zoomVariationRef = useRef<number>(0.85);
  const platformOpacityRef = useRef<number>(0.85);
  const bgOffsetYRef = useRef<number>(0.0);
  const cameraSmoothnessRef = useRef<number>(0.82);
  const userKeywordsRef = useRef<string>("");
  const cameraPosRef = useRef<{ x: number; y: number } | null>(null);
  const cameraZoomRef = useRef<number | null>(null);

  const ballConfigRef = useRef({
    shape: "circle",
    color: "dynamic",
    effect: "glow",
    svgContent: "",
    rotate: true,
    opacity: 1.0,
  });

  const extraTracksConfigRef = useRef<any>({
    melody: {
      shape: "square",
      color: "#f59e0b",
      effect: "glow",
      svgContent: "",
      rotate: true,
      opacity: 1.0,
    },
    bass: {
      shape: "hexagon",
      color: "#8b5cf6",
      effect: "glow",
      svgContent: "",
      rotate: true,
      opacity: 1.0,
    },
  });

  const svgImageCacheRef = useRef<{ [key: string]: HTMLImageElement | null }>(
    {},
  );
  const svgUrlCacheRef = useRef<{ [key: string]: string }>({});
  const compiledSliceSvgsRef = useRef<string[]>([]);

  const analysisDataRef = useRef<{
    positions: {
      x: number;
      y: number;
      angle: number;
      isImpact?: boolean;
      zoom?: number;
    }[];
    platforms: {
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      type: "major" | "minor" | "accelerator" | "friction";
      time: number;
    }[];
    frames: number;
    duration: number;
    particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      type: "spark" | "spark-high" | "spark-low" | "trail";
    }[];
    extraTracks?: {
      id: string;
      positions: { x: number; y: number; angle: number; zoom?: number }[];
      platforms: { x: number; y: number; w: number; h: number; angle: number }[];
      color?: string;
      shape?: string;
    }[];
    bgImages?: (HTMLImageElement | HTMLVideoElement | null)[];
    bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  } | null>(null);

  const animationFrameIdRef = useRef<number>(0);
  const lastFrameIdxRef = useRef<number>(-1);
  const renderFrameRef = useRef<() => void>(() => {});
  const audioClockSyncRef = useRef<{
    lastElemTime: number;
    lastPerfTime: number;
  }>({ lastElemTime: -1, lastPerfTime: 0 });

  const audioFileRef = useRef<File | null>(audioFile);
  const audioUrlRef = useRef<string>("");
  const okfProjectRef = useRef<OkfMusicogramaProject | null>(okfProject);
  const onStateChangeRef = useRef(onStateChange);

  audioFileRef.current = audioFile;
  okfProjectRef.current = okfProject;
  onStateChangeRef.current = onStateChange;

  const contextRef = useRef<{
    audioCtx: AudioContext;
    dest: MediaStreamAudioDestinationNode;
    sourceConnected: boolean;
    mediaRecorder?: MediaRecorder;
    recorderMimeType?: string;
    chunks: Blob[];
  } | null>(null);

  const setAnalyzingState = (val: boolean) => {
    isAnalyzingRef.current = val;
    setIsAnalyzing(val);
  };

  const getValidAudioElementDuration = () => {
    const raw = audioRef.current?.duration;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
  };

  const updateState = (
    play: boolean = isPlayingRef.current,
    rec: boolean = isRecordingRef.current,
    hasRec: boolean = !!recordedBlobRef.current,
    analyzing: boolean = isAnalyzingRef.current,
  ) => {
    const readySlices =
      analysisDataRef.current?.bgImages?.map((img) => isMediaReady(img)) || [];

    setSlicesInfo({
      count: analysisDataRef.current?.bgImages?.length || 0,
      ready: readySlices,
    });

    const hasExternalAudio = !!(
      audioFileRef.current &&
      audioRef.current &&
      audioUrlRef.current
    );
    const currentTime = hasExternalAudio
      ? audioRef.current!.currentTime || 0
      : virtualTimeRef.current;

    const duration =
      (hasExternalAudio && getValidAudioElementDuration()) ||
      analysisDataRef.current?.duration ||
      0;

    onStateChangeRef.current({
      isPlaying: play,
      isRecording: rec,
      hasRecording: hasRec,
      isAnalyzing: analyzing,
      emotions: emotionsRef.current,
      environmentConcept: environmentConceptRef.current,
      bgImageCount: analysisDataRef.current?.bgImages?.length || 0,
      bgReadySlices: readySlices,
      currentTime,
      duration,
    });
  };

  // Build deterministic physics trajectory from beats + duration + OKF sections
  const simulatePhysicsFromBeats = (
    beats: {
      time: number;
      isMajorSectionShift: boolean;
      focus: "bass" | "melody";
      energy: number;
      zcr: number;
      explicitType?: "major" | "minor" | "accelerator" | "friction";
      contour?: string;
      audioY?: number;
      melodyOffset?: number;
      bassOffset?: number;
      holdMode?: "jump" | "ramp";
    }[],
    duration: number,
    mosaicSlicesCount: number,
    existingBgImages?: (HTMLImageElement | HTMLVideoElement | null)[],
  ) => {
    const fps = 60;
    const SPEED = 800;
    const GRAVITY = 2500;
    const radius = 20;
    const totalFrames = Math.ceil(duration * fps);

    const positions: {
      x: number;
      y: number;
      angle: number;
      isImpact?: boolean;
      zoom: number;
    }[] = [];
    const platforms: {
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      type: "major" | "minor" | "accelerator" | "friction";
      time: number;
    }[] = [];

    const allBeats: {
      time: number;
      type: "major" | "minor" | "accelerator" | "friction";
      mode: "jump" | "ramp";
      y: number;
      energy: number;
    }[] = [];

    let lastPhysTime = 0;
    let pY = 0;

    // Space beat anchors by at least ~1.35s (roughly one musical bar) and favor smooth glides ("ramp")
    // so the spheres perform graceful, unhurried phrases with occasional grand leaps instead of constant "saltitos"
    const filteredBeats: typeof beats = [];
    for (const b of beats) {
      if (filteredBeats.length === 0) {
        filteredBeats.push(b);
      } else {
        const prev = filteredBeats[filteredBeats.length - 1];
        if (b.time - prev.time < 1.35) {
          if (b.isMajorSectionShift || b.energy > prev.energy * 1.08) {
            filteredBeats[filteredBeats.length - 1] = b;
          }
        } else {
          filteredBeats.push(b);
        }
      }
    }

    // Start with a smooth glide ("ramp") along the entry viaduct
    const leadInMode: "jump" | "ramp" = "ramp";
    const initialY =
      filteredBeats.length > 0 && filteredBeats[0].audioY !== undefined
        ? Math.max(-180, Math.min(140, filteredBeats[0].audioY * 0.5))
        : 0;
    allBeats.push({
      time: 0,
      type: "minor",
      mode: leadInMode,
      y: initialY,
      energy: 1.0,
    });
    pY = initialY;

    for (let idx = 0; idx < filteredBeats.length; idx++) {
      const beat = filteredBeats[idx];
      const beatTime = beat.time;

      let type: "major" | "minor" | "accelerator" | "friction" =
        beat.explicitType || (beat.isMajorSectionShift ? "major" : "minor");
      if (!beat.explicitType) {
        if (beat.energy > 2.6) type = "accelerator";
        else if (beat.zcr > 2.6 && beat.focus === "melody") type = "friction";
      }

      // Deterministic micro-variation
      const detSin = Math.sin(idx * 1.73 + beatTime * 2.1);

      const specs = sliceSpecsRef.current || [];
      let sliceStartT = 0;
      let sliceEndT = duration;
      let activeSpec: OkfSliceSpec | undefined;

      if (specs.length > 0) {
        const matched = specs.find(
          (s) => beatTime >= s.startTime && beatTime <= s.endTime,
        );
        if (matched) {
          activeSpec = matched;
          sliceStartT = matched.startTime;
          sliceEndT = matched.endTime;
        } else {
          const sIdx = Math.min(
            specs.length - 1,
            Math.max(
              0,
              Math.floor((beatTime / Math.max(1, duration)) * specs.length),
            ),
          );
          activeSpec = specs[sIdx];
          sliceStartT =
            activeSpec?.startTime ?? (sIdx * duration) / specs.length;
          sliceEndT =
            activeSpec?.endTime ?? ((sIdx + 1) * duration) / specs.length;
        }
      } else {
        const sc = Math.max(1, mosaicSlicesCount || 6);
        const sIdx = Math.min(
          sc - 1,
          Math.max(0, Math.floor((beatTime / Math.max(1, duration)) * sc)),
        );
        sliceStartT = (sIdx * duration) / sc;
        sliceEndT = ((sIdx + 1) * duration) / sc;
      }

      const sliceSpan = Math.max(0.5, sliceEndT - sliceStartT);
      const uSlice = Math.max(
        0,
        Math.min(1, (beatTime - sliceStartT) / sliceSpan),
      );

      let macroYBeat = 0;
      if (
        activeSpec?.trajectoryWaypoints &&
        activeSpec.trajectoryWaypoints.length >= 2
      ) {
        const wps = activeSpec.trajectoryWaypoints;
        if (beatTime <= wps[0].time) {
          macroYBeat = wps[0].y;
        } else if (beatTime >= wps[wps.length - 1].time) {
          macroYBeat = wps[wps.length - 1].y;
        } else {
          for (let w = 0; w < wps.length - 1; w++) {
            if (beatTime >= wps[w].time && beatTime <= wps[w + 1].time) {
              const dtW = Math.max(0.01, wps[w + 1].time - wps[w].time);
              const fW = (beatTime - wps[w].time) / dtW;
              macroYBeat = wps[w].y + (wps[w + 1].y - wps[w].y) * fW;
              break;
            }
          }
        }
        macroYBeat += detSin * 18;
      } else if (beat.contour === "ascending") {
        macroYBeat = 160 - 360 * uSlice + detSin * 28;
      } else if (beat.contour === "descending") {
        macroYBeat = -220 + 380 * uSlice + detSin * 28;
      } else if (beat.contour === "sustained_ramp") {
        macroYBeat = -190 + 340 * uSlice + detSin * 14;
      } else if (beat.contour === "staccato_jumps") {
        const alt = idx % 2 === 0 ? -1 : 0.85;
        macroYBeat =
          alt * (90 * Math.min(beat.energy, 2.0)) +
          Math.sin(uSlice * Math.PI * 2) * 50;
      } else {
        const wave = Math.sin(uSlice * Math.PI * 2) * 150;
        const energyOffset = -(Math.min(beat.energy, 2.2) - 1.1) * 90;
        macroYBeat = wave + energyOffset + detSin * 30;
      }

      // When real audio elevation (audioY) is available, prioritize the real audio's dynamic terraces & pitch contour (75%) blended with the OKF macro contour (25%)
      const targetYBeat =
        beat.audioY !== undefined
          ? beat.audioY * 0.75 + macroYBeat * 0.25
          : macroYBeat;

      const nextYBeat = Math.max(
        -320,
        Math.min(260, pY * 0.14 + targetYBeat * 0.86),
      );

      // Default to smooth S-curve glides ("ramp") and reserve aerial parabolic leaps ("jump") ONLY for major musical accents
      // (~1 leap every 2.5 - 4.0 seconds), eliminating repetitive little hops ("saltitos")
      const isGrandAccentJump =
        beat.isMajorSectionShift ||
        ((beat.energy || 1.0) >= 1.34 && idx % 2 === 0) ||
        (idx % 3 === 0 && (beat.energy || 1.0) >= 1.02);
      const mode: "jump" | "ramp" =
        beat.holdMode === "ramp" || beat.contour === "sustained_ramp"
          ? "ramp"
          : isGrandAccentJump
            ? "jump"
            : "ramp";
      pY = nextYBeat;

      allBeats.push({
        time: beatTime,
        type,
        mode,
        y: pY,
        energy: beat.energy || 1.2,
      });
      lastPhysTime = beatTime;
    }

    allBeats.push({
      time: lastPhysTime + 0.12,
      type: "minor",
      mode: "ramp",
      y: pY,
      energy: 0.8,
    });

    allBeats.push({
      time: Math.max(lastPhysTime + 2.0, duration + 3.0),
      type: "minor",
      mode: "ramp",
      y: pY,
      energy: 0.5,
    });

    // Build Platforms
    for (let i = 0; i < allBeats.length; i++) {
      const b = allBeats[i];
      const px = b.time * SPEED;
      const py = b.y;

      if (b.mode === "ramp" && i < allBeats.length - 1) {
        const bNext = allBeats[i + 1];
        const nx = bNext.time * SPEED;
        const ny = bNext.y;
        const cx = (px + nx) / 2;
        const cy = (py + ny) / 2;
        const w = Math.hypot(nx - px, ny - py);
        const h = 20;
        const angle = Math.atan2(ny - py, nx - px);
        platforms.push({
          x: cx,
          y: cy,
          w,
          h,
          angle,
          type: b.type,
          time: b.time,
        });
      } else {
        const w =
          b.type === "major"
            ? 240
            : b.type === "accelerator"
              ? 300
              : 140 + Math.abs(Math.sin(i * 3.1)) * 65;
        const h = 20;
        platforms.push({
          x: px,
          y: py,
          w,
          h,
          angle: 0,
          type: b.type,
          time: b.time,
        });
      }
    }

    // Pre-simulate trajectory with smooth S-curve glides ("ramp") and wide parabolic arches on major accents ("jump")
    let currentBeatIdx = 0;
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / fps;

      let isImpact = false;
      while (
        currentBeatIdx < allBeats.length - 1 &&
        t >= allBeats[currentBeatIdx + 1].time
      ) {
        currentBeatIdx++;
        if (currentBeatIdx < allBeats.length - 2) {
          isImpact = true;
        }
      }

      const bStart = allBeats[currentBeatIdx];
      const bEnd =
        currentBeatIdx < allBeats.length - 1
          ? allBeats[currentBeatIdx + 1]
          : null;

      const px = t * SPEED;
      let py = 0;
      let jumpArcProgress = 0;

      if (bEnd) {
        const dT = Math.max(0.001, bEnd.time - bStart.time);
        const localT = Math.max(0, Math.min(dT, t - bStart.time));
        const u = localT / dT;

        const targetY0 = bStart.y - radius - 10;
        const targetY1 = bEnd.y - radius - 10;

        if (bStart.mode === "ramp") {
          const easeU = (1 - Math.cos(u * Math.PI)) * 0.5;
          py = targetY0 + (targetY1 - targetY0) * easeU;
        } else {
          jumpArcProgress = Math.sin(u * Math.PI);
          const deltaY = targetY1 - targetY0;
          const beatE = Math.min(3.2, Math.max(0.6, bStart.energy || 1.2));
          const durationScale = Math.min(1.42, Math.max(0.75, dT / 0.85));
          const bounceH = Math.min(
            210,
            Math.max(68, (56 + beatE * 36) * durationScale),
          );
          const c = 4 * bounceH + 1.5 * Math.abs(deltaY);
          const b = deltaY - c;
          py = targetY0 + b * u + c * u * u;
        }
      } else {
        const localT = Math.max(0, t - bStart.time);
        const targetY0 = bStart.y - radius - 10;
        py = targetY0 + 0.5 * GRAVITY * localT * localT;
      }

      // Wide, clearly noticeable yet smooth cinematic zoom multiplier [0.42x .. 1.85x]:
      // - Zooms IN (up to 1.85x) during intimate piano / low-energy solo phrases
      // - Zooms OUT (down to 0.42x) during grand forte / tutti passages, high registers, and aerial leaps
      // - Includes a continuous 8-second phrase breathing wave so zoom motion is always clearly appreciable
      const beatEnergy = bStart.energy || 1.2;
      const energyZoom = 1.62 - Math.min(1.9, Math.max(0.35, beatEnergy)) * 0.54;
      const altitudeZoomOffset = Math.max(-0.28, Math.min(0.26, (py + 90) / 720));
      const jumpZoomOut = -0.24 * jumpArcProgress;
      const phraseZoomWave =
        Math.sin(t * 0.78) * 0.36 + Math.cos(t * 0.34) * 0.22;
      const currentZoom = Math.max(
        0.42,
        Math.min(
          1.85,
          energyZoom + altitudeZoomOffset + jumpZoomOut + phraseZoomWave,
        ),
      );

      const angle = px / radius;
      positions.push({ x: px, y: py, angle, isImpact, zoom: currentZoom });
    }

    // Apply temporal smoothing (±18 frames = 0.6s window) to round beat transitions while preserving the full wide zoom range
    const smoothedZooms = new Float32Array(positions.length);
    const win = 18;
    for (let i = 0; i < positions.length; i++) {
      let zSum = 0;
      let zCnt = 0;
      const startK = Math.max(0, i - win);
      const endK = Math.min(positions.length - 1, i + win);
      for (let k = startK; k <= endK; k++) {
        zSum += positions[k].zoom;
        zCnt++;
      }
      smoothedZooms[i] = zSum / Math.max(1, zCnt);
    }
    for (let i = 0; i < positions.length; i++) {
      positions[i].zoom = smoothedZooms[i];
    }

    const getTerrainY = (time: number) => {
      if (time <= allBeats[0].time) return allBeats[0].y;
      if (time >= allBeats[allBeats.length - 1].time)
        return allBeats[allBeats.length - 1].y;

      let bStart = allBeats[0];
      let bEnd = allBeats[allBeats.length - 1];
      for (let i = 0; i < allBeats.length - 1; i++) {
        if (time >= allBeats[i].time && time <= allBeats[i + 1].time) {
          bStart = allBeats[i];
          bEnd = allBeats[i + 1];
          break;
        }
      }
      const dT = bEnd.time - bStart.time;
      if (dT <= 0) return bStart.y;
      return bStart.y + (bEnd.y - bStart.y) * ((time - bStart.time) / dT);
    };

    const buildAuxTrack = (trackYOffset: number, id: string, freqMul: number) => {
      const mPositions: any[] = [];
      const mPlatforms: any[] = [];
      const mAllBeats: {
        time: number;
        y: number;
        mode: "jump" | "ramp";
        energy: number;
      }[] = [
        {
          time: 0,
          y: getTerrainY(0) + trackYOffset,
          mode: "ramp",
          energy: 1.0,
        },
      ];

      for (let idx = 0; idx < filteredBeats.length; idx++) {
        const mb = filteredBeats[idx];
        const terrainY = getTerrainY(mb.time);
        const realTrackOffset =
          id === "melody" && mb.melodyOffset !== undefined
            ? mb.melodyOffset
            : id === "bass" && mb.bassOffset !== undefined
              ? mb.bassOffset
              : Math.sin(idx * freqMul) * 52 * Math.min(mb.energy, 2.2);
        // Auxiliary spheres (melody & bass) glide smoothly in continuous S-curves ("ramp"), only arching at major section shifts
        const auxMode: "jump" | "ramp" = mb.isMajorSectionShift
          ? "jump"
          : "ramp";
        mAllBeats.push({
          time: mb.time,
          y: terrainY + trackYOffset + realTrackOffset,
          mode: auxMode,
          energy: mb.energy || 1.1,
        });
      }
      mAllBeats.push({
        time: lastPhysTime + 0.12,
        y: getTerrainY(lastPhysTime) + trackYOffset,
        mode: "ramp",
        energy: 0.7,
      });
      mAllBeats.push({
        time: Math.max(lastPhysTime + 2.0, duration + 3.0),
        y: getTerrainY(duration + 3.0) + trackYOffset,
        mode: "ramp",
        energy: 0.5,
      });

      for (let i = 0; i < mAllBeats.length - 1; i++) {
        const b = mAllBeats[i];
        const nextB = mAllBeats[i + 1];
        const px = b.time * SPEED;
        const nx = nextB.time * SPEED;
        const py = b.y;
        const ny = nextB.y;

        const cx = (px + nx) / 2;
        const cy = (py + ny) / 2;
        const w = Math.hypot(nx - px, ny - py);
        const h = 20;
        const angle = Math.atan2(ny - py, nx - px);

        mPlatforms.push({ x: cx, y: cy, w, h, angle });
      }

      let currentBeatIdxM = 0;
      for (let frame = 0; frame < totalFrames; frame++) {
        const t = frame / fps;
        while (
          currentBeatIdxM < mAllBeats.length - 1 &&
          t >= mAllBeats[currentBeatIdxM + 1].time
        ) {
          currentBeatIdxM++;
        }
        const bStart = mAllBeats[currentBeatIdxM];
        const bEnd =
          currentBeatIdxM < mAllBeats.length - 1
            ? mAllBeats[currentBeatIdxM + 1]
            : null;

        const px = t * SPEED;
        let py = 0;
        if (bEnd) {
          const dT = Math.max(0.001, bEnd.time - bStart.time);
          const localT = Math.max(0, Math.min(dT, t - bStart.time));
          const u = localT / dT;
          const targetY0 = bStart.y - radius - 10;
          const targetY1 = bEnd.y - radius - 10;
          if (bStart.mode === "ramp") {
            const easeU = (1 - Math.cos(u * Math.PI)) * 0.5;
            py = targetY0 + (targetY1 - targetY0) * easeU;
          } else {
            const deltaY = targetY1 - targetY0;
            const bounceH = Math.min(
              96,
              Math.max(32, (26 + (bStart.energy || 1.0) * 18) * Math.min(1.25, Math.max(0.65, dT / 0.58))),
            );
            const c = 4 * bounceH + 1.45 * Math.abs(deltaY);
            const b = deltaY - c;
            py = targetY0 + b * u + c * u * u;
          }
        } else {
          py = bStart.y - radius - 10;
        }
        mPositions.push({
          x: px,
          y: py,
          angle: px / radius,
          isImpact: false,
          zoom: 1.0,
        });
      }

      return { positions: mPositions, platforms: mPlatforms, id };
    };

    const extraTracks = [
      buildAuxTrack(-160, "melody", 2.3),
      buildAuxTrack(160, "bass", 1.4),
    ];

    const minX = 0;
    const maxX = duration * SPEED;
    const minY = -960;
    const maxY = 640;

    const slicesCount = Math.max(1, mosaicSlicesCount || 6);
    const bgImages: (HTMLImageElement | HTMLVideoElement | null)[] = new Array(
      slicesCount,
    ).fill(null);
    if (existingBgImages) {
      for (let i = 0; i < Math.min(slicesCount, existingBgImages.length); i++) {
        bgImages[i] = existingBgImages[i];
      }
    }

    analysisDataRef.current = {
      positions,
      platforms,
      extraTracks,
      frames: totalFrames,
      duration,
      particles: [],
      bgImages,
      bounds: { minX, maxX, minY, maxY },
    };

    compileAndAssignAlignedSvgs(slicesCount, !existingBgImages);
  };

  // Generate beats directly from the OKF JSON musicalStructure (when no audio file is loaded yet)
  const buildTrajectoryFromOkfJson = (project: OkfMusicogramaProject) => {
    const duration = project.metadata?.durationSeconds || 90;
    const baseBpm = project.metadata?.bpm || 116;
    const slicesCount =
      project.config?.svgMode === "single"
        ? 1
        : project.config?.mosaicSlices || project.sliceSpecs?.length || 6;

    // If the JSON already contains pre-calculated positions/platforms (saved full project), restore them
    if (
      project.data &&
      project.data.positions &&
      project.data.positions.length > 0 &&
      project.data.platforms
    ) {
      const d = project.data;
      const newBgImages: (HTMLImageElement | HTMLVideoElement | null)[] =
        new Array(slicesCount).fill(null);

      let hasSavedBg = false;
      if (d.bgSvgs && d.bgSvgs.length > 0) {
        compiledSliceSvgsRef.current = [...d.bgSvgs];
        d.bgSvgs.forEach((svgStr: string, index: number) => {
          if (!svgStr || index >= slicesCount) return;
          const blobUrl = svgStringToBlobUrl(svgStr);
          if (blobUrl) {
            hasSavedBg = true;
            const img = new Image();
            img.onload = () => updateState();
            img.src = blobUrl;
            newBgImages[index] = img;
          }
        });
      } else if (d.bgImagesBase64 && d.bgImagesBase64.length > 0) {
        d.bgImagesBase64.forEach((b64: string, index: number) => {
          if (!b64 || index >= slicesCount) return;
          hasSavedBg = true;
          const img = new Image();
          img.onload = () => updateState();
          try {
            const blob = base64ToBlob(b64);
            img.src = URL.createObjectURL(blob);
          } catch {
            img.src = b64;
          }
          newBgImages[index] = img;
        });
      }

      // Ensure saved positions carry a smooth dynamic zoom curve if legacy positions had constant 1.0
      const normalizedPositions = d.positions.map((p: any, idx: number) => {
        const t = idx / 60;
        const hasCustomZoom =
          typeof p.zoom === "number" && Math.abs(p.zoom - 1.0) > 0.01;
        const synthZoom = Math.max(
          0.45,
          Math.min(
            1.8,
            1.05 +
              Math.sin(t * 0.78) * 0.38 +
              Math.cos(t * 0.34) * 0.22 +
              ((p.y || 0) + 90) / 800,
          ),
        );
        return {
          ...p,
          zoom: hasCustomZoom ? p.zoom : synthZoom,
        };
      });

      analysisDataRef.current = {
        positions: normalizedPositions,
        platforms: d.platforms as any,
        extraTracks: d.extraTracks || [],
        duration: d.duration || duration,
        frames: d.frames || Math.ceil(duration * 60),
        bounds: d.bounds || { minX: 0, maxX: duration * 800, minY: -960, maxY: 640 },
        particles: [],
        bgImages: newBgImages,
      };
      compileAndAssignAlignedSvgs(slicesCount, !hasSavedBg);
      updateState();
      return;
    }

    const beats: {
      time: number;
      isMajorSectionShift: boolean;
      focus: "bass" | "melody";
      energy: number;
      zcr: number;
      explicitType?: "major" | "minor" | "accelerator" | "friction";
      contour?: string;
    }[] = [];

    if (
      project.musicalStructure?.customBeats &&
      project.musicalStructure.customBeats.length > 0
    ) {
      for (const cb of project.musicalStructure.customBeats) {
        beats.push({
          time: cb.time,
          isMajorSectionShift: !!cb.isMajorSectionShift,
          focus: cb.focus || "melody",
          energy: cb.energy || 1.2,
          zcr: 1.5,
          explicitType: cb.type,
        });
      }
    } else {
      const sections = project.musicalStructure?.sections || [
        {
          startTime: 0,
          endTime: duration,
          label: "Sección Principal",
          focus: "melody" as const,
          energy: 1.5,
          subdivision: 1,
          melodicContour: "wave" as const,
          platformStyle: "major" as const,
        },
      ];

      for (const sec of sections) {
        const secBpm = sec.bpmOverride || baseBpm;
        const beatInterval = Math.max(
          1.35,
          (60 / secBpm) * 2.0,
        );
        let isFirstInSec = true;

        for (let t = sec.startTime; t < sec.endTime; t += beatInterval) {
          if (t <= 0.15) continue;
          const measurePulse = Math.round((t - sec.startTime) / beatInterval);
          const accentBoost = measurePulse % 4 === 0 ? 1.25 : 0.95;

          beats.push({
            time: parseFloat(t.toFixed(3)),
            isMajorSectionShift: isFirstInSec,
            focus: sec.focus === "bass" ? "bass" : "melody",
            energy: sec.energy * accentBoost,
            zcr: sec.platformStyle === "friction" ? 3.2 : 1.4,
            explicitType: isFirstInSec ? "major" : sec.platformStyle,
            contour: sec.melodicContour,
          });
          isFirstInSec = false;
        }
      }
    }

    simulatePhysicsFromBeats(beats, duration, slicesCount, undefined);
    updateState();
  };

  // Pure Web Audio API analysis when an audio file IS provided (100% browser-based, zero AI)
  const analyzeAudioFile = async (
    file: File,
    project: OkfMusicogramaProject | null,
  ) => {
    setAnalyzingState(true);
    updateState();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      if (audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }

      const sampleRate = audioBuffer.sampleRate || 44100;
      const fps = 60;
      const chunkSize = Math.max(1, Math.floor(sampleRate / fps));
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 =
        audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

      // 3-Band time-domain filtering (< 200 Hz Bass, 200-1400 Hz Mid/Body, > 1400 Hz High/Transients) + Broadband RMS
      const dt = 1 / sampleRate;
      const rcLow = 1 / (2 * Math.PI * 200);
      const alphaLow = dt / (rcLow + dt);
      const rcMidLow = 1 / (2 * Math.PI * 1400);
      const alphaMidLow = dt / (rcMidLow + dt);
      const rcHigh = 1 / (2 * Math.PI * 1400);
      const alphaHigh = rcHigh / (rcHigh + dt);

      const rmsEnergies: number[] = [];
      const bassEnergies: number[] = [];
      const midEnergies: number[] = [];
      const highEnergies: number[] = [];
      const melodyEnergies: number[] = [];
      let sumRms = 0,
        peakRms = 0,
        sumB = 0,
        sumMid = 0,
        sumH = 0,
        sumM = 0;

      let lowVal = 0;
      let midLowVal = 0;
      let highVal = 0;
      let prevSample = 0;

      for (let i = 0; i < ch0.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, ch0.length);
        let sqSum = 0,
          eB = 0,
          eMid = 0,
          eH = 0;
        for (let j = i; j < end; j++) {
          const s = ch1 ? 0.5 * (ch0[j] + ch1[j]) : ch0[j];
          sqSum += s * s;
          lowVal = lowVal + alphaLow * (s - lowVal);
          midLowVal = midLowVal + alphaMidLow * (s - midLowVal);
          const bandMid = midLowVal - lowVal;
          highVal = alphaHigh * (highVal + s - prevSample);
          prevSample = s;
          eB += Math.abs(lowVal);
          eMid += Math.abs(bandMid);
          eH += Math.abs(highVal);
        }
        const count = Math.max(1, end - i);
        const frameRms = Math.sqrt(sqSum / count);
        eB /= count;
        eMid /= count;
        eH /= count;
        const eMel = eMid * 0.58 + eH * 0.42;

        rmsEnergies.push(frameRms);
        bassEnergies.push(eB);
        midEnergies.push(eMid);
        highEnergies.push(eH);
        melodyEnergies.push(eMel);

        sumRms += frameRms;
        if (frameRms > peakRms) peakRms = frameRms;
        sumB += eB;
        sumMid += eMid;
        sumH += eH;
        sumM += eMel;
      }

      const totalFrames = bassEnergies.length;
      const avgRms = sumRms / Math.max(1, totalFrames) || 0.0001;
      const avgB = sumB / Math.max(1, totalFrames) || 0.0001;
      const avgMid = sumMid / Math.max(1, totalFrames) || 0.0001;
      const avgH = sumH / Math.max(1, totalFrames) || 0.0001;
      const avgM = sumM / Math.max(1, totalFrames) || 0.0001;
      const duration =
        audioBuffer.duration || project?.metadata?.durationSeconds || 90;

      // Smooth RMS envelope & Silence Floor Gate (prevents fake beats during lead-in/lead-out silence or musical rests)
      const smoothRms = new Float32Array(totalFrames);
      for (let i = 0; i < totalFrames; i++) {
        let acc = 0,
          cnt = 0;
        for (let k = Math.max(0, i - 2); k <= Math.min(totalFrames - 1, i + 2); k++) {
          acc += rmsEnergies[k];
          cnt++;
        }
        smoothRms[i] = acc / Math.max(1, cnt);
      }
      const silenceFloor = Math.max(peakRms * 0.024, avgRms * 0.075);

      // Compute Real Acoustic Elevation Curve (audioElevationY) & Track Offsets from actual loudness (terrace dynamics) & spectral pitch balance
      const rawAudioY = new Float32Array(totalFrames);
      const rawMelodyOff = new Float32Array(totalFrames);
      const rawBassOff = new Float32Array(totalFrames);
      for (let i = 0; i < totalFrames; i++) {
        if (smoothRms[i] < silenceFloor) {
          rawAudioY[i] = 0;
          rawMelodyOff[i] = 0;
          rawBassOff[i] = 0;
          continue;
        }
        const relLoudness = Math.min(2.4, smoothRms[i] / avgRms);
        const bNorm = bassEnergies[i] / avgB;
        const mNorm = midEnergies[i] / avgMid;
        const hNorm = highEnergies[i] / avgH;
        const pitchRatio =
          (hNorm * 0.65 + mNorm * 0.35) / Math.max(0.28, bNorm * 0.55 + 0.45);

        // Forte & high register rise upward (-Y); echo piano & low register step downward (+Y)
        const dynamicY = -((relLoudness - 0.88) * 105);
        const registerY = -((Math.min(2.5, pitchRatio) - 1.0) * 90);
        rawAudioY[i] = Math.max(-285, Math.min(235, dynamicY + registerY));

        rawMelodyOff[i] = Math.max(
          -110,
          Math.min(85, -((Math.min(2.8, hNorm * 0.6 + mNorm * 0.4) - 0.9) * 58)),
        );
        rawBassOff[i] = Math.max(
          -85,
          Math.min(115, (Math.min(2.8, bNorm) - 0.85) * 62),
        );
      }

      const audioElevationY = new Float32Array(totalFrames);
      for (let i = 0; i < totalFrames; i++) {
        let acc = 0,
          cnt = 0;
        for (let k = Math.max(0, i - 5); k <= Math.min(totalFrames - 1, i + 5); k++) {
          acc += rawAudioY[k];
          cnt++;
        }
        audioElevationY[i] = acc / Math.max(1, cnt);
      }

      // Compute Log-Compressed Positive Spectral Onset Flux (captures both soft echo-piano violin attacks and loud tutti chords)
      const fluxBass = new Float32Array(totalFrames);
      const fluxMelody = new Float32Array(totalFrames);
      const fluxTotal = new Float32Array(totalFrames);
      let sumFluxB = 0,
        sumFluxM = 0,
        sumFluxT = 0;

      const logComp = (val: number) => Math.log1p(Math.max(0, val) * 8.0);

      for (let i = 2; i < totalFrames; i++) {
        if (smoothRms[i] < silenceFloor) continue;

        const lb0 = logComp(bassEnergies[i] / avgB);
        const lbPrev = Math.min(
          logComp(bassEnergies[i - 1] / avgB),
          logComp(bassEnergies[i - 2] / avgB),
        );
        const lm0 = logComp(midEnergies[i] / avgMid);
        const lmPrev = Math.min(
          logComp(midEnergies[i - 1] / avgMid),
          logComp(midEnergies[i - 2] / avgMid),
        );
        const lh0 = logComp(highEnergies[i] / avgH);
        const lhPrev = Math.min(
          logComp(highEnergies[i - 1] / avgH),
          logComp(highEnergies[i - 2] / avgH),
        );

        const fb = Math.max(0, lb0 - lbPrev);
        const fm =
          Math.max(0, lm0 - lmPrev) * 0.55 + Math.max(0, lh0 - lhPrev) * 0.45;
        const ft = fb * 0.38 + fm * 0.62;

        fluxBass[i] = fb;
        fluxMelody[i] = fm;
        fluxTotal[i] = ft;
        sumFluxB += fb;
        sumFluxM += fm;
        sumFluxT += ft;
      }

      const avgFluxB = sumFluxB / Math.max(1, totalFrames) || 0.0001;
      const avgFluxM = sumFluxM / Math.max(1, totalFrames) || 0.0001;
      const avgFluxT = sumFluxT / Math.max(1, totalFrames) || 0.0001;

      // Local adaptive onset score normalized over a ±0.55s window
      const normOnsetBass = new Float32Array(totalFrames);
      const normOnsetMelody = new Float32Array(totalFrames);
      const normOnsetTotal = new Float32Array(totalFrames);
      const winRadius = 33; // 0.55s at 60fps

      for (let i = 0; i < totalFrames; i++) {
        if (smoothRms[i] < silenceFloor) continue;
        const w0 = Math.max(0, i - winRadius);
        const w1 = Math.min(totalFrames - 1, i + winRadius);
        let locB = 0,
          locM = 0,
          locT = 0;
        for (let k = w0; k <= w1; k++) {
          locB += fluxBass[k];
          locM += fluxMelody[k];
          locT += fluxTotal[k];
        }
        const wCount = Math.max(1, w1 - w0 + 1);
        const denomB = Math.max(avgFluxB * 0.28, locB / wCount);
        const denomM = Math.max(avgFluxM * 0.28, locM / wCount);
        const denomT = Math.max(avgFluxT * 0.28, locT / wCount);

        normOnsetBass[i] = fluxBass[i] / denomB;
        normOnsetMelody[i] = fluxMelody[i] / denomM;
        normOnsetTotal[i] = fluxTotal[i] / denomT;
      }

      // Scale sliceSpecs to match real audio duration and clear stale pre-audio backgroundSvg so SVGs recompile 1:1 with real audio
      if (project?.sliceSpecs && project.sliceSpecs.length > 0) {
        const rawSpecs = project.sliceSpecs;
        const lastSpecEnd =
          rawSpecs[rawSpecs.length - 1]?.endTime ||
          project.metadata?.durationSeconds ||
          duration;
        const specScale =
          lastSpecEnd > 0 && Math.abs(duration - lastSpecEnd) > 0.2
            ? duration / lastSpecEnd
            : 1.0;

        sliceSpecsRef.current = rawSpecs.map((sp) => ({
          ...sp,
          startTime: sp.startTime * specScale,
          endTime: sp.endTime * specScale,
          backgroundSvg: undefined,
          trajectoryWaypoints: sp.trajectoryWaypoints?.map((wp) => ({
            ...wp,
            time: wp.time * specScale,
          })),
        }));
      }

      let beats: {
        time: number;
        isMajorSectionShift: boolean;
        focus: "bass" | "melody";
        energy: number;
        zcr: number;
        explicitType?: "major" | "minor" | "accelerator" | "friction";
        contour?: string;
        audioY?: number;
        melodyOffset?: number;
        bassOffset?: number;
        holdMode?: "jump" | "ramp";
      }[] = [];

      const hasOkfCustomBeats =
        project?.musicalStructure?.customBeats &&
        project.musicalStructure.customBeats.length > 0;
      const sections = project?.musicalStructure?.sections || [];
      const lastSecEnd =
        sections.length > 0
          ? sections[sections.length - 1]?.endTime ||
            project?.metadata?.durationSeconds ||
            duration
          : project?.metadata?.durationSeconds || duration;
      const sectionTimeScale =
        lastSecEnd > 0 && Math.abs(duration - lastSecEnd) > 0.2
          ? duration / lastSecEnd
          : 1.0;

      const findActiveSection = (tSec: number) => {
        if (sections.length === 0) return undefined;
        for (let s = 0; s < sections.length; s++) {
          const st = sections[s].startTime * sectionTimeScale;
          const et =
            s === sections.length - 1
              ? duration
              : sections[s].endTime * sectionTimeScale;
          if (tSec >= st && tSec <= et) {
            return { sec: sections[s], index: s, start: st, end: et };
          }
        }
        return {
          sec: sections[sections.length - 1],
          index: sections.length - 1,
          start: sections[sections.length - 1].startTime * sectionTimeScale,
          end: duration,
        };
      };

      if (hasOkfCustomBeats) {
        const projDur = project!.metadata?.durationSeconds || duration;
        const timeScale = projDur > 0 ? duration / projDur : 1;
        let lastT = -1;
        for (const cb of project!.musicalStructure!.customBeats!) {
          const scaledT = Math.min(duration - 0.05, cb.time * timeScale);
          if (scaledT <= 0.08) continue;
          const centerIdx = Math.min(
            totalFrames - 3,
            Math.max(2, Math.round(scaledT * fps)),
          );
          let bestIdx = centerIdx;
          let bestScore = -1;
          for (
            let idx = Math.max(2, centerIdx - 11);
            idx <= Math.min(totalFrames - 3, centerIdx + 11);
            idx++
          ) {
            const sc = normOnsetTotal[idx];
            if (sc > bestScore) {
              bestScore = sc;
              bestIdx = idx;
            }
          }
          const finalIdx = bestScore >= 0.9 ? bestIdx : centerIdx;
          const finalT = finalIdx / fps;
          if (finalT - lastT < 0.16) continue;
          beats.push({
            time: parseFloat(finalT.toFixed(3)),
            isMajorSectionShift: !!cb.isMajorSectionShift,
            focus: cb.focus || "melody",
            energy: Math.max(
              0.6,
              (cb.energy || 1.2) * 0.5 + (smoothRms[finalIdx] / avgRms) * 0.7,
            ),
            zcr: (highEnergies[finalIdx] || 0) / avgH,
            explicitType: cb.type,
            audioY: audioElevationY[finalIdx],
            melodyOffset: rawMelodyOff[finalIdx],
            bassOffset: rawBassOff[finalIdx],
          });
          lastT = finalT;
        }
      } else {
        // Direct Waveform Onset Detection enriched with OKF Section Styling (100% locked to true audio attacks & silences)
        const rawCandidates: {
          frame: number;
          time: number;
          score: number;
          secIdx: number;
        }[] = [];

        let lastPeakFrame = -999;
        let lastPeakScore = 0;

        for (let i = 2; i < totalFrames - 2; i++) {
          if (smoothRms[i] < silenceFloor) continue;
          const t = i / fps;
          const activeSecInfo = findActiveSection(t);
          const sec = activeSecInfo?.sec;
          const secIdx = activeSecInfo ? activeSecInfo.index : 0;

          const focusPref = sec?.focus || "tutti";
          const oScore =
            focusPref === "bass"
              ? normOnsetBass[i] * 0.62 + normOnsetTotal[i] * 0.38
              : focusPref === "melody"
                ? normOnsetMelody[i] * 0.62 + normOnsetTotal[i] * 0.38
                : normOnsetTotal[i];

          const isLocalMax =
            oScore >= normOnsetTotal[i - 1] * 0.98 &&
            oScore >= normOnsetTotal[i + 1] * 0.98 &&
            (oScore > normOnsetTotal[i - 2] || oScore > normOnsetTotal[i + 2]);

          if (!isLocalMax || oScore < 1.15) continue;

          const sub = sec?.subdivision || 1;
          const minGapSec = sub >= 2 ? 1.15 : 1.38;
          const minGapFrames = Math.round(minGapSec * fps);

          if (i - lastPeakFrame < minGapFrames) {
            if (oScore > lastPeakScore * 1.15 && rawCandidates.length > 0) {
              rawCandidates[rawCandidates.length - 1] = {
                frame: i,
                time: t,
                score: oScore,
                secIdx,
              };
              lastPeakFrame = i;
              lastPeakScore = oScore;
            }
          } else {
            rawCandidates.push({
              frame: i,
              time: t,
              score: oScore,
              secIdx,
            });
            lastPeakFrame = i;
            lastPeakScore = oScore;
          }
        }

        // Convert detected acoustic onsets into physics beats and handle sustained notes vs silent rests
        let prevSecIdx = -1;
        for (let cIdx = 0; cIdx < rawCandidates.length; cIdx++) {
          const cand = rawCandidates[cIdx];
          const prevCand = cIdx > 0 ? rawCandidates[cIdx - 1] : null;

          // If there is a long gap (> 0.66s) between two real note attacks, check if the audio is sustaining a chord or resting in silence
          if (prevCand) {
            const gap = cand.time - prevCand.time;
            if (gap > 0.66) {
              let gapRmsSum = 0,
                gapCnt = 0;
              const gStart = Math.min(totalFrames - 1, prevCand.frame + 8);
              const gEnd = Math.max(gStart, cand.frame - 6);
              for (let g = gStart; g <= gEnd; g++) {
                gapRmsSum += smoothRms[g];
                gapCnt++;
              }
              const avgGapRms = gapRmsSum / Math.max(1, gapCnt);

              if (avgGapRms < silenceFloor * 2.1) {
                // Musical rest or decaying held note before next phrase: land smoothly after decay and glide ("ramp") until the exact next attack
                if (gap > 0.85 && beats.length > 0) {
                  const holdStartT = Math.min(
                    cand.time - 0.15,
                    prevCand.time + 0.34,
                  );
                  const holdFrame = Math.min(
                    totalFrames - 1,
                    Math.round(holdStartT * fps),
                  );
                  beats.push({
                    time: parseFloat(holdStartT.toFixed(3)),
                    isMajorSectionShift: false,
                    focus: beats[beats.length - 1].focus,
                    energy: 0.75,
                    zcr: 1.0,
                    explicitType: "minor",
                    contour: beats[beats.length - 1].contour,
                    audioY: audioElevationY[holdFrame],
                    melodyOffset: rawMelodyOff[holdFrame],
                    bassOffset: rawBassOff[holdFrame],
                    holdMode: "ramp",
                  });
                } else if (beats.length > 0) {
                  beats[beats.length - 1].holdMode = "ramp";
                }
              } else if (gap > 1.95) {
                // Active sustained chord/melody without sharp transients: insert gentle ramp glides at ~1.6s intervals
                const numPulses = Math.max(1, Math.floor(gap / 1.6) - 1);
                for (let p = 1; p <= numPulses; p++) {
                  const interpT = prevCand.time + (gap * p) / (numPulses + 1);
                  const pFrame = Math.min(
                    totalFrames - 1,
                    Math.round(interpT * fps),
                  );
                  const secInfo = findActiveSection(interpT);
                  const sec = secInfo?.sec;
                  const relLoud = Math.min(2.4, smoothRms[pFrame] / avgRms);
                  beats.push({
                    time: parseFloat(interpT.toFixed(3)),
                    isMajorSectionShift: false,
                    focus: sec?.focus === "bass" ? "bass" : "melody",
                    energy: Math.max(0.75, relLoud * 0.9),
                    zcr: (highEnergies[pFrame] || 0) / avgH,
                    explicitType: sec?.platformStyle || "minor",
                    contour: sec?.melodicContour,
                    audioY: audioElevationY[pFrame],
                    melodyOffset: rawMelodyOff[pFrame],
                    bassOffset: rawBassOff[pFrame],
                    holdMode: "ramp",
                  });
                }
              }
            }
          }

          const f = cand.frame;
          const activeSecInfo = findActiveSection(cand.time);
          const sec = activeSecInfo?.sec;
          const secIdx = activeSecInfo ? activeSecInfo.index : 0;
          const isNewSection = secIdx !== prevSecIdx;
          prevSecIdx = secIdx;

          const relLoudness = Math.min(2.6, smoothRms[f] / avgRms);
          const onsetBoost = Math.min(2.2, cand.score * 0.48);
          const realEnergy = Math.min(
            3.5,
            Math.max(0.65, relLoudness * 0.72 + onsetBoost * 0.48),
          );
          const isMelFocus =
            sec?.focus === "bass"
              ? false
              : sec?.focus === "melody"
                ? true
                : melodyEnergies[f] / avgM >= (bassEnergies[f] / avgB) * 0.85;

          beats.push({
            time: parseFloat(cand.time.toFixed(3)),
            isMajorSectionShift: isNewSection,
            focus: isMelFocus ? "melody" : "bass",
            energy: realEnergy,
            zcr: (highEnergies[f] || 0) / avgH,
            explicitType: isNewSection
              ? "major"
              : sec?.platformStyle || (realEnergy > 2.3 ? "accelerator" : "major"),
            contour: sec?.melodicContour,
            audioY: audioElevationY[f],
            melodyOffset: rawMelodyOff[f],
            bassOffset: rawBassOff[f],
            holdMode: "jump",
          });
        }
      }

      const desiredSlices =
        project?.config?.svgMode === "single"
          ? 1
          : project?.config?.mosaicSlices ||
            project?.sliceSpecs?.length ||
            analysisDataRef.current?.bgImages?.length ||
            Math.max(4, Math.min(16, Math.round(duration / 15)));

      // Pass undefined for existingBgImages so compileAndAssignAlignedSvgs forces a full rebuild of the SVGs matched 1:1 with the real audio trajectory
      simulatePhysicsFromBeats(beats, duration, desiredSlices, undefined);
    } catch (e) {
      console.error("Audio analysis failed, falling back to OKF trajectory:", e);
      if (project) {
        buildTrajectoryFromOkfJson(project);
      }
    } finally {
      setAnalyzingState(false);
      updateState();
    }
  };

  // Apply OKF Project config & metadata whenever okfProject changes
  useEffect(() => {
    if (!okfProject) return;

    emotionsRef.current = okfProject.metadata?.emotions || [];
    environmentConceptRef.current =
      okfProject.metadata?.environmentConcept || "";
    sliceSpecsRef.current = okfProject.sliceSpecs || [];

    // Clear previous project background images so the new OKF project's backgrounds (or empty slots) take effect
    if (analysisDataRef.current?.bgImages) {
      analysisDataRef.current.bgImages.forEach((img) => {
        if (img && (img as any).src?.startsWith("blob:")) {
          URL.revokeObjectURL((img as any).src);
        }
      });
      analysisDataRef.current.bgImages = new Array(
        okfProject.config?.mosaicSlices || okfProject.sliceSpecs?.length || 6,
      ).fill(null);
    }

    if (okfProject.config) {
      const cfg = okfProject.config;
      if (cfg.zoom !== undefined) userZoomRef.current = cfg.zoom;
      if (cfg.platformOpacity !== undefined)
        platformOpacityRef.current = cfg.platformOpacity;
      if (cfg.bgOffsetY !== undefined) bgOffsetYRef.current = cfg.bgOffsetY;
      if (cfg.cameraSmoothness !== undefined)
        cameraSmoothnessRef.current = cfg.cameraSmoothness;
      if (cfg.userKeywords !== undefined)
        userKeywordsRef.current = cfg.userKeywords;

      if (cfg.ballConfig) {
        ballConfigRef.current = { ...ballConfigRef.current, ...cfg.ballConfig };
        if (cfg.ballConfig.svgContent) {
          preloadCustomGraphic(cfg.ballConfig.svgContent, (img, url) => {
            if (svgUrlCacheRef.current["main"])
              URL.revokeObjectURL(svgUrlCacheRef.current["main"]);
            if (svgImageCacheRef.current["main"]?.parentNode) {
              svgImageCacheRef.current["main"]?.parentNode.removeChild(
                svgImageCacheRef.current["main"]!,
              );
            }
            svgImageCacheRef.current["main"] = img;
            if (url) svgUrlCacheRef.current["main"] = url;
          });
        }
      }

      if (cfg.extraTracksConfig) {
        (["melody", "bass"] as const).forEach((trackId) => {
          const tCfg = cfg.extraTracksConfig[trackId];
          if (tCfg) {
            extraTracksConfigRef.current[trackId] = {
              ...extraTracksConfigRef.current[trackId],
              ...tCfg,
            };
            if (tCfg.svgContent) {
              preloadCustomGraphic(tCfg.svgContent, (img, url) => {
                if (svgUrlCacheRef.current[trackId])
                  URL.revokeObjectURL(svgUrlCacheRef.current[trackId]);
                if (svgImageCacheRef.current[trackId]?.parentNode) {
                  svgImageCacheRef.current[trackId]?.parentNode.removeChild(
                    svgImageCacheRef.current[trackId]!,
                  );
                }
                svgImageCacheRef.current[trackId] = img;
                if (url) svgUrlCacheRef.current[trackId] = url;
              });
            }
          }
        });
      }
    }

    if (
      !audioFile ||
      (okfProject.data &&
        okfProject.data.positions?.length &&
        okfProject.audioBase64)
    ) {
      buildTrajectoryFromOkfJson(okfProject);
    } else {
      analyzeAudioFile(audioFile, okfProject);
    }
  }, [okfProject]);

  // Handle audio file changes
  useEffect(() => {
    if (!animationFrameIdRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(() =>
        renderFrameRef.current(),
      );
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    virtualTimeRef.current = 0;
    lastWallTimeRef.current = performance.now();
    lastSynthBeatIdxRef.current = -1;
    cameraPosRef.current = null;

    if (!audioFile) {
      audioUrlRef.current = "";
      setAudioUrl("");
      if (audioRef.current) {
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      if (okfProject) {
        buildTrajectoryFromOkfJson(okfProject);
      }
      return;
    }

    const url = URL.createObjectURL(audioFile);
    audioUrlRef.current = url;
    setAudioUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
    recordedBlobRef.current = null;
    setRecordedBlob(null);
    lastFrameIdxRef.current = -1;

    // If okfProject already has precalculated positions matching this audio import, keep them; otherwise analyze audio
    if (
      okfProject?.data?.positions &&
      okfProject.data.positions.length > 0 &&
      okfProject.audioBase64
    ) {
      buildTrajectoryFromOkfJson(okfProject);
    } else {
      analyzeAudioFile(audioFile, okfProject);
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  // Clean up on unmount
  useEffect(() => {
    if (!animationFrameIdRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(() =>
        renderFrameRef.current(),
      );
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = 0;
      }
      if (contextRef.current) {
        if (contextRef.current.audioCtx.state !== "closed") {
          contextRef.current.audioCtx.close().catch(() => {});
        }
        contextRef.current = null;
      }
    };
  }, []);

  const ensureAudioContext = () => {
    if (!contextRef.current) {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const dest = audioCtx.createMediaStreamDestination();

      let sourceConnected = false;
      if (audioRef.current) {
        try {
          const source = audioCtx.createMediaElementSource(audioRef.current);
          source.connect(dest);
          source.connect(audioCtx.destination);
          sourceConnected = true;
        } catch (err) {
          console.warn("Audio element already connected:", err);
        }
      }

      contextRef.current = {
        audioCtx,
        dest,
        sourceConnected,
        chunks: [],
      };
    }
  };

  const ensureAudioAndRecorder = () => {
    if (!canvasRef.current) return;
    ensureAudioContext();
    if (!contextRef.current || contextRef.current.mediaRecorder) return;

    try {
      const canvasStream = canvasRef.current.captureStream(60);
      const audioStream = contextRef.current.dest.stream;
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];

      let mediaRecorder: MediaRecorder | undefined;
      let selectedMime = "video/webm";

      for (const candidate of mimeCandidates) {
        if (
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(candidate)
        ) {
          try {
            mediaRecorder = new MediaRecorder(combinedStream, {
              mimeType: candidate,
            });
            selectedMime = candidate;
            break;
          } catch {
            // Try next candidate
          }
        }
      }

      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(combinedStream);
        selectedMime = mediaRecorder.mimeType || "video/webm";
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && contextRef.current) {
          contextRef.current.chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (!contextRef.current) return;
        const blob = new Blob(contextRef.current.chunks, {
          type: contextRef.current.recorderMimeType || "video/webm",
        });
        recordedBlobRef.current = blob;
        setRecordedBlob(blob);
        contextRef.current.chunks = [];
        isRecordingRef.current = false;
        setIsRecording(false);
        updateState(isPlayingRef.current, false, true);

        if (autoExportOnStopRef.current) {
          autoExportOnStopRef.current = false;
          setTimeout(() => {
            triggerVideoDownload(blob);
          }, 150);
        }
      };

      contextRef.current.mediaRecorder = mediaRecorder;
      contextRef.current.recorderMimeType = selectedMime;
    } catch (err) {
      console.error("Failed to initialize MediaRecorder:", err);
    }
  };

  // Synthesize gentle musical chime on beat when playing without an external MP3 file
  const triggerSyntheticBeatTone = (
    platformType: "major" | "minor" | "accelerator" | "friction",
    yPos: number,
  ) => {
    if (!contextRef.current) return;
    const { audioCtx, dest } = contextRef.current;
    if (audioCtx.state !== "running") return;

    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      // Map vertical position to pentatonic frequencies
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
      const normY = Math.max(0, Math.min(1, (-yPos + 800) / 1600));
      const idx = Math.min(scale.length - 1, Math.floor(normY * scale.length));
      const freq = scale[idx] * (platformType === "accelerator" ? 1.5 : 1.0);

      osc.type = platformType === "major" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(dest);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore synth errors
    }
  };

  const play = async () => {
    try {
      ensureAudioContext();
      if (
        contextRef.current &&
        contextRef.current.audioCtx.state !== "running"
      ) {
        await contextRef.current.audioCtx.resume().catch(() => {});
      }

      const hasExternalAudio = !!(
        audioFileRef.current &&
        audioRef.current &&
        audioUrlRef.current
      );

      if (hasExternalAudio && audioRef.current) {
        const audioEl = audioRef.current;
        const dur =
          getValidAudioElementDuration() ||
          analysisDataRef.current?.duration ||
          90;
        if (audioEl.ended || audioEl.currentTime >= dur - 0.05) {
          audioEl.currentTime = 0;
          cameraPosRef.current = null;
        }
        await audioEl.play();
      } else {
        const dur = analysisDataRef.current?.duration || 90;
        if (virtualTimeRef.current >= dur - 0.05) {
          virtualTimeRef.current = 0;
          lastSynthBeatIdxRef.current = -1;
          cameraPosRef.current = null;
        }
      }

      lastWallTimeRef.current = performance.now();
      isPlayingRef.current = true;
      setIsPlaying(true);
      updateState(true);
    } catch (err) {
      console.error("Playback failed:", err);
      isPlayingRef.current = false;
      setIsPlaying(false);
      updateState(false);
    }
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    updateState(false);
  };

  const seekTo = (seconds: number) => {
    const hasExternalAudio = !!(
      audioFileRef.current &&
      audioRef.current &&
      audioUrlRef.current
    );
    const dur =
      (hasExternalAudio && getValidAudioElementDuration()) ||
      analysisDataRef.current?.duration ||
      90;
    const clamped = Math.max(0, Math.min(dur, seconds));
    if (hasExternalAudio && audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
    virtualTimeRef.current = clamped;
    lastWallTimeRef.current = performance.now();
    lastSynthBeatIdxRef.current = -1;
    lastFrameIdxRef.current = -1;
    updateState();
  };

  const rewind = () => {
    seekTo(0);
    cameraPosRef.current = null;
  };

  const startRecording = async () => {
    ensureAudioAndRecorder();
    if (!contextRef.current?.mediaRecorder) return;

    contextRef.current.chunks = [];
    if (contextRef.current.mediaRecorder.state === "inactive") {
      contextRef.current.mediaRecorder.start();
    }
    isRecordingRef.current = true;
    setIsRecording(true);
    recordedBlobRef.current = null;
    setRecordedBlob(null);

    if (!isPlayingRef.current) {
      await play();
    } else {
      updateState(true, true, false);
    }
  };

  const stopRecording = () => {
    if (
      !contextRef.current?.mediaRecorder ||
      contextRef.current.mediaRecorder.state === "inactive"
    )
      return;
    contextRef.current.mediaRecorder.stop();
  };

  const startFullVideoCapture = async () => {
    if (isRecordingRef.current) {
      stopRecording();
    }
    pause();
    rewind();
    autoExportOnStopRef.current = true;
    await new Promise((r) => setTimeout(r, 120));
    await startRecording();
  };

  const triggerVideoDownload = (blobToSave?: Blob | null) => {
    const blob = blobToSave || recordedBlobRef.current || recordedBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    const safeTitle = (okfProject?.metadata?.title || "musicograma")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    a.download = `${safeTitle || "musicograma"}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const exportVideo = () => {
    triggerVideoDownload();
  };

  const computeSliceBounds = (
    data: any,
    sliceIndex: number,
    slices: number,
  ) => {
    const WORLD_MIN_Y = -960;
    const WORLD_MAX_Y = 640;
    const WORLD_HEIGHT = WORLD_MAX_Y - WORLD_MIN_Y; // 1600

    const totalWidth = Math.max(800, data.bounds.maxX - data.bounds.minX);
    const duration = data.duration || totalWidth / 800;
    const specs = sliceSpecsRef.current || [];

    let sliceMinX = data.bounds.minX + (sliceIndex * totalWidth) / slices;
    let sliceMaxX = data.bounds.minX + ((sliceIndex + 1) * totalWidth) / slices;

    if (slices === specs.length && specs[sliceIndex] && duration > 0) {
      const spec = specs[sliceIndex];
      if (
        typeof spec.startTime === "number" &&
        typeof spec.endTime === "number" &&
        spec.endTime > spec.startTime
      ) {
        sliceMinX = (spec.startTime / duration) * totalWidth;
        sliceMaxX =
          sliceIndex === slices - 1
            ? totalWidth
            : (spec.endTime / duration) * totalWidth;
      }
    }

    const sliceWorldWidth = Math.max(400, sliceMaxX - sliceMinX);

    return {
      x: sliceMinX,
      y: WORLD_MIN_Y,
      width: sliceWorldWidth,
      height: WORLD_HEIGHT,
      size: sliceWorldWidth,
      sliceMinX,
      sliceMaxX,
      sliceWorldWidth,
      worldMinY: WORLD_MIN_Y,
      worldMaxY: WORLD_MAX_Y,
    };
  };

  // Compiles 100% trajectory-aligned detailed SVGs (either 1 unified panoramic SVG or N segment SVGs)
  const compileAndAssignAlignedSvgs = (
    slicesOverride?: number,
    forceRebuild: boolean = true,
  ) => {
    const data = analysisDataRef.current;
    if (!data || !data.bounds || !data.platforms) return;

    const specs = sliceSpecsRef.current || [];
    const slices = Math.max(
      1,
      slicesOverride || data.bgImages?.length || specs.length || 6,
    );

    if (!data.bgImages || data.bgImages.length !== slices) {
      const oldImages = data.bgImages || [];
      const nextImgs: (HTMLImageElement | HTMLVideoElement | null)[] = new Array(
        slices,
      ).fill(null);
      if (!forceRebuild) {
        for (let i = 0; i < Math.min(slices, oldImages.length); i++) {
          nextImgs[i] = oldImages[i];
        }
      } else {
        oldImages.forEach((img) => {
          if (img && (img as any).src?.startsWith("blob:")) {
            URL.revokeObjectURL((img as any).src);
          }
        });
      }
      data.bgImages = nextImgs;
    }

    const melodyColor = extraTracksConfigRef.current?.melody?.color || "#fbbf24";
    const bassColor = extraTracksConfigRef.current?.bass?.color || "#38bdf8";

    if (slices === 1) {
      // Single Unified Panoramic SVG Mode (1 SVG covering the entire musicogram)
      const totalWidth = Math.max(800, data.bounds.maxX - data.bounds.minX);
      const duration = data.duration || totalWidth / 800;
      const sectionCount = Math.max(1, specs.length);
      const sliceInputs: TrajectoryCompilerInput[] = [];

      for (let i = 0; i < sectionCount; i++) {
        const spec = specs[i];
        let sMinX = (i * totalWidth) / sectionCount;
        let sMaxX = ((i + 1) * totalWidth) / sectionCount;
        if (
          spec &&
          typeof spec.startTime === "number" &&
          typeof spec.endTime === "number" &&
          spec.endTime > spec.startTime &&
          duration > 0
        ) {
          sMinX = (spec.startTime / duration) * totalWidth;
          sMaxX =
            i === sectionCount - 1
              ? totalWidth
              : (spec.endTime / duration) * totalWidth;
        }
        sliceInputs.push({
          sliceIndex: i,
          totalSlices: sectionCount,
          sliceMinX: sMinX,
          sliceMaxX: sMaxX,
          worldMinY: -960,
          worldMaxY: 640,
          positions: data.positions,
          platforms: data.platforms,
          extraTracks: data.extraTracks,
          spec,
          projectTitle: okfProjectRef.current?.metadata?.title,
          environmentConcept: environmentConceptRef.current,
          melodyColor,
          bassColor,
        });
      }

      const masterSvgXml =
        !forceRebuild &&
        okfProjectRef.current?.config?.masterSceneSvg &&
        okfProjectRef.current.config.masterSceneSvg.includes(
          'data-sonogramic-scenic-animated="v3"',
        )
          ? okfProjectRef.current.config.masterSceneSvg
          : compileFullMasterSvg(
              sliceInputs,
              data.bounds.minX,
              data.bounds.maxX,
              -960,
              640,
            );

      compiledSliceSvgsRef.current = [masterSvgXml];
      if (okfProjectRef.current?.config) {
        okfProjectRef.current.config.masterSceneSvg = masterSvgXml;
        okfProjectRef.current.config.svgMode = "single";
      }

      if (forceRebuild || !data.bgImages[0]) {
        const blobUrl = svgStringToBlobUrl(masterSvgXml);
        if (blobUrl) {
          if (data.bgImages[0] && (data.bgImages[0] as any).parentNode) {
            (data.bgImages[0] as any).parentNode.removeChild(data.bgImages[0]);
          }
          data.bgImages[0] = createMountedSvgImage(blobUrl, () =>
            updateState(),
          );
        }
      }
      return;
    }

    // Multiple Segment SVGs Mode (N detailed SVGs aligned with each section's exact trajectory)
    const compiledList: string[] = new Array(slices).fill("");
    for (let i = 0; i < slices; i++) {
      const sb = computeSliceBounds(data, i, slices);
      const spec = specs[i];

      const input: TrajectoryCompilerInput = {
        sliceIndex: i,
        totalSlices: slices,
        sliceMinX: sb.sliceMinX,
        sliceMaxX: sb.sliceMaxX,
        worldMinY: sb.worldMinY,
        worldMaxY: sb.worldMaxY,
        positions: data.positions,
        platforms: data.platforms,
        extraTracks: data.extraTracks,
        spec,
        projectTitle: okfProjectRef.current?.metadata?.title,
        environmentConcept: environmentConceptRef.current,
        melodyColor,
        bassColor,
      };

      const svgXml =
        !forceRebuild &&
        spec?.backgroundSvg &&
        spec.backgroundSvg.includes('data-sonogramic-scenic-animated="v3"')
          ? spec.backgroundSvg
          : compileDetailedSliceSvg(input);
      compiledList[i] = svgXml;
      if (spec) {
        spec.backgroundSvg = svgXml;
        spec.generatedByAgent = true;
      }

      if (forceRebuild || !data.bgImages[i]) {
        const blobUrl = svgStringToBlobUrl(svgXml);
        if (blobUrl) {
          if (data.bgImages[i] && (data.bgImages[i] as any).parentNode) {
            (data.bgImages[i] as any).parentNode.removeChild(data.bgImages[i]);
          }
          data.bgImages[i] = createMountedSvgImage(blobUrl, () =>
            updateState(),
          );
        }
      }
    }
    compiledSliceSvgsRef.current = compiledList;
    if (okfProjectRef.current?.config) {
      okfProjectRef.current.config.svgMode = "segments";
    }
  };

  // Algorithmic local Reinhard Color Transfer to harmonize adjacent slices (Zero AI)
  const matchImageProperties = async (
    prevImgSource: HTMLImageElement | HTMLVideoElement,
    currentImgSource: HTMLImageElement,
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const prevCanvas = document.createElement("canvas");
      const currCanvas = document.createElement("canvas");

      const w = currentImgSource.naturalWidth || 1024;
      const h = currentImgSource.naturalHeight || 1024;

      prevCanvas.width = w;
      prevCanvas.height = h;
      currCanvas.width = w;
      currCanvas.height = h;

      const prevCtx = prevCanvas.getContext("2d");
      const currCtx = currCanvas.getContext("2d");

      if (!prevCtx || !currCtx) return resolve(null);

      try {
        prevCtx.drawImage(prevImgSource, 0, 0, w, h);
        currCtx.drawImage(currentImgSource, 0, 0, w, h);

        const sliceW = Math.floor(w * 0.2);
        const prevDataSlice = prevCtx.getImageData(w - sliceW, 0, sliceW, h);
        const currDataSlice = currCtx.getImageData(0, 0, sliceW, h);

        let pR = 0,
          pG = 0,
          pB = 0;
        let cR = 0,
          cG = 0,
          cB = 0;
        const slicePixels = sliceW * h;

        for (let i = 0; i < prevDataSlice.data.length; i += 4) {
          pR += prevDataSlice.data[i];
          pG += prevDataSlice.data[i + 1];
          pB += prevDataSlice.data[i + 2];

          cR += currDataSlice.data[i];
          cG += currDataSlice.data[i + 1];
          cB += currDataSlice.data[i + 2];
        }

        const meanPR = pR / slicePixels,
          meanPG = pG / slicePixels,
          meanPB = pB / slicePixels;
        const meanCR = cR / slicePixels,
          meanCG = cG / slicePixels,
          meanCB = cB / slicePixels;

        let varPR = 0,
          varPG = 0,
          varPB = 0;
        let varCR = 0,
          varCG = 0,
          varCB = 0;

        for (let i = 0; i < prevDataSlice.data.length; i += 4) {
          varPR += Math.pow(prevDataSlice.data[i] - meanPR, 2);
          varPG += Math.pow(prevDataSlice.data[i + 1] - meanPG, 2);
          varPB += Math.pow(prevDataSlice.data[i + 2] - meanPB, 2);

          varCR += Math.pow(currDataSlice.data[i] - meanCR, 2);
          varCG += Math.pow(currDataSlice.data[i + 1] - meanCG, 2);
          varCB += Math.pow(currDataSlice.data[i + 2] - meanCB, 2);
        }

        const stdPR = Math.sqrt(varPR / slicePixels),
          stdPG = Math.sqrt(varPG / slicePixels),
          stdPB = Math.sqrt(varPB / slicePixels);
        const stdCR = Math.sqrt(varCR / slicePixels),
          stdCG = Math.sqrt(varCG / slicePixels),
          stdCB = Math.sqrt(varCB / slicePixels);

        const safeDiv = (val: number) => (val === 0 ? 1 : val);
        const currDataGlobal = currCtx.getImageData(0, 0, w, h);

        const blendFactor = 0.45;
        for (let i = 0; i < currDataGlobal.data.length; i += 4) {
          const r = currDataGlobal.data[i];
          const g = currDataGlobal.data[i + 1];
          const b = currDataGlobal.data[i + 2];

          const targetR = Math.min(
            255,
            Math.max(0, (r - meanCR) * (stdPR / safeDiv(stdCR)) + meanPR),
          );
          const targetG = Math.min(
            255,
            Math.max(0, (g - meanCG) * (stdPG / safeDiv(stdCG)) + meanPG),
          );
          const targetB = Math.min(
            255,
            Math.max(0, (b - meanCB) * (stdPB / safeDiv(stdCB)) + meanPB),
          );

          currDataGlobal.data[i] =
            r * (1 - blendFactor) + targetR * blendFactor;
          currDataGlobal.data[i + 1] =
            g * (1 - blendFactor) + targetG * blendFactor;
          currDataGlobal.data[i + 2] =
            b * (1 - blendFactor) + targetB * blendFactor;
        }

        currCtx.putImageData(currDataGlobal, 0, 0);

        currCanvas.toBlob(
          (b) => {
            resolve(b || null);
          },
          "image/jpeg",
          0.92,
        );
      } catch (err) {
        console.error("Color transfer failed", err);
        resolve(null);
      }
    });
  };

  const harmonizeAllSlicesColors = async () => {
    const data = analysisDataRef.current;
    if (!data?.bgImages || data.bgImages.length < 2) return;

    for (let i = 1; i < data.bgImages.length; i++) {
      const prev = data.bgImages[i - 1];
      const curr = data.bgImages[i];
      if (
        prev &&
        curr &&
        isMediaReady(prev) &&
        isMediaReady(curr) &&
        curr instanceof HTMLImageElement
      ) {
        const harmonizedBlob = await matchImageProperties(prev, curr);
        if (harmonizedBlob) {
          const newUrl = URL.createObjectURL(harmonizedBlob);
          const newImg = new Image();
          await new Promise<void>((res) => {
            newImg.onload = () => res();
            newImg.onerror = () => res();
            newImg.src = newUrl;
          });
          if (curr.src.startsWith("blob:")) URL.revokeObjectURL(curr.src);
          data.bgImages[i] = newImg;
        }
      }
    }
    updateState();
  };

  // Render the structural layout template (white rectangles on black background) for a slice
  const renderSliceLayoutDataUrl = (index: number): string | null => {
    const data = analysisDataRef.current;
    if (!data || !data.bounds || !data.platforms) return null;
    const slices = data.bgImages?.length || 6;
    if (index < 0 || index >= slices) return null;

    const sb = computeSliceBounds(data, index, slices);
    const width = 1024;
    const height = 1024;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const scale = width / sb.size;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-sb.x, -sb.y);

    // If previous slice has an image, draw its right edge on the left overlap for seamless reference
    if (index > 0 && data.bgImages && isMediaReady(data.bgImages[index - 1])) {
      const prevImg = data.bgImages[index - 1] as any;
      const prevSb = computeSliceBounds(data, index - 1, slices);
      ctx.drawImage(prevImg, prevSb.x, prevSb.y, prevSb.size, prevSb.size);
    }

    const allTrackPlatforms = [
      data.platforms,
      ...(data.extraTracks || []).map((t: any) => t.platforms),
    ];

    for (const group of allTrackPlatforms) {
      for (const p of group) {
        if (p.x + p.w < sb.x || p.x - p.w > sb.x + sb.size) continue;
        ctx.fillStyle = "#ffffff";
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.angle) ctx.rotate(p.angle);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const downloadSliceLayout = (index: number) => {
    const svgXml = compiledSliceSvgsRef.current[index];
    if (svgXml) {
      const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `segmento_${index + 1}_trayecto_exacto.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      return;
    }
    const dataUrl = renderSliceLayoutDataUrl(index);
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `plantilla_guia_segmento_${index + 1}.jpg`;
    a.click();
  };

  const downloadAllSliceLayouts = () => {
    const count = analysisDataRef.current?.bgImages?.length || 0;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        downloadSliceLayout(i);
      }, i * 180);
    }
  };

  const downloadMasterSvg = () => {
    const data = analysisDataRef.current;
    if (!data || !data.bounds || !data.platforms) return;
    const specs = sliceSpecsRef.current || [];
    const totalWidth = Math.max(800, data.bounds.maxX - data.bounds.minX);
    const duration = data.duration || totalWidth / 800;
    const sectionCount = Math.max(1, specs.length);
    const melodyColor = extraTracksConfigRef.current?.melody?.color || "#fbbf24";
    const bassColor = extraTracksConfigRef.current?.bass?.color || "#38bdf8";

    const sliceInputs: TrajectoryCompilerInput[] = [];
    for (let i = 0; i < sectionCount; i++) {
      const spec = specs[i];
      let sMinX = (i * totalWidth) / sectionCount;
      let sMaxX = ((i + 1) * totalWidth) / sectionCount;
      if (
        spec &&
        typeof spec.startTime === "number" &&
        typeof spec.endTime === "number" &&
        spec.endTime > spec.startTime &&
        duration > 0
      ) {
        sMinX = (spec.startTime / duration) * totalWidth;
        sMaxX =
          i === sectionCount - 1
            ? totalWidth
            : (spec.endTime / duration) * totalWidth;
      }
      sliceInputs.push({
        sliceIndex: i,
        totalSlices: sectionCount,
        sliceMinX: sMinX,
        sliceMaxX: sMaxX,
        worldMinY: -960,
        worldMaxY: 640,
        positions: data.positions,
        platforms: data.platforms,
        extraTracks: data.extraTracks,
        spec,
        projectTitle: okfProjectRef.current?.metadata?.title,
        environmentConcept: environmentConceptRef.current,
        melodyColor,
        bassColor,
      });
    }

    const masterSvgXml = compileFullMasterSvg(
      sliceInputs,
      data.bounds.minX,
      data.bounds.maxX,
      -960,
      640,
    );
    const blob = new Blob([masterSvgXml], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (okfProjectRef.current?.metadata?.title || "musicograma")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    a.href = url;
    a.download = `musicograma_completo_${safeTitle}_trayecto_exacto.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const downloadSlice = (index: number) => {
    const svgXml = compiledSliceSvgsRef.current[index];
    if (svgXml) {
      const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `escena_svg_segmento_${index + 1}.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      return;
    }
    const img = analysisDataRef.current?.bgImages?.[index];
    if (isMediaReady(img)) {
      const c = document.createElement("canvas");
      if (img instanceof HTMLVideoElement) {
        c.width = img.videoWidth || 1920;
        c.height = img.videoHeight || 540;
      } else {
        c.width = (img as HTMLImageElement).naturalWidth || 1024;
        c.height = (img as HTMLImageElement).naturalHeight || 1024;
      }
      const cx = c.getContext("2d");
      if (cx) {
        cx.drawImage(img as any, 0, 0);
        const dataUrl = c.toDataURL("image/jpeg", 0.92);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `imagen_segmento_${index + 1}.jpg`;
        a.click();
      }
    }
  };

  const replaceSlice = (index: number, file: File) => {
    if (!analysisDataRef.current) return;
    if (
      file.type === "image/svg+xml" ||
      file.name.toLowerCase().endsWith(".svg")
    ) {
      file
        .text()
        .then((txt) => {
          compiledSliceSvgsRef.current[index] = txt;
        })
        .catch(() => {});
    }
    const url = URL.createObjectURL(file);

    const isVideo = file.type.startsWith("video/");
    const data = analysisDataRef.current;
    data.bgImages = data.bgImages || [];

    if (data.bgImages[index]) {
      const oldUrl = (data.bgImages[index] as any)?.src;
      if (oldUrl && oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
    }

    if (isVideo) {
      const vid = document.createElement("video");
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.play().catch((e) => console.error("Error playing video", e));
      data.bgImages[index] = vid;
      vid.onloadeddata = () => {
        updateState();
      };
    } else {
      const img = new Image();
      data.bgImages[index] = img;
      img.onload = () => {
        updateState();
      };
      img.src = url;
    }
  };

  const replaceSlicesBatch = (files: FileList | File[]) => {
    if (!analysisDataRef.current) return;
    const fileArr = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    if (fileArr.length === 0) return;

    const currentCount = analysisDataRef.current.bgImages?.length || 0;
    if (fileArr.length > currentCount) {
      const oldImages = analysisDataRef.current.bgImages || [];
      const newImages = new Array(fileArr.length).fill(null);
      for (let i = 0; i < oldImages.length; i++) {
        newImages[i] = oldImages[i];
      }
      analysisDataRef.current.bgImages = newImages;
    }

    fileArr.forEach((f, idx) => {
      replaceSlice(idx, f);
    });
  };

  const restoreOkfBackgrounds = () => {
    if (!analysisDataRef.current) return;
    const specs = okfProjectRef.current?.sliceSpecs || [];
    const count =
      analysisDataRef.current.bgImages?.length || specs.length || 6;
    compileAndAssignAlignedSvgs(count, true);
    updateState();
  };

  useImperativeHandle(ref, () => ({
    play,
    pause,
    rewind,
    seekTo,
    startRecording,
    stopRecording,
    startFullVideoCapture,
    exportVideo,
    downloadSliceLayout,
    downloadAllSliceLayouts,
    downloadMasterSvg,
    downloadSlice,
    replaceSlice,
    replaceSlicesBatch,
    restoreOkfBackgrounds,
    harmonizeAllSlicesColors,
    setMosaicSlices: (count: number) => {
      if (analysisDataRef.current && count > 0) {
        compileAndAssignAlignedSvgs(count, true);
        updateState();
      }
    },
    setZoom: (zoom: number) => {
      userZoomRef.current = zoom;
    },
    getZoom: () => userZoomRef.current,
    setZoomVariation: (val: number) => {
      zoomVariationRef.current = Math.max(0, Math.min(1.5, val));
    },
    setPlatformOpacity: (op: number) => {
      platformOpacityRef.current = op;
    },
    setBgOffsetY: (offset: number) => {
      bgOffsetYRef.current = offset;
    },
    getBgImagesCount: () => analysisDataRef.current?.bgImages?.length || 0,
    exportProject: () => {
      const d = analysisDataRef.current;
      if (!d) return null;

      const slicesCount = d.bgImages?.length || 6;
      const isSingleSvg = slicesCount === 1;
      const baseSpecs = okfProject?.sliceSpecs || sliceSpecsRef.current || [];
      const exportedSliceSpecs = baseSpecs.map((spec, idx) => ({
        ...spec,
        generatedByAgent: true,
        backgroundSvg:
          (!isSingleSvg && compiledSliceSvgsRef.current[idx]) ||
          spec.backgroundSvg ||
          "",
      }));

      return {
        okfVersion: "1.4.0",
        metadata: okfProject?.metadata || {
          title: audioFile?.name || "Musicograma Sonogramic",
          composer: "Autor Desconocido",
          durationSeconds: d.duration,
          bpm: 120,
          emotions: emotionsRef.current,
          environmentConcept: environmentConceptRef.current,
        },
        sliceSpecs: exportedSliceSpecs,
        musicalStructure: okfProject?.musicalStructure,
        config: {
          ballConfig: ballConfigRef.current,
          extraTracksConfig: extraTracksConfigRef.current,
          cameraSmoothness: cameraSmoothnessRef.current,
          userKeywords: userKeywordsRef.current,
          zoom: userZoomRef.current,
          platformOpacity: platformOpacityRef.current,
          bgOffsetY: bgOffsetYRef.current,
          mosaicSlices: slicesCount,
          svgMode: isSingleSvg ? "single" : "segments",
          ...(isSingleSvg && compiledSliceSvgsRef.current[0]
            ? { masterSceneSvg: compiledSliceSvgsRef.current[0] }
            : {}),
        },
        data: {
          positions: d.positions.map((p) => ({
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            angle: parseFloat(p.angle.toFixed(4)),
            isImpact: p.isImpact,
            zoom: parseFloat((p.zoom ?? 1.0).toFixed(3)),
          })),
          platforms: d.platforms,
          extraTracks: d.extraTracks,
          duration: d.duration,
          frames: d.frames,
          bounds: d.bounds,
          bgSvgs: [...compiledSliceSvgsRef.current],
        },
      };
    },
    setBallConfig: (config: any) => {
      const oldSvg = ballConfigRef.current.svgContent;
      ballConfigRef.current = { ...ballConfigRef.current, ...config };
      if (
        config.svgContent &&
        (config.svgContent !== oldSvg || !svgImageCacheRef.current["main"])
      ) {
        preloadCustomGraphic(config.svgContent, (img, url) => {
          if (svgUrlCacheRef.current["main"])
            URL.revokeObjectURL(svgUrlCacheRef.current["main"]);
          if (svgImageCacheRef.current["main"]?.parentNode) {
            svgImageCacheRef.current["main"]?.parentNode.removeChild(
              svgImageCacheRef.current["main"]!,
            );
          }
          svgImageCacheRef.current["main"] = img;
          if (url) svgUrlCacheRef.current["main"] = url;
        });
      }
    },
    setExtraTrackConfig: (trackId: string, config: any) => {
      if (extraTracksConfigRef.current[trackId]) {
        const oldSvg = extraTracksConfigRef.current[trackId].svgContent;
        extraTracksConfigRef.current[trackId] = {
          ...extraTracksConfigRef.current[trackId],
          ...config,
        };
        if (
          config.svgContent &&
          (config.svgContent !== oldSvg || !svgImageCacheRef.current[trackId])
        ) {
          preloadCustomGraphic(config.svgContent, (img, url) => {
            if (svgUrlCacheRef.current[trackId])
              URL.revokeObjectURL(svgUrlCacheRef.current[trackId]);
            if (svgImageCacheRef.current[trackId]?.parentNode) {
              svgImageCacheRef.current[trackId]?.parentNode.removeChild(
                svgImageCacheRef.current[trackId]!,
              );
            }
            svgImageCacheRef.current[trackId] = img;
            if (url) svgUrlCacheRef.current[trackId] = url;
          });
        }
      }
    },
    setCameraSmoothness: (val: number) => {
      cameraSmoothnessRef.current = val;
    },
    setUserKeywords: (keywords: string) => {
      userKeywordsRef.current = keywords;
    },
  }));

  const drawShapeOrGraphic = (
    ctx: CanvasRenderingContext2D,
    shape: string,
    radius: number,
    cacheKey: string,
    fillColor: string,
    effect: string,
    hitFlash: number = 0,
  ) => {
    if (shape === "custom-svg" && svgImageCacheRef.current[cacheKey]) {
      const img = svgImageCacheRef.current[cacheKey]!;
      const scaleMul = cacheKey === "main" ? 1.55 : 1.35;
      if (hitFlash > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius * scaleMul * 1.18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(253, 224, 71, 0.42)";
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#fde047";
        ctx.fill();
        ctx.restore();
      }
      ctx.drawImage(
        img,
        -radius * scaleMul,
        -radius * scaleMul,
        radius * scaleMul * 2,
        radius * scaleMul * 2,
      );
      return;
    }

    ctx.beginPath();
    if (shape === "square") {
      ctx.rect(-radius, -radius, radius * 2, radius * 2);
    } else if (shape === "hexagon") {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * (radius + 2);
        const py = Math.sin(angle) * (radius + 2);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === "star") {
      const spikes = 5;
      const outerRadius = radius + 4;
      const innerRadius = radius * 0.48;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === "music-note") {
      ctx.arc(-4, 6, radius * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(radius * 0.45, 6);
      ctx.lineTo(radius * 0.45, -radius * 1.2);
      ctx.lineTo(radius * 1.1, -radius * 0.85);
      ctx.stroke();
      return;
    } else {
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
    }

    ctx.fillStyle = fillColor;

    if (effect === "glow") {
      ctx.shadowBlur = 20;
      ctx.shadowColor = hitFlash > 0 ? "#fde047" : fillColor;
    } else if (effect === "outline") {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hitFlash > 0 ? "#fde047" : "#000000";
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fill();

    if (shape === "circle" || shape === "square") {
      ctx.strokeStyle = effect === "outline" ? "#000000" : "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 14);
      ctx.stroke();
    }
  };

  const renderFrame = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const data = analysisDataRef.current;
    const hasExternalAudio = !!(
      audioFileRef.current &&
      audioRef.current &&
      audioUrlRef.current
    );
    const duration =
      (hasExternalAudio && getValidAudioElementDuration()) ||
      data?.duration ||
      90;

    // Advance clock with sub-frame high-resolution interpolation for external audio or virtual clock
    let time = 0;
    let isPaused = true;

    if (hasExternalAudio && audioRef.current) {
      const rawAudioTime = audioRef.current.currentTime || 0;
      isPaused = audioRef.current.paused;
      const now = performance.now();

      if (isPaused || Math.abs(rawAudioTime - audioClockSyncRef.current.lastElemTime) > 0.25) {
        audioClockSyncRef.current.lastElemTime = rawAudioTime;
        audioClockSyncRef.current.lastPerfTime = now;
        time = rawAudioTime;
      } else {
        if (rawAudioTime !== audioClockSyncRef.current.lastElemTime) {
          audioClockSyncRef.current.lastElemTime = rawAudioTime;
          audioClockSyncRef.current.lastPerfTime = now;
        }
        const subFrameElapsed = Math.min(
          0.045,
          Math.max(0, (now - audioClockSyncRef.current.lastPerfTime) / 1000),
        );
        const rate = audioRef.current.playbackRate || 1.0;
        const activeCtx = contextRef.current?.audioCtx as any;
        const outputLat =
          activeCtx && activeCtx.state === "running"
            ? Number(activeCtx.outputLatency || activeCtx.baseLatency || 0)
            : 0;
        time = Math.max(
          0,
          Math.min(
            duration,
            rawAudioTime + subFrameElapsed * rate - Math.min(0.06, outputLat * 0.5),
          ),
        );
      }
    } else {
      isPaused = !isPlayingRef.current;
      if (!isPaused) {
        const now = performance.now();
        const dt = Math.min(
          0.1,
          Math.max(0, (now - lastWallTimeRef.current) / 1000),
        );
        lastWallTimeRef.current = now;
        virtualTimeRef.current += dt;
        if (virtualTimeRef.current >= duration) {
          virtualTimeRef.current = duration;
          isPlayingRef.current = false;
          setIsPlaying(false);
          if (isRecordingRef.current) {
            stopRecording();
          } else {
            updateState(false, false);
          }
        }
      }
      time = virtualTimeRef.current;
    }

    if (progressRef.current && !isDraggingRef.current && duration > 0) {
      progressRef.current.value = ((time / duration) * 100).toString();
    }

    const tFloat = time * 60;
    const frameIdx = Math.floor(tFloat);
    const frac = tFloat - frameIdx;
    const isNewFrame = !isPaused && frameIdx !== lastFrameIdxRef.current;
    if (!isPaused) {
      lastFrameIdxRef.current = frameIdx;
    }

    if (data && data.positions.length > 0) {
      const clampedIdx = Math.min(
        Math.max(0, frameIdx),
        data.positions.length - 1,
      );
      const p1 = data.positions[clampedIdx];
      const p2 = data.positions[clampedIdx + 1] || p1;

      const exactX = p1.x + (p2.x - p1.x) * frac;
      const exactY = p1.y + (p2.y - p1.y) * frac;

      const z1 = p1.zoom || 1.0;
      const z2 = p2.zoom || z1;
      const exactZoom = z1 + (z2 - z1) * frac;

      let a1 = p1.angle || 0;
      let a2 = p2.angle || a1;
      if (a2 - a1 > Math.PI) a1 += Math.PI * 2;
      if (a1 - a2 > Math.PI) a2 += Math.PI * 2;
      const exactAngle = a1 + (a2 - a1) * frac;

      const ballPos = {
        ...p1,
        x: exactX,
        y: exactY,
        zoom: exactZoom,
        angle: exactAngle,
      };

      // Camera Math: Lock horizontal X directly to ballPos.x for zero horizontal phase lag,
      // while cameraSmoothnessRef (0% to 100%) controls both vertical jump isolation (steady horizon vs locked to sphere) and temporal inertia
      const smooth = Math.min(
        1.0,
        Math.max(0, cameraSmoothnessRef.current ?? 0.82),
      );
      const steadyHorizonY = -45;
      const verticalFollow = Math.pow(1.0 - smooth, 1.55);
      const desiredCamY =
        steadyHorizonY + (ballPos.y - steadyHorizonY) * verticalFollow;

      if (!cameraPosRef.current) {
        cameraPosRef.current = { x: ballPos.x, y: desiredCamY };
      } else {
        const distSq =
          (ballPos.x - cameraPosRef.current.x) ** 2 +
          (desiredCamY - cameraPosRef.current.y) ** 2;
        if (distSq > 1500000) {
          cameraPosRef.current = { x: ballPos.x, y: desiredCamY };
        } else {
          const tY = isPaused
            ? 0.28
            : 0.008 + Math.pow(1.0 - smooth, 2.1) * 0.992;

          cameraPosRef.current.x = ballPos.x;
          cameraPosRef.current.y +=
            (desiredCamY - cameraPosRef.current.y) * tY;
        }
      }

      const topCamX = cameraPosRef.current.x;
      const topCamY = cameraPosRef.current.y;

      const targetCy = height * 0.6;
      const targetCx = width * 0.3;

      ctx.save();
      ctx.translate(targetCx, targetCy);

      // Wide, smooth dynamic camera zoom regulated by userZoomRef (base zoom), zoomVariationRef (0% to 150%), and cameraSmoothnessRef (0% to 100%)
      const rawZoomFactor = Math.max(0.28, Math.min(2.2, ballPos.zoom || 1.0));
      const dynamicScale = Math.pow(
        rawZoomFactor,
        zoomVariationRef.current * 1.18,
      );
      const targetZoom = Math.max(
        0.18,
        Math.min(2.6, userZoomRef.current * dynamicScale),
      );
      if (cameraZoomRef.current === null) {
        cameraZoomRef.current = targetZoom;
      } else {
        const alphaZ = isPaused
          ? 0.25
          : 0.004 + Math.pow(1.0 - smooth, 2.2) * 0.996;
        cameraZoomRef.current +=
          (targetZoom - cameraZoomRef.current) * alphaZ;
      }
      const zoom = cameraZoomRef.current;
      ctx.scale(zoom, zoom);
      ctx.translate(-topCamX, -topCamY);

      const viewMinX = topCamX - (width * 0.35) / zoom;
      const viewMaxX = topCamX + (width * 0.75) / zoom;

      // Draw Trajectory-Aligned Vector SVG Background Slices
      if (data.bgImages && data.bgImages.length > 0 && data.bounds) {
        ctx.save();
        ctx.globalAlpha = 0.98;

        for (let i = 0; i < data.bgImages.length; i++) {
          const bgImg = data.bgImages[i];
          const sb = computeSliceBounds(data, i, data.bgImages.length);

          if (
            sb.sliceMinX + sb.sliceWorldWidth < viewMinX ||
            sb.sliceMinX > viewMaxX
          )
            continue;

          if (isMediaReady(bgImg)) {
            const imgEl = bgImg as any;
            ctx.save();
            ctx.beginPath();
            ctx.rect(
              sb.sliceMinX,
              bgOffsetYRef.current - 50000,
              sb.sliceWorldWidth,
              100000,
            );
            ctx.clip();
            ctx.drawImage(
              imgEl,
              sb.x,
              sb.y + bgOffsetYRef.current,
              sb.width,
              sb.height,
            );
            ctx.restore();
          } else {
            // Render stylized OKF Slice Card Placeholder when no image is uploaded yet
            const spec = sliceSpecsRef.current[i];
            const palette = spec?.recommendedPalette || [
              "#0f172a",
              "#1e1b4b",
              "#7e22ce",
            ];
            const drawY = data.bounds.minY + bgOffsetYRef.current;
            const worldH = Math.max(
              0.0001,
              data.bounds.maxY - data.bounds.minY,
            );

            ctx.save();
            const grad = ctx.createLinearGradient(
              sb.sliceMinX,
              drawY,
              sb.sliceMinX + sb.sliceWorldWidth,
              drawY + worldH,
            );
            grad.addColorStop(0, palette[0] || "#0f172a");
            grad.addColorStop(0.5, palette[1] || "#1e1b4b");
            grad.addColorStop(1, palette[0] || "#0f172a");
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(sb.sliceMinX, drawY, sb.sliceWorldWidth, worldH);

            ctx.globalAlpha = Math.max(0.3, platformOpacityRef.current);
            ctx.strokeStyle = palette[2] || "rgba(168, 85, 247, 0.45)";
            ctx.lineWidth = 4 / zoom;
            ctx.setLineDash([24, 18]);
            ctx.strokeRect(sb.sliceMinX, drawY, sb.sliceWorldWidth, worldH);
            ctx.restore();
          }
        }
        ctx.restore();
      }

      // Impact flashes & synthetic beat audio fallback (scan recent 3-frame window so no beat impact is ever skipped across rAF ticks)
      let hitFlash = 0;
      let triggeredImpact = false;
      for (
        let checkIdx = Math.max(0, clampedIdx - 1);
        checkIdx <= Math.min(data.positions.length - 1, clampedIdx + 1);
        checkIdx++
      ) {
        if (data.positions[checkIdx]?.isImpact) {
          hitFlash = 1.0;
          if (isNewFrame && Math.abs(checkIdx - lastSynthBeatIdxRef.current) > 2) {
            lastSynthBeatIdxRef.current = checkIdx;
            triggeredImpact = true;
          }
          break;
        }
      }

      if (triggeredImpact) {
        const isHigh = ballPos.y < -180;
        const isLow = ballPos.y > 140;

        if (!hasExternalAudio) {
          triggerSyntheticBeatTone(
            isHigh ? "accelerator" : "major",
            ballPos.y,
          );
        }

        for (let i = 0; i < 10; i++) {
          data.particles.push({
            x: ballPos.x,
            y: ballPos.y + 20,
            vx: (Math.random() - 0.5) * (isHigh ? 25 : 15),
            vy: Math.random() * (isLow ? -30 : -15),
            life: 1.0,
            type: isHigh ? "spark-high" : isLow ? "spark-low" : "spark",
          });
        }
      }

      // Live 60 FPS Scenic Animation & Reactive Bounce Ripples on the SVG Elements (Zero Mechanical Boxes when SVG is present)
      ctx.lineCap = "round";
      const animT = performance.now() * 0.001;
      const allTrackPlatforms = [
        {
          platforms: data.platforms,
          isMain: true,
          trackId: "main",
          sphereX: ballPos.x,
          sphereY: ballPos.y,
          color: "#fbbf24",
        },
        ...(data.extraTracks || []).map((t) => {
          const clampedExtraIdx = Math.min(
            Math.max(0, frameIdx),
            t.positions.length - 1,
          );
          const ep = t.positions[clampedExtraIdx] || { x: ballPos.x, y: ballPos.y };
          return {
            platforms: t.platforms,
            isMain: false,
            trackId: t.id,
            sphereX: ep.x,
            sphereY: ep.y,
            color: extraTracksConfigRef.current[t.id]?.color || "#38bdf8",
          };
        }),
      ];

      for (const group of allTrackPlatforms) {
        let lastDrawnX = -99999;
        for (let pIdx = 0; pIdx < group.platforms.length; pIdx++) {
          const p = group.platforms[pIdx];
          if (p.x + p.w > viewMinX && p.x - p.w < viewMaxX) {
            if (!group.isMain && p.x - lastDrawnX < 155) continue;
            lastDrawnX = p.x;

            const distX = Math.abs(group.sphereX - p.x);
            const proximity = Math.max(0, 1 - distX / Math.max(70, p.w * 0.75));
            const phase = animT * 2.6 + pIdx * 1.15;
            const halfW = Math.max(38, p.w * 0.45);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(group.isMain ? p.angle * 0.5 : 0);

            // 1. Continuous 60 FPS ambient scenic animation around the drawn SVG element
            if (group.isMain) {
              // Orbiting/swaying fireflies, blossom petals, or fountain droplets around the main scenic element
              const orbX = Math.sin(phase) * (halfW * 0.65);
              const orbY = -14 + Math.cos(phase * 1.3) * 8;
              ctx.globalAlpha = 0.45 + 0.35 * Math.sin(phase * 1.7);
              ctx.fillStyle =
                p.type === "major"
                  ? "#fbcfe8"
                  : p.type === "accelerator"
                    ? "#fde047"
                    : "#bae6fd";
              ctx.beginPath();
              ctx.arc(orbX, orbY, 3.5, 0, Math.PI * 2);
              ctx.fill();

              const orbX2 = -Math.cos(phase * 0.9) * (halfW * 0.58);
              const orbY2 = -8 + Math.sin(phase * 1.4) * 7;
              ctx.beginPath();
              ctx.arc(orbX2, orbY2, 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (group.trackId === "bass") {
              // Continuous animated water/resonance ripple ring under the Bass lily pad / plinth
              const rippleCycle = (animT * 0.65 + pIdx * 0.27) % 1;
              ctx.globalAlpha = (1 - rippleCycle) * 0.38;
              ctx.strokeStyle = group.color;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(
                0,
                2,
                halfW * (0.75 + rippleCycle * 0.55),
                6 + rippleCycle * 6,
                0,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
            } else if (group.trackId === "melody") {
              // Gentle animated shimmer on the aerial cloud / crystal perch
              const shimmer = 0.22 + 0.18 * Math.sin(phase);
              ctx.globalAlpha = shimmer;
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(
                Math.sin(phase * 0.7) * (halfW * 0.4),
                -8,
                3,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
            }

            // 2. Elastic Bounce Ripple & Cushion Glow when the sphere lands on this SVG element!
            if (proximity > 0.02) {
              const rippleR = halfW * (0.45 + (1 - proximity) * 0.65);
              ctx.globalAlpha = proximity * 0.78;
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 3 * proximity;
              ctx.shadowColor = group.color;
              ctx.shadowBlur = 16 * proximity;
              ctx.beginPath();
              ctx.ellipse(
                0,
                -10 + proximity * 3,
                rippleR,
                4.5 + (1 - proximity) * 4,
                0,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
            }

            ctx.restore();
          }
        }
      }

      const isHigh = ballPos.y < -300;
      const isLow = ballPos.y > 300;

      let ballColor = "#ffffff";
      if (ballConfigRef.current.color === "dynamic") {
        ballColor = isHigh ? "#f43f5e" : isLow ? "#10b981" : "#ffffff";
      } else {
        ballColor = ballConfigRef.current.color;
      }

      // Moving Sparks
      for (let i = data.particles.length - 1; i >= 0; i--) {
        const part = data.particles[i];
        if (part.vx !== 0 || part.vy !== 0) {
          if (!isPaused) {
            part.x += part.vx;
            part.y += part.vy;
            part.vy += 0.5;
            part.life -= 0.03;
            if (part.life <= 0) {
              data.particles.splice(i, 1);
              continue;
            }
          }

          ctx.beginPath();
          ctx.arc(part.x, part.y, 4 * part.life, 0, Math.PI * 2);
          if (part.type === "spark-high") {
            ctx.fillStyle = `rgba(244, 63, 94, ${part.life})`;
          } else if (part.type === "spark-low") {
            ctx.fillStyle = `rgba(16, 185, 129, ${part.life})`;
          } else {
            ctx.fillStyle = `rgba(253, 224, 71, ${part.life})`;
          }
          ctx.fill();
        }
      }

      // Trail effect
      if (isNewFrame && frameIdx % 3 === 0) {
        data.particles.push({
          x: ballPos.x,
          y: ballPos.y,
          vx: 0,
          vy: 0,
          life: 1.0,
          type: isHigh ? "spark-high" : isLow ? "spark-low" : "trail",
        });
      }

      const ballColorStr = ballColor.startsWith("#")
        ? `${parseInt(ballColor.substring(1, 3), 16)}, ${parseInt(ballColor.substring(3, 5), 16)}, ${parseInt(ballColor.substring(5, 7), 16)}`
        : "255, 255, 255";

      for (let i = data.particles.length - 1; i >= 0; i--) {
        const part = data.particles[i];
        if (part.vx === 0 && part.vy === 0) {
          if (!isPaused) {
            part.life -= 0.05;
            if (part.life <= 0) {
              data.particles.splice(i, 1);
              continue;
            }
          }
          if (ballConfigRef.current.effect === "none") continue;
          ctx.beginPath();
          ctx.arc(part.x, part.y, 20 * part.life, 0, Math.PI * 2);
          let tColor =
            ballConfigRef.current.color === "dynamic"
              ? "255, 255, 255"
              : ballColorStr;
          if (ballConfigRef.current.color === "dynamic") {
            if (part.type === "spark-high") tColor = "244, 63, 94";
            else if (part.type === "spark-low") tColor = "16, 185, 129";
          }
          ctx.fillStyle = `rgba(${tColor}, ${part.life * 0.3})`;
          ctx.fill();
        }
      }

      const radius = 20;

      // Draw Main Sphere
      ctx.save();
      ctx.globalAlpha = ballConfigRef.current.opacity ?? 1.0;
      ctx.translate(ballPos.x, ballPos.y);
      if (ballConfigRef.current.rotate !== false) {
        ctx.rotate(ballPos.angle);
      }
      drawShapeOrGraphic(
        ctx,
        ballConfigRef.current.shape,
        radius,
        "main",
        ballColor,
        ballConfigRef.current.effect,
        hitFlash,
      );
      ctx.restore();

      // Draw Auxiliary Spheres (Melody & Bass)
      if (data.extraTracks) {
        for (const t of data.extraTracks) {
          const clampedExtraIdx = Math.min(
            Math.max(0, frameIdx),
            t.positions.length - 1,
          );
          const baseP = t.positions[clampedExtraIdx];
          if (baseP) {
            const tPos = { ...baseP };
            if (clampedExtraIdx < t.positions.length - 1) {
              const p2Extra = t.positions[clampedExtraIdx + 1];
              if (p2Extra) {
                tPos.x += (p2Extra.x - tPos.x) * frac;
                tPos.y += (p2Extra.y - tPos.y) * frac;
                let a1Extra = tPos.angle;
                let a2Extra = p2Extra.angle;
                if (a2Extra - a1Extra > Math.PI) a1Extra += Math.PI * 2;
                if (a1Extra - a2Extra > Math.PI) a2Extra += Math.PI * 2;
                tPos.angle = a1Extra + (a2Extra - a1Extra) * frac;
              }
            }

            ctx.save();
            const config = extraTracksConfigRef.current[t.id];
            ctx.globalAlpha = config?.opacity ?? 1.0;
            ctx.translate(tPos.x, tPos.y);
            if (config?.rotate !== false) {
              ctx.rotate(tPos.angle);
            }

            drawShapeOrGraphic(
              ctx,
              config?.shape || "circle",
              radius,
              t.id,
              config?.color || "#ffffff",
              config?.effect || "glow",
              0,
            );
            ctx.restore();
          }
        }
      }

      ctx.restore(); // camera restore
    }

    animationFrameIdRef.current = requestAnimationFrame(() =>
      renderFrameRef.current(),
    );
  };
  renderFrameRef.current = renderFrame;

  return (
    <div className="relative group/player w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        onClick={() => {
          if (hidePlaybackBar) {
            isPlaying ? pause() : play();
          }
        }}
        title={
          hidePlaybackBar
            ? isPlaying
              ? "Clic para pausar"
              : "Clic para reproducir"
            : undefined
        }
        className={`w-full h-full object-cover ${hidePlaybackBar ? "cursor-pointer" : ""}`}
      />

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="auto"
        onLoadedMetadata={() => {
          updateState();
        }}
        onPlay={() => {
          isPlayingRef.current = true;
          setIsPlaying(true);
          updateState(true);
        }}
        onPause={() => {
          if (!audioRef.current?.ended) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            updateState(false);
          }
        }}
        onEnded={() => {
          isPlayingRef.current = false;
          setIsPlaying(false);
          if (isRecordingRef.current) {
            stopRecording();
          } else {
            updateState(false, false);
          }
        }}
      />

      {/* Quick Overlay Visibility Toggles on Canvas Hover */}
      {(onToggleSvgButtons || onTogglePlaybackBar) && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 opacity-0 group-hover/player:opacity-100 transition-opacity duration-200">
          {onToggleSvgButtons && (
            <button
              onClick={onToggleSvgButtons}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700/80 backdrop-blur-md text-[11px] font-medium cursor-pointer shadow-lg"
              title={
                hideSvgButtons
                  ? "Mostrar botones de tramos SVG en el reproductor"
                  : "Ocultar botones de tramos SVG en el reproductor"
              }
            >
              {hideSvgButtons ? (
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {hideSvgButtons ? "Mostrar Botones SVG" : "Ocultar Botones SVG"}
              </span>
            </button>
          )}
          {onTogglePlaybackBar && (
            <button
              onClick={onTogglePlaybackBar}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700/80 backdrop-blur-md text-[11px] font-medium cursor-pointer shadow-lg"
              title={
                hidePlaybackBar
                  ? "Mostrar barra de reproducción"
                  : "Ocultar barra de reproducción (clic en el lienzo para reproducir/pausar)"
              }
            >
              {hidePlaybackBar ? (
                <Eye className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {hidePlaybackBar
                  ? "Mostrar Barra Reproducción"
                  : "Ocultar Barra Reproducción"}
              </span>
            </button>
          )}
        </div>
      )}

      {isRecording && (
        <div className="absolute top-5 right-5 flex items-center space-x-2 bg-red-950/85 border border-red-500/50 px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-semibold font-mono tracking-wider">
            CAPTURANDO VÍDEO 60 FPS...
          </span>
        </div>
      )}

      <div
        className={
          (hideSvgButtons || slicesInfo.count === 0) && hidePlaybackBar
            ? "hidden"
            : "absolute bottom-0 left-0 right-0 px-6 pb-5 pt-12 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent flex flex-col gap-2 opacity-95 hover:opacity-100 transition-opacity duration-200"
        }
      >
        {/* Slices Timeline Overlay */}
        {slicesInfo.count > 0 && (
          <div
            className={
              hideSvgButtons ? "hidden" : "w-full flex h-9 gap-1 mb-1"
            }
          >
            {Array.from({ length: slicesInfo.count }).map((_, i) => {
              const isReady = slicesInfo.ready[i];
              const spec = sliceSpecsRef.current[i];
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (spec) seekTo(spec.startTime);
                    else {
                      const dur = analysisDataRef.current?.duration || 90;
                      seekTo((i / slicesInfo.count) * dur);
                    }
                  }}
                  title={
                    spec
                      ? `${spec.title} (${spec.startTime}s - ${spec.endTime}s)`
                      : `Ir al Segmento ${i + 1}`
                  }
                  className={`flex-1 relative group rounded-lg border transition-all cursor-pointer ${
                    isReady
                      ? "bg-emerald-950/60 border-emerald-500/60 hover:bg-emerald-900/60"
                      : "bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-purple-500/50"
                  } flex justify-center items-center`}
                >
                  <span className="text-[11px] font-medium text-slate-200 truncate px-1">
                    {isReady ? "✒️ " : "📐 "}
                    {slicesInfo.count === 1
                      ? "SVG Panorámico Completo (100%)"
                      : `SVG S${i + 1}`}
                  </span>

                  {/* Hover Toolbar for each segment */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50"
                  >
                    <div className="flex items-center justify-center gap-1 bg-slate-900 border border-slate-700 shadow-2xl px-1.5 py-1 rounded-lg">
                      <button
                        onClick={() => downloadSliceLayout(i)}
                        className="p-1.5 text-amber-300 hover:bg-slate-800 rounded transition-colors"
                        title={`Descargar SVG detallado con trayectos exactos (Segmento ${i + 1})`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>

                      {isReady && (
                        <button
                          onClick={() => downloadSlice(i)}
                          className="p-1.5 text-emerald-300 hover:bg-slate-800 rounded transition-colors"
                          title={`Descargar SVG actual del Segmento ${i + 1}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Playback Controls */}
        <div
          className={
            hidePlaybackBar ? "hidden" : "flex items-center gap-3 w-full"
          }
        >
          <button
            onClick={() => (isPlaying ? pause() : play())}
            disabled={isAnalyzing}
            title={isPlaying ? "Pausar" : "Reproducir Musicograma"}
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-white text-slate-950 hover:bg-purple-200 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={rewind}
            title="Rebobinar al inicio (00:00)"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex-1 relative flex items-center h-4">
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              step="0.1"
              ref={progressRef}
              onMouseDown={() => {
                isDraggingRef.current = true;
              }}
              onMouseUp={() => {
                isDraggingRef.current = false;
              }}
              onTouchStart={() => {
                isDraggingRef.current = true;
              }}
              onTouchEnd={() => {
                isDraggingRef.current = false;
              }}
              onChange={(e) => {
                const dur =
                  (audioFileRef.current && getValidAudioElementDuration()) ||
                  analysisDataRef.current?.duration ||
                  90;
                const targetTime = (parseFloat(e.target.value) / 100) * dur;
                seekTo(targetTime);
              }}
              className="absolute inset-0 w-full h-2 bg-slate-700/70 rounded-full appearance-none cursor-pointer accent-purple-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

AudioVisualizer.displayName = "AudioVisualizer";
