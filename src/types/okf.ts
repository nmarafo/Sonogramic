export interface TrackVisualConfig {
  shape: "circle" | "square" | "hexagon" | "star" | "music-note" | "custom-svg";
  color: string;
  effect: "none" | "glow" | "outline";
  rotate: boolean;
  opacity: number;
  label?: string;
  svgContent?: string;
}

export interface OkfGuideStep {
  step: number;
  title: string;
  phase:
    | "preparacion"
    | "plantillas"
    | "imagenes"
    | "esferas"
    | "sincronizacion"
    | "grabacion";
  instruction: string;
  didacticTip?: string;
  targetAction?:
    | "download_layouts"
    | "upload_batch_images"
    | "upload_audio"
    | "preview_playback"
    | "record_full_video"
    | "export_project_json"
    | "none";
}

export interface OkfSliceSpec {
  index: number;
  title: string;
  startTime: number;
  endTime: number;
  musicalSection: string;
  dynamicsAndTempo?: string;
  didacticNote: string;
  imagePrompt: string;
  recommendedPalette?: string[];
  imageUrl?: string;
  backgroundSvg?: string;
  svgTheme?: string;
  trajectoryWaypoints?: { time: number; y: number }[];
  generatedByAgent?: boolean;
}

export interface OkfMusicalSection {
  startTime: number;
  endTime: number;
  label: string;
  focus: "melody" | "bass" | "tutti";
  energy: number;
  bpmOverride?: number;
  subdivision?: number;
  melodicContour?:
    | "ascending"
    | "descending"
    | "arch"
    | "valley"
    | "wave"
    | "staccato_jumps"
    | "sustained_ramp";
  platformStyle: "major" | "minor" | "accelerator" | "friction";
}

export interface OkfCustomBeat {
  time: number;
  energy: number;
  isMajorSectionShift?: boolean;
  focus?: "melody" | "bass";
  type?: "major" | "minor" | "accelerator" | "friction";
}

export interface OkfMusicogramaMetadata {
  id?: string;
  title: string;
  composer: string;
  musicalPeriodOrGenre?: string;
  educationalStage?: string;
  durationSeconds: number;
  bpm: number;
  timeSignature?: string;
  musicalForm?: string;
  pedagogicalObjectives?: string[];
  emotions: string[];
  environmentConcept: string;
}

export interface OkfMusicogramaConfig {
  zoom: number;
  platformOpacity: number;
  bgOffsetY: number;
  cameraSmoothness: number;
  mosaicSlices: number;
  svgMode?: "segments" | "single";
  masterSceneSvg?: string;
  userKeywords?: string;
  ballConfig: TrackVisualConfig;
  extraTracksConfig: {
    melody: TrackVisualConfig;
    bass: TrackVisualConfig;
  };
}

export interface OkfMusicogramaProject {
  okfVersion: string;
  metadata: OkfMusicogramaMetadata;
  guideSteps: OkfGuideStep[];
  sliceSpecs: OkfSliceSpec[];
  config: OkfMusicogramaConfig;
  musicalStructure?: {
    sections?: OkfMusicalSection[];
    customBeats?: OkfCustomBeat[];
  };
  audioBase64?: string;
  audioType?: string;
  audioName?: string;
  data?: {
    duration: number;
    frames: number;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
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
    extraTracks?: {
      id: string;
      positions: { x: number; y: number; angle: number; zoom?: number }[];
      platforms: { x: number; y: number; w: number; h: number; angle: number }[];
    }[];
    bgImagesBase64?: string[];
  };
}
