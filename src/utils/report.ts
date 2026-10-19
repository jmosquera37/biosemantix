import type {
  GeneDetails,
  QueryStatus,
  SourceStatus,
} from "../services/biosemantix";

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  ok: "consultado",
  not_found: "sin resultados",
  unavailable: "no disponible (red)",
  error: "error de la fuente",
  malformed: "respuesta no válida",
  skipped: "no aplicable",
};

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  ok: "Consulta completada",
  partial: "Consulta parcial",
  not_found: "No encontrado",
  unavailable: "Fuente no disponible",
  invalid_identifier: "Identificador no admitido",
};

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export const QUERY_STATUS_TONES: Record<QueryStatus, StatusTone> = {
  ok: "success",
  partial: "warning",
  not_found: "info",
  unavailable: "warning",
  invalid_identifier: "error",
};

export function sourceStatusLabel(status: SourceStatus): string {
  return SOURCE_STATUS_LABELS[status] ?? status;
}

export function queryStatusLabel(status: QueryStatus): string {
  return QUERY_STATUS_LABELS[status] ?? status;
}

export function queryStatusTone(status: QueryStatus): StatusTone {
  return QUERY_STATUS_TONES[status] ?? "neutral";
}

export interface ReportEntry {
  identifier: string;
  details?: GeneDetails;
  error?: string;
}

const CSV_HEADERS = [
  "Identificador consultado",
  "Identificador normalizado",
  "Tipo de identificador",
  "Estado de consulta",
  "Estado Ensembl",
  "Estado UniProt",
  "Símbolo del gen",
  "ID Ensembl",
  "Accession UniProt",
  "Descripción del gen",
  "Función biológica",
  "Procesos biológicos",
  "Funciones moleculares",
  "Localización celular",
  "Vías biológicas",
  "Fuentes consultadas",
  "Mensaje",
];

export function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function joinAnnotations(items: { id: string; name: string }[]): string {
  return items.map((item) => `${item.id}: ${item.name}`).join("; ");
}

function consultedSources(details: GeneDetails): string {
  const names: string[] = [];

  if (details.sources.ensembl.status !== "skipped") {
    names.push("Ensembl");
  }

  if (details.sources.uniprot.status !== "skipped") {
    names.push("UniProt");
  }

  return names.length > 0 ? names.join("; ") : "Ninguna";
}

/**
 * Construye el contenido CSV del reporte funcional.
 *
 * Incluye todos los identificadores procesados: los resueltos por completo,
 * los parciales y los que fallaron, dejando constancia del estado de cada
 * fuente y del mensaje asociado.
 */
export function buildReportCsv(entries: ReportEntry[]): string {
  const rows = entries.map((entry) => {
    const details = entry.details;

    if (!details) {
      return [
        entry.identifier,
        "",
        "",
        "error",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        entry.error ?? "No fue posible completar la consulta.",
      ];
    }

    const annotations = details.annotations;

    return [
      entry.identifier,
      details.normalized,
      details.query_type,
      details.status,
      details.sources.ensembl.status,
      details.sources.uniprot.status,
      details.gene.symbol ?? "",
      details.gene.ensembl_id ?? "",
      details.protein.uniprot_accession ?? "",
      details.gene.description ?? "",
      annotations.function.join("; "),
      joinAnnotations(annotations.biological_processes),
      joinAnnotations(annotations.molecular_functions),
      annotations.subcellular_location.join("; "),
      annotations.pathways.join("; "),
      consultedSources(details),
      details.message ?? "",
    ];
  });

  return [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

/** Categoría de una consulta, alineada con el resumen global del reporte. */
export type ReportCategory = "completed" | "partial" | "not_found" | "failed";

/** Filtro por estado seleccionable en el reporte. */
export type ReportStatusFilter = "all" | ReportCategory;

/**
 * Clasifica una consulta procesada en una categoría de estado.
 *
 * Se usa tanto para el resumen global como para el filtro por estado, de
 * forma que ambos coincidan siempre.
 */
export function reportCategory(entry: ReportEntry): ReportCategory {
  if (entry.error || !entry.details) {
    return "failed";
  }

  switch (entry.details.status) {
    case "ok":
      return "completed";
    case "partial":
      return "partial";
    case "not_found":
      return "not_found";
    default:
      return "failed";
  }
}

/**
 * Indica si una consulta coincide con el texto buscado.
 *
 * Busca, sin distinguir mayúsculas y minúsculas, en el identificador
 * original, el identificador normalizado, el símbolo del gen, el ID de
 * Ensembl y el accession de UniProt.
 */
export function reportEntryMatchesQuery(
  entry: ReportEntry,
  query: string
): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  const details = entry.details;

  const fields = [
    entry.identifier,
    details?.normalized,
    details?.gene.symbol,
    details?.gene.ensembl_id,
    details?.protein.uniprot_accession,
    details?.protein.uniprot_id,
  ];

  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}
