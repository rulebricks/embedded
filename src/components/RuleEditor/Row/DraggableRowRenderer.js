import classNames from "classnames";
import { Row } from "react-data-grid";
import { useDrag, useDrop } from "react-dnd";

const rowDraggingClassname = "opacity-50";
const rowOverClassname = "dragging-over";

export function DraggableRowRenderer({
  rowIdx,
  isRowSelected,
  className,
  onRowReorder,
  selectedRows,
  onRowsReorder,
  canDrag,
  ...props
}) {
  const [{ isDragging }, drag, _dragPreview] = useDrag({
    type: "ROW_DRAG",
    item: { index: rowIdx },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    previewOptions: {
      captureDraggingState: true,
    },
    canDrag: canDrag,
  });

  const [{ isOver }, drop] = useDrop({
    accept: "ROW_DRAG",
    drop({ index }) {
      if (selectedRows.size <= 1) {
        onRowReorder(index, rowIdx);
      } else {
        onRowsReorder(Array.from(selectedRows).sort(), rowIdx);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isDeactivated = props.row.data.settings
    ? !props.row.data.settings.enabled
    : false;

  const aiStatus = props.row.data.aiStatus;

  className = classNames(
    className,
    isDragging && rowDraggingClassname,
    isOver && rowOverClassname,
    aiStatus === "added" && "bg-lime-400/20",
    aiStatus === "modified" && "bg-yellow-200/40",
    aiStatus === "deleted" && "bg-neutral-200 bg-opacity-30",
    isDeactivated && "bg-neutral-200 bg-opacity-30"
  );

  return (
    <Row
      ref={(ref) => {
        if (ref) {
          drag(ref.firstElementChild);
        }
        drop(ref);
      }}
      rowIdx={rowIdx}
      isRowSelected={isRowSelected}
      className={className}
      {...props}
    />
  );
}
