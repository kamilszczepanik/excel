import { CellData } from "@/types";
import { cn, evaluateFormula } from "@/utils";
import { COL_WIDTH, ROW_HEIGHT } from "@/utils/constants";

interface Props {
  cellId: string;
  getCellData: (cellId: string) => CellData;
  selectedCell: string | null;
  editingCell: string | null;
  visibleRange: {
    startCol: number;
    endCol: number;
    startRow: number;
    endRow: number;
  };
  colIndex: number;
  handleCellSelect: (cellId: string) => void;
  handleCellDoubleClick: (cellId: string) => void;
  isEditingFormulaBar: boolean;
  editValue: string;
  handleCellChange: (value: string) => void;
  isFormulaBarFocused: boolean;
  handleCellEditComplete: (cellId: string, value: string) => void;
  setEditingCell: (cellId: string | null) => void;
  setIsEditingFormulaBar: (isEditingFormulaBar: boolean) => void;
  setEditValue: (value: string) => void;
}

export const Cell: React.FC<Props> = ({
  cellId,
  getCellData,
  selectedCell,
  editingCell,
  visibleRange,
  colIndex,
  handleCellSelect,
  handleCellDoubleClick,
  isEditingFormulaBar,
  editValue,
  handleCellChange,
  isFormulaBarFocused,
  handleCellEditComplete,
  setEditingCell,
  setIsEditingFormulaBar,
  setEditValue,
}: Props) => {
  const cellData = getCellData(cellId);
  const isSelected = cellId === selectedCell;
  const isEditing = cellId === editingCell;
  const colPosition = visibleRange.startCol + colIndex;

  return (
    <div
      key={`cell-${cellId}`}
      className={cn(
        "overflow-hidden border px-1 text-ellipsis whitespace-nowrap",
        isSelected ? "box-border border-2 border-blue-500" : "border-gray-200",
        cellData.isFormula ? "text-yellow-700" : "",
      )}
      style={{
        width: COL_WIDTH,
        minWidth: COL_WIDTH,
        height: ROW_HEIGHT,
        position: "absolute",
        left: 50 + colPosition * COL_WIDTH,
        top: 0,
      }}
      onClick={() => handleCellSelect(cellId)}
      onDoubleClick={() => handleCellDoubleClick(cellId)}
    >
      {isEditing || (isSelected && isEditingFormulaBar) ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => handleCellChange(e.target.value)}
          onBlur={() => {
            if (!isFormulaBarFocused) {
              handleCellEditComplete(cellId, editValue);
              setEditingCell(null);
              setIsEditingFormulaBar(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCellEditComplete(cellId, editValue);
              setEditingCell(null);
              setIsEditingFormulaBar(false);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditingCell(null);
              setIsEditingFormulaBar(false);
              setEditValue(getCellData(cellId).value);
            }
            e.stopPropagation();
          }}
          autoFocus={isEditing}
          className="h-full w-full border-none p-0 outline-none"
        />
      ) : (
        <span>
          {isSelected && isFormulaBarFocused
            ? editValue.startsWith("=")
              ? evaluateFormula(
                  editValue,
                  (cellId) => getCellData(cellId).value,
                )
              : editValue
            : cellData.displayValue}
        </span>
      )}
    </div>
  );
};
