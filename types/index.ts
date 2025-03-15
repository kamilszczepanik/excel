export interface CellData {
  value: string;
  displayValue: string;
  isFormula?: boolean;
  dependsOn?: Set<string>;
}

export type Cells = Map<string, CellData>;

export type DependentCells = Map<string, Set<string>>;
