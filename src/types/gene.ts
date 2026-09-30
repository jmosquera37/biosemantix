export interface Gene {
  id: string;
  symbol: string;
  name: string;
  description: string;
  synonyms: string[];
  ensemblId: string;
  uniprotId: string;

  function: string;

  biologicalProcesses: string[];
  molecularFunctions: string[];
  cellularComponents: string[];

  pathways: string[];

  expressionLevel: number;
  pValue: number;
}