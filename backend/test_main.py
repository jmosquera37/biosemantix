"""Pruebas del contrato de errores y la lógica del backend de BioSemantix.

No dependen de que Ensembl o UniProt estén disponibles: las fuentes
externas se sustituyen por dobles (mocks) y el transporte HTTP se simula
con ``httpx.MockTransport``.
"""

import unittest
from unittest import mock

import httpx
from fastapi.testclient import TestClient

import main


# ---------------------------------------------------------------------------
# Datos de ejemplo
# ---------------------------------------------------------------------------


def gene_payload() -> dict:
    return {
        "id": "ENSG00000012048",
        "display_name": "BRCA1",
        "description": "BRCA1 DNA repair associated",
        "species": "homo_sapiens",
        "assembly_name": "GRCh38",
    }


def protein_payload() -> dict:
    return {
        "primaryAccession": "P38398",
        "uniProtkbId": "BRCA1_HUMAN",
        "proteinDescription": {
            "recommendedName": {
                "fullName": {"value": "Breast cancer type 1 susceptibility protein"}
            },
            "alternativeNames": [{"fullName": {"value": "RING finger protein 53"}}],
        },
        "genes": [{"geneName": {"value": "BRCA1"}}],
        "comments": [
            {
                "commentType": "FUNCTION",
                "texts": [
                    {"value": "E3 ubiquitin-protein ligase."},
                    {"value": "E3 ubiquitin-protein ligase."},
                ],
            },
            {
                "commentType": "SUBCELLULAR LOCATION",
                "subcellularLocations": [{"location": {"value": "Nucleus"}}],
            },
            {
                "commentType": "PATHWAY",
                "texts": [{"value": "DNA damage response."}],
            },
        ],
        "uniProtKBCrossReferences": [
            {
                "database": "GO",
                "id": "GO:0006281",
                "properties": [{"value": "P:DNA repair"}],
            },
            {
                "database": "GO",
                "id": "GO:0006281",
                "properties": [{"value": "P:DNA repair"}],
            },
            {
                "database": "GO",
                "id": "GO:0003677",
                "properties": [{"value": "F:DNA binding"}],
            },
            {
                "database": "InterPro",
                "id": "IPR001841",
                "properties": [{"value": "Zinc finger"}],
            },
        ],
    }


def source(status: str, message: str = "") -> dict:
    return main._source(status, message)


# ---------------------------------------------------------------------------
# Clasificación de identificadores
# ---------------------------------------------------------------------------


class TestClassifyIdentifier(unittest.TestCase):
    def test_ensembl_id(self):
        self.assertEqual(
            main.classify_identifier("ENSG00000012048"),
            ("ENSG00000012048", main.QUERY_TYPE_ENSEMBL),
        )

    def test_ensembl_id_lowercase_is_normalized(self):
        self.assertEqual(
            main.classify_identifier("ensg00000012048"),
            ("ENSG00000012048", main.QUERY_TYPE_ENSEMBL),
        )

    def test_uniprot_accession(self):
        self.assertEqual(
            main.classify_identifier("P04637"),
            ("P04637", main.QUERY_TYPE_UNIPROT),
        )

    def test_uniprot_accession_extended(self):
        self.assertEqual(
            main.classify_identifier("Q9Y2T1"),
            ("Q9Y2T1", main.QUERY_TYPE_UNIPROT),
        )

    def test_symbol_is_uppercased(self):
        self.assertEqual(
            main.classify_identifier(" brca1 "),
            ("BRCA1", main.QUERY_TYPE_SYMBOL),
        )

    def test_symbol_with_separators(self):
        self.assertEqual(
            main.classify_identifier("HLA-A"),
            ("HLA-A", main.QUERY_TYPE_SYMBOL),
        )

    def test_invalid_identifier_with_space(self):
        _, query_type = main.classify_identifier("BR CA1")
        self.assertEqual(query_type, main.QUERY_TYPE_UNSUPPORTED)

    def test_invalid_identifier_with_slashes(self):
        _, query_type = main.classify_identifier("BRCA1/2")
        self.assertEqual(query_type, main.QUERY_TYPE_UNSUPPORTED)

    def test_empty_identifier(self):
        _, query_type = main.classify_identifier("   ")
        self.assertEqual(query_type, main.QUERY_TYPE_UNSUPPORTED)


# ---------------------------------------------------------------------------
# Traducción de errores HTTP a excepciones tipadas
# ---------------------------------------------------------------------------


class TestGetJson(unittest.TestCase):
    def _run(self, handler):
        transport = httpx.MockTransport(handler)

        async def run():
            async with httpx.AsyncClient(transport=transport) as client:
                return await main._get_json(client, "https://example.test/x")

        return asyncio_run(run())

    def test_not_found(self):
        with self.assertRaises(main.SourceNotFound):
            self._run(lambda request: httpx.Response(404, json={}))

    def test_server_error(self):
        with self.assertRaises(main.SourceError) as ctx:
            self._run(lambda request: httpx.Response(503, json={}))
        self.assertEqual(ctx.exception.status_code, 503)

    def test_unavailable_on_connect_error(self):
        def handler(request):
            raise httpx.ConnectError("boom")

        with self.assertRaises(main.SourceUnavailable):
            self._run(handler)

    def test_malformed_on_invalid_json(self):
        with self.assertRaises(main.SourceMalformed):
            self._run(
                lambda request: httpx.Response(
                    200, content=b"not-json", headers={"content-type": "application/json"}
                )
            )

    def test_ok_returns_dict(self):
        result = self._run(lambda request: httpx.Response(200, json={"id": "X"}))
        self.assertEqual(result, {"id": "X"})


# ---------------------------------------------------------------------------
# Extracción y deduplicación de anotaciones
# ---------------------------------------------------------------------------


class TestAnnotations(unittest.TestCase):
    def test_deduplicates_function_and_go(self):
        annotations = main.extract_annotations(protein_payload())

        self.assertEqual(annotations["function"], ["E3 ubiquitin-protein ligase."])
        self.assertEqual(annotations["subcellular_location"], ["Nucleus"])
        self.assertEqual(annotations["pathways"], ["DNA damage response."])
        self.assertEqual(len(annotations["biological_processes"]), 1)
        self.assertEqual(annotations["biological_processes"][0]["id"], "GO:0006281")
        self.assertEqual(annotations["molecular_functions"][0]["id"], "GO:0003677")

    def test_empty_protein_yields_empty_annotations(self):
        self.assertEqual(
            main.extract_annotations(None),
            main._empty_annotations(),
        )


# ---------------------------------------------------------------------------
# Contrato de los endpoints
# ---------------------------------------------------------------------------


class EndpointTestCase(unittest.TestCase):
    def setUp(self):
        main.gene_cache.clear()
        self.client = TestClient(main.app)


class TestGeneEndpoint(EndpointTestCase):
    def test_invalid_identifier_is_not_queried(self):
        response = self.client.get("/api/genes/BR%20CA1")
        self.assertEqual(response.status_code, 200)

        body = response.json()
        self.assertEqual(body["status"], main.STATUS_INVALID)
        self.assertEqual(
            body["sources"]["ensembl"]["status"], main.SOURCE_SKIPPED
        )
        self.assertEqual(body["sources"]["uniprot"]["status"], main.SOURCE_SKIPPED)

    def test_not_found(self):
        async def ensembl(client, identifier, query_type):
            return None, source(main.SOURCE_NOT_FOUND)

        async def uniprot(client, symbol):
            return None, source(main.SOURCE_NOT_FOUND)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            body = self.client.get("/api/genes/BRCAX").json()

        self.assertEqual(body["status"], main.STATUS_NOT_FOUND)
        self.assertIsNone(body["gene"]["symbol"])
        self.assertEqual(body["protein"]["uniprot_accession"], None)

    def test_ensembl_unavailable_is_distinct_from_not_found(self):
        async def ensembl(client, identifier, query_type):
            return None, source(main.SOURCE_UNAVAILABLE)

        async def uniprot(client, symbol):
            return None, source(main.SOURCE_UNAVAILABLE)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            body = self.client.get("/api/genes/BRCA1").json()

        self.assertEqual(body["status"], main.STATUS_UNAVAILABLE)
        self.assertNotEqual(body["status"], main.STATUS_NOT_FOUND)

    def test_ok(self):
        async def ensembl(client, identifier, query_type):
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return protein_payload(), source(main.SOURCE_OK)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            body = self.client.get("/api/genes/BRCA1").json()

        self.assertEqual(body["status"], main.STATUS_OK)
        self.assertEqual(body["gene"]["ensembl_id"], "ENSG00000012048")
        self.assertEqual(body["protein"]["uniprot_accession"], "P38398")

    def test_ensembl_ok_uniprot_without_results_is_ok(self):
        async def ensembl(client, identifier, query_type):
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return None, source(main.SOURCE_NOT_FOUND)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            body = self.client.get("/api/genes/BRCA1").json()

        self.assertEqual(body["status"], main.STATUS_OK)
        self.assertEqual(body["sources"]["uniprot"]["status"], main.SOURCE_NOT_FOUND)
        self.assertIsNone(body["protein"]["uniprot_accession"])

    def test_uniprot_failure_preserves_ensembl_data(self):
        async def ensembl(client, identifier, query_type):
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return None, source(main.SOURCE_UNAVAILABLE)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            body = self.client.get("/api/genes/BRCA1").json()

        self.assertEqual(body["status"], main.STATUS_PARTIAL)
        # La información válida de Ensembl se conserva.
        self.assertEqual(body["gene"]["ensembl_id"], "ENSG00000012048")
        self.assertEqual(body["sources"]["ensembl"]["status"], main.SOURCE_OK)

    def test_uniprot_accession_is_queried_as_protein(self):
        calls = {"accession": 0}

        async def uniprot_accession(client, accession):
            calls["accession"] += 1
            return protein_payload(), source(main.SOURCE_OK)

        async def ensembl(client, identifier, query_type):
            return gene_payload(), source(main.SOURCE_OK)

        with mock.patch.object(
            main, "_query_uniprot_by_accession", side_effect=uniprot_accession
        ), mock.patch.object(main, "_query_ensembl", side_effect=ensembl):
            body = self.client.get("/api/genes/P38398").json()

        self.assertEqual(calls["accession"], 1)
        self.assertEqual(body["query_type"], main.QUERY_TYPE_UNIPROT)
        self.assertEqual(body["protein"]["uniprot_accession"], "P38398")

    def test_partial_result_is_not_cached(self):
        counter = {"n": 0}

        async def ensembl(client, identifier, query_type):
            counter["n"] += 1
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return None, source(main.SOURCE_UNAVAILABLE)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            self.client.get("/api/genes/BRCA1")
            self.client.get("/api/genes/BRCA1")

        self.assertEqual(counter["n"], 2)

    def test_stable_result_is_cached(self):
        counter = {"n": 0}

        async def ensembl(client, identifier, query_type):
            counter["n"] += 1
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return protein_payload(), source(main.SOURCE_OK)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            self.client.get("/api/genes/BRCA1")
            self.client.get("/api/genes/BRCA1")

        self.assertEqual(counter["n"], 1)

    def test_expired_cache_is_recomputed(self):
        counter = {"n": 0}

        async def ensembl(client, identifier, query_type):
            counter["n"] += 1
            return gene_payload(), source(main.SOURCE_OK)

        async def uniprot(client, symbol):
            return protein_payload(), source(main.SOURCE_OK)

        with mock.patch.object(main, "_query_ensembl", side_effect=ensembl), \
             mock.patch.object(main, "_query_uniprot_by_symbol", side_effect=uniprot):
            self.client.get("/api/genes/BRCA1")

            # Forzamos una entrada de caché caducada.
            key = f"{main.QUERY_TYPE_SYMBOL}:BRCA1"
            _, value = main.gene_cache[key]
            main.gene_cache[key] = (
                main.time.monotonic() - main.CACHE_TTL_SECONDS - 1,
                value,
            )

            self.client.get("/api/genes/BRCA1")

        self.assertEqual(counter["n"], 2)


# ---------------------------------------------------------------------------
# Adaptadores de fuentes (transporte HTTP simulado)
# ---------------------------------------------------------------------------


class TestEnsemblAdapter(unittest.TestCase):
    def _call(self, handler, identifier="BRCA1", query_type=main.QUERY_TYPE_SYMBOL):
        transport = httpx.MockTransport(handler)

        async def run():
            async with httpx.AsyncClient(transport=transport) as client:
                return await main._query_ensembl(client, identifier, query_type)

        return asyncio_run(run())

    def test_status_400_means_not_found(self):
        gene, src = self._call(
            lambda request: httpx.Response(400, json={"error": "Failed to resolve"})
        )
        self.assertIsNone(gene)
        self.assertEqual(src["status"], main.SOURCE_NOT_FOUND)

    def test_status_404_means_not_found(self):
        gene, src = self._call(lambda request: httpx.Response(404, json={}))
        self.assertIsNone(gene)
        self.assertEqual(src["status"], main.SOURCE_NOT_FOUND)

    def test_status_500_means_error(self):
        gene, src = self._call(lambda request: httpx.Response(500, json={}))
        self.assertIsNone(gene)
        self.assertEqual(src["status"], main.SOURCE_ERROR)

    def test_connection_error_means_unavailable(self):
        def handler(request):
            raise httpx.ConnectError("boom")

        gene, src = self._call(handler)
        self.assertIsNone(gene)
        self.assertEqual(src["status"], main.SOURCE_UNAVAILABLE)

    def test_ok(self):
        gene, src = self._call(
            lambda request: httpx.Response(200, json=gene_payload())
        )
        self.assertEqual(gene["id"], "ENSG00000012048")
        self.assertEqual(src["status"], main.SOURCE_OK)


class TestUniProtAdapter(unittest.TestCase):
    def _call(self, handler):
        transport = httpx.MockTransport(handler)

        async def run():
            async with httpx.AsyncClient(transport=transport) as client:
                return await main._query_uniprot(
                    client,
                    "gene_exact:BRCA1 AND organism_id:9606",
                    "«BRCA1»",
                )

        return asyncio_run(run())

    def test_prefers_reviewed_entries(self):
        queries = []

        def handler(request):
            queries.append(dict(request.url.params).get("query", ""))
            return httpx.Response(200, json={"results": [{"primaryAccession": "P38398"}]})

        protein, src = self._call(handler)

        self.assertEqual(len(queries), 1)
        self.assertIn("reviewed:true", queries[0])
        self.assertEqual(protein["primaryAccession"], "P38398")
        self.assertEqual(src["status"], main.SOURCE_OK)

    def test_falls_back_when_no_reviewed_entry(self):
        queries = []

        def handler(request):
            query = dict(request.url.params).get("query", "")
            queries.append(query)

            if "reviewed:true" in query:
                return httpx.Response(200, json={"results": []})

            return httpx.Response(200, json={"results": [{"primaryAccession": "Q1"}]})

        protein, src = self._call(handler)

        self.assertEqual(len(queries), 2)
        self.assertEqual(protein["primaryAccession"], "Q1")
        self.assertEqual(src["status"], main.SOURCE_OK)

    def test_unavailable_does_not_trigger_fallback(self):
        calls = {"n": 0}

        def handler(request):
            calls["n"] += 1
            raise httpx.ConnectError("boom")

        protein, src = self._call(handler)

        self.assertEqual(calls["n"], 1)
        self.assertIsNone(protein)
        self.assertEqual(src["status"], main.SOURCE_UNAVAILABLE)


# ---------------------------------------------------------------------------
# CORS configurable por entorno
# ---------------------------------------------------------------------------


class TestResolveCorsOrigins(unittest.TestCase):
    def test_defaults_when_absent(self):
        self.assertEqual(
            main.resolve_cors_origins(None),
            main.DEFAULT_CORS_ALLOW_ORIGINS,
        )

    def test_defaults_when_blank(self):
        self.assertEqual(
            main.resolve_cors_origins("   "),
            main.DEFAULT_CORS_ALLOW_ORIGINS,
        )

    def test_parses_comma_separated_origins(self):
        self.assertEqual(
            main.resolve_cors_origins(
                "https://a.example.test, https://b.example.test "
            ),
            ["https://a.example.test", "https://b.example.test"],
        )

    def test_wildcard_is_rejected(self):
        self.assertEqual(
            main.resolve_cors_origins("*"),
            main.DEFAULT_CORS_ALLOW_ORIGINS,
        )
        self.assertEqual(
            main.resolve_cors_origins("https://a.example.test,*"),
            ["https://a.example.test"],
        )


class TestCorsMiddleware(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def _preflight(self, origin):
        return self.client.options(
            "/api/genes/BRCA1",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

    def test_local_origin_is_allowed(self):
        response = self._preflight("http://localhost:5173")
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://localhost:5173",
        )

    def test_unknown_origin_is_not_allowed(self):
        response = self._preflight("https://dominio-ajeno.example")
        self.assertIsNone(response.headers.get("access-control-allow-origin"))


def asyncio_run(coro):
    """Ejecuta una corrutina sin depender de un bucle global."""
    import asyncio

    return asyncio.new_event_loop().run_until_complete(coro)


if __name__ == "__main__":
    unittest.main()
