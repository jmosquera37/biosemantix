const UNIPROT_API = "https://rest.uniprot.org";

export async function getProteinByGene(symbol: string) {
  const query = `gene_exact:${symbol} AND organism_id:9606`;

  const response = await fetch(
    `${UNIPROT_API}/uniprotkb/search?query=${encodeURIComponent(
      query
    )}&format=json`
  );

  console.log("Estado de UniProt:", response.status);
  console.log("Respuesta de UniProt:", response.statusText);

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Detalle del error de UniProt:", errorText);

    throw new Error(`No se pudo consultar UniProt para ${symbol}`);
  }

  const data = await response.json();

  return data;
}