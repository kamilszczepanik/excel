export interface CellData {
  value: string;
  displayValue: string;
  isFormula?: boolean;
  dependsOn?: Set<string>;
}

export type Cells = Map<string, CellData>;
