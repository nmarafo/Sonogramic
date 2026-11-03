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
  transparentBackdrop?: boolean;
}

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
 * Evaluates the smoothed terrain height at world coordinate x,
 * tapering cleanly to y = 0 at slice boundaries so adjacent segments join seamlessly.
 */
const buildTerrainLookup = (
  platforms: { x: number; y: number }[],
  sliceMinX: number,
  sliceMaxX: number,
) => {
  const relevant = platforms
    .filter((p) => p.x >= sliceMinX - 1200 && p.x <= sliceMaxX + 1200)
    .sort((a, b) => a.x - b.x);

  return (x: number): number => {
    if (relevant.length === 0) return 0;
    if (x <= relevant[0].x) return relevant[0].y;
    if (x >= relevant[relevant.length - 1].x)
      return relevant[relevant.length - 1].y;

    for (let i = 0; i < relevant.length - 1; i++) {
      const p0 = relevant[i];
      const p1 = relevant[i + 1];
      if (x >= p0.x && x <= p1.x) {
        const dx = p1.x - p0.x;
        const t = dx > 0 ? (x - p0.x) / dx : 0;
        const cosineT = (1 - Math.cos(t * Math.PI)) * 0.5;
        return p0.y + (p1.y - p0.y) * cosineT;
      }
    }
    return 0;
  };
};

/**
 * Builds animated background landmarks (sun, clouds, rainbows, lightning, distant trees/crystals/palms)
 * that frame the scene without ever drawing text or trajectory lines.
 */
const buildAnimatedEnvironmentBackdrop = (
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
  const specText =
    `${spec?.title || ""} ${spec?.musicalSection || ""} ${spec?.imagePrompt || ""}`.toLowerCase();

  let els = "";
  const sliceW = sliceMaxX - sliceMinX;
  const sunX = sliceMinX + sliceW * (0.24 + (sliceIndex % 3) * 0.24);
  const sunY = worldMinY + 230;

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

    if (!isStorm) {
      els += `<g transform="translate(${sunX.toFixed(1)}, ${sunY})">
        <circle cx="0" cy="0" r="195" fill="${c3}" fill-opacity="0.16">
          <animate attributeName="fill-opacity" values="0.12;0.26;0.12" dur="4.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="0" cy="0" r="105" fill="${c2}" fill-opacity="0.28">
          <animate attributeName="r" values="98;114;98" dur="3.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="0" cy="0" r="52" fill="#ffffff" fill-opacity="0.86"/>
      </g>`;
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
        els += `<path d="M ${(sliceMinX + sliceW * 0.06).toFixed(1)} 180 Q ${(sliceMinX + sliceW * 0.5).toFixed(1)} ${ry - 520} ${(sliceMinX + sliceW * 0.94).toFixed(1)} 180" fill="none" stroke="${rainbowColors[r]}" stroke-width="14" stroke-opacity="0.38">
          <animate attributeName="stroke-opacity" values="0.24;0.48;0.24" dur="${(3.2 + r * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
        </path>`;
      }
    }

    // Distant swaying cypresses & flying songbirds between bounce arches
    const step = 460;
    for (let x = sliceMinX + 230; x < sliceMaxX - 200; x += step) {
      const idx = Math.round((x - sliceMinX) / step);
      const ty = getTerrainY(x);
      const baseRidgeY = ty * 0.68 + 85;
      const swayDur = (3.4 + (idx % 4) * 0.5).toFixed(1);

      if (isStorm && idx % 2 === 0) {
        els += `<g stroke="${c3}" stroke-width="5" fill="none" opacity="0.8">
          <polyline points="${(x - 40).toFixed(1)},${worldMinY + 60} ${(x + 15).toFixed(1)},${worldMinY + 250} ${(x - 20).toFixed(1)},${worldMinY + 285} ${(x + 30).toFixed(1)},${(ty - 140).toFixed(1)}"/>
          <animate attributeName="opacity" values="0.08;0.92;0.15;0.85;0.08" dur="${(1.8 + (idx % 3) * 0.4).toFixed(1)}s" repeatCount="indefinite"/>
        </g>`;
      }

      // Animated swaying cypress trees in mid-ground
      els += `<g transform="translate(${x.toFixed(1)}, ${baseRidgeY.toFixed(1)})">
        <g>
          <path d="M -68 35 C -82 -55 -74 -135 -60 -185 C -46 -135 -38 -55 -52 35 Z" fill="${c0}" fill-opacity="0.84" stroke="${c1}" stroke-width="1.5"/>
          <animateTransform attributeName="transform" type="rotate" values="-2.2 -60 35; 2.2 -60 35; -2.2 -60 35" dur="${swayDur}s" repeatCount="indefinite"/>
        </g>
        <g>
          <path d="M 68 35 C 54 -48 62 -118 76 -162 C 90 -118 98 -48 84 35 Z" fill="${c0}" fill-opacity="0.8" stroke="${c1}" stroke-width="1.5"/>
          <animateTransform attributeName="transform" type="rotate" values="2.0 76 35; -2.0 76 35; 2.0 76 35" dur="${swayDur}s" repeatCount="indefinite"/>
        </g>
      </g>`;

      // Animated flying songbirds in the sky
      const birdY = ty - 280 - ((idx * 47) % 110);
      els += `<g transform="translate(${(x + 90).toFixed(1)}, ${birdY.toFixed(1)})">
        <g>
          <path d="M -26 0 Q -13 -16 0 -2 Q 13 -16 26 0" fill="none" stroke="${c3}" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M 18 -24 Q 29 -38 40 -26 Q 51 -38 62 -24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
          <animateTransform attributeName="transform" type="translate" values="0,0; 18,-14; 0,0" dur="${(2.3 + (idx % 3) * 0.4).toFixed(1)}s" repeatCount="indefinite"/>
        </g>
      </g>`;
    }
  } else if (theme === "cavern") {
    for (let x = sliceMinX + 180; x < sliceMaxX - 140; x += 320) {
      const idx = Math.round((x - sliceMinX) / 320);
      const stalH = 135 + ((idx * 67) % 150);
      els += `<polygon points="${(x - 36).toFixed(1)},${worldMinY} ${(x + 36).toFixed(1)},${worldMinY} ${x.toFixed(1)},${(worldMinY + stalH).toFixed(1)}" fill="${c1}" fill-opacity="0.65" stroke="${c2}" stroke-width="1.5" stroke-opacity="0.4"/>`;
      // Glowing dripping crystal light at tip of stalactite
      els += `<circle cx="${x.toFixed(1)}" cy="${(worldMinY + stalH + 6).toFixed(1)}" r="6" fill="${c3}">
        <animate attributeName="opacity" values="0.25;0.95;0.25" dur="${(1.9 + (idx % 4) * 0.35).toFixed(1)}s" repeatCount="indefinite"/>
      </circle>`;
    }
  } else if (theme === "canarias") {
    els += `<g transform="translate(${sunX.toFixed(1)}, ${sunY})">
      <circle cx="0" cy="0" r="150" fill="${c2}" fill-opacity="0.24">
        <animate attributeName="r" values="140;162;140" dur="4.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="0" r="68" fill="${c3}" fill-opacity="0.88"/>
    </g>`;
  } else if (theme === "carnival") {
    for (let x = sliceMinX + 260; x < sliceMaxX - 200; x += 420) {
      const idx = Math.round((x - sliceMinX) / 420);
      const ty = getTerrainY(x);
      const baseY = ty * 0.72 + 95;
      // Animated sweeping stage spotlight beam
      els += `<g transform="translate(${x.toFixed(1)}, ${baseY.toFixed(1)})">
        <polygon points="0,0 -130,${worldMinY - baseY} -20,${worldMinY - baseY}" fill="${idx % 2 === 0 ? c2 : c1}" fill-opacity="0.11">
          <animateTransform attributeName="transform" type="rotate" values="-14 0 0; 14 0 0; -14 0 0" dur="${(3.8 + (idx % 3) * 0.7).toFixed(1)}s" repeatCount="indefinite"/>
        </polygon>
      </g>`;
    }
  } else {
    els += `<g transform="translate(${sunX.toFixed(1)}, ${sunY})">
      <circle cx="0" cy="0" r="155" fill="${c2}" fill-opacity="0.22">
        <animate attributeName="fill-opacity" values="0.14;0.3;0.14" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="0" r="65" fill="${c3}" fill-opacity="0.8"/>
    </g>`;
  }

  return els;
};

/**
 * Draws an animated scenic element centered at (p.x, p.y) with its top surface at local y = -10,
 * so the Main Sphere (whose bottom touches at y = -10) visually jumps directly from one scenic element to the next!
 */
const buildMainSphereBounceElement = (
  theme: DetectedTheme,
  idx: number,
  p: {
    x: number;
    y: number;
    w: number;
    h: number;
    angle: number;
    type?: "major" | "minor" | "accelerator" | "friction";
  },
  groundY: number,
  pfx: string,
  palette: string[],
): string => {
  const c0 = palette[0] || "#0f172a";
  const c1 = palette[1] || "#1e293b";
  const c2 = palette[2] || "#38bdf8";
  const c3 = palette[3] || "#fbbf24";

  const deg = (p.angle * 180) / Math.PI;
  const halfW = Math.max(48, p.w * 0.52);
  const stemHeight = Math.max(95, Math.min(420, groundY - p.y));
  const animDur = (2.8 + (idx % 5) * 0.45).toFixed(2);
  const variant = idx % 4;

  const accentColor =
    p.type === "major"
      ? "#f472b6"
      : p.type === "accelerator"
        ? "#fb7185"
        : p.type === "friction"
          ? "#38bdf8"
          : c3;

  // When p.w > 420, this platform is a smooth glide ("ramp"): render a multi-arch scenic viaduct / floral pergola / stone causeway
  // so the Main Sphere visibly glides across an architectural/natural bridge instead of stretching a single icon
  if (p.w > 420) {
    const spanW = p.w * 0.96;
    const hSpan = spanW * 0.5;
    const archCount = Math.max(2, Math.min(7, Math.round(spanW / 270)));
    const archW = spanW / archCount;
    let archesSvg = "";
    for (let a = 0; a < archCount; a++) {
      const ax0 = -hSpan + a * archW;
      const axMid = ax0 + archW * 0.5;
      const ax1 = ax0 + archW;
      archesSvg += `<rect x="${(ax0 - 8).toFixed(1)}" y="14" width="16" height="${Math.min(230, stemHeight).toFixed(0)}" fill="url(#${pfx}_pillarGrad)" opacity="0.78"/>`;
      archesSvg += `<path d="M ${ax0.toFixed(1)} 16 L ${ax0.toFixed(1)} 64 Q ${axMid.toFixed(1)} 18 ${ax1.toFixed(1)} 64 L ${ax1.toFixed(1)} 16 Z" fill="url(#${pfx}_deckGrad)" opacity="0.88"/>`;
      archesSvg += `<circle cx="${axMid.toFixed(1)}" cy="4" r="5" fill="${a % 2 === 0 ? accentColor : c3}">
        <animate attributeName="opacity" values="0.45;1;0.45" dur="${animDur}s" repeatCount="indefinite"/>
      </circle>`;
    }
    archesSvg += `<rect x="${(hSpan - 8).toFixed(1)}" y="14" width="16" height="${Math.min(230, stemHeight).toFixed(0)}" fill="url(#${pfx}_pillarGrad)" opacity="0.78"/>`;

    return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
      ${archesSvg}
      <rect x="${(-hSpan).toFixed(1)}" y="-10" width="${spanW.toFixed(1)}" height="24" rx="8" fill="url(#${pfx}_deckGrad)" stroke="${accentColor}" stroke-width="2.5"/>
      <line x1="${(-hSpan + 6).toFixed(1)}" y1="-10" x2="${(hSpan - 6).toFixed(1)}" y2="-10" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
    </g>`;
  }

  if (theme === "baroque") {
    if (variant === 0) {
      // 1. Blossoming Spring Tree Crown (Main Sphere jumps on top of the floral canopy at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.55).toFixed(2)})">
        <!-- Tree Trunk & Branches -->
        <path d="M -14 ${stemHeight.toFixed(0)} Q -8 55 -5 12 L -38 2 M 14 ${stemHeight.toFixed(0)} Q 8 55 5 12 L 38 2 M 0 45 L 0 0" stroke="#5c2d16" stroke-width="14" stroke-linecap="round" fill="none"/>
        <!-- Animated Blossoming Canopy Cushion (Top surface at y = -10) -->
        <g>
          <ellipse cx="${(-halfW * 0.48).toFixed(1)}" cy="10" rx="${(halfW * 0.48).toFixed(1)}" ry="20" fill="#db2777" fill-opacity="0.85"/>
          <ellipse cx="${(halfW * 0.48).toFixed(1)}" cy="10" rx="${(halfW * 0.48).toFixed(1)}" ry="20" fill="#e11d48" fill-opacity="0.85"/>
          <ellipse cx="0" cy="6" rx="${(halfW * 0.88).toFixed(1)}" ry="16" fill="#f472b6" fill-opacity="0.95" stroke="#fbcfe8" stroke-width="2.5"/>
          <ellipse cx="${(-halfW * 0.35).toFixed(1)}" cy="2" rx="${(halfW * 0.32).toFixed(1)}" ry="11" fill="#fbcfe8" fill-opacity="0.9"/>
          <ellipse cx="${(halfW * 0.35).toFixed(1)}" cy="2" rx="${(halfW * 0.32).toFixed(1)}" ry="11" fill="#fbcfe8" fill-opacity="0.9"/>
          <circle cx="0" cy="-2" r="5" fill="${c3}"/>
          <circle cx="${(-halfW * 0.45).toFixed(1)}" cy="1" r="4" fill="#ffffff"/>
          <circle cx="${(halfW * 0.45).toFixed(1)}" cy="1" r="4" fill="#ffffff"/>
          <animateTransform attributeName="transform" type="rotate" values="-1.6 0 25; 1.6 0 25; -1.6 0 25" dur="${animDur}s" repeatCount="indefinite"/>
        </g>
      </g>`;
    }
    if (variant === 1) {
      // 2. Tiered Venetian Marble Fountain with Animated Water Jets (Top basin rim at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.5).toFixed(2)})">
        <!-- Fluted Marble Pedestal -->
        <rect x="-20" y="14" width="40" height="${Math.min(180, stemHeight).toFixed(0)}" rx="6" fill="url(#${pfx}_pillarGrad)" stroke="${c3}" stroke-width="1.5"/>
        <ellipse cx="0" cy="68" rx="${(halfW * 0.72).toFixed(1)}" ry="12" fill="${c2}" fill-opacity="0.7" stroke="${c3}" stroke-width="2"/>
        <!-- Animated Water Jets Arcing Under the Basin -->
        <path d="M ${(-halfW * 0.65).toFixed(1)} -8 Q ${(-halfW * 1.05).toFixed(1)} -42 ${(-halfW * 1.25).toFixed(1)} 48" fill="none" stroke="#bae6fd" stroke-width="3.5" stroke-dasharray="9 6">
          <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.95s" repeatCount="indefinite"/>
        </path>
        <path d="M ${(halfW * 0.65).toFixed(1)} -8 Q ${(halfW * 1.05).toFixed(1)} -42 ${(halfW * 1.25).toFixed(1)} 48" fill="none" stroke="#bae6fd" stroke-width="3.5" stroke-dasharray="9 6">
          <animate attributeName="stroke-dashoffset" from="30" to="0" dur="0.95s" repeatCount="indefinite"/>
        </path>
        <!-- Upper Fountain Rim & Shimmering Water Cushion at y = -10 -->
        <path d="M ${(-halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.65).toFixed(1)} 16 L ${(-halfW * 0.65).toFixed(1)} 16 Z" fill="url(#${pfx}_deckGrad)" stroke="${c3}" stroke-width="2.5"/>
        <ellipse cx="0" cy="-10" rx="${(halfW * 0.88).toFixed(1)}" ry="5.5" fill="#7dd3fc" stroke="#ffffff" stroke-width="2">
          <animate attributeName="fill-opacity" values="0.65;1;0.65" dur="1.8s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
    }
    if (variant === 2) {
      // 3. Palladian Arched Garden Bridge with Climbing Vines (Bridge crown at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
        <!-- Romanesque Support Pillars -->
        <rect x="${(-halfW * 0.72).toFixed(1)}" y="12" width="18" height="${Math.min(220, stemHeight).toFixed(0)}" fill="url(#${pfx}_pillarGrad)" opacity="0.78"/>
        <rect x="${(halfW * 0.72 - 18).toFixed(1)}" y="12" width="18" height="${Math.min(220, stemHeight).toFixed(0)}" fill="url(#${pfx}_pillarGrad)" opacity="0.78"/>
        <!-- Arched Marble Bridge Deck with Top Surface at y = -10 -->
        <path d="M ${(-halfW).toFixed(1)} -10 L ${halfW.toFixed(1)} -10 L ${(halfW * 0.92).toFixed(1)} 22 Q 0 -2 ${(-halfW * 0.92).toFixed(1)} 22 Z" fill="url(#${pfx}_deckGrad)" stroke="${accentColor}" stroke-width="2.5"/>
        <line x1="${(-halfW).toFixed(1)}" y1="-10" x2="${halfW.toFixed(1)}" y2="-10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Animated Glowing Floral Medallions on Bridge -->
        <circle cx="0" cy="3" r="6" fill="${accentColor}">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="${animDur}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }
    // 4. Classical Baroque Rotunda Dome & Cypress Pair (Dome cushion at y = -10)
    return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.5).toFixed(2)})">
      <rect x="${(-halfW * 0.55).toFixed(1)}" y="12" width="12" height="78" fill="${c3}" fill-opacity="0.75"/>
      <rect x="-6" y="12" width="12" height="78" fill="${c3}" fill-opacity="0.8"/>
      <rect x="${(halfW * 0.55 - 12).toFixed(1)}" y="12" width="12" height="78" fill="${c3}" fill-opacity="0.75"/>
      <path d="M ${(-halfW * 0.85).toFixed(1)} 12 Q 0 -32 ${(halfW * 0.85).toFixed(1)} 12 Z" fill="url(#${pfx}_deckGrad)" stroke="${c3}" stroke-width="2.5"/>
      <ellipse cx="0" cy="-10" rx="${(halfW * 0.65).toFixed(1)}" ry="5" fill="#ffffff" fill-opacity="0.85"/>
    </g>`;
  }

  if (theme === "cavern") {
    if (variant === 0) {
      // 1. Giant Bioluminescent Cavern Mushroom (Cap surface at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.5).toFixed(2)})">
        <path d="M -16 125 Q -8 55 -10 10 L 10 10 Q 8 55 16 125 Z" fill="#cbd5e1" fill-opacity="0.82"/>
        <g>
          <path d="M ${(-halfW * 0.95).toFixed(1)} 14 Q 0 -36 ${(halfW * 0.95).toFixed(1)} 14 Z" fill="${accentColor}" fill-opacity="0.88" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="${(-halfW * 0.4).toFixed(1)}" cy="2" r="6" fill="#ffffff" fill-opacity="0.75"/>
          <circle cx="0" cy="-4" r="7" fill="${c3}" fill-opacity="0.85"/>
          <circle cx="${(halfW * 0.4).toFixed(1)}" cy="2" r="6" fill="#ffffff" fill-opacity="0.75"/>
          <animate attributeName="opacity" values="0.78;1;0.78" dur="${animDur}s" repeatCount="indefinite"/>
        </g>
      </g>`;
    }
    if (variant === 1) {
      // 2. Faceted Glowing Crystal Table (Flat crystal facet at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
        <polygon points="${(-halfW * 0.85).toFixed(1)},-10 ${(halfW * 0.85).toFixed(1)},-10 ${(halfW * 0.55).toFixed(1)},65 0,95 ${(-halfW * 0.55).toFixed(1)},65" fill="url(#${pfx}_deckGrad)" stroke="#ffffff" stroke-width="2.5"/>
        <polygon points="${(-halfW * 0.45).toFixed(1)},-10 ${(halfW * 0.45).toFixed(1)},-10 0,75" fill="${c3}" fill-opacity="0.35">
          <animate attributeName="fill-opacity" values="0.2;0.65;0.2" dur="${animDur}s" repeatCount="indefinite"/>
        </polygon>
      </g>`;
    }
    // 3 & 4. Dwarven Runic Stone Bridge with Animated Flickering Torches (Top surface at y = -10)
    return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <rect x="${(-halfW * 0.7).toFixed(1)}" y="14" width="22" height="140" fill="url(#${pfx}_pillarGrad)"/>
      <rect x="${(halfW * 0.7 - 22).toFixed(1)}" y="14" width="22" height="140" fill="url(#${pfx}_pillarGrad)"/>
      <rect x="${(-halfW * 0.92).toFixed(1)}" y="-10" width="${(halfW * 1.84).toFixed(1)}" height="26" rx="6" fill="url(#${pfx}_deckGrad)" stroke="${accentColor}" stroke-width="2.5"/>
      <!-- Animated Torch Flames at Bridge Ends -->
      <path d="M ${(-halfW * 0.75).toFixed(1)} -10 C ${(-halfW * 0.75 - 10).toFixed(1)} -28 ${(-halfW * 0.75 + 10).toFixed(1)} -28 ${(-halfW * 0.75).toFixed(1)} -38 C ${(-halfW * 0.75 + 12).toFixed(1)} -24 ${(-halfW * 0.75 - 12).toFixed(1)} -24 ${(-halfW * 0.75).toFixed(1)} -10 Z" fill="${c3}">
        <animate attributeName="opacity" values="0.55;1;0.55" dur="0.9s" repeatCount="indefinite"/>
      </path>
      <path d="M ${(halfW * 0.75).toFixed(1)} -10 C ${(halfW * 0.75 - 10).toFixed(1)} -28 ${(halfW * 0.75 + 10).toFixed(1)} -28 ${(halfW * 0.75).toFixed(1)} -38 C ${(halfW * 0.75 + 12).toFixed(1)} -24 ${(halfW * 0.75 - 12).toFixed(1)} -24 ${(halfW * 0.75).toFixed(1)} -10 Z" fill="${c3}">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.1s" repeatCount="indefinite"/>
      </path>
    </g>`;
  }

  if (theme === "canarias") {
    if (variant % 2 === 0) {
      // 1. Casa Tradicional Canaria con Tejado de Teja y Balcón de Tea (Roof crest at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.45).toFixed(2)})">
        <rect x="${(-halfW * 0.78).toFixed(1)}" y="10" width="${(halfW * 1.56).toFixed(1)}" height="110" fill="#f8fafc" fill-opacity="0.9" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="${(-halfW * 0.65).toFixed(1)}" y="34" width="${(halfW * 1.3).toFixed(1)}" height="18" fill="#78350f" stroke="#fde68a" stroke-width="1.5"/>
        <polygon points="${(-halfW * 0.92).toFixed(1)},12 ${(-halfW * 0.72).toFixed(1)},-10 ${(halfW * 0.72).toFixed(1)},-10 ${(halfW * 0.92).toFixed(1)},12" fill="#b45309" stroke="#fef3c7" stroke-width="2.5"/>
      </g>`;
    }
    // 2. Arco de Piedra Volcánica con Banderines de Romería Animados (Arch top at y = -10)
    return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <path d="M ${(-halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.85).toFixed(1)} 22 Q 0 0 ${(-halfW * 0.85).toFixed(1)} 22 Z" fill="url(#${pfx}_deckGrad)" stroke="${c3}" stroke-width="2.5"/>
      <g>
        <polygon points="${(-halfW * 0.45).toFixed(1)},12 ${(-halfW * 0.3).toFixed(1)},12 ${(-halfW * 0.37).toFixed(1)},32" fill="#38bdf8"/>
        <polygon points="-10,12 10,12 0,34" fill="#facc15"/>
        <polygon points="${(halfW * 0.3).toFixed(1)},12 ${(halfW * 0.45).toFixed(1)},12 ${(halfW * 0.37).toFixed(1)},32" fill="#f43f5e"/>
        <animateTransform attributeName="transform" type="rotate" values="-3 0 12; 3 0 12; -3 0 12" dur="${animDur}s" repeatCount="indefinite"/>
      </g>
    </g>`;
  }

  if (theme === "carnival") {
    if (variant % 2 === 0) {
      // 1. Tambor Surdo de Carnaval Iluminado (Drumhead at y = -10)
      return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${(deg * 0.5).toFixed(2)})">
        <rect x="${(-halfW * 0.78).toFixed(1)}" y="-10" width="${(halfW * 1.56).toFixed(1)}" height="78" rx="8" fill="url(#${pfx}_deckGrad)" stroke="${c3}" stroke-width="2.5"/>
        <line x1="${(-halfW * 0.6).toFixed(1)}" y1="-10" x2="${(-halfW * 0.3).toFixed(1)}" y2="68" stroke="${c3}" stroke-width="2.5"/>
        <line x1="${(-halfW * 0.3).toFixed(1)}" y1="-10" x2="0" y2="68" stroke="${c3}" stroke-width="2.5"/>
        <line x1="0" y1="-10" x2="${(halfW * 0.3).toFixed(1)}" y2="68" stroke="${c3}" stroke-width="2.5"/>
        <line x1="${(halfW * 0.3).toFixed(1)}" y1="-10" x2="${(halfW * 0.6).toFixed(1)}" y2="68" stroke="${c3}" stroke-width="2.5"/>
        <ellipse cx="0" cy="-10" rx="${(halfW * 0.82).toFixed(1)}" ry="6" fill="#ffffff" stroke="${accentColor}" stroke-width="3">
          <animate attributeName="fill-opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
    }
    // 2. Pasarela con Abanico de Plumas Animado (Stage top at y = -10)
    return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
      <g opacity="0.75">
        <ellipse cx="-24" cy="18" rx="10" ry="38" transform="rotate(-28 -24 18)" fill="${c2}"/>
        <ellipse cx="0" cy="22" rx="10" ry="42" fill="${accentColor}"/>
        <ellipse cx="24" cy="18" rx="10" ry="38" transform="rotate(28 24 18)" fill="${c3}"/>
        <animateTransform attributeName="transform" type="rotate" values="-4 0 0; 4 0 0; -4 0 0" dur="${animDur}s" repeatCount="indefinite"/>
      </g>
      <rect x="${(-halfW * 0.92).toFixed(1)}" y="-10" width="${(halfW * 1.84).toFixed(1)}" height="20" rx="8" fill="url(#${pfx}_deckGrad)" stroke="#ffffff" stroke-width="2.5"/>
    </g>`;
  }

  // Symphonic / Universal Scenic Element (Classical Colonnade Capital & Animated Harmonic Ring at y = -10)
  return `<g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${deg.toFixed(2)})">
    <rect x="-18" y="14" width="36" height="${Math.min(180, stemHeight).toFixed(0)}" fill="url(#${pfx}_pillarGrad)" opacity="0.75"/>
    <circle cx="0" cy="36" r="24" fill="none" stroke="${c3}" stroke-width="2" stroke-dasharray="6 4">
      <animateTransform attributeName="transform" type="rotate" from="0 0 36" to="360 0 36" dur="9s" repeatCount="indefinite"/>
    </circle>
    <path d="M ${(-halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.92).toFixed(1)} -10 L ${(halfW * 0.72).toFixed(1)} 16 L ${(-halfW * 0.72).toFixed(1)} 16 Z" fill="url(#${pfx}_deckGrad)" stroke="${accentColor}" stroke-width="2.5"/>
    <line x1="${(-halfW * 0.9).toFixed(1)}" y1="-10" x2="${(halfW * 0.9).toFixed(1)}" y2="-10" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  </g>`;
};

/**
 * Draws an animated aerial scenic element at (mp.x, mp.y) with top surface at y = -10
 * so the Melody Sphere (Agudos) visually bounces across clouds, bird perches, and floral trellises!
 */
const buildMelodyAerialBounceElement = (
  theme: DetectedTheme,
  idx: number,
  mp: { x: number; y: number; w: number; h: number; angle: number },
  melodyColor: string,
  c3: string,
): string => {
  const halfW = Math.min(84, Math.max(44, mp.w * 0.16));
  const dur = (3.0 + (idx % 4) * 0.5).toFixed(1);

  if (theme === "cavern") {
    // Glowing levitating crystal / chandelier cushion at y = -10
    return `<g transform="translate(${mp.x.toFixed(1)}, ${mp.y.toFixed(1)})">
      <g>
        <polygon points="${(-halfW * 0.85).toFixed(1)},-10 ${(halfW * 0.85).toFixed(1)},-10 ${(halfW * 0.45).toFixed(1)},12 0,26 ${(-halfW * 0.45).toFixed(1)},12" fill="${melodyColor}" fill-opacity="0.72" stroke="#ffffff" stroke-width="2"/>
        <circle cx="0" cy="4" r="6" fill="${c3}"/>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-4; 0,0" dur="${dur}s" repeatCount="indefinite"/>
      </g>
    </g>`;
  }

  // Sunlit Animated Cloud Cushion & Floral Perch (Top cushion at y = -10)
  return `<g transform="translate(${mp.x.toFixed(1)}, ${mp.y.toFixed(1)})">
    <g>
      <ellipse cx="${(-halfW * 0.42).toFixed(1)}" cy="4" rx="${(halfW * 0.46).toFixed(1)}" ry="12" fill="#f8fafc" fill-opacity="0.82"/>
      <ellipse cx="${(halfW * 0.42).toFixed(1)}" cy="4" rx="${(halfW * 0.46).toFixed(1)}" ry="12" fill="#f8fafc" fill-opacity="0.82"/>
      <ellipse cx="0" cy="2" rx="${(halfW * 0.78).toFixed(1)}" ry="12" fill="#ffffff" fill-opacity="0.92" stroke="${melodyColor}" stroke-width="2"/>
      <animateTransform attributeName="transform" type="translate" values="-5,0; 5,0; -5,0" dur="${dur}s" repeatCount="indefinite"/>
    </g>
  </g>`;
};

/**
 * Draws an animated lower-world scenic element at (bp.x, bp.y) with top surface at y = -10
 * so the Bass Sphere (Graves) visually bounces across giant water lily pads, fountain pools, boulders, or drums!
 */
const buildBassGroundBounceElement = (
  theme: DetectedTheme,
  idx: number,
  bp: { x: number; y: number; w: number; h: number; angle: number },
  bassColor: string,
  c3: string,
): string => {
  const halfW = Math.min(90, Math.max(48, bp.w * 0.17));
  const dur = (2.6 + (idx % 4) * 0.45).toFixed(1);

  if (theme === "baroque" || theme === "symphonic") {
    // Giant Emerald Water Lily Pad (Nenúfar) with Lotus Blossom & Animated Water Ripples at y = -10
    return `<g transform="translate(${bp.x.toFixed(1)}, ${bp.y.toFixed(1)})">
      <ellipse cx="0" cy="4" rx="${(halfW * 1.1).toFixed(1)}" ry="9" fill="none" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.55">
        <animate attributeName="rx" values="${(halfW * 0.9).toFixed(1)};${(halfW * 1.35).toFixed(1)};${(halfW * 0.9).toFixed(1)}" dur="${dur}s" repeatCount="indefinite"/>
        <animate attributeName="stroke-opacity" values="0.65;0.15;0.65" dur="${dur}s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="0" cy="-2" rx="${(halfW * 0.88).toFixed(1)}" ry="9" fill="#10b981" fill-opacity="0.88" stroke="#6ee7b7" stroke-width="2"/>
      <path d="M -10 -8 L 0 -18 L 10 -8 Z" fill="#f472b6"/>
    </g>`;
  }

  // Sculpted Basalt / Crystal / Drum Resonance Plinth at y = -10
  return `<g transform="translate(${bp.x.toFixed(1)}, ${bp.y.toFixed(1)})">
    <path d="M ${(-halfW * 0.85).toFixed(1)} -10 L ${(halfW * 0.85).toFixed(1)} -10 L ${(halfW * 0.98).toFixed(1)} 20 L ${(-halfW * 0.98).toFixed(1)} 20 Z" fill="${bassColor}" fill-opacity="0.75" stroke="${c3}" stroke-width="2"/>
    <ellipse cx="0" cy="-10" rx="${(halfW * 0.82).toFixed(1)}" ry="5" fill="#ffffff" fill-opacity="0.85">
      <animate attributeName="fill-opacity" values="0.55;0.95;0.55" dur="${dur}s" repeatCount="indefinite"/>
    </ellipse>
  </g>`;
};

/**
 * Compiles a complete, animated, text-free SVG for a single segment (or the entire work)
 * in exact World Pixels [sliceMinX..sliceMaxX, worldMinY..worldMaxY].
 * Does NOT draw the trajectory lines of the spheres; instead, it draws animated scenic elements
 * positioned around the bounce points so the spheres appear to jump directly on those drawn elements.
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
    extraTracks,
    melodyColor = "#38bdf8",
    bassColor = "#a855f7",
    transparentBackdrop = false,
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

  // 1. Build continuous horizon, mid-ground ridge, and foreground hills
  // Placed slightly below the bounce elements so tree trunks, fountains, and pedestals rise out of the hills
  const sampleStep = 120;
  let farPts = `M ${sliceMinX.toFixed(1)} -170`;
  let midPts = `M ${sliceMinX.toFixed(1)} 65`;
  let forePts = `M ${sliceMinX.toFixed(1)} 115`;
  let foreTopStroke = `M ${sliceMinX.toFixed(1)} 115`;

  for (let x = sliceMinX + sampleStep; x < sliceMaxX; x += sampleStep) {
    const ty = getTerrainY(x);
    const u = (x - sliceMinX) / sliceWidth;
    const borderEnv = Math.sin(u * Math.PI);
    const wave1 = Math.sin(x * 0.0022 + sliceIndex) * 42 * borderEnv;
    const wave2 = Math.cos(x * 0.0038 + sliceIndex * 2) * 26 * borderEnv;

    const farY = ty * 0.38 - 170 + wave1;
    const midY = ty * 0.68 + 65 + wave2;
    const foreY = ty + 115;

    farPts += ` L ${x.toFixed(1)} ${farY.toFixed(1)}`;
    midPts += ` L ${x.toFixed(1)} ${midY.toFixed(1)}`;
    forePts += ` L ${x.toFixed(1)} ${foreY.toFixed(1)}`;
    foreTopStroke += ` L ${x.toFixed(1)} ${foreY.toFixed(1)}`;
  }

  farPts += ` L ${sliceMaxX.toFixed(1)} -170 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  midPts += ` L ${sliceMaxX.toFixed(1)} 65 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  forePts += ` L ${sliceMaxX.toFixed(1)} 115 L ${sliceMaxX.toFixed(1)} ${worldMaxY} L ${sliceMinX.toFixed(1)} ${worldMaxY} Z`;
  foreTopStroke += ` L ${sliceMaxX.toFixed(1)} 115`;

  // 2. Build Animated Background Landmarks (Sun, Rainbow, Swaying Trees, Birds, Spotlights)
  const landmarksMarkup = buildAnimatedEnvironmentBackdrop(
    theme,
    sliceIndex,
    sliceMinX,
    sliceMaxX,
    worldMinY,
    getTerrainY,
    palette,
    spec,
  );

  // 3. Build Animated Scenic Elements at Every Bounce Point of the Main Sphere
  const slicePlatforms = platforms.filter(
    (p) => p.x + p.w >= sliceMinX - 120 && p.x - p.w <= sliceMaxX + 120,
  );
  let mainScenicElementsMarkup = "";
  for (let i = 0; i < slicePlatforms.length; i++) {
    const p = slicePlatforms[i];
    const localGroundY = getTerrainY(p.x) + 120;
    mainScenicElementsMarkup += buildMainSphereBounceElement(
      theme,
      i,
      p,
      localGroundY,
      pfx,
      palette,
    );
  }

  // 4. Build Animated Aerial Elements for the Melody Sphere (Clouds, Perches, Crystals)
  let melodyScenicMarkup = "";
  const melodyTrack = extraTracks?.find((t) => t.id === "melody");
  if (melodyTrack && melodyTrack.platforms.length > 0) {
    const mPlats = melodyTrack.platforms.filter(
      (p) => p.x + p.w >= sliceMinX - 100 && p.x - p.w <= sliceMaxX + 100,
    );
    let lastMx = -99999;
    for (let i = 0; i < mPlats.length; i++) {
      const mp = mPlats[i];
      if (mp.x - lastMx < 360) continue;
      lastMx = mp.x;
      melodyScenicMarkup += buildMelodyAerialBounceElement(
        theme,
        i,
        mp,
        melodyColor,
        c3,
      );
    }
  }

  // 5. Build Animated Ground/Water Elements for the Bass Sphere (Lily Pads, Plinths, Drums)
  let bassScenicMarkup = "";
  const bassTrack = extraTracks?.find((t) => t.id === "bass");
  if (bassTrack && bassTrack.platforms.length > 0) {
    const bPlats = bassTrack.platforms.filter(
      (p) => p.x + p.w >= sliceMinX - 100 && p.x - p.w <= sliceMaxX + 100,
    );
    let lastBx = -99999;
    for (let i = 0; i < bPlats.length; i++) {
      const bp = bPlats[i];
      if (bp.x - lastBx < 360) continue;
      lastBx = bp.x;
      bassScenicMarkup += buildBassGroundBounceElement(
        theme,
        i,
        bp,
        bassColor,
        c3,
      );
    }
  }

  const svgPixelW = Math.min(
    4096,
    Math.max(1920, Math.round(sliceWidth * 0.35)),
  );
  const svgPixelH = Math.max(
    540,
    Math.round(svgPixelW * (worldHeight / sliceWidth)),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sliceMinX.toFixed(1)} ${worldMinY} ${sliceWidth.toFixed(1)} ${worldHeight}" width="${svgPixelW}" height="${svgPixelH}" preserveAspectRatio="none" data-sonogramic-scenic-animated="v4">
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
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.65"/>
      <stop offset="45%" stop-color="${c1}" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.96"/>
    </linearGradient>
    <linearGradient id="${pfx}_deckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c3}" stop-opacity="0.95"/>
      <stop offset="42%" stop-color="${c2}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.96"/>
    </linearGradient>
  </defs>

  ${
    transparentBackdrop
      ? ""
      : `<!-- 1. Sky -->
  <rect x="${sliceMinX.toFixed(1)}" y="${worldMinY}" width="${sliceWidth.toFixed(1)}" height="${worldHeight}" fill="url(#${pfx}_skyGrad)"/>

  <!-- 2. Contoured Horizon & Mid-ground Scenic Ridges -->
  <path d="${farPts}" fill="url(#${pfx}_farHillGrad)"/>
  <path d="${midPts}" fill="url(#${pfx}_midHillGrad)" stroke="${c2}" stroke-width="2" stroke-opacity="0.35"/>`
  }

  <!-- 3. Animated Backdrop Landmarks (Sun, Rainbow, Swaying Trees, Birds) -->
  <g id="${pfx}_animated_landmarks">
    ${landmarksMarkup}
  </g>

  <!-- 4. Sculpted Foreground Hills -->
  <path d="${forePts}" fill="url(#${pfx}_foreTerrainGrad)"/>
  <path d="${foreTopStroke}" fill="none" stroke="${c3}" stroke-width="3.5" stroke-opacity="0.45"/>

  <!-- 5. Animated Aerial Scenic Elements for Melody Sphere (Clouds, Perches, Crystals) -->
  <g id="${pfx}_melody_scenic_elements">
    ${melodyScenicMarkup}
  </g>

  <!-- 6. Animated Scenic Elements for Main Sphere (Blossoming Trees, Fountains, Bridges, Drums, Balconies) -->
  <g id="${pfx}_main_scenic_elements">
    ${mainScenicElementsMarkup}
  </g>

  <!-- 7. Animated Lower Scenic Elements for Bass Sphere (Lily Pads, Plinths, Boulders) -->
  <g id="${pfx}_bass_scenic_elements">
    ${bassScenicMarkup}
  </g>
</svg>`;
};

export interface ParallaxLayerSvgs {
  sky: string;
  far: string;
  mid: string;
  front: string;
}

export type ParallaxTheme =
  | "baroque"
  | "cavern"
  | "canarias"
  | "carnival"
  | "storm"
  | "ocean"
  | "cosmos"
  | "symphonic";

export const detectParallaxThemeFromJson = (params: {
  spec?: OkfSliceSpec;
  specs?: OkfSliceSpec[];
  projectMetadata?: OkfMusicogramaMetadata;
  projectTitle?: string;
  environmentConcept?: string;
  userKeywords?: string;
}): ParallaxTheme => {
  const {
    spec,
    specs,
    projectMetadata,
    projectTitle,
    environmentConcept,
    userKeywords,
  } = params;

  const allSpecsText = (specs || (spec ? [spec] : []))
    .map(
      (s) =>
        `${s.svgTheme || ""} ${s.title || ""} ${s.musicalSection || ""} ${s.imagePrompt || ""} ${s.didacticNote || ""}`,
    )
    .join(" ");

  const combined = [
    spec?.svgTheme || "",
    projectMetadata?.id || "",
    projectMetadata?.title || "",
    projectMetadata?.composer || "",
    projectMetadata?.musicalPeriodOrGenre || "",
    (projectMetadata?.emotions || []).join(" "),
    projectMetadata?.environmentConcept || "",
    projectTitle || "",
    environmentConcept || "",
    userKeywords || "",
    allSpecsText,
  ]
    .join(" ")
    .toLowerCase();

  // Check explicit theme tokens first
  const explicitTheme = (spec?.svgTheme || specs?.[0]?.svgTheme || "").toLowerCase();
  if (explicitTheme.includes("cavern") || explicitTheme.includes("grieg"))
    return "cavern";
  if (explicitTheme.includes("canari") || explicitTheme.includes("isa"))
    return "canarias";
  if (explicitTheme.includes("carnav") || explicitTheme.includes("carniv"))
    return "carnival";
  if (explicitTheme.includes("storm") || explicitTheme.includes("torment"))
    return "storm";
  if (explicitTheme.includes("ocean") || explicitTheme.includes("mar"))
    return "ocean";
  if (explicitTheme.includes("cosmo") || explicitTheme.includes("space"))
    return "cosmos";
  if (explicitTheme.includes("baroq") || explicitTheme.includes("vivaldi"))
    return "baroque";

  if (
    combined.includes("carnaval") ||
    combined.includes("santa catalina") ||
    combined.includes("batucada") ||
    combined.includes("comparsa") ||
    combined.includes("murga") ||
    combined.includes("mambo") ||
    combined.includes("samba")
  ) {
    return "carnival";
  }
  if (
    combined.includes("isa ") ||
    combined.includes("parranda") ||
    combined.includes("timple") ||
    combined.includes("pintadera") ||
    combined.includes("canari") ||
    combined.includes("teide") ||
    combined.includes("alisios")
  ) {
    return "canarias";
  }
  if (
    combined.includes("grieg") ||
    combined.includes("rey de la montaña") ||
    combined.includes("rey de la montana") ||
    combined.includes("peer gynt") ||
    combined.includes("caverna") ||
    combined.includes("gruta") ||
    combined.includes("trol") ||
    combined.includes("subterrán")
  ) {
    return "cavern";
  }
  if (
    combined.includes("vivaldi") ||
    combined.includes("primavera") ||
    combined.includes("barroc") ||
    combined.includes("ritornello") ||
    combined.includes("pastoral") ||
    combined.includes("jardín") ||
    combined.includes("jardin")
  ) {
    return "baroque";
  }
  if (
    combined.includes("cosmos") ||
    combined.includes("espacial") ||
    combined.includes("galaxia") ||
    combined.includes("planeta") ||
    combined.includes("nebulosa") ||
    combined.includes("synthwave") ||
    combined.includes("holst")
  ) {
    return "cosmos";
  }
  if (
    combined.includes("océano") ||
    combined.includes("oceano") ||
    combined.includes("marino") ||
    combined.includes("marítima") ||
    combined.includes("debussy") ||
    combined.includes("acuario") ||
    combined.includes("arrecife")
  ) {
    return "ocean";
  }
  if (
    combined.includes("tempestad") ||
    combined.includes("tormenta") ||
    combined.includes("dies irae") ||
    combined.includes("relámpago") ||
    combined.includes("trueno")
  ) {
    return "storm";
  }
  return "symphonic";
};

/**
 * Ensures `farSvg`, `midSvg`, and `frontSvg` remain transparent in their sky/backdrop area
 * even if an external LLM included a full-canvas background `<rect>` inside them.
 */
export const sanitizeTransparentParallaxSvg = (svgXml: string): string => {
  if (!svgXml || !svgXml.trim()) return "";
  return svgXml.replace(
    /<rect\b[^>]*(?:width=["'](?:100%|1600|1920|2048|3200)["'][^>]*height=["'](?:100%|1000|1080|1216|1600|1900)["']|height=["'](?:100%|1000|1080|1216|1600|1900)["'][^>]*width=["'](?:100%|1600|1920|2048|3200)["'])[^>]*\/?>/gi,
    "",
  );
};

/**
 * Compiles 4 horizontally-seamless (3200 x 1900, viewBox="0 -1100 3200 1900") animated SVGs
 * generated according to the musical work's theme in the OKF JSON:
 *  - sky   (speed 0.16x): Deep sky gradient, celestial bodies, auroras/nebulae/lightning & drifting clouds
 *  - far   (speed 0.38x): Distant horizon mountains/villas/volcanoes/planets/ferris wheels & flying flocks
 *  - mid   (speed 0.66x): Mid-ground hills, thematic swaying trees/palms/crystals/columns & animated waterfalls/waves
 *  - front (speed 1.28x): Foreground atmospheric particles (blossom petals, embers, confetti, sea foam, stardust)
 */
export const compileParallaxLayerSvgs = (params: {
  spec?: OkfSliceSpec;
  specs?: OkfSliceSpec[];
  projectMetadata?: OkfMusicogramaMetadata;
  projectTitle?: string;
  environmentConcept?: string;
  userKeywords?: string;
}): ParallaxLayerSvgs => {
  const {
    spec,
    specs,
    projectMetadata,
    projectTitle,
    environmentConcept,
    userKeywords,
  } = params;

  const pTheme = detectParallaxThemeFromJson({
    spec,
    specs,
    projectMetadata,
    projectTitle,
    environmentConcept,
    userKeywords,
  });

  const themeDefaultPalettes: Record<ParallaxTheme, string[]> = {
    baroque: ["#0c4a6e", "#0284c7", "#38bdf8", "#fde047"],
    cavern: ["#090d16", "#1e1b4b", "#a855f7", "#f59e0b"],
    canarias: ["#0f172a", "#0369a1", "#f59e0b", "#fef08a"],
    carnival: ["#1e1b4b", "#701a75", "#ec4899", "#facc15"],
    storm: ["#090d16", "#1e293b", "#6366f1", "#38bdf8"],
    ocean: ["#042f2e", "#0f766e", "#2dd4bf", "#bae6fd"],
    cosmos: ["#030712", "#1e1b4b", "#8b5cf6", "#22d3ee"],
    symphonic: ["#0f172a", "#1e293b", "#38bdf8", "#fbbf24"],
  };

  const firstSpecWithPalette =
    (spec?.recommendedPalette && spec.recommendedPalette.length >= 3
      ? spec
      : (specs || []).find(
          (s) => s.recommendedPalette && s.recommendedPalette.length >= 3,
        )) || undefined;

  const palette =
    firstSpecWithPalette?.recommendedPalette || themeDefaultPalettes[pTheme];
  const c0 = palette[0] || "#0f172a";
  const c1 = palette[1] || "#1e293b";
  const c2 = palette[2] || "#38bdf8";
  const c3 = palette[3] || palette[2] || "#fbbf24";

  const W = 3200;
  const MIN_Y = -1100;
  const MAX_Y = 800;
  const H = MAX_Y - MIN_Y; // 1900
  const omega = (Math.PI * 2) / W;

  // Helper to build a 100% horizontally periodic (C1 seamless at x=0 and x=3200) ridge polygon
  const buildSeamlessRidgePath = (
    baseY: number,
    a1: number,
    p1: number,
    a2: number,
    p2: number,
    a3: number,
    p3: number,
  ): { fillPath: string; topStroke: string; evalY: (x: number) => number } => {
    const evalY = (x: number) =>
      baseY +
      a1 * Math.sin(omega * x + p1) +
      a2 * Math.cos(2 * omega * x + p2) +
      a3 * Math.sin(3 * omega * x + p3);
    const step = 64;
    let pts = `M 0 ${evalY(0).toFixed(1)}`;
    for (let x = step; x <= W; x += step) {
      pts += ` L ${x} ${evalY(x).toFixed(1)}`;
    }
    return {
      fillPath: `${pts} L ${W} ${MAX_Y} L 0 ${MAX_Y} Z`,
      topStroke: pts,
      evalY,
    };
  };

  // ============================================================================
  // LAYER 0: DEEP SKY, CELESTIAL ASTROS, AURORAS & CLOUDS (0.16x)
  // ============================================================================
  let starsMarkup = "";
  const starCount = pTheme === "cosmos" ? 48 : pTheme === "baroque" ? 18 : 28;
  for (let i = 0; i < starCount; i++) {
    const sx = ((i * 397 + 140) % (W - 120)) + 60;
    const sy = -1040 + ((i * 251) % 640);
    const sr = 2.0 + (i % 3) * 1.3;
    const dur = (2.0 + (i % 5) * 0.65).toFixed(1);
    starsMarkup += `<circle cx="${sx}" cy="${sy}" r="${sr.toFixed(1)}" fill="#ffffff" opacity="0.65">
      <animate attributeName="opacity" values="0.16;0.94;0.16" dur="${dur}s" repeatCount="indefinite"/>
    </circle>`;
  }

  let skyThemeSpecial = "";
  if (pTheme === "cavern") {
    // Subterranean Cavern Ceiling Stalactites & Glowing Mineral Veins
    let ceilPts = `M 0 ${MIN_Y}`;
    for (let x = 0; x <= W; x += 80) {
      const cy =
        -920 +
        Math.sin(omega * x * 2) * 75 +
        Math.cos(omega * x * 5) * 55;
      ceilPts += ` L ${x} ${cy.toFixed(1)}`;
    }
    ceilPts += ` L ${W} ${MIN_Y} Z`;
    skyThemeSpecial += `<path d="${ceilPts}" fill="${c0}" fill-opacity="0.92" stroke="${c2}" stroke-width="3" stroke-opacity="0.45"/>`;
    for (let x = 180; x < W - 120; x += 320) {
      const h = 140 + ((x * 13) % 130);
      skyThemeSpecial += `<g transform="translate(${x}, -940)">
        <polygon points="-28,0 0,${h} 28,0" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <circle cx="0" cy="${h}" r="7" fill="${c3}">
          <animate attributeName="opacity" values="0.25;0.95;0.25" dur="2.6s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }
  } else if (pTheme === "carnival") {
    // Sweeping Festival Searchlight Beams & Firework Bursts
    for (let b = 0; b < 6; b++) {
      const bx = 280 + b * 520;
      const bColor = b % 2 === 0 ? c2 : c3;
      const dur = (4.2 + (b % 3) * 0.9).toFixed(1);
      skyThemeSpecial += `<g transform="translate(${bx}, 240)">
        <polygon points="0,0 -220,-1320 220,-1320" fill="${bColor}" fill-opacity="0.14">
          <animateTransform attributeName="transform" type="rotate" values="-18 0 0; 18 0 0; -18 0 0" dur="${dur}s" repeatCount="indefinite"/>
        </polygon>
      </g>`;
    }
    for (let f = 0; f < 5; f++) {
      const fx = 420 + f * 580;
      const fy = -760 + ((f * 130) % 240);
      const fDur = (2.4 + (f % 3) * 0.7).toFixed(1);
      skyThemeSpecial += `<g transform="translate(${fx}, ${fy})">
        <circle cx="0" cy="0" r="18" fill="none" stroke="${c3}" stroke-width="4" stroke-dasharray="6 10">
          <animate attributeName="r" values="12;95;12" dur="${fDur}s" repeatCount="indefinite"/>
          <animate attributeName="stroke-opacity" values="0.95;0.05;0.95" dur="${fDur}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }
  } else if (pTheme === "storm") {
    // Animated Jagged Lightning Bolts across the Storm Sky
    for (let l = 0; l < 4; l++) {
      const lx = 440 + l * 760;
      const lDur = (3.4 + l * 0.65).toFixed(2);
      skyThemeSpecial += `<path d="M ${lx} -1060 L ${lx - 45} -780 L ${lx + 20} -760 L ${lx - 65} -460 L ${lx + 10} -440 L ${lx - 40} -180" fill="none" stroke="#fef08a" stroke-width="5" opacity="0">
        <animate attributeName="opacity" values="0;0;0.95;0.15;0.88;0;0;0" dur="${lDur}s" repeatCount="indefinite"/>
      </path>`;
    }
  } else if (pTheme === "baroque" || pTheme === "canarias") {
    // Multi-band Rainbow / Alisios Harmonic Arch
    const rainbowCols = ["#ef4444", "#f97316", "#facc15", "#10b981", "#38bdf8", "#8b5cf6"];
    rainbowCols.forEach((col, rIdx) => {
      const ry = -520 + rIdx * 18;
      skyThemeSpecial += `<path d="M 0 ${ry} Q 800 ${ry - 340} 1600 ${ry} T 3200 ${ry}" fill="none" stroke="${col}" stroke-width="14" stroke-opacity="0.22">
        <animate attributeName="stroke-opacity" values="0.14;0.32;0.14" dur="${(3.8 + rIdx * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
      </path>`;
    });
  } else if (pTheme === "cosmos") {
    // Shooting Stars & Deep Nebula Clouds
    for (let s = 0; s < 4; s++) {
      const sx = 350 + s * 740;
      const sy = -880 + (s % 2) * 160;
      const sDur = (3.2 + s * 0.7).toFixed(1);
      skyThemeSpecial += `<g transform="translate(${sx}, ${sy})">
        <line x1="0" y1="0" x2="-120" y2="-45" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.75">
          <animateTransform attributeName="transform" type="translate" values="0,0; 260,95; 0,0" dur="${sDur}s" repeatCount="indefinite"/>
        </line>
      </g>`;
    }
  }

  let cloudsMarkup = "";
  for (let i = 0; i < 7; i++) {
    const cx = 220 + i * 440;
    const cy = -780 + ((i * 173) % 340);
    const scale = (0.85 + (i % 3) * 0.25).toFixed(2);
    const driftDur = (6.5 + (i % 4) * 1.4).toFixed(1);
    cloudsMarkup += `<g transform="translate(${cx}, ${cy}) scale(${scale})" opacity="${pTheme === "cavern" ? "0.18" : "0.34"}">
      <g>
        <ellipse cx="-65" cy="12" rx="78" ry="22" fill="${c2}"/>
        <ellipse cx="65" cy="12" rx="82" ry="20" fill="${c3}"/>
        <ellipse cx="0" cy="0" rx="115" ry="28" fill="#ffffff"/>
        <animateTransform attributeName="transform" type="translate" values="-28,0; 28,0; -28,0" dur="${driftDur}s" repeatCount="indefinite"/>
      </g>
    </g>`;
  }

  const skySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${MIN_Y} ${W} ${H}" width="2048" height="1216" preserveAspectRatio="none" data-sonogramic-parallax-theme="${pTheme}">
  <defs>
    <linearGradient id="px_sky_bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c0}"/>
      <stop offset="46%" stop-color="${c1}"/>
      <stop offset="82%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c0}"/>
    </linearGradient>
    <radialGradient id="px_sun_glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92"/>
      <stop offset="35%" stop-color="${c3}" stop-opacity="0.52"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="${MIN_Y}" width="${W}" height="${H}" fill="url(#px_sky_bg)"/>
  <!-- Atmospheric Aurora / Harmonic Ribbons -->
  <path d="M 0 -580 Q 800 -880 1600 -580 T 3200 -580" fill="none" stroke="${c3}" stroke-width="48" stroke-opacity="0.14">
    <animate attributeName="stroke-opacity" values="0.08;0.24;0.08" dur="5.2s" repeatCount="indefinite"/>
  </path>
  <path d="M 0 -510 Q 800 -810 1600 -510 T 3200 -510" fill="none" stroke="${c2}" stroke-width="36" stroke-opacity="0.16">
    <animate attributeName="stroke-opacity" values="0.10;0.28;0.10" dur="4.4s" repeatCount="indefinite"/>
  </path>
  <!-- Twinkling Starfield -->
  <g>${starsMarkup}</g>
  <!-- Pulsing Celestial Sun / Moon / Corona -->
  <g transform="translate(880, -640)">
    <circle cx="0" cy="0" r="290" fill="url(#px_sun_glow)">
      <animate attributeName="r" values="260;320;260" dur="4.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="0" cy="0" r="76" fill="#ffffff" fill-opacity="0.88"/>
  </g>
  <g transform="translate(2480, -680)">
    <circle cx="0" cy="0" r="220" fill="url(#px_sun_glow)">
      <animate attributeName="r" values="195;245;195" dur="5.4s" repeatCount="indefinite"/>
    </circle>
  </g>
  <!-- Thematic Sky Elements -->
  <g>${skyThemeSpecial}</g>
  <!-- High-Altitude Drifting Cloud Banks -->
  <g>${cloudsMarkup}</g>
</svg>`;

  // ============================================================================
  // LAYER 1: DISTANT HORIZON LANDMARKS, MOUNTAINS & FLOCKS (0.38x)
  // ============================================================================
  const farRidge1 = buildSeamlessRidgePath(-330, 95, 0.4, 52, 1.2, 28, 2.1);
  const farRidge2 = buildSeamlessRidgePath(-185, 76, 1.9, 44, 0.5, 24, 1.1);

  let farLandmarks = "";
  for (let x = 260; x < W - 200; x += 520) {
    const idx = Math.round(x / 520);
    const ry = farRidge2.evalY(x);
    if (pTheme === "cavern") {
      // Distant Giant Glowing Crystal Spires & Stalactite Arches
      farLandmarks += `<g transform="translate(${x}, ${ry.toFixed(1)})">
        <polygon points="-52,28 0,-185 52,28" fill="${c2}" fill-opacity="0.48" stroke="${c3}" stroke-width="2"/>
        <polygon points="30,32 68,-125 102,32" fill="${c3}" fill-opacity="0.38"/>
        <polygon points="-92,32 -58,-110 -24,32" fill="${c2}" fill-opacity="0.35"/>
        <circle cx="0" cy="-185" r="10" fill="#ffffff">
          <animate attributeName="opacity" values="0.3;0.95;0.3" dur="${(2.2 + (idx % 3) * 0.5).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    } else if (pTheme === "canarias") {
      // Volcanic Teide / Caldera Cones, Roque Nublo Monolith & Whitewashed Coastal Villages
      farLandmarks += `<g transform="translate(${x}, ${ry.toFixed(1)})" opacity="0.78">
        <polygon points="-170,35 -25,-165 25,-165 170,35" fill="${c1}" stroke="${c3}" stroke-width="2"/>
        <rect x="-14" y="-215" width="28" height="52" rx="5" fill="${c2}" stroke="${c3}" stroke-width="1.8"/>
        <rect x="65" y="-28" width="34" height="26" fill="#ffffff" fill-opacity="0.85"/>
        <rect x="104" y="-22" width="28" height="20" fill="#ffffff" fill-opacity="0.82"/>
      </g>`;
    } else if (pTheme === "carnival") {
      // Illuminated Rotating Carnival Ferris Wheel & Festival Horizon Stage
      farLandmarks += `<g transform="translate(${x}, ${ry.toFixed(1)})" opacity="0.78">
        <line x1="-55" y1="25" x2="0" y2="-95" stroke="${c3}" stroke-width="4"/>
        <line x1="55" y1="25" x2="0" y2="-95" stroke="${c3}" stroke-width="4"/>
        <g transform="translate(0, -95)">
          <circle cx="0" cy="0" r="76" fill="none" stroke="${c2}" stroke-width="4" stroke-dasharray="12 8"/>
          <circle cx="0" cy="0" r="52" fill="none" stroke="${c3}" stroke-width="2.5"/>
          <line x1="-76" y1="0" x2="76" y2="0" stroke="${c3}" stroke-width="2"/>
          <line x1="0" y1="-76" x2="0" y2="76" stroke="${c3}" stroke-width="2"/>
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="14s" repeatCount="indefinite"/>
        </g>
      </g>`;
    } else if (pTheme === "ocean") {
      // Coastal Lighthouse with Sweeping Beam & Rocking Horizon Sailboats
      farLandmarks += `<g transform="translate(${x}, ${ry.toFixed(1)})" opacity="0.78">
        <polygon points="-22,25 -12,-145 12,-145 22,25" fill="#ffffff" stroke="${c2}" stroke-width="2"/>
        <rect x="-16" y="-162" width="32" height="18" fill="${c3}"/>
        <polygon points="0,-153 260,-230 260,-90" fill="#fef08a" fill-opacity="0.22">
          <animateTransform attributeName="transform" type="rotate" values="-12 0 -153; 12 0 -153; -12 0 -153" dur="4.2s" repeatCount="indefinite"/>
        </polygon>
        <g transform="translate(135, 10)">
          <polygon points="0,0 0,-68 44,-12" fill="#ffffff" fill-opacity="0.86"/>
          <polygon points="-32,0 38,0 26,14 -22,14" fill="${c2}"/>
          <animateTransform attributeName="transform" type="rotate" values="-4 0 0; 4 0 0; -4 0 0" dur="3.4s" repeatCount="indefinite"/>
        </g>
      </g>`;
    } else if (pTheme === "cosmos") {
      // Ringed Horizon Planets & Crystalline Space Spires
      farLandmarks += `<g transform="translate(${x}, ${(ry - 150).toFixed(1)})" opacity="0.78">
        <circle cx="0" cy="0" r="54" fill="${c1}" stroke="${c2}" stroke-width="2.5"/>
        <ellipse cx="0" cy="0" rx="108" ry="22" fill="none" stroke="${c3}" stroke-width="4" transform="rotate(-16)">
          <animate attributeName="stroke-opacity" values="0.35;0.9;0.35" dur="3.6s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
    } else {
      // Baroque / Symphonic / Storm: Distant Horizon Aqueducts, Palladian Villas & Campaniles
      farLandmarks += `<g transform="translate(${x}, ${ry.toFixed(1)})" opacity="0.68">
        <rect x="-110" y="-58" width="220" height="75" fill="${c1}" stroke="${c3}" stroke-width="1.8"/>
        <path d="M -122 -58 L 0 -118 L 122 -58 Z" fill="${c2}" stroke="${c3}" stroke-width="2"/>
        <rect x="135" y="-145" width="28" height="160" fill="${c1}" stroke="${c3}" stroke-width="1.5"/>
        <polygon points="130,-145 149,-190 168,-145" fill="${c3}"/>
        <circle cx="0" cy="-82" r="10" fill="${c3}">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="${(2.6 + (idx % 3) * 0.5).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }

    // Animated High-Altitude Bird Flocks / Glowing Spores
    const birdY = ry - 240 - ((idx * 53) % 120);
    farLandmarks += `<g transform="translate(${x + 180}, ${birdY.toFixed(1)})">
      <g>
        <path d="M -24 0 Q -12 -15 0 -2 Q 12 -15 24 0" fill="none" stroke="${c3}" stroke-width="3" stroke-linecap="round"/>
        <path d="M 22 -22 Q 32 -35 42 -24 Q 52 -35 62 -22" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>
        <path d="M -52 -18 Q -42 -30 -32 -20 Q -22 -30 -12 -18" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
        <animateTransform attributeName="transform" type="translate" values="-22,6; 22,-12; -22,6" dur="${(3.1 + (idx % 3) * 0.6).toFixed(1)}s" repeatCount="indefinite"/>
      </g>
    </g>`;
  }

  const farSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${MIN_Y} ${W} ${H}" width="2048" height="1216" preserveAspectRatio="none" data-sonogramic-parallax-theme="${pTheme}">
  <defs>
    <linearGradient id="px_far1_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.36"/>
      <stop offset="45%" stop-color="${c1}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="px_far2_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.96"/>
    </linearGradient>
  </defs>
  <path d="${farRidge1.fillPath}" fill="url(#px_far1_grad)"/>
  <path d="${farRidge1.topStroke}" fill="none" stroke="${c3}" stroke-width="2" stroke-opacity="0.28"/>
  ${farLandmarks}
  <path d="${farRidge2.fillPath}" fill="url(#px_far2_grad)"/>
  <path d="${farRidge2.topStroke}" fill="none" stroke="${c2}" stroke-width="2.5" stroke-opacity="0.38"/>
</svg>`;

  // ============================================================================
  // LAYER 2: MID-GROUND HILLS, THEMATIC VEGETATION, WATERFALLS & ARCHES (0.66x)
  // ============================================================================
  const midRidge = buildSeamlessRidgePath(15, 64, 0.8, 36, 2.4, 18, 0.7);
  let midScenery = "";
  for (let x = 160; x < W - 120; x += 280) {
    const idx = Math.round(x / 280);
    const my = midRidge.evalY(x);
    const swayDur = (3.0 + (idx % 4) * 0.55).toFixed(1);

    if (idx % 3 === 0) {
      if (pTheme === "cavern") {
        // Subterranean Glowing Braziers & Crystal Clusters
        midScenery += `<g transform="translate(${x}, ${my.toFixed(1)})">
          <polygon points="-40,35 -12,-95 16,35" fill="${c2}" fill-opacity="0.65" stroke="${c3}" stroke-width="2"/>
          <polygon points="10,35 34,-120 58,35" fill="${c3}" fill-opacity="0.58"/>
          <circle cx="34" cy="-128" r="16" fill="${c3}" fill-opacity="0.75">
            <animate attributeName="r" values="12;22;12" dur="1.8s" repeatCount="indefinite"/>
          </circle>
        </g>`;
      } else if (pTheme === "canarias") {
        // Traditional Canarian Wooden Balcony & Pulsing Pintadera Sun Emblem
        midScenery += `<g transform="translate(${x}, ${my.toFixed(1)})">
          <rect x="-70" y="-65" width="140" height="90" fill="#ffffff" fill-opacity="0.82" stroke="${c2}" stroke-width="2"/>
          <rect x="-78" y="-42" width="156" height="16" rx="3" fill="#78350f" stroke="${c3}" stroke-width="1.5"/>
          <polygon points="0,-115 26,-88 0,-61 -26,-88" fill="${c2}" stroke="${c3}" stroke-width="2">
            <animateTransform attributeName="transform" type="rotate" from="0 0 -88" to="360 0 -88" dur="12s" repeatCount="indefinite"/>
          </polygon>
        </g>`;
      } else if (pTheme === "carnival") {
        // Illuminated Carnival Stage Arch & Pulsing Spotlight Orbs
        midScenery += `<g transform="translate(${x}, ${my.toFixed(1)})">
          <path d="M -85 35 A 85 95 0 0 1 85 35" fill="none" stroke="${c2}" stroke-width="10"/>
          <path d="M -72 35 A 72 82 0 0 1 72 35" fill="none" stroke="${c3}" stroke-width="5" stroke-dasharray="10 8"/>
          <circle cx="0" cy="-62" r="14" fill="#ffffff">
            <animate attributeName="r" values="10;18;10" dur="1.4s" repeatCount="indefinite"/>
          </circle>
        </g>`;
      } else {
        // Baroque / Symphonic / Ocean / Cosmos / Storm: Multi-Arch Viaduct & Cascading Waterfall
        midScenery += `<g transform="translate(${x}, ${my.toFixed(1)})">
          <rect x="-85" y="-55" width="170" height="18" rx="4" fill="${c2}" fill-opacity="0.72" stroke="${c3}" stroke-width="2"/>
          <rect x="-72" y="-37" width="16" height="95" fill="${c1}"/>
          <rect x="-8" y="-37" width="16" height="95" fill="${c1}"/>
          <rect x="56" y="-37" width="16" height="95" fill="${c1}"/>
          <line x1="-32" y1="-35" x2="-32" y2="85" stroke="#bae6fd" stroke-width="7" stroke-dasharray="14 10" stroke-opacity="0.65">
            <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.1s" repeatCount="indefinite"/>
          </line>
          <line x1="32" y1="-35" x2="32" y2="85" stroke="#bae6fd" stroke-width="7" stroke-dasharray="14 10" stroke-opacity="0.65">
            <animate attributeName="stroke-dashoffset" from="48" to="0" dur="1.1s" repeatCount="indefinite"/>
          </line>
        </g>`;
      }
    }

    if (pTheme === "canarias" || pTheme === "carnival") {
      // Swaying Canarian / Tropical Palm Trees
      midScenery += `<g transform="translate(${x + 85}, ${my.toFixed(1)})">
        <g>
          <path d="M 0 38 Q -8 -45 6 -135" fill="none" stroke="${c1}" stroke-width="10" stroke-linecap="round"/>
          <path d="M 6 -135 Q -55 -155 -78 -115" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 6 -135 Q 65 -155 88 -115" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 6 -135 Q -35 -180 -62 -152" fill="none" stroke="${c3}" stroke-width="5" stroke-linecap="round"/>
          <path d="M 6 -135 Q 45 -180 72 -152" fill="none" stroke="${c3}" stroke-width="5" stroke-linecap="round"/>
          <animateTransform attributeName="transform" type="rotate" values="-3.2 0 38; 3.2 0 38; -3.2 0 38" dur="${swayDur}s" repeatCount="indefinite"/>
        </g>
      </g>`;
    } else if (pTheme === "cavern") {
      // Bioluminescent Giant Cavern Mushrooms
      midScenery += `<g transform="translate(${x + 85}, ${my.toFixed(1)})">
        <rect x="-7" y="-85" width="14" height="120" rx="5" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
        <path d="M -52 -80 C -52 -135 52 -135 52 -80 Z" fill="${c2}" stroke="${c3}" stroke-width="2">
          <animate attributeName="fill-opacity" values="0.55;0.95;0.55" dur="${swayDur}s" repeatCount="indefinite"/>
        </path>
        <circle cx="-18" cy="-100" r="6" fill="#ffffff" opacity="0.8"/>
        <circle cx="16" cy="-96" r="5" fill="${c3}" opacity="0.85"/>
      </g>`;
    } else {
      // Swaying Cypresses / Pines / Blossoming Trees
      midScenery += `<g transform="translate(${x + 85}, ${my.toFixed(1)})">
        <g>
          <path d="M -22 35 C -38 -55 -28 -145 -10 -195 C 8 -145 18 -55 2 35 Z" fill="${c0}" fill-opacity="0.88" stroke="${c2}" stroke-width="1.8"/>
          <circle cx="-10" cy="-130" r="5" fill="${c3}" fill-opacity="0.85"/>
          <animateTransform attributeName="transform" type="rotate" values="${pTheme === "storm" ? "-6.5" : "-2.6"} -10 35; ${pTheme === "storm" ? "6.5" : "2.6"} -10 35; ${pTheme === "storm" ? "-6.5" : "-2.6"} -10 35" dur="${swayDur}s" repeatCount="indefinite"/>
        </g>
        <g>
          <path d="M 32 38 C 18 -40 26 -115 42 -158 C 58 -115 66 -40 52 38 Z" fill="${c1}" fill-opacity="0.86" stroke="${c3}" stroke-width="1.5"/>
          <animateTransform attributeName="transform" type="rotate" values="2.4 42 38; -2.4 42 38; 2.4 42 38" dur="${swayDur}s" repeatCount="indefinite"/>
        </g>
      </g>`;
    }
  }

  const midSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${MIN_Y} ${W} ${H}" width="2048" height="1216" preserveAspectRatio="none" data-sonogramic-parallax-theme="${pTheme}">
  <defs>
    <linearGradient id="px_mid_grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.52"/>
      <stop offset="38%" stop-color="${c1}" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="${c0}" stop-opacity="0.97"/>
    </linearGradient>
  </defs>
  ${midScenery}
  <path d="${midRidge.fillPath}" fill="url(#px_mid_grad)"/>
  <path d="${midRidge.topStroke}" fill="none" stroke="${c3}" stroke-width="3" stroke-opacity="0.52"/>
  <!-- Animated Valley Mist / Harmonic Wave Ribbon -->
  <path d="M 0 65 Q 800 15 1600 65 T 3200 65" fill="none" stroke="#ffffff" stroke-width="26" stroke-opacity="0.14">
    <animate attributeName="stroke-opacity" values="0.07;0.22;0.07" dur="3.8s" repeatCount="indefinite"/>
  </path>
</svg>`;

  // ============================================================================
  // LAYER 4: FOREGROUND PARALLAX OVERLAY — THEMATIC PARTICLES (1.28x)
  // ============================================================================
  let frontParticles = "";
  for (let i = 0; i < 24; i++) {
    const fx = ((i * 293 + 90) % (W - 100)) + 50;
    const fy = -520 + ((i * 197) % 920);
    const dur = (2.6 + (i % 5) * 0.55).toFixed(1);

    if (pTheme === "carnival") {
      // Falling Multicolor Carnival Confetti & Serpentine Ribbons
      const confCol = i % 3 === 0 ? c2 : i % 3 === 1 ? c3 : "#38bdf8";
      frontParticles += `<g transform="translate(${fx}, ${fy})">
        <rect x="-7" y="-4" width="14" height="8" rx="2" fill="${confCol}" opacity="0.82" transform="rotate(${(i * 37) % 180})">
          <animateTransform attributeName="transform" type="translate" values="-18,-28; 22,32; -18,-28" dur="${dur}s" repeatCount="indefinite"/>
        </rect>
      </g>`;
    } else if (pTheme === "storm") {
      // Diagonal Wind-Driven Rain Streaks & Electric Sparks
      frontParticles += `<g transform="translate(${fx}, ${fy})">
        <line x1="0" y1="0" x2="-22" y2="48" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round" opacity="0.55">
          <animateTransform attributeName="transform" type="translate" values="14,-30; -14,30; 14,-30" dur="1.2s" repeatCount="indefinite"/>
        </line>
      </g>`;
    } else if (pTheme === "cavern") {
      // Rising Glowing Subterranean Embers & Crystal Spores
      frontParticles += `<g transform="translate(${fx}, ${fy})">
        <polygon points="0,-9 7,0 0,9 -7,0" fill="${i % 2 === 0 ? c3 : c2}" fill-opacity="0.78">
          <animateTransform attributeName="transform" type="translate" values="0,24; 0,-28; 0,24" dur="${dur}s" repeatCount="indefinite"/>
        </polygon>
      </g>`;
    } else if (pTheme === "ocean") {
      // Rising Iridescent Sea-Foam Bubbles
      frontParticles += `<g transform="translate(${fx}, ${fy})">
        <circle cx="0" cy="0" r="${6 + (i % 4) * 2}" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.72">
          <animateTransform attributeName="transform" type="translate" values="-10,26; 10,-26; -10,26" dur="${dur}s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    } else {
      // Baroque / Canarias / Cosmos / Symphonic: Blossom Petals & Golden Fireflies
      const isPetal = i % 2 === 0;
      if (isPetal) {
        frontParticles += `<g transform="translate(${fx}, ${fy})">
          <g>
            <ellipse cx="0" cy="0" rx="8" ry="4.5" transform="rotate(28)" fill="${c3}" fill-opacity="0.72"/>
            <animateTransform attributeName="transform" type="translate" values="-24,-18; 24,22; -24,-18" dur="${dur}s" repeatCount="indefinite"/>
          </g>
        </g>`;
      } else {
        frontParticles += `<g transform="translate(${fx}, ${fy})">
          <circle cx="0" cy="0" r="5.5" fill="#ffffff" fill-opacity="0.75">
            <animate attributeName="fill-opacity" values="0.2;0.9;0.2" dur="${dur}s" repeatCount="indefinite"/>
          </circle>
          <circle cx="0" cy="0" r="13" fill="${c2}" fill-opacity="0.22">
            <animate attributeName="r" values="9;17;9" dur="${dur}s" repeatCount="indefinite"/>
          </circle>
        </g>`;
      }
    }
  }

  const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${MIN_Y} ${W} ${H}" width="2048" height="1216" preserveAspectRatio="none" data-sonogramic-parallax-theme="${pTheme}">
  <g>${frontParticles}</g>
</svg>`;

  return {
    sky: skySvg,
    far: farSvg,
    mid: midSvg,
    front: frontSvg,
  };
};

/**
 * Compiles a single unified panoramic animated SVG covering the entire musicograma from 0s to duration,
 * without any text or trajectory lines.
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${totalMinX.toFixed(1)} ${worldMinY} ${totalWidth.toFixed(1)} ${worldHeight}" width="${masterPixelW}" height="${masterPixelH}" preserveAspectRatio="none" data-sonogramic-scenic-animated="v3">
  ${nestedSlices}
</svg>`;
};
