
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type {
  ExpressionData,
  AnalysisConfiguration,
  GeneListData,
} from "../types/expressionData";

interface ExpressionDataContextValue {
  expressionData: ExpressionData | null;
  setExpressionData: (data: ExpressionData | null) => void;
  analysisConfiguration: AnalysisConfiguration | null;
  setAnalysisConfiguration: (
    config: AnalysisConfiguration | null
  ) => void;
  geneListData: GeneListData | null;
  setGeneListData: (data: GeneListData | null) => void;
}

const ExpressionDataContext =
  createContext<ExpressionDataContextValue | undefined>(undefined);

export function ExpressionDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [expressionData, setExpressionData] =
    useState<ExpressionData | null>(null);

  const [analysisConfiguration, setAnalysisConfiguration] =
    useState<AnalysisConfiguration | null>(null);
  
  const [geneListData, setGeneListData] =
    useState<GeneListData | null>(null);

  return (
    <ExpressionDataContext.Provider
      value={{
        expressionData,
        setExpressionData,
        analysisConfiguration,
        setAnalysisConfiguration,
        geneListData,
        setGeneListData,  
      }}
    >
      {children}
    </ExpressionDataContext.Provider>
  );
}

export function useExpressionData() {
  const context = useContext(ExpressionDataContext);

  if (!context) {
    throw new Error(
      "useExpressionData debe utilizarse dentro de ExpressionDataProvider."
    );
  }

  return context;
}
