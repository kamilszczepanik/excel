"use client";
import { cn } from "@/utils";
import React, { useState, useCallback, useMemo } from "react";

interface CellData {
  value: string;
  displayValue: string;
}

const ROW_COL_WIDTH = "w-20";
const ROW_COL_MIN_WIDTH = "min-w-20";
const COL_HEADER_WIDTH = "w-20";
const COL_HEADER_MIN_WIDTH = "min-w-20";
const ROW_COUNT = 100;
const COL_COUNT = 26;

const ExcelGrid: React.FC = () => {
  const [visibleRows, setVisibleRows] = useState({
    start: 0,
    end: 30,
  });
  const [visibleCols, setVisibleCols] = useState({
    start: 0,
    end: 15,
  });

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
  }, [COL_COUNT]);

  function getColumnLabel(colIndex: number): string {
    let label = "";
    let col = colIndex;

    while (col >= 0) {
      label = String.fromCharCode("A".charCodeAt(0) + (col % 26)) + label;
      col = Math.floor(col / 26) - 1;
    }

    return label;
  }

  function getCellId(row: number, col: number): string {
    return `${getColumnLabel(col)}${row + 1}`;
  }

  function getCellData(cellId: string): CellData {
    return cells.get(cellId) || { value: "", displayValue: "" };
  }

  const handleCellSelect = useCallback((cellId: string) => {
    setSelectedCell(cellId);
  }, []);

  const handleCellDoubleClick = useCallback(
    (cellId: string) => {
      const cellData = getCellData(cellId);
      setEditingCell(cellId);
      setEditValue(cellData.value);
    },
    [cells],
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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollLeft = target.scrollLeft;

    const startRow = Math.floor(scrollTop);
    const visibleRowCount = Math.ceil(target.clientHeight);
    const endRow = Math.min(startRow + visibleRowCount + 5, ROW_COUNT);

    const startCol = Math.floor(scrollLeft);
    const visibleColCount = Math.ceil(target.clientWidth);
    const endCol = Math.min(startCol + visibleColCount + 2, COL_COUNT);

    setVisibleRows({ start: startRow, end: endRow });
    setVisibleCols({ start: startCol, end: endCol });
  }, []);

  return (
    <div
      className="relative overflow-auto"
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
    >
      <div className="flex">
        <div
          className={`${COL_HEADER_WIDTH} ${COL_HEADER_MIN_WIDTH} sticky overflow-hidden`}
        />
        {columnHeaders.slice(visibleCols.start, visibleCols.end).map((col) => (
          <div
            key={col}
            className={`text-center font-bold ${COL_HEADER_WIDTH}`}
          >
            {col}
          </div>
        ))}
      </div>

      <div>
        {Array.from({ length: visibleRows.end - visibleRows.start }).map(
          (_, rowIndex) => {
            const row = visibleRows.start + rowIndex;
            return (
              <div key={`row-${row}`} className="row flex">
                <div
                  className={`${ROW_COL_WIDTH} ${ROW_COL_MIN_WIDTH} sticky left-0 z-[1] text-center font-bold`}
                >
                  {row + 1}
                </div>

                <div className="flex">
                  {Array.from({
                    length: visibleCols.end - visibleCols.start,
                  }).map((_, colIndex) => {
                    const col = visibleCols.start + colIndex;
                    const cellId = getCellId(row, col);
                    const cellData = getCellData(cellId);
                    const isSelected = cellId === selectedCell;
                    const isEditing = cellId === editingCell;

                    return (
                      <div
                        key={`cell-${cellId}`}
                        className={cn(
                          `relative overflow-hidden border border-gray-200 px-1 text-ellipsis whitespace-nowrap ${ROW_COL_WIDTH} ${ROW_COL_MIN_WIDTH}`,
                          isSelected ? "outline-2 outline-blue-500" : "",
                        )}
                        onClick={() => handleCellSelect(cellId)}
                        onDoubleClick={() => handleCellDoubleClick(cellId)}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => handleCellChange(e.target.value)}
                            onBlur={() =>
                              handleCellEditComplete(cellId, editValue)
                            }
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
                            className="font-inherit h-full w-full border-none p-0 text-inherit outline-none"
                          />
                        ) : (
                          <span>{cellData.displayValue}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};

export default ExcelGrid;
