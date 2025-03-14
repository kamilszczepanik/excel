"use client";
import { cn } from "@/utils";
import React, { useState, useCallback, useMemo } from "react";

interface CellData {
  value: string;
  displayValue: string;
}

interface ExcelGridProps {
  rowCount?: number;
  colCount?: number;
  defaultRowHeight?: string;
  defaultColWidth?: string;
}

const ROW_HEADER_WIDTH = "w-12";

const ExcelGrid: React.FC<ExcelGridProps> = ({
  rowCount = 100,
  colCount = 26,
  defaultRowHeight = "h-8",
  defaultColWidth = "w-12",
}) => {
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
    for (let i = 0; i < colCount; i++) {
      headers.push(getColumnLabel(i));
    }
    return headers;
  }, [colCount]);

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
    [cells]
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
    []
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
          if (currentRow < rowCount - 1) {
            setSelectedCell(`${colLabel}${currentRow + 2}`);
          }
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (currentCol > 0) {
            setSelectedCell(
              `${columnHeaders[currentCol - 1]}${currentRow + 1}`
            );
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (currentCol < colCount - 1) {
            setSelectedCell(
              `${columnHeaders[currentCol + 1]}${currentRow + 1}`
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
      rowCount,
      colCount,
      editValue,
      editingCell,
      selectedCell,
      columnHeaders,
      handleCellDoubleClick,
      handleCellEditComplete,
    ]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      const scrollLeft = target.scrollLeft;

      const startRow = Math.floor(scrollTop);
      const visibleRowCount = Math.ceil(target.clientHeight);
      const endRow = Math.min(startRow + visibleRowCount + 5, rowCount); // Add buffer

      const startCol = Math.floor(scrollLeft);
      const visibleColCount = Math.ceil(target.clientWidth);
      const endCol = Math.min(startCol + visibleColCount + 2, colCount); // Add buffer

      setVisibleRows({ start: startRow, end: endRow });
      setVisibleCols({ start: startCol, end: endCol });
    },
    [rowCount, colCount]
  );

  return (
    <div
      className="w-full h-full relative overflow-auto"
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
    >
      <div className="flex">
        <div className={`${ROW_HEADER_WIDTH} sticky`} />
        {columnHeaders.slice(visibleCols.start, visibleCols.end).map((col) => (
          <div
            key={col}
            className={`border-r border-b text-center font-bold ${defaultColWidth}`}
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
                  className={`${ROW_HEADER_WIDTH} border-r border-b text-center font-bold sticky left-0 z-[1]`}
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
                          `cell border border-gray-200 px-1 overflow-hidden whitespace-nowrap text-ellipsis relative ${defaultColWidth}`,
                          isSelected ? "outline-2 outline-blue-500" : ""
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
                            className="w-full h-full border-none p-0 font-inherit text-inherit outline-none"
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
          }
        )}
      </div>
    </div>
  );
};

export default ExcelGrid;
