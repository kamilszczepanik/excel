import { COL_WIDTH } from "@/utils/constants";
import React, { memo } from "react";

interface Props {
  selectedCell: string | null;
  editValue: string;
  handleCellChange: (value: string) => void;
  handleFormulaBarKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleFormulaBarFocus: () => void;
  handleFormulaBarBlur: () => void;
  handleEditFormulaBar: (value: string) => void;
}

export const FormulaBar = memo(
  ({
    selectedCell,
    editValue,
    handleCellChange,
    handleFormulaBarKeyDown,
    handleFormulaBarFocus,
    handleFormulaBarBlur,
    handleEditFormulaBar,
  }: Props) => {
    console.log("selectedCell", selectedCell);
    return (
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-300 bg-white p-2">
        <div className="w-12 text-center font-medium">
          {selectedCell || "No cell selected"}
        </div>
        <input
          type="text"
          value={editValue}
          onChange={(e) => handleCellChange(e.target.value)}
          onKeyDown={handleFormulaBarKeyDown}
          onFocus={handleFormulaBarFocus}
          onBlur={handleFormulaBarBlur}
          placeholder="Enter formula or value..."
          className="flex-1 rounded px-2 py-1"
          style={{ minWidth: COL_WIDTH * 3 }}
          onClick={() =>
            selectedCell && handleEditFormulaBar(selectedCell.toString())
          }
          disabled={!selectedCell}
        />
      </div>
    );
  },
);

FormulaBar.displayName = "FormulaBar";
