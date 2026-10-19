import { describe, expect, it } from "vitest";

import type { GeneDetails } from "../services/biosemantix";
import {
  buildReportCsv,
  escapeCsv,
  queryStatusLabel,
  queryStatusTone,
  reportCategory,
  reportEntryMatchesQuery,
  sourceStatusLabel,
} from "./report";

function makeDetails(overrides: Partial<GeneDetails> = {}): GeneDetails {
  return {
    identifier: "BRCA1",
    normalized: "BRCA1",
    query_type: "symbol",
    status: "ok",
    message: "Consulta completada correctamente.",
    sources: {
      ensembl: { status: "ok", message: null },
      uniprot: { status: "ok", message: null },
    },
    gene: {
      symbol: "BRCA1",
      ensembl_id: "ENSG00000012048",
      description: 'Gen "reparador", del ADN',
      species: "homo_sapiens",
      assembly: "GRCh38",
    },
    protein: {
      uniprot_accession: "P38398",
      uniprot_id: "BRCA1_HUMAN",
      recommended_name: "Breast cancer type 1",
      alternative_names: [],
    },
    annotations: {
      function: ["E3 ubiquitin-protein ligase."],
      subcellular_location: ["Nucleus"],
      pathways: ["DNA damage response."],
      biological_processes: [{ id: "GO:0006281", name: "DNA repair" }],
      molecular_functions: [{ id: "GO:0003677", name: "DNA binding" }],
    },
    ...overrides,
  };
}

describe("escapeCsv", () => {
  it("duplica las comillas dobles", () => {
    expect(escapeCsv('a "b" c')).toBe('"a ""b"" c"');
  });

  it("conserva comas y saltos de línea dentro de las comillas", () => {
    expect(escapeCsv("a,b\nc")).toBe('"a,b\nc"');
  });

  it("convierte null y undefined en cadena vacía", () => {
    expect(escapeCsv(null)).toBe('""');
    expect(escapeCsv(undefined)).toBe('""');
  });
});

describe("etiquetas de estado", () => {
  it("traduce los estados de fuente al español", () => {
    expect(sourceStatusLabel("ok")).toBe("consultado");
    expect(sourceStatusLabel("unavailable")).toBe("no disponible (red)");
    expect(sourceStatusLabel("skipped")).toBe("no aplicable");
  });

  it("traduce los estados de consulta y su tono", () => {
    expect(queryStatusLabel("partial")).toBe("Consulta parcial");
    expect(queryStatusTone("invalid_identifier")).toBe("error");
    expect(queryStatusTone("not_found")).toBe("info");
  });
});

describe("buildReportCsv", () => {
  it("incluye la cabecera y una fila por identificador procesado", () => {
    const csv = buildReportCsv([
      { identifier: "BRCA1", details: makeDetails() },
      { identifier: "FALLA", error: "No se pudo conectar." },
    ]);

    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Identificador consultado"');
    expect(lines[0]).toContain('"Estado Ensembl"');
  });

  it("exporta los datos del gen y sus anotaciones", () => {
    const csv = buildReportCsv([{ identifier: "BRCA1", details: makeDetails() }]);

    expect(csv).toContain('"ENSG00000012048"');
    expect(csv).toContain('"P38398"');
    expect(csv).toContain('"GO:0006281: DNA repair"');
    expect(csv).toContain('"Ensembl; UniProt"');
  });

  it("incluye las consultas fallidas con su estado y mensaje", () => {
    const csv = buildReportCsv([
      { identifier: "P04637", error: "El servicio respondió con un error." },
    ]);

    const row = csv.split("\r\n")[1];
    expect(row).toContain('"error"');
    expect(row).toContain('"El servicio respondió con un error."');
  });

  it("distingue las consultas parciales de las completas", () => {
    const partial = makeDetails({
      status: "partial",
      sources: {
        ensembl: { status: "ok", message: "Ensembl OK" },
        uniprot: { status: "unavailable", message: "UniProt caído" },
      },
    });

    const csv = buildReportCsv([{ identifier: "BRCA1", details: partial }]);
    const row = csv.split("\r\n")[1];

    expect(row).toContain('"partial"');
    expect(row).toContain('"unavailable"');
    expect(row).toContain('"BRCA1"');
  });

  it("escapa descripciones con comillas y comas", () => {
    const csv = buildReportCsv([{ identifier: "BRCA1", details: makeDetails() }]);
    expect(csv).toContain('"Gen ""reparador"", del ADN"');
  });
});

describe("reportCategory", () => {
  it("clasifica una consulta completada", () => {
    expect(reportCategory({ identifier: "BRCA1", details: makeDetails() })).toBe(
      "completed"
    );
  });

  it("clasifica una consulta parcial", () => {
    const partial = makeDetails({ status: "partial" });

    expect(
      reportCategory({ identifier: "BRCA1", details: partial })
    ).toBe("partial");
  });

  it("clasifica una consulta sin resultados", () => {
    const notFound = makeDetails({ status: "not_found" });

    expect(
      reportCategory({ identifier: "ZZZ", details: notFound })
    ).toBe("not_found");
  });

  it("clasifica como error las fuentes no disponibles y los identificadores no admitidos", () => {
    expect(
      reportCategory({
        identifier: "TP53",
        details: makeDetails({ status: "unavailable" }),
      })
    ).toBe("failed");

    expect(
      reportCategory({
        identifier: "bad id!",
        details: makeDetails({ status: "invalid_identifier" }),
      })
    ).toBe("failed");
  });

  it("clasifica como error las consultas que no devolvieron datos", () => {
    expect(
      reportCategory({ identifier: "X", error: "No se pudo conectar." })
    ).toBe("failed");
  });
});

describe("reportEntryMatchesQuery", () => {
  it("devuelve true cuando la búsqueda está vacía o solo tiene espacios", () => {
    const entry = { identifier: "BRCA1", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "")).toBe(true);
    expect(reportEntryMatchesQuery(entry, "   ")).toBe(true);
  });

  it("encuentra por símbolo del gen sin distinguir mayúsculas", () => {
    const entry = { identifier: "ENSG00000012048", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "brca1")).toBe(true);
  });

  it("encuentra por identificador original", () => {
    const entry = { identifier: "ENSG00000012048", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "ensg00000012048")).toBe(true);
  });

  it("encuentra por ID de Ensembl y accession de UniProt", () => {
    const entry = { identifier: "BRCA1", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "ENSG00000012048")).toBe(true);
    expect(reportEntryMatchesQuery(entry, "p38398")).toBe(true);
  });

  it("encuentra coincidencias parciales", () => {
    const entry = { identifier: "BRCA1", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "1204")).toBe(true);
    expect(reportEntryMatchesQuery(entry, "ubre")).toBe(false);
  });

  it("devuelve false cuando no hay coincidencias", () => {
    const entry = { identifier: "BRCA1", details: makeDetails() };

    expect(reportEntryMatchesQuery(entry, "TP53")).toBe(false);
  });

  it("busca por identificador en consultas fallidas", () => {
    const entry = { identifier: "NOEXISTE", error: "Fuente no disponible." };

    expect(reportEntryMatchesQuery(entry, "noexiste")).toBe(true);
    expect(reportEntryMatchesQuery(entry, "otro")).toBe(false);
  });
});
