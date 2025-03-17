export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const getColumnLabel = (colIndex: number): string => {
  let label = "";
  let col = colIndex;

  while (col >= 0) {
    label = String.fromCharCode("A".charCodeAt(0) + (col % 26)) + label;
    col = Math.floor(col / 26) - 1;
  }

  return label;
};

export const evaluateFormula = (
  formula: string,
  getCellValue: (cellId: string) => string,
  visitedCells: Set<string> = new Set<string>(),
): string => {
  try {
    const expression = formula.substring(1).trim();

    const cellRefRegex = /[A-Z]+\d+/g;

    const evaluableExpression = expression.replace(cellRefRegex, (cellRef) => {
      if (visitedCells.has(cellRef)) {
        throw new Error(`Circular reference detected: ${cellRef}`);
      }

      const refValue = getCellValue(cellRef);

      if (refValue.startsWith("=")) {
        const newVisited = new Set(visitedCells);
        newVisited.add(cellRef);
        const evaluatedRef = evaluateFormula(
          refValue,
          getCellValue,
          newVisited,
        );

        if (evaluatedRef.startsWith("#ERROR") || evaluatedRef === "#CIRCULAR") {
          throw new Error(
            `Error in referenced cell ${cellRef}: ${evaluatedRef}`,
          );
        }

        return evaluatedRef === "" ? "0" : evaluatedRef;
      }

      if (!refValue || isNaN(Number(refValue))) {
        if (!refValue) return "0";

        throw new Error(
          `Cell ${cellRef} contains non-numeric data: ${refValue}`,
        );
      }

      return refValue;
    });

    if (/[a-zA-Z$_]/.test(evaluableExpression)) {
      return "#ERROR: Invalid cell reference or syntax";
    }

    const sanitizedExpression = evaluableExpression.replace(/[+\-*/]$/, "");

    try {
      const result = new Function(`return ${sanitizedExpression}`)();

      return result.toString();
    } catch (syntaxError) {
      console.error(
        "Expression syntax error:",
        syntaxError,
        sanitizedExpression,
      );
      return "#ERROR: Invalid expression syntax";
    }
  } catch (error) {
    console.error("Formula evaluation error:", error);
    return error instanceof Error ? `#ERROR: ${error.message}` : "#ERROR";
  }
};
