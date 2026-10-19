"""API de BioSemantix.

BioSemantix funciona como un diccionario de genes: dada una lista de
identificadores, consulta fuentes públicas (Ensembl y UniProt) y construye
un reporte funcional por gen.

Contrato de la respuesta de ``GET /api/genes/{identifier}``
-----------------------------------------------------------
La ruta siempre responde con HTTP 200 y un cuerpo con esta forma::

    {
      "identifier": "BRCA1",           # identificador tal como lo envió el cliente
      "normalized": "BRCA1",           # identificador normalizado
      "query_type": "symbol",          # symbol | ensembl_id | uniprot_accession | unsupported
      "status": "ok",                  # ok | partial | not_found | unavailable | invalid_identifier
      "message": "...",                # explicación del estado global, en español
      "sources": {
        "ensembl": {"status": "ok", "message": "..."},
        "uniprot": {"status": "not_found", "message": "..."}
      },
      "gene": {...} | null,
      "protein": {...} | null,
      "annotations": {...}
    }

Estados por fuente (``sources.*.status``):
    ok          -> la fuente respondió y el registro existe.
    not_found   -> la fuente respondió (404 o sin resultados) y el registro no existe.
    unavailable -> no fue posible conectar (timeout / error de red).
    error       -> la fuente respondió con un error HTTP inesperado.
    malformed   -> la respuesta no pudo interpretarse.
    skipped     -> la fuente no aplica para este tipo de identificador.

Estados globales (``status``):
    ok                  -> alguna fuente resolvió el registro y ninguna falló.
    partial             -> hay datos válidos pero una fuente no pudo consultarse.
    not_found           -> ninguna fuente encontró el registro.
    unavailable         -> ninguna fuente pudo consultarse (no se puede afirmar nada).
    invalid_identifier  -> el formato del identificador no está admitido.
"""

import os
import re
import time
from urllib.parse import quote

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Orígenes locales permitidos por defecto (desarrollo).
DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


def resolve_cors_origins(value: str | None) -> list[str]:
    """Resuelve la lista de orígenes permitidos para CORS.

    Lee ``CORS_ALLOW_ORIGINS`` (orígenes separados por comas). Si no se define
    o queda vacía, conserva los orígenes locales por defecto. El comodín ``*``
    nunca se admite: si solo se indican comodines, se usan los valores por
    defecto.
    """
    if value is None or not value.strip():
        return list(DEFAULT_CORS_ALLOW_ORIGINS)

    origins = [origin.strip() for origin in value.split(",") if origin.strip()]
    allowed = [origin for origin in origins if origin != "*"]

    return allowed or list(DEFAULT_CORS_ALLOW_ORIGINS)


app = FastAPI(title="BioSemantix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=resolve_cors_origins(os.environ.get("CORS_ALLOW_ORIGINS")),
    allow_origin_regex=os.environ.get("CORS_ALLOW_ORIGIN_REGEX") or None,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

ENSEMBL_BASE = "https://rest.ensembl.org"
UNIPROT_BASE = "https://rest.uniprot.org"

ENSEMBL_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "BioSemantix/1.0 (gene annotation application)",
}

REQUEST_TIMEOUT = httpx.Timeout(30.0)

# ---------------------------------------------------------------------------
# Identificadores
# ---------------------------------------------------------------------------

QUERY_TYPE_SYMBOL = "symbol"
QUERY_TYPE_ENSEMBL = "ensembl_id"
QUERY_TYPE_UNIPROT = "uniprot_accession"
QUERY_TYPE_UNSUPPORTED = "unsupported"

# Identificador de gen de Ensembl (por ejemplo ENSG00000012048).
ENSEMBL_GENE_RE = re.compile(r"^ENSG\d{11}$")

# Accesión canónica de UniProt (por ejemplo P04637 o Q9Y2T1).
UNIPROT_ACCESSION_RE = re.compile(
    r"^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]"
    r"|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$"
)

# Símbolo de gen: letras, dígitos y los separadores habituales.
GENE_SYMBOL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

SUPPORTED_IDENTIFIERS_MESSAGE = (
    "Se admiten símbolos de genes (por ejemplo BRCA1), identificadores "
    "Ensembl (ENSG00000012048) y accesiones UniProt (P38398)."
)


def classify_identifier(raw: str) -> tuple[str, str]:
    """Clasifica y normaliza un identificador.

    Devuelve una tupla ``(normalizado, tipo)``. Si el formato no está
    admitido, el tipo es ``QUERY_TYPE_UNSUPPORTED``.
    """
    identifier = (raw or "").strip()

    if not identifier:
        return "", QUERY_TYPE_UNSUPPORTED

    upper = identifier.upper()

    if ENSEMBL_GENE_RE.match(upper):
        return upper, QUERY_TYPE_ENSEMBL

    if UNIPROT_ACCESSION_RE.match(upper):
        return upper, QUERY_TYPE_UNIPROT

    if GENE_SYMBOL_RE.match(identifier):
        # Los símbolos génicos se consultan en mayúsculas.
        return upper, QUERY_TYPE_SYMBOL

    return identifier, QUERY_TYPE_UNSUPPORTED


# ---------------------------------------------------------------------------
# Estados y errores de fuente
# ---------------------------------------------------------------------------

SOURCE_OK = "ok"
SOURCE_NOT_FOUND = "not_found"
SOURCE_UNAVAILABLE = "unavailable"
SOURCE_ERROR = "error"
SOURCE_MALFORMED = "malformed"
SOURCE_SKIPPED = "skipped"

STATUS_OK = "ok"
STATUS_PARTIAL = "partial"
STATUS_NOT_FOUND = "not_found"
STATUS_UNAVAILABLE = "unavailable"
STATUS_INVALID = "invalid_identifier"

STATUS_MESSAGES = {
    STATUS_OK: "Consulta completada correctamente.",
    STATUS_PARTIAL: (
        "Consulta parcial: hay información disponible, pero una de las "
        "fuentes no pudo consultarse."
    ),
    STATUS_NOT_FOUND: (
        "No se encontró el identificador en las fuentes consultadas."
    ),
    STATUS_UNAVAILABLE: (
        "No fue posible completar la consulta: ninguna de las fuentes pudo "
        "consultarse. No se puede confirmar que el registro no exista."
    ),
    STATUS_INVALID: (
        "El identificador no tiene un formato admitido. "
        + SUPPORTED_IDENTIFIERS_MESSAGE
    ),
}

_FAILED_SOURCE_STATUSES = (SOURCE_UNAVAILABLE, SOURCE_ERROR, SOURCE_MALFORMED)


class SourceNotFound(Exception):
    """La fuente respondió 404 (recurso inexistente)."""


class SourceUnavailable(Exception):
    """No fue posible conectar con la fuente (timeout o error de red)."""


class SourceError(Exception):
    """La fuente respondió con un error HTTP inesperado."""

    def __init__(self, status_code: int):
        super().__init__(f"HTTP {status_code}")
        self.status_code = status_code


class SourceMalformed(Exception):
    """La respuesta de la fuente no pudo interpretarse."""


def _source(status: str, message: str) -> dict:
    return {"status": status, "message": message}


def _empty_annotations() -> dict:
    return {
        "function": [],
        "subcellular_location": [],
        "pathways": [],
        "biological_processes": [],
        "molecular_functions": [],
    }


# ---------------------------------------------------------------------------
# Extracción de datos
# ---------------------------------------------------------------------------


def _dedupe(values: list) -> list:
    """Elimina duplicados preservando el orden de aparición."""
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _dedupe_annotations(items: list[dict]) -> list[dict]:
    """Elimina anotaciones GO duplicadas por identificador."""
    seen = set()
    result = []
    for item in items:
        if item["id"] not in seen:
            seen.add(item["id"])
            result.append(item)
    return result


def extract_gene_summary(gene: dict | None) -> dict:
    """Normaliza la información básica del gen procedente de Ensembl.

    Siempre devuelve un objeto con las mismas claves; los campos no
    disponibles quedan como ``None`` para no confundir "ausente" con "vacío".
    """
    if not gene:
        return {
            "symbol": None,
            "ensembl_id": None,
            "description": None,
            "species": None,
            "assembly": None,
        }

    return {
        "symbol": gene.get("display_name") or gene.get("id"),
        "ensembl_id": gene.get("id"),
        "description": gene.get("description"),
        "species": gene.get("species"),
        "assembly": gene.get("assembly_name"),
    }


def extract_protein_summary(protein: dict | None) -> dict:
    """Normaliza la información proteica procedente de UniProt."""
    if not protein:
        return {
            "uniprot_accession": None,
            "uniprot_id": None,
            "recommended_name": None,
            "alternative_names": [],
        }

    description = protein.get("proteinDescription", {})

    recommended_name = (
        description.get("recommendedName", {}).get("fullName", {}).get("value")
    )

    alternative_names = []
    for name in description.get("alternativeNames", []):
        value = name.get("fullName", {}).get("value")
        if value:
            alternative_names.append(value)

    return {
        "uniprot_accession": protein.get("primaryAccession"),
        "uniprot_id": protein.get("uniProtkbId"),
        "recommended_name": recommended_name,
        "alternative_names": _dedupe(alternative_names),
    }


def extract_annotations(protein: dict | None) -> dict:
    """Extrae y deduplica las anotaciones funcionales de UniProt."""
    annotations = _empty_annotations()

    if not protein:
        return annotations

    for comment in protein.get("comments", []):
        comment_type = comment.get("commentType")

        if comment_type == "FUNCTION":
            for text in comment.get("texts", []):
                value = text.get("value")
                if value:
                    annotations["function"].append(value)

        elif comment_type == "PATHWAY":
            for text in comment.get("texts", []):
                value = text.get("value")
                if value:
                    annotations["pathways"].append(value)

        elif comment_type == "SUBCELLULAR LOCATION":
            for location in comment.get("subcellularLocations", []):
                name = location.get("location", {}).get("value")
                if name:
                    annotations["subcellular_location"].append(name)

    biological_processes = []
    molecular_functions = []

    for reference in protein.get("uniProtKBCrossReferences", []):
        if reference.get("database") != "GO":
            continue

        go_id = reference.get("id")
        go_name = None
        go_type = None

        for prop in reference.get("properties", []):
            value = prop.get("value", "")
            if value.startswith("P:"):
                go_type = "biological_process"
                go_name = value[2:]
            elif value.startswith("F:"):
                go_type = "molecular_function"
                go_name = value[2:]

        if go_id and go_name:
            annotation = {"id": go_id, "name": go_name}
            if go_type == "biological_process":
                biological_processes.append(annotation)
            elif go_type == "molecular_function":
                molecular_functions.append(annotation)

    annotations["function"] = _dedupe(annotations["function"])
    annotations["subcellular_location"] = _dedupe(
        annotations["subcellular_location"]
    )
    annotations["pathways"] = _dedupe(annotations["pathways"])
    annotations["biological_processes"] = _dedupe_annotations(
        biological_processes
    )
    annotations["molecular_functions"] = _dedupe_annotations(
        molecular_functions
    )

    return annotations


def _protein_gene_symbol(protein: dict | None) -> str | None:
    """Obtiene el símbolo génico asociado a una entrada de UniProt."""
    if not protein:
        return None

    for gene in protein.get("genes", []):
        name = gene.get("geneName", {}).get("value")
        if name:
            return name

    return None


# ---------------------------------------------------------------------------
# Acceso HTTP a las fuentes
# ---------------------------------------------------------------------------


async def _get_json(
    client: httpx.AsyncClient,
    url: str,
    params: dict | None = None,
    headers: dict | None = None,
) -> dict:
    """Realiza una petición GET y devuelve el JSON.

    Traduce los fallos a excepciones tipadas para que el llamador pueda
    distinguirlos sin inspeccionar textos de error.
    """
    try:
        response = await client.get(url, params=params, headers=headers)
    except httpx.TimeoutException as error:
        raise SourceUnavailable("Tiempo de espera agotado.") from error
    except httpx.RequestError as error:
        raise SourceUnavailable("No fue posible conectar.") from error

    if response.status_code == 404:
        raise SourceNotFound()

    if response.status_code >= 400:
        raise SourceError(response.status_code)

    try:
        data = response.json()
    except ValueError as error:
        raise SourceMalformed() from error

    if not isinstance(data, dict):
        raise SourceMalformed()

    return data


async def _query_ensembl(
    client: httpx.AsyncClient,
    identifier: str,
    query_type: str,
) -> tuple[dict | None, dict]:
    """Consulta Ensembl y devuelve ``(gen, estado_de_la_fuente)``."""
    encoded = quote(identifier, safe="")

    if query_type == QUERY_TYPE_ENSEMBL:
        url = f"{ENSEMBL_BASE}/lookup/id/{encoded}"
    else:
        url = f"{ENSEMBL_BASE}/lookup/symbol/homo_sapiens/{encoded}"

    try:
        data = await _get_json(client, url, headers=ENSEMBL_HEADERS)
    except SourceNotFound:
        return None, _source(
            SOURCE_NOT_FOUND,
            f"No se encontró «{identifier}» en Ensembl.",
        )
    except SourceUnavailable:
        return None, _source(
            SOURCE_UNAVAILABLE,
            "No fue posible conectar con Ensembl (error de red o tiempo de espera).",
        )
    except SourceError as error:
        # Ensembl responde con HTTP 400 cuando un símbolo no puede
        # resolverse, por lo que se trata como "no encontrado".
        if error.status_code == 400:
            return None, _source(
                SOURCE_NOT_FOUND,
                f"No se encontró «{identifier}» en Ensembl.",
            )
        return None, _source(
            SOURCE_ERROR,
            f"Ensembl respondió con un error HTTP {error.status_code}.",
        )
    except SourceMalformed:
        return None, _source(
            SOURCE_MALFORMED,
            "Ensembl devolvió una respuesta que no pudo interpretarse.",
        )

    if not data.get("id"):
        return None, _source(
            SOURCE_MALFORMED,
            "Ensembl devolvió una respuesta incompleta.",
        )

    return data, _source(SOURCE_OK, "Información del gen obtenida de Ensembl.")


async def _query_uniprot_once(
    client: httpx.AsyncClient,
    query: str,
    describe: str,
) -> tuple[dict | None, dict]:
    """Una única consulta a UniProt y su estado de la fuente."""
    try:
        data = await _get_json(
            client,
            f"{UNIPROT_BASE}/uniprotkb/search",
            params={"query": query, "format": "json", "size": 1},
        )
    except SourceUnavailable:
        return None, _source(
            SOURCE_UNAVAILABLE,
            "No fue posible conectar con UniProt (error de red o tiempo de espera).",
        )
    except SourceError as error:
        return None, _source(
            SOURCE_ERROR,
            f"UniProt respondió con un error HTTP {error.status_code}.",
        )
    except SourceMalformed:
        return None, _source(
            SOURCE_MALFORMED,
            "UniProt devolvió una respuesta que no pudo interpretarse.",
        )

    results = data.get("results")

    if results is None:
        return None, _source(
            SOURCE_MALFORMED,
            "UniProt devolvió una respuesta sin el campo esperado «results».",
        )

    if not results:
        return None, _source(
            SOURCE_NOT_FOUND,
            f"No se encontró una proteína asociada a {describe} en UniProt.",
        )

    return results[0], _source(SOURCE_OK, "Información obtenida de UniProt.")


async def _query_uniprot(
    client: httpx.AsyncClient,
    base_query: str,
    describe: str,
) -> tuple[dict | None, dict]:
    """Consulta UniProt priorizando las entradas revisadas (Swiss-Prot).

    Si no existe una entrada revisada, se reintenta sin ese filtro para no
    ocultar información procedente de entradas no revisadas (TrEMBL).
    ``base_query`` ya incluye ``organism_id:9606``.
    """
    protein, source = await _query_uniprot_once(
        client,
        f"({base_query}) AND reviewed:true",
        describe,
    )

    if source["status"] == SOURCE_NOT_FOUND:
        protein, source = await _query_uniprot_once(
            client, base_query, describe
        )

    return protein, source


async def _query_uniprot_by_symbol(
    client: httpx.AsyncClient,
    symbol: str,
) -> tuple[dict | None, dict]:
    query = f"gene_exact:{symbol} AND organism_id:9606"
    return await _query_uniprot(client, query, f"«{symbol}»")


async def _query_uniprot_by_accession(
    client: httpx.AsyncClient,
    accession: str,
) -> tuple[dict | None, dict]:
    query = f"accession:{accession} AND organism_id:9606"
    return await _query_uniprot(client, query, f"la accesión «{accession}»")


# ---------------------------------------------------------------------------
# Caché con expiración
# ---------------------------------------------------------------------------

CACHE_TTL_SECONDS = 3600
gene_cache: dict[str, tuple[float, dict]] = {}


def _cache_get(key: str) -> dict | None:
    entry = gene_cache.get(key)
    if entry is None:
        return None

    stored_at, value = entry
    if time.monotonic() - stored_at > CACHE_TTL_SECONDS:
        gene_cache.pop(key, None)
        return None

    return value


def _cache_set(key: str, value: dict) -> None:
    gene_cache[key] = (time.monotonic(), value)


# ---------------------------------------------------------------------------
# Construcción de la respuesta
# ---------------------------------------------------------------------------


def _overall_status(sources: dict) -> str:
    """Deriva el estado global a partir del estado de cada fuente."""
    active = {
        name: info["status"]
        for name, info in sources.items()
        if info["status"] != SOURCE_SKIPPED
    }

    if not active:
        return STATUS_NOT_FOUND

    failed = any(status in _FAILED_SOURCE_STATUSES for status in active.values())
    resolved = any(status == SOURCE_OK for status in active.values())

    if failed:
        return STATUS_PARTIAL if resolved else STATUS_UNAVAILABLE

    return STATUS_OK if resolved else STATUS_NOT_FOUND


def _invalid_identifier_response(raw: str, normalized: str) -> dict:
    skipped = _source(SOURCE_SKIPPED, "No se consultó: formato no admitido.")
    return {
        "identifier": (raw or "").strip(),
        "normalized": normalized,
        "query_type": QUERY_TYPE_UNSUPPORTED,
        "status": STATUS_INVALID,
        "message": STATUS_MESSAGES[STATUS_INVALID],
        "sources": {"ensembl": skipped, "uniprot": dict(skipped)},
        "gene": extract_gene_summary(None),
        "protein": extract_protein_summary(None),
        "annotations": _empty_annotations(),
    }


async def _build_gene_response(
    normalized: str,
    query_type: str,
) -> dict:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        if query_type == QUERY_TYPE_UNIPROT:
            protein, uniprot_source = await _query_uniprot_by_accession(
                client, normalized
            )
            symbol = _protein_gene_symbol(protein)

            if symbol:
                gene, ensembl_source = await _query_ensembl(
                    client, symbol, QUERY_TYPE_SYMBOL
                )
            else:
                gene = None
                ensembl_source = _source(
                    SOURCE_SKIPPED,
                    "No se consultó Ensembl: no se pudo determinar el símbolo génico.",
                )
        else:
            gene, ensembl_source = await _query_ensembl(
                client, normalized, query_type
            )

            symbol = None
            if gene:
                symbol = gene.get("display_name") or gene.get("id")

            if symbol:
                protein, uniprot_source = await _query_uniprot_by_symbol(
                    client, symbol
                )
            elif query_type == QUERY_TYPE_SYMBOL:
                # Aunque Ensembl falle, se intenta resolver con UniProt.
                protein, uniprot_source = await _query_uniprot_by_symbol(
                    client, normalized
                )
            else:
                protein = None
                uniprot_source = _source(
                    SOURCE_SKIPPED,
                    "No se consultó UniProt: no se pudo determinar el símbolo génico.",
                )

    sources = {"ensembl": ensembl_source, "uniprot": uniprot_source}
    status = _overall_status(sources)

    return {
        "identifier": normalized,
        "normalized": normalized,
        "query_type": query_type,
        "status": status,
        "message": STATUS_MESSAGES.get(status),
        "sources": sources,
        "gene": extract_gene_summary(gene),
        "protein": extract_protein_summary(protein),
        "annotations": extract_annotations(protein),
    }


# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------


@app.get("/")
def read_root():
    return {"message": "BioSemantix API funcionando"}


@app.get("/api/genes/{identifier}")
async def get_gene(identifier: str):
    normalized, query_type = classify_identifier(identifier)

    if query_type == QUERY_TYPE_UNSUPPORTED:
        return _invalid_identifier_response(identifier, normalized)

    cache_key = f"{query_type}:{normalized}"
    cached = _cache_get(cache_key)
    if cached is not None:
        # Se devuelve el identificador original de esta petición, aunque el
        # resultado proceda de la caché.
        response = dict(cached)
        response["identifier"] = (identifier or "").strip()
        return response

    result = await _build_gene_response(normalized, query_type)
    result["identifier"] = (identifier or "").strip()

    # Solo se cachean los resultados estables. Un fallo transitorio de una
    # fuente (parcial o no disponible) no debe quedar almacenado para
    # permitir una nueva consulta.
    if result["status"] in (STATUS_OK, STATUS_NOT_FOUND):
        _cache_set(cache_key, result)

    return result


@app.get("/api/proteins/{symbol}")
async def get_protein(symbol: str):
    normalized, query_type = classify_identifier(symbol)

    if query_type == QUERY_TYPE_UNSUPPORTED:
        return {
            "error": STATUS_MESSAGES[STATUS_INVALID],
            "status": STATUS_INVALID,
        }

    query = f"gene_exact:{normalized} AND organism_id:9606"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(
                f"{UNIPROT_BASE}/uniprotkb/search",
                params={"query": query, "format": "json"},
            )
    except httpx.RequestError:
        return {
            "error": "No fue posible conectar con UniProt.",
            "status": SOURCE_UNAVAILABLE,
        }

    if response.status_code >= 400:
        return {
            "error": f"UniProt respondió con un error HTTP {response.status_code}.",
            "status": SOURCE_ERROR,
        }

    try:
        return response.json()
    except ValueError:
        return {
            "error": "UniProt devolvió una respuesta que no pudo interpretarse.",
            "status": SOURCE_MALFORMED,
        }
