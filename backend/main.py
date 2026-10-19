from fastapi import FastAPI
import httpx
import asyncio
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
gene_cache = {}
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
ENSEMBL_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "BioSemantix/1.0 (gene annotation application)",
}


async def fetch_ensembl_gene(
    client: httpx.AsyncClient,
    identifier: str,
):
    if identifier.startswith("ENSG"):
        url = f"https://rest.ensembl.org/lookup/id/{identifier}"
    else:
        url = (
            "https://rest.ensembl.org/lookup/symbol/"
            f"homo_sapiens/{identifier}"
        )

    response = await client.get(url, headers=ENSEMBL_HEADERS)
    response.raise_for_status()
    return response.json()


async def fetch_uniprot_gene(
    client: httpx.AsyncClient,
    identifier: str,
    gene_symbol: str | None = None,
):
    url = "https://rest.uniprot.org/uniprotkb/search"

    # Si el identificador es de Ensembl, usamos el símbolo
    # obtenido de Ensembl para buscar la proteína.
    if identifier.startswith("ENSG") and gene_symbol:
        query = f"gene_exact:{gene_symbol} AND organism_id:9606"
    elif identifier.startswith("ENSG"):
        return {"results": []}
    elif gene_symbol:
        query = f"gene_exact:{gene_symbol} AND organism_id:9606"
    else:
        # Permite consultar directamente una accesión UniProt,
        # por ejemplo P04637.
        query = f"accession:{identifier} AND organism_id:9606"

    response = await client.get(
        url,
        params={"query": query, "format": "json", "size": 1},
    )
    response.raise_for_status()
    return response.json()
@app.get("/")
def read_root():
    return {"message": "BioSemantix API funcionando"}


@app.get("/api/genes/{symbol}")
async def get_gene(symbol: str):
    symbol = symbol.strip().upper()

    if symbol in gene_cache:
        return gene_cache[symbol]

    
    timeout = httpx.Timeout(30.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            ensembl_data = await fetch_ensembl_gene(client, symbol)
        except httpx.HTTPStatusError as error:
            if error.response.status_code == 404:
                return {
                    "error": f"No se encontró el gen {symbol} en Ensembl."
                }
            return {
                "error": (
                    "Ensembl devolvió un error al consultar "
                    f"{symbol}: HTTP {error.response.status_code}."
                )
            }
        except httpx.RequestError:
            return {
                "error": "No fue posible conectar con Ensembl."
            }

        resolved_symbol = ensembl_data.get("display_name")

        try:
            uniprot_data = await fetch_uniprot_gene(
                client,
                symbol,
                gene_symbol=resolved_symbol,
            )
            results = uniprot_data.get("results", [])
        except (httpx.HTTPStatusError, httpx.RequestError):
            results = []

    # Si UniProt no devuelve una proteína, conservamos
    # la información del gen obtenida de Ensembl.
    protein = results[0] if results else {}

    primary_accession = protein.get("primaryAccession")
    uniprot_id = protein.get("uniProtkbId")

    recommended_name = (
        protein.get("proteinDescription", {})
        .get("recommendedName", {})
        .get("fullName", {})
        .get("value")
    )

    alternative_names = []

    for name in protein.get("proteinDescription", {}).get(
        "alternativeNames", []
    ):
        full_name = name.get("fullName", {}).get("value")
        if full_name:
            alternative_names.append(full_name)


    # -------------------------
    # Información básica UniProt
    # -------------------------
    primary_accession = protein.get("primaryAccession")
    uniprot_id = protein.get("uniProtkbId")

    recommended_name = (
        protein
        .get("proteinDescription", {})
        .get("recommendedName", {})
        .get("fullName", {})
        .get("value")
    )

    alternative_names = []

    for name in protein.get("proteinDescription", {}).get(
        "alternativeNames", []
    ):
        full_name = name.get("fullName", {}).get("value")

        if full_name:
            alternative_names.append(full_name)

    # -------------------------
    # Anotación funcional
    # -------------------------
    function = []

    for comment in protein.get("comments", []):
        if comment.get("commentType") == "FUNCTION":
            for text in comment.get("texts", []):
                value = text.get("value")

                if value:
                    function.append(value)

    # -------------------------
    # Localización celular
    # -------------------------
    subcellular_location = []

    for comment in protein.get("comments", []):
        if comment.get("commentType") == "SUBCELLULAR LOCATION":
            locations = comment.get("subcellularLocations", [])

            for location in locations:
                location_name = (
                    location
                    .get("location", {})
                    .get("value")
                )

                if location_name:
                    subcellular_location.append(location_name)

    # -------------------------
    # Vías biológicas
    # -------------------------
    pathways = []

    for comment in protein.get("comments", []):
        if comment.get("commentType") == "PATHWAY":
            for text in comment.get("texts", []):
                value = text.get("value")

                if value:
                    pathways.append(value)

    
    # -------------------------
    # Anotaciones Gene Ontology (GO)
    # -------------------------
    biological_processes = []
    molecular_functions = []

    for reference in protein.get("uniProtKBCrossReferences", []):
        if reference.get("database") == "GO":

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

            if go_id and go_name and go_type:
                annotation = {
                    "id": go_id,
                    "name": go_name
                }

                if go_type == "biological_process":
                    biological_processes.append(annotation)

                elif go_type == "molecular_function":
                    molecular_functions.append(annotation)

    
    # -------------------------
    # Eliminar anotaciones duplicadas
    # -------------------------
    subcellular_location = list(dict.fromkeys(subcellular_location))
    pathways = list(dict.fromkeys(pathways))

    biological_processes = list({
        item["id"]: item
        for item in reversed(biological_processes)
    }.values())[::-1]

    molecular_functions = list({
        item["id"]: item
        for item in reversed(molecular_functions)
    }.values())[::-1]
    
    # -------------------------
    # Respuesta unificada
    # -------------------------
    result = {
        "gene": {
            "symbol": ensembl_data.get("display_name"),
            "ensembl_id": ensembl_data.get("id"),
            "description": ensembl_data.get("description"),
            "species": ensembl_data.get("species"),
            "assembly": ensembl_data.get("assembly_name")
        },
        "protein": {
            "uniprot_accession": primary_accession,
            "uniprot_id": uniprot_id,
            "recommended_name": recommended_name,
            "alternative_names": alternative_names
        },
        "annotations": {
            "function": function,
            "subcellular_location": subcellular_location,
            "pathways": pathways,
            "biological_processes": biological_processes,
            "molecular_functions": molecular_functions
        }
    }

    gene_cache[symbol] = result

    return result



@app.get("/api/proteins/{symbol}")
async def get_protein(symbol: str):

    query = f"gene_exact:{symbol} AND organism_id:9606"

    url = (
        "https://rest.uniprot.org/uniprotkb/search"
        f"?query={query}&format=json"
    )

    timeout = httpx.Timeout(30.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)

        if response.status_code != 200:
            return {
                "error": f"No se pudo consultar UniProt para {symbol}",
                "status": response.status_code,
                "details": response.text
            }

        return response.json()

    except httpx.RequestError as error:
        return {
            "error": "No se pudo conectar con UniProt",
            "details": str(error)
        }