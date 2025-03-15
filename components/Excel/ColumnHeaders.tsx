import { cn } from "@/utils";
import { COL_WIDTH, ROW_HEIGHT } from "@/utils/constants";
import React, { memo, useMemo } from "react";

interface ColumnHeadersProps {
  visibleColumnHeaders: string[];
  colLabel: string;
  visibleRange: {
    startCol: number;
    endCol: number;
  };
}

export const ColumnHeaders: React.FC<ColumnHeadersProps> = memo(
  ({ visibleColumnHeaders, colLabel, visibleRange }) => {
    const headers = useMemo(() => {
      return visibleColumnHeaders.map((col, index) => (
        <ColumnHeader
          key={col}
          col={col}
          index={index}
          isActive={col === colLabel}
          startCol={visibleRange.startCol}
        />
      ));
    }, [visibleColumnHeaders, colLabel, visibleRange.startCol]);

    return <div className="sticky top-0 z-20 -mt-12 flex">{headers}</div>;
  },
);

ColumnHeaders.displayName = "ColumnHeaders";

interface ColumnHeaderProps {
  col: string;
  index: number;
  isActive: boolean;
  startCol: number;
}

const ColumnHeader = memo(
  ({ col, index, isActive, startCol }: ColumnHeaderProps) => (
    <div
      key={col}
      className={cn(
        "flex items-center justify-center border border-gray-300 text-center font-bold",
        isActive ? "bg-blue-200" : "",
      )}
      style={{
        width: COL_WIDTH,
        minWidth: COL_WIDTH,
        height: ROW_HEIGHT,
        position: "absolute",
        left: 50 + (index + startCol) * COL_WIDTH,
        top: 0,
        zIndex: 10,
      }}
    >
      {col}
    </div>
  ),
);

ColumnHeader.displayName = "ColumnHeader";
