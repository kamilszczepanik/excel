"use client";
import { cn, getColumnLabel } from "@/utils";
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";

interface CellData {
  value: string;
  displayValue: string;
  isFormula?: boolean;
  dependsOn?: Set<string>;
}

const ROW_HEIGHT = 30;
const COL_WIDTH = 80;
const ROW_COUNT = 10000;
const COL_COUNT = 10000;
const BUFFER_SIZE = 5;

function evaluateFormula(
  formula: string,
  getCellValue: (cellId: string) => string,
  visitedCells: Set<string> = new Set<string>(),
): string {
  try {
    const expression = formula.substring(1).trim();

    const cellRefRegex = /[A-Z]+\d+/g;

    const cellRefs: string[] = Array.from(
      expression.matchAll(cellRefRegex),
    ).map((match) => match[0]);

    const formulaCell = formula.match(/^=([A-Z]+\d+)$/);
    if (formulaCell && cellRefs.includes(formulaCell[1])) {
      return "#CIRCULAR";
    }

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
}

const ExcelGrid: React.FC = () => {
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [selectedCell, setSelectedCell] = useState<string | null>("A1");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState(false);
  const [isEditingFormulaBar, setIsEditingFormulaBar] = useState(false);
  const [dependentCells, setDependentCells] = useState<
    Map<string, Set<string>>
  >(new Map());

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [visibleRange, setVisibleRange] = useState({
    startRow: 0,
    endRow: 50,
    startCol: 0,
    endCol: 25,
  });

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

  useEffect(() => {
    if (selectedCell) {
      const cellData = getCellData(selectedCell);
      setEditValue(cellData.value);
    } else {
      setEditValue("");
    }
  }, [selectedCell, getCellData]);

  const handleCellSelect = useCallback((cellId: string) => {
    setSelectedCell(cellId);
    setEditingCell(null);
  }, []);

  const handleCellDoubleClick = useCallback((cellId: string) => {
    setSelectedCell(cellId);
    setEditingCell(cellId);
  }, []);

  const handleEditFormulaBar = useCallback((cellId: string) => {
    setIsEditingFormulaBar(true);
    setSelectedCell(cellId);
  }, []);

  const handleCellChange = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  const focusGridWithoutScrolling = useCallback(() => {
    if (gridContainerRef.current) {
      const scrollPosition = {
        top: window.pageYOffset || document.documentElement.scrollTop,
        left: window.pageXOffset || document.documentElement.scrollLeft,
      };

      gridContainerRef.current.focus();
      window.scrollTo(scrollPosition.left, scrollPosition.top);
    }
  }, []);

  useEffect(() => {
    focusGridWithoutScrolling();
  }, [focusGridWithoutScrolling]);

  const findCellReferences = useCallback((formula: string): string[] => {
    if (!formula.startsWith("=")) return [];

    const expression = formula.substring(1).trim();
    const cellRefRegex = /[A-Z]+\d+/g;
    return Array.from(expression.matchAll(cellRefRegex)).map(
      (match) => match[0],
    );
  }, []);

  const updateCellAndDependents = useCallback(
    (cellId: string, newValue: string) => {
      const newDependentCells = new Map(dependentCells);

      setCells((prevCells) => {
        const newCells = new Map(prevCells);
        const updatedCells = new Set<string>();

        const updateCell = (id: string, value: string) => {
          if (updatedCells.has(id)) return;
          updatedCells.add(id);

          const isFormula = value.startsWith("=");
          let displayValue = value;
          let dependsOn: Set<string> | undefined;

          const oldCell = prevCells.get(id);
          if (oldCell && oldCell.dependsOn) {
            oldCell.dependsOn.forEach((depCellId) => {
              const deps = newDependentCells.get(depCellId);
              if (deps) {
                deps.delete(id);
                if (deps.size === 0) {
                  newDependentCells.delete(depCellId);
                } else {
                  newDependentCells.set(depCellId, deps);
                }
              }
            });
          }

          if (isFormula) {
            dependsOn = new Set(findCellReferences(value));
            displayValue = evaluateFormula(value, (cellId) => {
              const cell = newCells.get(cellId);
              return cell ? cell.value : "";
            });
          }

          newCells.set(id, {
            value,
            displayValue,
            isFormula,
            dependsOn,
          });

          if (dependsOn) {
            dependsOn.forEach((depCellId) => {
              const deps =
                newDependentCells.get(depCellId) || new Set<string>();
              deps.add(id);
              newDependentCells.set(depCellId, deps);
            });
          }

          const dependents = newDependentCells.get(id);
          if (dependents) {
            dependents.forEach((depId) => {
              const depCell = newCells.get(depId);
              if (depCell && depCell.isFormula) {
                updateCell(depId, depCell.value);
              }
            });
          }
        };

        updateCell(cellId, newValue);

        return newCells;
      });

      setDependentCells(newDependentCells);
    },
    [dependentCells, findCellReferences],
  );

  const handleCellEditComplete = useCallback(
    (cellId: string, newValue: string) => {
      updateCellAndDependents(cellId, newValue);
      setEditingCell(null);
      setIsEditingFormulaBar(false);

      setTimeout(() => {
        focusGridWithoutScrolling();
      }, 0);
    },
    [focusGridWithoutScrolling, updateCellAndDependents],
  );

  const handleFormulaBarKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleCellEditComplete(selectedCell, editValue);
      }
    },
    [selectedCell, editValue, handleCellEditComplete],
  );

  const handleFormulaBarFocus = useCallback(() => {
    setIsFormulaBarFocused(true);
  }, []);

  const handleFormulaBarBlur = useCallback(() => {
    setIsFormulaBarFocused(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;

      const isPrintableKey =
        e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;
      const isNumericKey = /^[0-9]$/.test(e.key);
      const isCommonInputChar = /^[a-zA-Z0-9=+\-*/().,]$/.test(e.key);

      if (
        (isPrintableKey || isNumericKey || isCommonInputChar) &&
        !editingCell &&
        !isFormulaBarFocused
      ) {
        setEditingCell(selectedCell);
        setEditValue(e.key);
        e.preventDefault();
        return;
      }

      const [colLabel, rowLabel] =
        selectedCell.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
      if (!colLabel || !rowLabel) return;

      const currentCol = columnHeaders.indexOf(colLabel);
      const currentRow = parseInt(rowLabel) - 1;

      const ensureCellVisible = (row: number, col: number) => {
        if (!scrollContainerRef.current) return;

        const colLabel = getColumnLabel(col);
        const cellId = `${colLabel}${row + 1}`;

        setSelectedCell(cellId);

        const cellTop = (row + 1) * ROW_HEIGHT;
        const cellLeft = 50 + col * COL_WIDTH;

        const { offsetWidth, offsetHeight, scrollLeft, scrollTop } =
          scrollContainerRef.current;

        if (cellLeft < scrollLeft + 50) {
          scrollContainerRef.current.scrollLeft = cellLeft - 50;
        } else if (cellLeft + COL_WIDTH > scrollLeft + offsetWidth) {
          scrollContainerRef.current.scrollLeft =
            cellLeft + COL_WIDTH - offsetWidth;
        }

        if (cellTop < scrollTop + ROW_HEIGHT) {
          scrollContainerRef.current.scrollTop = cellTop - ROW_HEIGHT;
        } else if (cellTop + ROW_HEIGHT > scrollTop + offsetHeight) {
          scrollContainerRef.current.scrollTop =
            cellTop + ROW_HEIGHT - offsetHeight;
        }
      };

      switch (e.key) {
        case "ArrowUp":
          if (currentRow > 0) {
            ensureCellVisible(currentRow - 1, currentCol);
          }
          e.preventDefault();
          break;
        case "ArrowDown":
          if (currentRow < ROW_COUNT - 1) {
            ensureCellVisible(currentRow + 1, currentCol);
          }
          e.preventDefault();
          break;
        case "ArrowLeft":
          if (currentCol > 0) {
            ensureCellVisible(currentRow, currentCol - 1);
          }
          e.preventDefault();
          break;
        case "ArrowRight":
          if (currentCol < COL_COUNT - 1) {
            ensureCellVisible(currentRow, currentCol + 1);
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
            setIsEditingFormulaBar(false);
            setTimeout(() => {
              focusGridWithoutScrolling();
            }, 0);
          }
          e.preventDefault();
          break;
        case "Delete":
        case "Backspace":
          if (!editingCell && !isFormulaBarFocused) {
            handleCellEditComplete(selectedCell, "");
            e.preventDefault();
          }
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
      focusGridWithoutScrolling,
      isFormulaBarFocused,
    ],
  );

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollLeft, clientHeight, clientWidth } =
      scrollContainerRef.current;

    const startRow = Math.floor(scrollTop / ROW_HEIGHT);
    const endRow = Math.min(
      Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + BUFFER_SIZE,
      ROW_COUNT - 1,
    );

    const startCol = Math.floor(scrollLeft / COL_WIDTH);
    const endCol = Math.min(
      Math.ceil((scrollLeft + clientWidth) / COL_WIDTH) + BUFFER_SIZE,
      COL_COUNT - 1,
    );

    setVisibleRange({
      startRow: Math.max(0, startRow - BUFFER_SIZE),
      endRow,
      startCol: Math.max(0, startCol - BUFFER_SIZE),
      endCol,
    });
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

  const visibleColumnHeaders = useMemo(() => {
    const headers = [];
    for (let i = visibleRange.startCol; i <= visibleRange.endCol; i++) {
      if (i < COL_COUNT) {
        headers.push(getColumnLabel(i));
      }
    }
    return headers;
  }, [visibleRange.startCol, visibleRange.endCol]);

  useEffect(() => {
    handleScroll();

    const handleResize = () => {
      handleScroll();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll]);

  return (
    <div className="flex h-screen flex-col">
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
      <div
        ref={(el) => {
          gridContainerRef.current = el;
          scrollContainerRef.current = el;
        }}
        className="flex-1 overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        <div
          style={{
            width: COL_COUNT * COL_WIDTH + 50,
            height: ROW_COUNT * ROW_HEIGHT + ROW_HEIGHT,
            position: "relative",
          }}
        >
          <div
            className="sticky top-0 left-0 z-[100] border border-gray-300 bg-gray-200"
            style={{
              width: "50px",
              minWidth: "50px",
              height: ROW_HEIGHT,
            }}
          />

          <div className="sticky top-0 z-20 -mt-12 flex">
            {visibleColumnHeaders.map((col, index) => (
              <div
                key={col}
                className={cn(
                  "flex items-center justify-center border border-gray-300 bg-gray-100 text-center font-bold",
                  col === selectedCellInfo.colLabel ? "bg-blue-200" : "",
                )}
                style={{
                  width: COL_WIDTH,
                  minWidth: COL_WIDTH,
                  height: ROW_HEIGHT,
                  position: "absolute",
                  left: 50 + (index + visibleRange.startCol) * COL_WIDTH,
                  top: 0,
                  zIndex: 10,
                }}
              >
                {col}
              </div>
            ))}
          </div>
          {Array.from({
            length: visibleRange.endRow - visibleRange.startRow + 1,
          }).map((_, rowIndex) => {
            const row = visibleRange.startRow + rowIndex;

            return (
              <div
                key={`row-${row}`}
                style={{
                  height: ROW_HEIGHT,
                  position: "absolute",
                  top: (row + 1) * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  width: "100%",
                }}
              >
                <div
                  className={cn(
                    "sticky flex items-center justify-center border border-gray-300 bg-gray-100 text-center font-bold",
                    row === selectedCellInfo.rowIndex ? "bg-blue-200" : "",
                  )}
                  style={{
                    width: "50px",
                    minWidth: "50px",
                    height: ROW_HEIGHT,
                    left: scrollContainerRef.current
                      ? scrollContainerRef.current.getBoundingClientRect().left
                      : 0,
                    top:
                      (row + 1) * ROW_HEIGHT -
                      (scrollContainerRef.current
                        ? scrollContainerRef.current.scrollTop
                        : 0),
                    zIndex: 30,
                  }}
                >
                  {row + 1}
                </div>

                {visibleColumnHeaders.map((colHeader, colIndex) => {
                  const cellId = `${colHeader}${row + 1}`;
                  const cellData = getCellData(cellId);
                  const isSelected = cellId === selectedCell;
                  const isEditing = cellId === editingCell;
                  const colPosition = visibleRange.startCol + colIndex;

                  return (
                    <div
                      key={`cell-${cellId}`}
                      className={cn(
                        "overflow-hidden border px-1 text-ellipsis whitespace-nowrap",
                        isSelected
                          ? "box-border border-2 border-blue-500"
                          : "border-gray-200",
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
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExcelGrid;
