import vivaldiJson from "../../examples/vivaldi_primavera_okf.json";
import griegJson from "../../examples/grieg_rey_montana_okf.json";
import isaCanariaJson from "../../examples/isa_canaria_okf.json";
import carnavalLasPalmasJson from "../../examples/musicograma_carnaval_las_palmas_okf.json";
import { OkfMusicogramaProject } from "../types/okf";

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
    project: vivaldiJson as unknown as OkfMusicogramaProject,
  },
  {
    id: "grieg-rey-montana",
    shortTitle: "Grieg — El Rey de la Montaña",
    badge: "Accelerando · 6 Segmentos",
    project: griegJson as unknown as OkfMusicogramaProject,
  },
  {
    id: "isa-canaria",
    shortTitle: "Folclore Canario — Isa Parrandera",
    badge: "Compás 3/4 · 5 Segmentos",
    project: isaCanariaJson as unknown as OkfMusicogramaProject,
  },
  {
    id: "carnaval-las-palmas",
    shortTitle: "Carnaval LPGC — ¡Ay, Carnaval!",
    badge: "Compás 4/4 · 6 Segmentos",
    project: carnavalLasPalmasJson as unknown as OkfMusicogramaProject,
  },
];
