"use client";
import { cn, getColumnLabel } from "@/utils";
import React, { useState, useCallback, useMemo } from "react";

interface CellData {
  value: string;
  displayValue: string;
}

const ROW_HEIGHT = 30;
const COL_WIDTH = 80;
const ROW_COUNT = 10;
const COL_COUNT = 10;

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
        newCells.set(cellId, {
          value: newValue,
          displayValue: newValue,
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
    // We don't need to calculate visible cells anymore since we're rendering them all
    // Just keep the function for future optimizations
  }, []);

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
              className="flex items-center justify-center border border-gray-300 text-center font-bold"
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
              className="sticky left-0 z-10 flex items-center justify-center border border-gray-300 bg-gray-100 text-center font-bold"
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
                    "overflow-hidden border border-gray-200 px-1 text-ellipsis whitespace-nowrap",
                    isSelected ? "outline-2 outline-blue-500" : "",
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
