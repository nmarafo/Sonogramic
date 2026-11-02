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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sliceMinX.toFixed(1)} ${worldMinY} ${sliceWidth.toFixed(1)} ${worldHeight}" width="${svgPixelW}" height="${svgPixelH}" preserveAspectRatio="none" data-sonogramic-scenic-animated="v3">
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

  <!-- 1. Sky -->
  <rect x="${sliceMinX.toFixed(1)}" y="${worldMinY}" width="${sliceWidth.toFixed(1)}" height="${worldHeight}" fill="url(#${pfx}_skyGrad)"/>

  <!-- 2. Contoured Horizon & Mid-ground Scenic Ridges -->
  <path d="${farPts}" fill="url(#${pfx}_farHillGrad)"/>
  <path d="${midPts}" fill="url(#${pfx}_midHillGrad)" stroke="${c2}" stroke-width="2" stroke-opacity="0.35"/>

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
