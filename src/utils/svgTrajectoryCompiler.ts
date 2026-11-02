import type { OkfMusicogramaMetadata, OkfSliceSpec } from "../types/okf";

export interface TrajectoryCompilerInput {
  sliceIndex: number;
  slicesCount?: number;
  totalSlices?: number;
  sliceMinX: number;
  sliceMaxX: number;
  worldMinY: number;
  worldMaxY: number;
  spec?: OkfSliceSpec;
  projectMetadata?: OkfMusicogramaMetadata;
  projectTitle?: string;
  environmentConcept?: string;
  userKeywords?: string;
  platforms: {
    x: number;
    y: number;
    w: number;
    h: number;
    angle: number;
    type?: "major" | "minor" | "accelerator" | "friction";
    time?: number;
  }[];
  positions: {
    x: number;
    y: number;
    angle: number;
    isImpact?: boolean;
  }[];
  extraTracks?: {
    id: string;
    positions: { x: number; y: number; angle: number }[];
    platforms: { x: number; y: number; w: number; h: number; angle: number }[];
  }[];
  melodyColor?: string;
  bassColor?: string;
}

const escapeXml = (str: string): string =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

type DetectedTheme =
  | "baroque"
  | "cavern"
  | "canarias"
  | "carnival"
  | "symphonic";

const detectSliceTheme = (
  spec?: OkfSliceSpec,
  metadata?: OkfMusicogramaMetadata,
  keywords?: string,
): DetectedTheme => {
  if (spec?.svgTheme) {
    const t = spec.svgTheme.toLowerCase();
    if (t.includes("baroq") || t.includes("vivaldi")) return "baroque";
    if (t.includes("cavern") || t.includes("grieg") || t.includes("trol"))
      return "cavern";
    if (t.includes("canari") || t.includes("isa")) return "canarias";
    if (t.includes("carnav") || t.includes("carniv")) return "carnival";
  }
  const combined =
    `${metadata?.id || ""} ${metadata?.title || ""} ${metadata?.composer || ""} ${keywords || ""} ${spec?.title || ""} ${spec?.imagePrompt || ""}`.toLowerCase();
  if (
    combined.includes("vivaldi") ||
    combined.includes("primavera") ||
    combined.includes("barroc") ||
    combined.includes("ritornello")
  ) {
    return "baroque";
  }
  if (
    combined.includes("grieg") ||
    combined.includes("montaña") ||
    combined.includes("montana") ||
    combined.includes("peer gynt") ||
    combined.includes("caverna") ||
    combined.includes("trol")
  ) {
    return "cavern";
  }
  if (
    combined.includes("carnaval") ||
    combined.includes("santa catalina") ||
    combined.includes("mambo") ||
    combined.includes("drag")
  ) {
    return "carnival";
  }
  if (
    combined.includes("isa ") ||
    combined.includes("parranda") ||
    combined.includes("timple") ||
    combined.includes("pintadera") ||
    combined.includes("canari")
  ) {
    return "canarias";
  }
  return "symphonic";
};

/**
 * Evaluates the smoothed trajectory height at world coordinate x,
 * tapering cleanly to y = 0 at slice boundaries so adjacent segments join seamlessly.
 */
const buildTerrainLookup = (
  platforms: { x: number; y: number }[],
  sliceMinX: number,
  sliceMaxX: number,
) => {
  const sliceW = Math.max(1, sliceMaxX - sliceMinX);
  const relevant = platforms
    .filter((p) => p.x >= sliceMinX - 800 && p.x <= sliceMaxX + 800)
    .sort((a, b) => a.x - b.x);

  return (x: number): number => {
    const u = Math.max(0, Math.min(1, (x - sliceMinX) / sliceW));
    const borderTaper = Math.sin(u * Math.PI);
    const smoothTaper = Math.min(1, borderTaper * 2.2);

    if (relevant.length === 0) return 0;
    if (x <= relevant[0].x) return relevant[0].y * smoothTaper;
    if (x >= relevant[relevant.length - 1].x)
      return relevant[relevant.length - 1].y * smoothTaper;

    for (let i = 0; i < relevant.length - 1; i++) {
      const p0 = relevant[i];
      const p1 = relevant[i + 1];
      if (x >= p0.x && x <= p1.x) {
        const dx = p1.x - p0.x;
        const t = dx > 0 ? (x - p0.x) / dx : 0;
        const cosineT = (1 - Math.cos(t * Math.PI)) * 0.5;
        const rawY = p0.y + (p1.y - p0.y) * cosineT;
        return rawY * smoothTaper;
      }
    }
    return 0;
  };
};

/**
 * Extracts inner SVG markup from a raw <svg>...</svg> string and namespaces IDs
 * so multiple segments can be combined without ID collisions.
 */
const extractAndNamespaceCustomSvg = (
  rawSvg: string | undefined,
  prefix: string,
  sliceMinX: number,
  sliceWidth: number,
  worldMinY: number,
  worldHeight: number,
): string => {
  if (!rawSvg || !rawSvg.trim().startsWith("<svg")) return "";
  if (rawSvg.includes('data-sonogramic-aligned="true"')) {
    const backdropMatch = rawSvg.match(
      /<!-- OKF_CUSTOM_BACKDROP_START -->([\s\S]*?)<!-- OKF_CUSTOM_BACKDROP_END -->/,
    );
    return backdropMatch ? backdropMatch[1].trim() : "";
  }

  const viewBoxMatch = rawSvg.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 1024 1024";

  const innerMatch = rawSvg.trim().match(/^<svg[^>]*>([\s\S]*)<\/svg>$/i);
  if (!innerMatch || !innerMatch[1]) return "";

  let inner = innerMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\bid=["']([^"']+)["']/g, `id="${prefix}_$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}_$1)`);

  // Tile custom backdrop every ~2400 world pixels so sky/sun/art proportions stay natural
  const tileWidth = Math.max(1600, Math.min(sliceWidth, 3200));
  const numTiles = Math.max(1, Math.round(sliceWidth / tileWidth));
  const actualTileW = sliceWidth / numTiles;

  let tilesMarkup = "";
  for (let t = 0; t < numTiles; t++) {
    const tx = sliceMinX + t * actualTileW;
    const tilePrefixed = inner
      .replace(new RegExp(`id="${prefix}_`, "g"), `id="${prefix}_t${t}_`)
      .replace(new RegExp(`url\\(#${prefix}_`, "g"), `url(#${prefix}_t${t}_`);
    tilesMarkup += `<svg x="${tx.toFixed(1)}" y="${worldMinY}" width="${(actualTileW + 2).toFixed(1)}" height="${worldHeight}" viewBox="${viewBox}" preserveAspectRatio="none" opacity="0.55">${tilePrefixed}</svg>`;
  }

  return tilesMarkup;
};

/**
 * Generates thematic mid-ground landmarks positioned along the exact trajectory ridge.
 */
const buildThematicLandmarksMarkup = (
  theme: DetectedTheme,
  sliceIndex: number,
  sliceMinX: number,
  sliceMaxX: number,
  worldMinY: number,
  getTerrainY: (x: number) => number,
  palette: string[],
  spec?: OkfSliceSpec,
): string => {
  const c0 = palette[0] || "#0f172a";
  const c1 = palette[1] || "#0284c7";
  const c2 = palette[2] || "#f59e0b";
  const c3 = palette[3] || "#fef08a";
  const specText = `${spec?.title || ""} ${spec?.musicalSection || ""} ${spec?.imagePrompt || ""}`.toLowerCase();

  let els = "";
  const step = 380;

  // Celestial & upper atmosphere elements
  const sliceW = sliceMaxX - sliceMinX;
  const sunX = sliceMinX + sliceW * (0.22 + (sliceIndex % 3) * 0.25);
  const sunY = worldMinY + 250;

  if (theme === "baroque") {
    const isStorm =
      specText.includes("tempestad") ||
      specText.includes("tormenta") ||
      specText.includes("storm") ||
      sliceIndex === 3;
    const isRainbow =
      specText.includes("apoteosis") ||
      specText.includes("arcoíris") ||
      specText.includes("rainbow") ||
      sliceIndex === 5;
    const isFountain =
      specText.includes("fuente") ||
      specText.includes("fonti") ||
      specText.includes("céfiro") ||
      sliceIndex === 2;
    const isBirds =
      specText.includes("aves") ||
      specText.includes("uccelli") ||
      sliceIndex === 1 ||
      sliceIndex === 4;

    if (!isStorm) {
      els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="190" fill="${c3}" fill-opacity="0.16"/>`;
      els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="95" fill="${c2}" fill-opacity="0.28"/>`;
      els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="48" fill="#ffffff" fill-opacity="0.82"/>`;
    }

    if (isRainbow) {
      const rainbowColors = [
        "#ef4444",
        "#f97316",
        "#facc15",
        "#10b981",
        "#38bdf8",
        "#8b5cf6",
      ];
      for (let r = 0; r < rainbowColors.length; r++) {
        const ry = -220 + r * 18;
        els += `<path d="M ${(sliceMinX + sliceW * 0.06).toFixed(1)} 160 Q ${(sliceMinX + sliceW * 0.5).toFixed(1)} ${ry - 520} ${(sliceMinX + sliceW * 0.94).toFixed(1)} 160" fill="none" stroke="${rainbowColors[r]}" stroke-width="14" stroke-opacity="0.38"/>`;
      }
    }

    for (let x = sliceMinX + 220; x < sliceMaxX - 180; x += step) {
      const idx = Math.round((x - sliceMinX) / step);
      const ty = getTerrainY(x);
      const baseRidgeY = ty * 0.72 + 45;

      if (isStorm && idx % 2 === 0) {
        // Jagged lightning bolt striking toward the trajectory
        els += `<g stroke="${c3}" stroke-width="5" fill="none" opacity="0.85">
          <polyline points="${(x - 40).toFixed(1)},${worldMinY + 60} ${(x + 15).toFixed(1)},${worldMinY + 260} ${(x - 20).toFixed(1)},${worldMinY + 290} ${(x + 30).toFixed(1)},${(ty - 120).toFixed(1)}"/>
          <polyline points="${(x + 15).toFixed(1)},${worldMinY + 260} ${(x + 85).toFixed(1)},${worldMinY + 380}" stroke-width="2.5" opacity="0.65"/>
        </g>`;
      }

      if (isFountain && idx % 2 === 1) {
        // Tiered Baroque water fountain with parabolic water jets
        const fy = baseRidgeY;
        els += `<g transform="translate(${x.toFixed(1)}, ${fy.toFixed(1)})">
          <rect x="-45" y="-18" width="90" height="22" rx="6" fill="${c3}" fill-opacity="0.7"/>
          <rect x="-14" y="-75" width="28" height="58" fill="${c2}" fill-opacity="0.65"/>
          <ellipse cx="0" cy="-75" rx="52" ry="10" fill="${c3}" fill-opacity="0.85"/>
          <rect x="-8" y="-125" width="16" height="50" fill="${c2}" fill-opacity="0.75"/>
          <ellipse cx="0" cy="-125" rx="30" ry="7" fill="${c3}" fill-opacity="0.9"/>
          <path d="M 0 -130 Q -45 -210 -85 -70" fill="none" stroke="${c3}" stroke-width="3.5" stroke-dasharray="6 4" opacity="0.85"/>
          <path d="M 0 -130 Q 45 -210 85 -70" fill="none" stroke="${c3}" stroke-width="3.5" stroke-dasharray="6 4" opacity="0.85"/>
          <path d="M 0 -130 Q -25 -245 -48 -120" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.8"/>
          <path d="M 0 -130 Q 25 -245 48 -120" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.8"/>
        </g>`;
      } else if (isBirds && idx % 2 === 0) {
        // Blossoming cherry/almond tree & songbirds near the trajectory
        const treeY = baseRidgeY + 15;
        els += `<g transform="translate(${x.toFixed(1)}, ${treeY.toFixed(1)})">
          <path d="M -8 40 L -5 -95 L -42 -150 M 5 -95 L 44 -145 M 0 -65 L 0 -165" stroke="#5c2d16" stroke-width="9" stroke-linecap="round" fill="none"/>
          <circle cx="-42" cy="-155" r="46" fill="#f472b6" fill-opacity="0.68"/>
          <circle cx="44" cy="-150" r="44" fill="#fb7185" fill-opacity="0.65"/>
          <circle cx="0" cy="-178" r="54" fill="#fbcfe8" fill-opacity="0.75"/>
          <path d="M -65 -245 Q -48 -268 -32 -248 Q -16 -268 0 -245" fill="none" stroke="${c3}" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M 35 -265 Q 52 -288 68 -268 Q 84 -288 100 -265" fill="none" stroke="${c3}" stroke-width="3" stroke-linecap="round"/>
        </g>`;
      } else {
        // Italian Cypress pair + Classical Baroque Rotunda Pavilion
        const cyY = baseRidgeY + 20;
        els += `<g transform="translate(${x.toFixed(1)}, ${cyY.toFixed(1)})">
          <path d="M -70 30 C -84 -65 -76 -145 -62 -195 C -48 -145 -40 -65 -54 30 Z" fill="${c0}" fill-opacity="0.88" stroke="${c1}" stroke-width="1.5"/>
          <path d="M 70 30 C 56 -55 64 -125 78 -170 C 92 -125 100 -55 86 30 Z" fill="${c0}" fill-opacity="0.85" stroke="${c1}" stroke-width="1.5"/>
          ${
            idx % 3 === 0
              ? `<g transform="translate(0, -10)">
                  <path d="M -42 -90 A 42 38 0 0 1 42 -90 Z" fill="${c2}" fill-opacity="0.72" stroke="${c3}" stroke-width="2"/>
                  <rect x="-46" y="-90" width="92" height="8" rx="3" fill="${c3}" fill-opacity="0.85"/>
                  <rect x="-36" y="-82" width="8" height="82" fill="${c3}" fill-opacity="0.75"/>
                  <rect x="-14" y="-82" width="8" height="82" fill="${c3}" fill-opacity="0.75"/>
                  <rect x="8" y="-82" width="8" height="82" fill="${c3}" fill-opacity="0.75"/>
                  <rect x="28" y="-82" width="8" height="82" fill="${c3}" fill-opacity="0.75"/>
                </g>`
              : ""
          }
        </g>`;
      }
    }
  } else if (theme === "cavern") {
    // Stalactites hanging from cavern roof + glowing Nordic crystals along the ridge
    for (let x = sliceMinX + 160; x < sliceMaxX - 120; x += 280) {
      const idx = Math.round((x - sliceMinX) / 280);
      const stalH = 140 + ((idx * 67) % 160);
      els += `<polygon points="${(x - 38).toFixed(1)},${worldMinY} ${(x + 38).toFixed(1)},${worldMinY} ${x.toFixed(1)},${(worldMinY + stalH).toFixed(1)}" fill="${c1}" fill-opacity="0.65" stroke="${c2}" stroke-width="1.5" stroke-opacity="0.4"/>`;

      const ty = getTerrainY(x);
      const baseY = ty * 0.72 + 60;
      if (idx % 2 === 0) {
        // Glowing crystal cluster
        els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
          <polygon points="-28,20 -12,-95 6,20" fill="${c2}" fill-opacity="0.75" stroke="${c3}" stroke-width="2"/>
          <polygon points="-6,25 14,-130 32,25" fill="${c3}" fill-opacity="0.82" stroke="#ffffff" stroke-width="2"/>
          <polygon points="18,22 38,-75 48,22" fill="${c2}" fill-opacity="0.7" stroke="${c3}" stroke-width="1.5"/>
          <circle cx="12" cy="-70" r="55" fill="${c3}" fill-opacity="0.16"/>
        </g>`;
      } else {
        // Cyclopean Troll Hall column & torch
        els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
          <rect x="-24" y="-220" width="48" height="240" rx="4" fill="${c0}" fill-opacity="0.85" stroke="${c1}" stroke-width="2"/>
          <rect x="-34" y="-232" width="68" height="16" rx="3" fill="${c1}"/>
          <circle cx="0" cy="-145" r="28" fill="${c2}" fill-opacity="0.35"/>
          <path d="M 0 -172 C 14 -152 16 -136 0 -126 C -16 -136 -14 -152 0 -172 Z" fill="${c3}"/>
        </g>`;
      }
    }
  } else if (theme === "canarias") {
    // Sun + Romería bunting flags + Canary houses with wooden tea balconies + Cardones
    els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="140" fill="${c2}" fill-opacity="0.25"/>`;
    els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="65" fill="${c3}" fill-opacity="0.85"/>`;

    for (let x = sliceMinX + 240; x < sliceMaxX - 200; x += step) {
      const idx = Math.round((x - sliceMinX) / step);
      const ty = getTerrainY(x);
      const baseY = ty * 0.72 + 55;

      if (idx % 2 === 0) {
        // Traditional Canary house with Wooden Tea Balcony (Balcón Canario)
        els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
          <rect x="-58" y="-135" width="116" height="155" fill="#f8fafc" fill-opacity="0.88" stroke="#cbd5e1" stroke-width="2"/>
          <polygon points="-66,-135 0,-178 66,-135" fill="#b45309" stroke="#fef3c7" stroke-width="2"/>
          <rect x="-48" y="-98" width="96" height="18" fill="#78350f" stroke="#fde68a" stroke-width="1.5"/>
          <rect x="-44" y="-122" width="88" height="24" fill="none" stroke="#78350f" stroke-width="3"/>
          <rect x="-16" y="-52" width="32" height="72" rx="14" fill="#78350f"/>
        </g>`;
      } else {
        // Canary Cardón (Euphorbia canariensis) candelabra cactus
        els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})" stroke="#065f46" stroke-width="10" stroke-linecap="round" fill="none">
          <path d="M 0 25 L 0 -135"/>
          <path d="M 0 -45 Q -32 -45 -32 -85 L -32 -125"/>
          <path d="M 0 -60 Q 32 -60 32 -95 L 32 -130"/>
          <path d="M 0 -25 Q -52 -25 -52 -65 L -52 -95"/>
        </g>`;
      }
    }
  } else if (theme === "carnival") {
    // Carnival spotlights, Canary palms, Queen/Drag stage arches & fireworks
    for (let x = sliceMinX + 240; x < sliceMaxX - 200; x += step) {
      const idx = Math.round((x - sliceMinX) / step);
      const ty = getTerrainY(x);
      const baseY = ty * 0.72 + 50;

      // Spotlight beam from stage toward sky
      els += `<polygon points="${x.toFixed(1)},${baseY.toFixed(1)} ${(x - 140).toFixed(1)},${worldMinY} ${(x - 40).toFixed(1)},${worldMinY}" fill="${idx % 2 === 0 ? c2 : c1}" fill-opacity="0.09"/>`;

      if (idx % 2 === 0) {
        // Canary Palm Tree with Carnival lights
        els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
          <path d="M 0 30 Q 12 -65 0 -155" stroke="#92400e" stroke-width="12" fill="none" stroke-linecap="round"/>
          <path d="M 0 -155 Q -55 -185 -90 -135" stroke="#10b981" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path d="M 0 -155 Q -35 -210 -75 -180" stroke="#34d399" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M 0 -155 Q 55 -185 90 -135" stroke="#10b981" stroke-width="7" fill="none" stroke-linecap="round"/>
          <path d="M 0 -155 Q 35 -210 75 -180" stroke="#34d399" stroke-width="6" fill="none" stroke-linecap="round"/>
          <circle cx="0" cy="-155" r="14" fill="${c3}"/>
        </g>`;
      } else {
        // Carnival Feather Fantasia & Firework burst
        const fwY = worldMinY + 240 + ((idx * 55) % 140);
        els += `<g transform="translate(${x.toFixed(1)}, ${fwY.toFixed(1)})" stroke="${c3}" stroke-width="2.5" stroke-linecap="round">
          <circle cx="0" cy="0" r="6" fill="#ffffff"/>
          <line x1="0" y1="-12" x2="0" y2="-58"/><line x1="0" y1="12" x2="0" y2="58"/>
          <line x1="-12" y1="0" x2="-58" y2="0"/><line x1="12" y1="0" x2="58" y2="0"/>
          <line x1="-9" y1="-9" x2="-42" y2="-42" stroke="${c2}"/><line x1="9" y1="-9" x2="42" y2="-42" stroke="${c2}"/>
          <line x1="-9" y1="9" x2="-42" y2="42" stroke="${c1}"/><line x1="9" y1="9" x2="42" y2="42" stroke="${c1}"/>
        </g>`;
      }
    }
  } else {
    // Symphonic / Universal musical landscape
    els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="150" fill="${c2}" fill-opacity="0.22"/>`;
    els += `<circle cx="${sunX.toFixed(1)}" cy="${sunY}" r="65" fill="${c3}" fill-opacity="0.75"/>`;
    for (let x = sliceMinX + 260; x < sliceMaxX - 200; x += step) {
      const ty = getTerrainY(x);
      const baseY = ty * 0.72 + 55;
      els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
        <polygon points="-45,30 0,-150 45,30" fill="${c1}" fill-opacity="0.45" stroke="${c3}" stroke-width="1.5" stroke-opacity="0.5"/>
        <circle cx="0" cy="-150" r="8" fill="${c3}" fill-opacity="0.8"/>
      </g>`;
    }
  }

  return els;
};

/**
 * Compiles a complete, high-precision SVG for a single segment (or the entire work)
 * whose coordinate system is in exact World Pixels [sliceMinX..sliceMaxX, worldMinY..worldMaxY],
 * guaranteeing 100% mathematical coincidence between the SVG drawings and the trajectories/platforms.
 */
export const compileDetailedSliceSvg = (
  input: TrajectoryCompilerInput,
): string => {
  const {
    sliceIndex,
    sliceMinX,
    sliceMaxX,
    worldMinY,
    worldMaxY,
    spec,
    projectMetadata,
    projectTitle,
    environmentConcept,
    userKeywords,
    platforms,
    positions,
    extraTracks,
    melodyColor = "#38bdf8",
    bassColor = "#a855f7",
  } = input;

  const sliceWidth = Math.max(800, sliceMaxX - sliceMinX);
  const worldHeight = Math.max(800, worldMaxY - worldMinY);
  const palette =
    spec?.recommendedPalette && spec.recommendedPalette.length >= 3
      ? spec.recommendedPalette
      : ["#0f172a", "#1e293b", "#38bdf8", "#fbbf24"];

  const c0 = palette[0] || "#0f172a";
  const c1 = palette[1] || "#1e293b";
  const c2 = palette[2] || "#38bdf8";
  const c3 = palette[3] || palette[2] || "#fbbf24";

  const theme = detectSliceTheme(
    spec,
    projectMetadata,
    `${projectTitle || ""} ${environmentConcept || ""} ${userKeywords || ""}`,
  );
  const getTerrainY = buildTerrainLookup(platforms, sliceMinX, sliceMaxX);

  const pfx = `s${sliceIndex}`;

  // 1. Build continuous horizon, mid-ground ridge, and sculpted foreground terrain paths
  // All 3 paths start and end at exact fixed Y offsets at sliceMinX and sliceMaxX
  // because getTerrainY(sliceMinX) === 0 and getTerrainY(sliceMaxX) === 0!
  const sampleStep = 120;
  let farPts = `M ${sliceMinX.toFixed(1)} -180`;
  let midPts = `M ${sliceMinX.toFixed(1)} 45`;
  let forePts = `M ${sliceMinX.toFixed(1)} 75`;
  let foreTopStroke = `M ${sliceMinX.toFixed(1)} 75`;

  for (let x = sliceMinX + sampleStep; x < sliceMaxX; x += sampleStep) {
    const ty = getTerrainY(x);
    const u = (x - sliceMinX) / sliceWidth;
    const borderEnv = Math.sin(u * Math.PI);
    const wave1 = Math.sin(x * 0.0022 + sliceIndex) * 42 * borderEnv;
    const wave2 = Math.cos(x * 0.0038 + sliceIndex * 2) * 26 * borderEnv;

    const farY = ty * 0.38 - 180 + wave1;
    const midY = ty * 0.68 + 45 + wave2;
    const foreY = ty + 75;

    farPts += ` L ${x.toFixed(1)} ${farY.toFixed(1)}`;
    midPts += ` L ${x.toFixed(1)} ${midY.toFixed(1)}`;
    forePts += ` L ${x.toFixed(1)} ${foreY.toFixed(1)}`;
    foreTopStroke += ` L ${x.toFixed(1)} ${foreY.toFixed(1)}`;
  }

  farPts += ` L ${sliceMaxX.toFixed(1)} -180 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  midPts += ` L ${sliceMaxX.toFixed(1)} 45 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  forePts += ` L ${sliceMaxX.toFixed(1)} 75 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  foreTopStroke += ` L ${sliceMaxX.toFixed(1)} 75`;

  // 2. Build exact Main Sphere Trajectory Path & Contact Filigree Arc
  const slicePositions = positions.filter(
    (p) => p.x >= sliceMinX - 80 && p.x <= sliceMaxX + 80,
  );
  let mainCenterPath = "";
  let mainContactPath = "";
  let jumpApexMarkers = "";

  if (slicePositions.length > 0) {
    const stride = Math.max(1, Math.min(3, Math.floor(slicePositions.length / 450)));
    for (let i = 0; i < slicePositions.length; i += stride) {
      const pt = slicePositions[i];
      const cmd = i === 0 ? "M" : "L";
      mainCenterPath += `${cmd} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
      mainContactPath += `${cmd} ${pt.x.toFixed(1)} ${(pt.y + 20).toFixed(1)} `;

      // Detect local parabolic jump apex (highest point of jump arc)
      if (
        i >= stride &&
        i + stride < slicePositions.length &&
        pt.y < slicePositions[i - stride].y &&
        pt.y < slicePositions[i + stride].y &&
        slicePositions[i + stride].y - pt.y > 1.2
      ) {
        jumpApexMarkers += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="5" fill="${c3}" fill-opacity="0.7"/>`;
      }
    }
    const lastPt = slicePositions[slicePositions.length - 1];
    mainCenterPath += `L ${lastPt.x.toFixed(1)} ${lastPt.y.toFixed(1)}`;
    mainContactPath += `L ${lastPt.x.toFixed(1)} ${(lastPt.y + 20).toFixed(1)}`;
  }

  // 3. Build exact Melody (Agudos) & Bass (Graves) Auxiliary Track Paths
  let melodyPathD = "";
  let melodyUpperLineD = "";
  let melodyLowerLineD = "";
  let bassPathD = "";
  let bassFoundationD = "";

  const melodyTrack = extraTracks?.find((t) => t.id === "melody");
  if (melodyTrack && melodyTrack.positions.length > 0) {
    const mPos = melodyTrack.positions.filter(
      (p) => p.x >= sliceMinX - 80 && p.x <= sliceMaxX + 80,
    );
    const stride = Math.max(1, Math.min(4, Math.floor(mPos.length / 350)));
    for (let i = 0; i < mPos.length; i += stride) {
      const pt = mPos[i];
      const cmd = i === 0 ? "M" : "L";
      melodyPathD += `${cmd} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
      melodyUpperLineD += `${cmd} ${pt.x.toFixed(1)} ${(pt.y - 10).toFixed(1)} `;
      melodyLowerLineD += `${cmd} ${pt.x.toFixed(1)} ${(pt.y + 10).toFixed(1)} `;
    }
  }

  const bassTrack = extraTracks?.find((t) => t.id === "bass");
  if (bassTrack && bassTrack.positions.length > 0) {
    const bPos = bassTrack.positions.filter(
      (p) => p.x >= sliceMinX - 80 && p.x <= sliceMaxX + 80,
    );
    const stride = Math.max(1, Math.min(4, Math.floor(bPos.length / 350)));
    for (let i = 0; i < bPos.length; i += stride) {
      const pt = bPos[i];
      const cmd = i === 0 ? "M" : "L";
      bassPathD += `${cmd} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
      bassFoundationD += `${cmd} ${pt.x.toFixed(1)} ${(pt.y + 20).toFixed(1)} `;
    }
  }

  // 4. Build Exact Architectural Platforms, Bridges, Balustrades & Support Pillars
  const slicePlatforms = platforms.filter(
    (p) => p.x + p.w >= sliceMinX - 120 && p.x - p.w <= sliceMaxX + 120,
  );

  let supportsMarkup = "";
  let platformsMarkup = "";

  for (let i = 0; i < slicePlatforms.length; i++) {
    const p = slicePlatforms[i];
    const deg = (p.angle * 180) / Math.PI;
    const halfW = p.w / 2;
    const pillarLeftX = p.x - Math.min(halfW * 0.68, halfW - 14);
    const pillarRightX = p.x + Math.min(halfW * 0.68, halfW - 14);
    const deckBottomY = p.y + 12;
    const groundY = worldMaxY;

    // Vertical pillars & arch connecting the platform to the ground
    if (p.w >= 90) {
      const archRadius = Math.max(20, (pillarRightX - pillarLeftX) / 2 - 8);
      const archY = Math.min(groundY - 40, deckBottomY + archRadius + 24);
      supportsMarkup += `<g opacity="0.72">
        <path d="M ${(pillarLeftX - 10).toFixed(1)} ${groundY} L ${(pillarLeftX - 10).toFixed(1)} ${deckBottomY.toFixed(1)} L ${(pillarRightX + 10).toFixed(1)} ${deckBottomY.toFixed(1)} L ${(pillarRightX + 10).toFixed(1)} ${groundY} L ${(pillarRightX - 6).toFixed(1)} ${groundY} L ${(pillarRightX - 6).toFixed(1)} ${archY.toFixed(1)} A ${archRadius.toFixed(1)} ${(archRadius * 0.85).toFixed(1)} 0 0 0 ${(pillarLeftX + 6).toFixed(1)} ${archY.toFixed(1)} L ${(pillarLeftX + 6).toFixed(1)} ${groundY} Z" fill="url(#${pfx}_pillarGrad)" stroke="${c2}" stroke-width="2" stroke-opacity="0.55"/>
      </g>`;
    } else {
      supportsMarkup += `<rect x="${(p.x - 10).toFixed(1)}" y="${deckBottomY.toFixed(1)}" width="20" height="${(groundY - deckBottomY).toFixed(1)}" fill="url(#${pfx}_pillarGrad)" opacity="0.65"/>`;
    }

    // Accent styling by platform type
    const topStrokeColor =
      p.type === "major"
        ? "#f472b6"
        : p.type === "accelerator"
          ? "#fb7185"
          : p.type === "friction"
            ? "#38bdf8"
            : c3;

    // Decorative balustrade spindles inside the platform deck
    let spindles = "";
    const spindleStep = 34;
    for (let sx = -halfW + 20; sx <= halfW - 20; sx += spindleStep) {
      spindles += `<rect x="${(sx - 2.5).toFixed(1)}" y="-4" width="5" height="14" rx="2" fill="${c3}" fill-opacity="0.75"/>`;
    }

    // Exact platform structure rotated by p.angle, with top contact rail at y = -10
    platformsMarkup += `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <rect x="${(-halfW).toFixed(1)}" y="-10" width="${p.w.toFixed(1)}" height="26" rx="5" fill="url(#${pfx}_deckGrad)" stroke="${topStrokeColor}" stroke-width="2.5"/>
      ${spindles}
      <line x1="${(-halfW).toFixed(1)}" y1="-10" x2="${halfW.toFixed(1)}" y2="-10" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <line x1="${(-halfW).toFixed(1)}" y1="-7" x2="${halfW.toFixed(1)}" y2="-7" stroke="${topStrokeColor}" stroke-width="2.5" stroke-linecap="round"/>
      ${
         Math.abs(p.angle) < 0.01
          ? `<circle cx="0" cy="-10" r="7" fill="${topStrokeColor}" stroke="#ffffff" stroke-width="2"/>
             <polygon points="0,-2 8,8 0,18 -8,8" fill="${c3}" fill-opacity="0.85"/>`
          : ""
      }
    </g>`;
  }

  // 5. Extract and namespace custom OKF backgroundSvg if present
  const customBackdrop = extractAndNamespaceCustomSvg(
    spec?.backgroundSvg,
    pfx,
    sliceMinX,
    sliceWidth,
    worldMinY,
    worldHeight,
  );

  // 6. Build thematic landmarks anchored to the trajectory ridge
  const landmarksMarkup = buildThematicLandmarksMarkup(
    theme,
    sliceIndex,
    sliceMinX,
    sliceMaxX,
    worldMinY,
    getTerrainY,
    palette,
    spec,
  );

  // 7. Section header watermark in the upper sky of the slice
  const headerTitle = escapeXml(spec?.title || `Segmento ${sliceIndex + 1}`);
  const headerSub = escapeXml(
    `${spec?.musicalSection || ""}${spec?.dynamicsAndTempo ? " · " + spec.dynamicsAndTempo : ""}`,
  );
  const titleX = sliceMinX + 90;
  const titleY = worldMinY + 110;

  // Aspect-matched width & height attributes for crisp browser rasterization without letterboxing
  const svgPixelW = Math.min(
    4096,
    Math.max(1920, Math.round(sliceWidth * 0.35)),
  );
  const svgPixelH = Math.max(
    540,
    Math.round(svgPixelW * (worldHeight / sliceWidth)),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sliceMinX.toFixed(1)} ${worldMinY} ${sliceWidth.toFixed(1)} ${worldHeight}" width="${svgPixelW}" height="${svgPixelH}" preserveAspectRatio="none" data-sonogramic-aligned="true">
  <defs>
    <linearGradient id="${pfx}_skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c0}"/>
      <stop offset="52%" stop-color="${c1}"/>
      <stop offset="88%" stop-color="${c2}" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="${c0}"/>
    </linearGradient>
    <linearGradient id="${pfx}_farHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="${pfx}_midHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.48"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.96"/>
    </linearGradient>
    <linearGradient id="${pfx}_foreTerrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.92"/>
      <stop offset="30%" stop-color="${c0}" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.99"/>
    </linearGradient>
    <linearGradient id="${pfx}_pillarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${c1}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="${pfx}_deckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c3}" stop-opacity="0.92"/>
      <stop offset="35%" stop-color="${c2}" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.96"/>
    </linearGradient>
  </defs>

  <!-- 1. Sky & Custom OKF Backdrop -->
  <rect x="${sliceMinX.toFixed(1)}" y="${worldMinY}" width="${sliceWidth.toFixed(1)}" height="${worldHeight}" fill="url(#${pfx}_skyGrad)"/>
  ${customBackdrop ? `<!-- OKF_CUSTOM_BACKDROP_START -->${customBackdrop}<!-- OKF_CUSTOM_BACKDROP_END -->` : ""}

  <!-- 2. Contoured Horizon & Mid-ground Scenic Ridges -->
  <path d="${farPts}" fill="url(#${pfx}_farHillGrad)"/>
  <path d="${midPts}" fill="url(#${pfx}_midHillGrad)" stroke="${c2}" stroke-width="2" stroke-opacity="0.35"/>

  <!-- 3. Thematic Landmarks Aligned with the Trajectory Ridge -->
  <g id="${pfx}_landmarks">
    ${landmarksMarkup}
  </g>

  <!-- 4. Sculpted Foreground Terrain Following Exact Platform Heights -->
  <path d="${forePts}" fill="url(#${pfx}_foreTerrainGrad)"/>
  <path d="${foreTopStroke}" fill="none" stroke="${c3}" stroke-width="3.5" stroke-opacity="0.45"/>

  <!-- 5. Architectural Support Pillars & Arches Under Every Platform -->
  <g id="${pfx}_platform_supports">
    ${supportsMarkup}
  </g>

  <!-- 6. Exact Trajectory Paths for Melody (Agudos), Bass (Graves) & Main Sphere -->
  <g id="${pfx}_exact_trajectories" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${
      melodyPathD
        ? `<path d="${melodyUpperLineD}" stroke="${melodyColor}" stroke-width="1.5" stroke-opacity="0.35"/>
           <path d="${melodyLowerLineD}" stroke="${melodyColor}" stroke-width="1.5" stroke-opacity="0.35"/>
           <path d="${melodyPathD}" stroke="${melodyColor}" stroke-width="4" stroke-opacity="0.72" stroke-dasharray="14 8"/>`
        : ""
    }
    ${
      bassPathD
        ? `<path d="${bassFoundationD}" stroke="${bassColor}" stroke-width="6" stroke-opacity="0.38"/>
           <path d="${bassPathD}" stroke="${bassColor}" stroke-width="3.5" stroke-opacity="0.68" stroke-dasharray="18 10"/>`
        : ""
    }
    ${
      mainContactPath
        ? `<path d="${mainContactPath}" stroke="${c3}" stroke-width="8" stroke-opacity="0.22"/>
           <path d="${mainContactPath}" stroke="${c3}" stroke-width="3" stroke-opacity="0.75"/>`
        : ""
    }
    ${
      mainCenterPath
        ? `<path d="${mainCenterPath}" stroke="#ffffff" stroke-width="2.2" stroke-opacity="0.55" stroke-dasharray="10 8"/>`
        : ""
    }
    ${jumpApexMarkers}
  </g>

  <!-- 7. Exact Platform Bridges, Balustrades & Impact Medallions -->
  <g id="${pfx}_exact_platforms">
    ${platformsMarkup}
  </g>

  <!-- 8. Segment Musicological Header -->
  <g opacity="0.65">
    <text x="${titleX.toFixed(1)}" y="${titleY}" fill="#f8fafc" font-family="sans-serif" font-size="34" font-weight="bold">${headerTitle}</text>
    ${
      headerSub
        ? `<text x="${titleX.toFixed(1)}" y="${titleY + 40}" fill="${c3}" font-family="monospace" font-size="24">${headerSub}</text>`
        : ""
    }
  </g>
</svg>`;
};

/**
 * Compiles a single unified panoramic SVG covering the entire musicograma from 0s to duration,
 * combining all segment scenes, architectural platforms, and exact trajectories into one SVG document.
 */
export const compileFullMasterSvg = (
  slicesInputs: TrajectoryCompilerInput[],
  totalMinX: number,
  totalMaxX: number,
  worldMinY: number,
  worldMaxY: number,
): string => {
  const totalWidth = Math.max(1920, totalMaxX - totalMinX);
  const worldHeight = Math.max(800, worldMaxY - worldMinY);

  let nestedSlices = "";
  for (const sInput of slicesInputs) {
    const sliceSvg = compileDetailedSliceSvg(sInput).trim();
    const sliceW = Math.max(800, sInput.sliceMaxX - sInput.sliceMinX);
    const innerMatch = sliceSvg.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/i);
    if (innerMatch && innerMatch[1]) {
      nestedSlices += `<svg x="${sInput.sliceMinX.toFixed(1)}" y="${worldMinY}" width="${sliceW.toFixed(1)}" height="${worldHeight}" viewBox="${sInput.sliceMinX.toFixed(1)} ${worldMinY} ${sliceW.toFixed(1)} ${worldHeight}" preserveAspectRatio="none">${innerMatch[1]}</svg>\n`;
    }
  }

  const masterPixelW = 8192;
  const masterPixelH = Math.max(
    540,
    Math.round(masterPixelW * (worldHeight / totalWidth)),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${totalMinX.toFixed(1)} ${worldMinY} ${totalWidth.toFixed(1)} ${worldHeight}" width="${masterPixelW}" height="${masterPixelH}" preserveAspectRatio="none" data-sonogramic-aligned="true">
  ${nestedSlices}
</svg>`;
};
