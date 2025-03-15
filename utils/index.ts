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
