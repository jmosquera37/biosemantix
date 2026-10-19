/** URL del backend usada en desarrollo local cuando no hay variable definida. */
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

/** Tiempo máximo que se espera al comprobar el backend (5 segundos). */
const BACKEND_HEALTH_TIMEOUT_MS = 5000;

/**
 * Devuelve la URL base del backend de BioSemantix.
 *
 * Usa la variable de entorno ``VITE_API_BASE_URL`` cuando está definida
 * (despliegue) y cae a ``http://127.0.0.1:8000`` en desarrollo local. El valor
 * se recorta y se le quita la barra final para evitar rutas con doble barra.
 */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const base = typeof configured === "string" ? configured.trim() : "";

  if (!base) {
    return DEFAULT_API_BASE_URL;
  }

  return base.replace(/\/+$/, "");
}

/** Tipo de identificador admitido por el backend. */
export type QueryType =
  | "symbol"
  | "ensembl_id"
  | "uniprot_accession"
  | "unsupported";

/** Estado de una fuente externa concreta. */
export type SourceStatus =
  | "ok"
  | "not_found"
  | "unavailable"
  | "error"
  | "malformed"
  | "skipped";

/** Estado global de la consulta de un identificador. */
export type QueryStatus =
  | "ok"
  | "partial"
  | "not_found"
  | "unavailable"
  | "invalid_identifier";

export interface SourceInfo {
  status: SourceStatus;
  message: string | null;
}

export interface GeneAnnotation {
  id: string;
  name: string;
}

export interface GeneSummary {
  symbol: string | null;
  ensembl_id: string | null;
  description: string | null;
  species: string | null;
  assembly: string | null;
}

export interface ProteinSummary {
  uniprot_accession: string | null;
  uniprot_id: string | null;
  recommended_name: string | null;
  alternative_names: string[];
}

export interface GeneAnnotations {
  function: string[];
  subcellular_location: string[];
  pathways: string[];
  biological_processes: GeneAnnotation[];
  molecular_functions: GeneAnnotation[];
}

export interface GeneDetails {
  identifier: string;
  normalized: string;
  query_type: QueryType;
  status: QueryStatus;
  message: string | null;
  sources: {
    ensembl: SourceInfo;
    uniprot: SourceInfo;
  };
  gene: GeneSummary;
  protein: ProteinSummary;
  annotations: GeneAnnotations;
}

function emptyAnnotations(): GeneAnnotations {
  return {
    function: [],
    subcellular_location: [],
    pathways: [],
    biological_processes: [],
    molecular_functions: [],
  };
}

/**
 * Normaliza la respuesta del backend para garantizar la forma esperada por
 * la interfaz, incluso si algún campo llegara ausente o malformado.
 */
function normalizeDetails(data: unknown, identifier: string): GeneDetails {
  const raw = (data ?? {}) as Partial<GeneDetails>;
  const sources = raw.sources ?? {} as GeneDetails["sources"];

  return {
    identifier: raw.identifier ?? identifier,
    normalized: raw.normalized ?? identifier,
    query_type: raw.query_type ?? "unsupported",
    status: raw.status ?? "unavailable",
    message: raw.message ?? null,
    sources: {
      ensembl: {
        status: sources.ensembl?.status ?? "skipped",
        message: sources.ensembl?.message ?? null,
      },
      uniprot: {
        status: sources.uniprot?.status ?? "skipped",
        message: sources.uniprot?.message ?? null,
      },
    },
    gene: {
      symbol: raw.gene?.symbol ?? null,
      ensembl_id: raw.gene?.ensembl_id ?? null,
      description: raw.gene?.description ?? null,
      species: raw.gene?.species ?? null,
      assembly: raw.gene?.assembly ?? null,
    },
    protein: {
      uniprot_accession: raw.protein?.uniprot_accession ?? null,
      uniprot_id: raw.protein?.uniprot_id ?? null,
      recommended_name: raw.protein?.recommended_name ?? null,
      alternative_names: raw.protein?.alternative_names ?? [],
    },
    annotations: {
      ...emptyAnnotations(),
      ...(raw.annotations ?? {}),
    },
  };
}

/**
 * Consulta la información funcional de un identificador.
 *
 * Devuelve el resultado estructurado para cualquier estado de la consulta
 * (``ok``, ``partial``, ``not_found``, ``unavailable`` o
 * ``invalid_identifier``). Solo lanza una excepción cuando falla la
 * comunicación con el propio backend de BioSemantix.
 */
export async function getGeneDetails(
  identifier: string
): Promise<GeneDetails> {
  const trimmed = identifier.trim();

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/api/genes/${encodeURIComponent(trimmed)}`
    );
  } catch {
    throw new Error(
      "No fue posible conectar con el servicio de BioSemantix. " +
        "Verifica que el backend esté en ejecución."
    );
  }

  if (!response.ok) {
    throw new Error(
      "El servicio de BioSemantix respondió con un error " +
        `(HTTP ${response.status}).`
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "El servicio de BioSemantix devolvió una respuesta no válida."
    );
  }

  return normalizeDetails(data, trimmed);
}

/**
 * Comprueba si el backend de BioSemantix responde.
 *
 * Consulta la ruta raíz (``GET /``) del backend, que solo confirma que el
 * servicio está en ejecución. **No** verifica la disponibilidad de Ensembl ni
 * de UniProt, ni lanza consultas biológicas.
 *
 * Devuelve ``true`` si el backend responde correctamente y ``false`` si
 * responde con un error HTTP. Lanza una excepción si no es posible conectar,
 * si se supera el tiempo de espera o si la comprobación se cancela (por
 * ejemplo, al desmontar el componente). La comprobación acepta un
 * ``AbortSignal`` opcional para poder cancelarla y se interrumpe sola tras
 * ``BACKEND_HEALTH_TIMEOUT_MS`` para no dejar peticiones colgadas.
 */
export async function checkBackendHealth(
  signal?: AbortSignal
): Promise<boolean> {
  const controller = new AbortController();

  const abort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abort);
    }
  }

  const timeout = setTimeout(() => controller.abort(), BACKEND_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}/`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
