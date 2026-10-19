const ENSEMBL_API = "https://rest.ensembl.org";

export async function getGeneBySymbol(symbol: string) {
  const response = await fetch(
    `${ENSEMBL_API}/lookup/symbol/homo_sapiens/${symbol}?content-type=application/json`
  );

  if (!response.ok) {
    throw new Error(`No se pudo consultar el gen ${symbol}`);
  }

  return response.json();
}