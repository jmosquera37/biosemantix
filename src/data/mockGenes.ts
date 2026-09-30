import type { Gene } from "../types/gene";

export const mockGenes: Gene[] = [
  {
    id: "1",
    symbol: "BRCA1",
    name: "BRCA1 DNA repair associated",
    description:
      "Gen asociado con mecanismos celulares relacionados con la reparación del ADN.",
    synonyms: ["BRCC1", "IRIS"],
    ensemblId: "ENSG00000012048",
    uniprotId: "P38398",
    function:
      "Participa en procesos celulares relacionados con la reparación y mantenimiento del ADN.",
    biologicalProcesses: [
      "Reparación del ADN",
      "Respuesta al daño del ADN",
      "Regulación del ciclo celular",
    ],
    molecularFunctions: [
      "Unión a proteínas",
      "Unión a ADN",
    ],
    cellularComponents: [
      "Núcleo celular",
      "Complejo de reparación del ADN",
    ],
    pathways: [
      "Reparación por recombinación homóloga",
      "Respuesta al daño del ADN",
    ],
    expressionLevel: 8.42,
    pValue: 0.001,
  },

  {
    id: "2",
    symbol: "TP53",
    name: "Tumor protein p53",
    description:
      "Gen relacionado con la regulación de procesos celulares y la respuesta al estrés celular.",
    synonyms: ["P53", "BCC7"],
    ensemblId: "ENSG00000141510",
    uniprotId: "P04637",
    function:
      "Participa en la regulación de diferentes procesos celulares relacionados con el ciclo celular.",
    biologicalProcesses: [
      "Regulación del ciclo celular",
      "Respuesta al estrés celular",
      "Reparación del ADN",
    ],
    molecularFunctions: [
      "Unión a ADN",
      "Actividad de factor de transcripción",
    ],
    cellularComponents: [
      "Núcleo celular",
      "Citoplasma",
    ],
    pathways: [
      "Vía de señalización de p53",
      "Respuesta al daño del ADN",
    ],
    expressionLevel: 7.85,
    pValue: 0.003,
  },

  {
    id: "3",
    symbol: "EGFR",
    name: "Epidermal growth factor receptor",
    description:
      "Receptor de membrana implicado en procesos de señalización celular.",
    synonyms: ["ERBB", "ERBB1"],
    ensemblId: "ENSG00000146648",
    uniprotId: "P00533",
    function:
      "Participa en procesos de señalización celular relacionados con el crecimiento y proliferación.",
    biologicalProcesses: [
      "Señalización celular",
      "Proliferación celular",
      "Regulación del crecimiento celular",
    ],
    molecularFunctions: [
      "Actividad de receptor",
      "Unión a proteínas",
    ],
    cellularComponents: [
      "Membrana plasmática",
      "Membrana celular",
    ],
    pathways: [
      "Señalización EGFR",
      "Vía MAPK",
      "Vía PI3K-AKT",
    ],
    expressionLevel: 9.12,
    pValue: 0.0005,
  },

  {
    id: "4",
    symbol: "MYC",
    name: "MYC proto-oncogene",
    description:
      "Gen que participa en la regulación de procesos relacionados con crecimiento y proliferación celular.",
    synonyms: ["C-MYC"],
    ensemblId: "ENSG00000136997",
    uniprotId: "P01106",
    function:
      "Actúa como regulador de la expresión de diversos genes involucrados en procesos celulares.",
    biologicalProcesses: [
      "Proliferación celular",
      "Regulación de la expresión génica",
      "Crecimiento celular",
    ],
    molecularFunctions: [
      "Actividad de factor de transcripción",
      "Unión a ADN",
    ],
    cellularComponents: [
      "Núcleo celular",
    ],
    pathways: [
      "Señalización de MYC",
      "Regulación del ciclo celular",
    ],
    expressionLevel: 8.76,
    pValue: 0.008,
  },

  {
    id: "5",
    symbol: "PTEN",
    name: "Phosphatase and tensin homolog",
    description:
      "Gen relacionado con la regulación de diferentes procesos de señalización celular.",
    synonyms: ["MMAC1", "TEP1"],
    ensemblId: "ENSG00000171862",
    uniprotId: "P60484",
    function:
      "Participa en la regulación de vías de señalización relacionadas con crecimiento y supervivencia celular.",
    biologicalProcesses: [
      "Señalización celular",
      "Regulación del crecimiento celular",
      "Regulación de la proliferación",
    ],
    molecularFunctions: [
      "Actividad fosfatasa",
      "Unión a proteínas",
    ],
    cellularComponents: [
      "Citoplasma",
      "Membrana plasmática",
    ],
    pathways: [
      "Vía PI3K-AKT",
      "Señalización celular",
    ],
    expressionLevel: 6.94,
    pValue: 0.012,
  },

  {
    id: "6",
    symbol: "AKT1",
    name: "AKT serine/threonine kinase 1",
    description:
      "Gen relacionado con señalización celular y regulación de procesos de supervivencia y crecimiento.",
    synonyms: ["PKB", "RAC"],
    ensemblId: "ENSG00000142208",
    uniprotId: "P31749",
    function:
      "Participa en procesos de señalización celular relacionados con crecimiento y supervivencia.",
    biologicalProcesses: [
      "Señalización celular",
      "Supervivencia celular",
      "Crecimiento celular",
    ],
    molecularFunctions: [
      "Actividad quinasa",
      "Unión a ATP",
    ],
    cellularComponents: [
      "Citoplasma",
      "Membrana plasmática",
    ],
    pathways: [
      "Vía PI3K-AKT",
      "Señalización de insulina",
    ],
    expressionLevel: 7.63,
    pValue: 0.021,
  },
];