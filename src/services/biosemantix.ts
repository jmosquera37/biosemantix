export interface GeneAnnotation {
  id: string;
  name: string;
}

export interface GeneDetails {
  gene: {
    symbol: string;
    ensembl_id: string;
    description: string | null;
    species: string;
    assembly: string;
  };
  protein: {
    uniprot_accession: string | null;
    uniprot_id: string | null;
    recommended_name: string | null;
    alternative_names: string[];
  };
  annotations: {
    function: string[];
    subcellular_location: string[];
    pathways: string[];
    biological_processes: GeneAnnotation[];
    molecular_functions: GeneAnnotation[];
  };
}

export async function getGeneDetails(
  symbol: string
): Promise<GeneDetails> {
  const response = await fetch(
    `http://127.0.0.1:8000/api/genes/${encodeURIComponent(symbol.trim())}`
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error || "No se pudo consultar la información del gen."
    );
  }

  return data as GeneDetails;
}