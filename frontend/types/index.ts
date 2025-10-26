export type TempDiagnosis = {
  confidence: number;
  uncertainty: number;
  modelUsed: string;
  disease: string;
  chatId: string;
};

export type Explanation = {
  symptoms: string;
  tokens: string[];
  importances: number[];
};
