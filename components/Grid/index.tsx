"use client";
import { cn, getColumnLabel } from "@/utils";
import React, { useState, useCallback, useMemo } from "react";

interface CellData {
  value: string;
  displayValue: string;
  isFormula?: boolean; // Track if cell contains a formula
}

const ROW_HEIGHT = 30;
const COL_WIDTH = 80;
const ROW_COUNT = 10;
const COL_COUNT = 10;

function evaluateFormula(formula: string): string {
  try {
    const expression = formula.substring(1).trim();

    if (/[a-zA-Z$_]/.test(expression)) {
      return "#ERROR: Only numbers and operators allowed";
    }

    const result = new Function(`return ${expression}`)();

    return result.toString();
  } catch (error) {
    console.error("Formula evaluation error:", error);
    return "#ERROR";
  }
}

const ExcelGrid: React.FC = () => {
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const columnHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < COL_COUNT; i++) {
      headers.push(getColumnLabel(i));
    }
    return headers;
  }, []);

  const getCellData = useCallback(
    (cellId: string): CellData => {
      return cells.get(cellId) || { value: "", displayValue: "" };
    },
    [cells],
  );

  const handleCellSelect = useCallback((cellId: string) => {
    setSelectedCell(cellId);
  }, []);

  const handleCellDoubleClick = useCallback(
    (cellId: string) => {
      const cellData = getCellData(cellId);
      setEditingCell(cellId);
      setEditValue(cellData.value);
    },
    [getCellData],
  );

  const handleCellChange = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  const handleCellEditComplete = useCallback(
    (cellId: string, newValue: string) => {
      setCells((prevCells) => {
        const newCells = new Map(prevCells);

        const isFormula = newValue.startsWith("=");
        let displayValue = newValue;

        if (isFormula) {
          displayValue = evaluateFormula(newValue);
        }

        newCells.set(cellId, {
          value: newValue,
          displayValue: displayValue,
          isFormula: isFormula,
        });

        return newCells;
      });
      setEditingCell(null);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;

      const [colLabel, rowLabel] =
        selectedCell.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
      if (!colLabel || !rowLabel) return;

      const currentCol = columnHeaders.indexOf(colLabel);
      const currentRow = parseInt(rowLabel) - 1;

      switch (e.key) {
        case "ArrowUp":
          if (currentRow > 0) {
            setSelectedCell(`${colLabel}${currentRow}`);
          }
          e.preventDefault();
          break;
        case "ArrowDown":
          if (currentRow < ROW_COUNT - 1) {
            setSelectedCell(`${colLabel}${currentRow + 2}`);
          }
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (currentCol > 0) {
            setSelectedCell(
              `${columnHeaders[currentCol - 1]}${currentRow + 1}`,
            );
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (currentCol < COL_COUNT - 1) {
            setSelectedCell(
              `${columnHeaders[currentCol + 1]}${currentRow + 1}`,
            );
          }
          e.preventDefault();
          break;
        case "Enter":
          if (editingCell) {
            handleCellEditComplete(editingCell, editValue);
          } else {
            handleCellDoubleClick(selectedCell);
          }
          e.preventDefault();
          break;
        case "Escape":
          if (editingCell) {
            setEditingCell(null);
          }
          e.preventDefault();
          break;
      }
    },
    [
      editValue,
      editingCell,
      selectedCell,
      columnHeaders,
      handleCellDoubleClick,
      handleCellEditComplete,
    ],
  );

  const handleScroll = useCallback(() => {
    // todo: handle scroll
  }, []);

  const selectedCellInfo = useMemo(() => {
    if (!selectedCell) return { rowIndex: -1, colLabel: "" };
    const match = selectedCell.match(/([A-Z]+)(\d+)/);
    if (!match) return { rowIndex: -1, colLabel: "" };
    const [, colLabel, rowNum] = match;

    return {
      rowIndex: parseInt(rowNum) - 1,
      colLabel,
    };
  }, [selectedCell]);

  return (
    <div
      className="relative h-screen w-full overflow-auto"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
    >
      <div
        style={{
          width: COL_COUNT * COL_WIDTH + 50,
          height: ROW_COUNT * ROW_HEIGHT + ROW_HEIGHT,
        }}
      >
        <div className="sticky top-0 z-10 flex bg-gray-100">
          <div
            className="sticky left-0 z-20 border border-gray-300 bg-gray-200"
            style={{ width: "50px", minWidth: "50px", height: ROW_HEIGHT }}
          />

          {columnHeaders.map((col) => (
            <div
              key={col}
              className={cn(
                "flex items-center justify-center border border-gray-300 text-center font-bold",
                col === selectedCellInfo.colLabel ? "bg-blue-200" : "",
              )}
              style={{
                width: COL_WIDTH,
                minWidth: COL_WIDTH,
                height: ROW_HEIGHT,
                flexShrink: 0,
              }}
            >
              {col}
            </div>
          ))}
        </div>

        {Array.from({ length: ROW_COUNT }).map((_, row) => (
          <div
            key={`row-${row}`}
            className="flex"
            style={{ height: ROW_HEIGHT }}
          >
            <div
              className={cn(
                "sticky left-0 z-10 flex items-center justify-center border border-gray-300 text-center font-bold",
                row === selectedCellInfo.rowIndex ? "bg-blue-200" : "",
              )}
              style={{ width: "50px", minWidth: "50px", height: ROW_HEIGHT }}
            >
              {row + 1}
            </div>

            {columnHeaders.map((colHeader) => {
              const cellId = `${colHeader}${row + 1}`;
              const cellData = getCellData(cellId);
              const isSelected = cellId === selectedCell;
              const isEditing = cellId === editingCell;

              return (
                <div
                  key={`cell-${cellId}`}
                  className={cn(
                    "overflow-hidden border px-1 text-ellipsis whitespace-nowrap",
                    isSelected
                      ? "box-border border-2 border-blue-500"
                      : "border-gray-200",
                    cellData.isFormula ? "text-green-700" : "",
                  )}
                  style={{
                    width: COL_WIDTH,
                    minWidth: COL_WIDTH,
                    height: ROW_HEIGHT,
                    flexShrink: 0,
                  }}
                  onClick={() => handleCellSelect(cellId)}
                  onDoubleClick={() => handleCellDoubleClick(cellId)}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => handleCellChange(e.target.value)}
                      onBlur={() => handleCellEditComplete(cellId, editValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCellEditComplete(cellId, editValue);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingCell(null);
                        }
                        e.stopPropagation();
                      }}
                      autoFocus
                      className="h-full w-full border-none p-0 outline-none"
                    />
                  ) : (
                    <span>{cellData.displayValue}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExcelGrid;
