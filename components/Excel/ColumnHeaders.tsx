import { cn } from "@/utils";
import { COL_WIDTH, ROW_HEIGHT } from "@/utils/constants";

interface Props {
  visibleColumnHeaders: string[];
  colLabel: string;
  visibleRange: {
    startCol: number;
    endCol: number;
  };
}

export const ColumnHeaders: React.FC<Props> = ({
  visibleColumnHeaders,
  colLabel,
  visibleRange,
}) => {
  return (
    <div className="sticky top-0 z-20 -mt-12 flex">
      {visibleColumnHeaders.map((col, index) => (
        <div
          key={col}
          className={cn(
            "flex items-center justify-center border border-gray-300 text-center font-bold",
            col === colLabel ? "bg-blue-200" : "",
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
  );
};
