import vivaldiJson from "../../examples/vivaldi_primavera_okf.json";
import griegJson from "../../examples/grieg_rey_montana_okf.json";
import isaCanariaJson from "../../examples/isa_canaria_okf.json";
import carnavalLasPalmasJson from "../../examples/musicograma_carnaval_las_palmas_okf.json";
import { OkfMusicogramaProject } from "../types/okf";
import { compileParallaxLayerSvgs } from "../utils/svgTrajectoryCompiler";

const withThematicParallaxInJson = (
  rawProject: OkfMusicogramaProject,
): OkfMusicogramaProject => {
  const compiled = compileParallaxLayerSvgs({
    spec: rawProject.sliceSpecs?.[0],
    specs: rawProject.sliceSpecs,
    projectMetadata: rawProject.metadata,
    projectTitle: rawProject.metadata?.title,
    environmentConcept: rawProject.metadata?.environmentConcept,
    userKeywords: rawProject.config?.userKeywords,
  });
  return {
    ...rawProject,
    config: {
      ...rawProject.config,
      parallaxIntensity: rawProject.config?.parallaxIntensity ?? 1.0,
      parallaxLayers: {
        skySvg: rawProject.config?.parallaxLayers?.skySvg || compiled.sky,
        farSvg: rawProject.config?.parallaxLayers?.farSvg || compiled.far,
        midSvg: rawProject.config?.parallaxLayers?.midSvg || compiled.mid,
        frontSvg: rawProject.config?.parallaxLayers?.frontSvg || compiled.front,
      },
    },
  };
};

export const EXAMPLE_OKF_PROJECTS: {
  id: string;
  shortTitle: string;
  badge: string;
  project: OkfMusicogramaProject;
}[] = [
  {
    id: "vivaldi-primavera",
    shortTitle: "Vivaldi — La Primavera (Allegro)",
    badge: "Barroco · 6 Segmentos",
    project: withThematicParallaxInJson(
      vivaldiJson as unknown as OkfMusicogramaProject,
    ),
  },
  {
    id: "grieg-rey-montana",
    shortTitle: "Grieg — El Rey de la Montaña",
    badge: "Accelerando · 6 Segmentos",
    project: withThematicParallaxInJson(
      griegJson as unknown as OkfMusicogramaProject,
    ),
  },
  {
    id: "isa-canaria",
    shortTitle: "Folclore Canario — Isa Parrandera",
    badge: "Compás 3/4 · 5 Segmentos",
    project: withThematicParallaxInJson(
      isaCanariaJson as unknown as OkfMusicogramaProject,
    ),
  },
  {
    id: "carnaval-las-palmas",
    shortTitle: "Carnaval LPGC — ¡Ay, Carnaval!",
    badge: "Compás 4/4 · 6 Segmentos",
    project: withThematicParallaxInJson(
      carnavalLasPalmasJson as unknown as OkfMusicogramaProject,
    ),
  },
];
