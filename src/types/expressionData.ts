
export interface ExpressionData {
  fileName: string;
  headers: string[];
  rows: string[][];
  geneColumnIndex: number;
  expressionColumnIndexes: number[];
}

export interface AnalysisConfiguration {
  controlColumn: string;
  treatmentColumn: string;
  method: "over-representation" | "enrichment";
  annotationSource: "ensembl" | "uniprot";
  significanceThreshold: number;
  maxResults: number;
}


export interface GeneListData {
  fileName: string;
  genes: string[];
}
