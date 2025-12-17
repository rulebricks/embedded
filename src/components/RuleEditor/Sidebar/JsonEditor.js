import { Editor as Json5Editor } from "json5-editor";
import {
  Icon123,
  IconAlphabetLatin,
  IconBraces,
  IconBrackets,
  IconCalendar,
  IconCheck,
  IconCheckbox,
  IconChevronDown,
  IconChevronRight,
  IconCode,
  IconCopy,
  IconGripVertical,
  IconLayoutList,
  IconMaximize,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import classNames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import JSON5 from "json5";
import { debounce } from "lodash";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import EmbeddedModalOverlay from "../EmbeddedModalOverlay";
import { getValueType } from "../util/models";

// Field name input component that prevents re-renders during editing
const FieldNameInput = ({
  initialValue,
  onRename,
  disabled,
  className,
  placeholder,
}) => {
  const [value, setValue] = useState(initialValue);

  // Update local state when initialValue changes (i.e., when reordering happens)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Create debounced version of onRename
  const debouncedRename = useCallback(
    debounce((newValue) => {
      if (newValue !== initialValue) {
        onRename(newValue);
      }
    }, 200),
    [onRename, initialValue]
  );

  // Call debounced rename when value changes
  useEffect(() => {
    if (value !== initialValue) {
      debouncedRename(value);
    }
    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedRename.cancel();
    };
  }, [value, initialValue, debouncedRename]);

  // Immediate rename when focus is lost
  const handleBlur = () => {
    debouncedRename.cancel();
    if (value !== initialValue) {
      onRename(value);
    }
  };

  // Also trigger immediate rename on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      debouncedRename.cancel();
      e.target.blur();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
    />
  );
};

// Create context for tracking dragging state and current parent path
const DragContext = createContext({
  isDragging: false,
  currentDragParentPath: null,
  setIsDragging: () => {},
  setCurrentDragParentPath: () => {},
});

// DragProvider component to track drag state
const DragProvider = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentDragParentPath, setCurrentDragParentPath] = useState(null);

  return (
    <DragContext.Provider
      value={{
        isDragging,
        currentDragParentPath,
        setIsDragging,
        setCurrentDragParentPath,
      }}
    >
      <DndProvider backend={HTML5Backend}>{children}</DndProvider>
    </DragContext.Provider>
  );
};

export function tryParseJSON(v) {
  let value;
  let error;
  try {
    const parsed = JSON5.parse(v);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      value = null;
      error = "Value is not a JSON object.";
    } else {
      value = parsed;
      error = null;
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

export function tryParseJSONArray(v) {
  let value;
  let error;
  try {
    const parsed = typeof v !== "object" ? JSON5.parse(v) : v;
    if (!Array.isArray(parsed)) {
      value = null;
      error = "Value is not a list.";
    } else {
      value = parsed;
      error = null;
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

export function tryParsePrimitive(v) {
  let value;
  let error;
  try {
    const parsed = JSON5.parse(v);
    if (typeof parsed !== "object" || parsed === null) {
      value = parsed;
      error = null;
    } else {
      value = null;
      error = "Value is not a primitive.";
    }
  } catch (e) {
    value = null;
    error = e.message;
  }
  return { value, error };
}

// DraggableField component for react-dnd
const DraggableField = ({
  id,
  index,
  moveField,
  children,
  readOnly,
  parentPath,
}) => {
  const ref = useRef(null);
  const { setIsDragging, setCurrentDragParentPath } = useContext(DragContext);

  const [{ handlerId }, drop] = useDrop({
    accept: "FIELD",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current || readOnly) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      const dragParentPath = item.parentPath;

      if (dragIndex === hoverIndex) {
        return;
      }

      if (dragParentPath !== parentPath) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveField(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "FIELD",
    item: () => {
      setIsDragging(true);
      setCurrentDragParentPath(parentPath);
      return { id, index, parentPath };
    },
    end: () => {
      setIsDragging(false);
      setCurrentDragParentPath(null);
    },
    canDrag: (_monitor) => {
      if (document.activeElement instanceof HTMLInputElement) {
        return false;
      }
      return true && !readOnly;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      dropEffect: "move",
      anchorX: 0,
    },
    previewOptions: {
      anchorX: 0,
    },
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <motion.div
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

// Simple Mode GUI components
function TypeSelector({ type, onChange, disabled, enableFunctions }) {
  const types = [
    {
      value: "string",
      label: "Text",
      color: "bg-green-100/50 !text-green-800/80 hover:bg-green-300",
      icon: <IconAlphabetLatin size={16} stroke={1.5} />,
    },
    {
      value: "number",
      label: "Number",
      color: "bg-red-100 !text-red-800/80 hover:bg-red-300",
      icon: <Icon123 size={16} stroke={1.5} />,
    },
    {
      value: "boolean",
      label: "Boolean",
      color: "bg-purple-100/50 !text-purple-800/80 hover:bg-purple-300",
      icon: <IconCheckbox size={16} stroke={1.5} />,
    },
    {
      value: "date",
      label: "Date",
      color: "bg-orange-100/50 !text-orange-800/80 hover:bg-orange-300",
      icon: <IconCalendar size={16} stroke={1.5} />,
    },
    {
      value: "list",
      label: "List",
      color: "bg-blue-100/50 !text-blue-800/80 hover:bg-blue-300",
      icon: <IconBrackets size={16} stroke={1.5} />,
    },
    {
      value: "object",
      label: "Object",
      color: "bg-neutral-100/50 !text-neutral-800/80 hover:bg-neutral-100",
      icon: <IconBraces size={16} stroke={1.5} />,
    },
  ];

  if (enableFunctions) {
    types.push({
      value: "function",
      label: "Function",
      color: "bg-black/50 !text-neutral-100/80 hover:bg-neutral-800",
      icon: <IconCode size={16} stroke={1.5} />,
    });
  }

  const selectedType = types.find((t) => t.value === type) || types[0];

  return (
    <div className="flex-shrink-0 w-[32px] hover:brightness-90">
      <div className="relative">
        <select
          value={type}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={classNames(
            "w-full text-xs bg-none rounded-l-sm duration-100 cursor-pointer px-0 border-0 border-neutral-200 outline-0 focus:outline-none focus-within:outline-none focus:ring-0",
            disabled && "bg-gray-100 cursor-not-allowed",
            selectedType.color
          )}
          style={{
            textIndent: "-9999px",
          }}
        >
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <div
          className={`absolute inset-0 rounded-l-sm flex items-center justify-center pointer-events-none ${selectedType.color}`}
        >
          {selectedType.icon}
        </div>
      </div>
    </div>
  );
}

function SimpleObjectEditor({
  data,
  onChange,
  path = {},
  nestingLevel = 0,
  parentPath = "root",
  enableFunctions,
}) {
  const [expanded, setExpanded] = useState({});
  const { isDragging, currentDragParentPath } = useContext(DragContext);

  const isValidDropArea = isDragging && currentDragParentPath === parentPath;

  const toggleExpand = (key) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const moveField = (dragIndex, hoverIndex) => {
    if (path?.readOnly) return;

    const fieldOrder = Object.keys(data);
    if (
      dragIndex < 0 ||
      dragIndex >= fieldOrder.length ||
      hoverIndex < 0 ||
      hoverIndex >= fieldOrder.length
    ) {
      return;
    }

    const dragKey = fieldOrder[dragIndex];
    const newOrder = [...fieldOrder];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, dragKey);

    const newData = {};
    newOrder.forEach((key) => {
      newData[key] = data[key];
    });

    onChange(newData);
  };

  const getDefaultForType = (type) => {
    switch (type) {
      case "string":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "date":
        return new Date().toISOString();
      case "list":
        return [];
      case "object":
        return {};
      case "function":
        return "() => {}";
      default:
        return "";
    }
  };

  const updateValue = (key, newValue, valueType = null) => {
    const newData = { ...data };
    if (valueType) {
      switch (valueType) {
        case "string":
          newData[key] = typeof newValue === "string" ? newValue : "";
          break;
        case "number":
          newData[key] = typeof newValue === "number" ? newValue : 0;
          break;
        case "boolean":
          newData[key] = newValue === "true" || newValue === true;
          break;
        case "date":
          newData[key] =
            typeof newValue === "string" ? newValue : new Date().toISOString();
          break;
        case "list":
          newData[key] = [];
          break;
        case "object":
          newData[key] = {};
          break;
        case "function":
          newData[key] = "() => {}";
          break;
      }
    } else {
      newData[key] = newValue;
    }
    onChange(newData);
  };

  const changeType = (key, type) => {
    updateValue(key, getDefaultForType(type), type);
    if (type === "object" || type === "list") {
      setExpanded((prev) => ({
        ...prev,
        [key]: true,
      }));
    }
  };

  const addField = () => {
    const fieldNumbers = Object.keys(data)
      .filter((key) => key.match(/^field\d+$/))
      .map((key) => Number.parseInt(key.replace("field", ""), 10));

    const nextNumber =
      fieldNumbers.length > 0 ? Math.max(...fieldNumbers) + 1 : 0;
    const newKey = `field${nextNumber}`;
    const newData = {
      ...data,
      [newKey]: "",
    };
    onChange(newData);

    if (Object.keys(data).length === 0) {
      const parentKey = path[path.length - 1];
      if (parentKey) {
        setExpanded((prev) => ({
          ...prev,
          [parentKey]: true,
        }));
      }
    }
  };

  const removeField = (key) => {
    const newData = { ...data };
    delete newData[key];
    onChange(newData);
  };

  const renameField = (oldKey, newKey) => {
    if (oldKey === newKey) return;
    if (newKey.trim() === "" || data[newKey] !== undefined) return;

    const keyOrder = Object.keys(data);
    const keyIndex = keyOrder.indexOf(oldKey);
    if (keyIndex !== -1) {
      keyOrder[keyIndex] = newKey;
    }

    const newData = {};
    keyOrder.forEach((key) => {
      if (key === newKey) {
        newData[key] = data[oldKey];
      } else {
        newData[key] = data[key];
      }
    });

    onChange(newData);
  };

  const isEmpty = !Array.isArray(data) && Object.keys(data).length === 0;

  return (
    <div
      className={classNames(
        "w-full text-xs overflow-auto transition-colors duration-150",
        "bg-white",
        {
          "bg-neutral-700 ring-2 rounded-sm ring-neutral-200 z-10 relative pb-1":
            isValidDropArea && parentPath !== "root",
          "bg-neutral-100": isDragging && !isValidDropArea,
        }
      )}
    >
      <AnimatePresence initial={{ opacity: 0 }}>
        {!isEmpty &&
          Object.entries(data).map(([key, value], index) => {
            const valueType = getValueType(value);
            return (
              <DraggableField
                key={`field-${index}`}
                id={key}
                index={index}
                moveField={moveField}
                readOnly={path?.readOnly}
                parentPath={parentPath}
              >
                <div
                  className={classNames(
                    "border-b border-neutral-100 last:border-b-0 group bg-white"
                  )}
                >
                  <div className="flex items-center gap-2 px-2 py-1.5 group-hover:bg-neutral-100/90 transition-colors duration-100">
                    {!path?.readOnly && (
                      <div
                        className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-900 flex-shrink-0 transition-colors duration-150"
                        title="Drag to reorder"
                      >
                        <IconGripVertical size={14} stroke={1.5} />
                      </div>
                    )}
                    <div className="flex items-center w-auto flex-shrink-0">
                      {valueType === "object" ? (
                        <button
                          className="text-neutral-400 hover:text-neutral-600"
                          onClick={() => toggleExpand(key)}
                        >
                          {expanded[key] ? (
                            <IconChevronDown size={14} />
                          ) : (
                            <IconChevronRight size={14} />
                          )}
                        </button>
                      ) : nestingLevel > 0 ? (
                        <div className="w-0" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 min-w-32 border rounded-sm">
                      <TypeSelector
                        type={valueType}
                        onChange={(type) => changeType(key, type)}
                        disabled={path?.readOnly}
                        enableFunctions={enableFunctions}
                      />
                      <FieldNameInput
                        initialValue={key}
                        onRename={(newKey) => renameField(key, newKey)}
                        disabled={path?.readOnly}
                        className={classNames(
                          "font-medium placeholder:text-neutral-300 flex-1 !font-mono rounded-r-sm w-full text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 border-0 border-neutral-200 hover:border-neutral-300 transition-colors",
                          path?.readOnly &&
                            "bg-gray-100/70 border-neutral-200 cursor-not-allowed text-neutral-500"
                        )}
                        placeholder="Column key"
                      />
                    </div>
                    <button
                      className={classNames(
                        "text-neutral-400 hover:text-red-500 flex-shrink-0 transition-colors",
                        path?.readOnly &&
                          "opacity-50 cursor-not-allowed hover:text-neutral-400"
                      )}
                      onClick={() => removeField(key)}
                      disabled={path?.readOnly}
                      title="Remove field"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                  {valueType === "object" && expanded[key] && (
                    <div className="pl-2 pr-1 pb-1 border-l border-neutral-200 ml-[16px] relative">
                      <SimpleObjectEditor
                        data={value}
                        onChange={(newValue) => updateValue(key, newValue)}
                        path={{ ...path, readOnly: path?.readOnly }}
                        nestingLevel={nestingLevel + 1}
                        parentPath={`${parentPath}.${key}`}
                        enableFunctions={enableFunctions}
                      />
                    </div>
                  )}
                </div>
              </DraggableField>
            );
          })}
      </AnimatePresence>
      {isEmpty && !path?.readOnly && (
        <div className="text-center text-neutral-400 text-xs py-4 pb-2 px-2">
          This object is empty. Add a field to get started.
        </div>
      )}
      {isEmpty && path?.readOnly && (
        <div className="text-center text-neutral-400 text-xs py-4 px-2">
          This object is empty.
        </div>
      )}
      {!path?.readOnly && (
        <div className="px-2 pt-1 pb-1">
          <button
            className="w-full rounded-sm flex items-center justify-center gap-1 p-2 mt-1 text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-0 focus:ring-blue-400 text-xs font-light transition-colors duration-100"
            onClick={addField}
          >
            <IconPlus size={15} />
            Add Field
          </button>
        </div>
      )}
    </div>
  );
}

export default function JsonEditor({
  value,
  setValue,
  readOnly,
  valid,
  placeholder,
  showSimpleModeToggle = false,
  enableFunctions = false,
}) {
  const [justCopied, setJustCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);

  const [parsedData, setParsedData] = useState(() => {
    try {
      const initialValue =
        typeof value === "string" ? JSON5.parse(value) || {} : value || {};
      return initialValue;
    } catch (_e) {
      return {};
    }
  });

  useEffect(() => {
    if (!showSimpleModeToggle) {
      setSimpleMode(false);
      return;
    }

    if (typeof window !== "undefined") {
      const storedAdvancedMode = localStorage.getItem(
        "rulebricks-editor-advanced-mode"
      );
      setSimpleMode(storedAdvancedMode !== "true");
    }
  }, [showSimpleModeToggle]);

  useEffect(() => {
    if (simpleMode) {
      try {
        const parsed = typeof value === "string" ? JSON5.parse(value) : value;
        setParsedData(parsed || {});
      } catch (_e) {
        setParsedData({});
      }
    }
  }, [value, simpleMode]);

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(
        JSON.stringify(JSON5.parse(value), null, 2)
      );
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 3000);
    } catch (_e) {
      // Silently ignore clipboard or JSON parsing errors
    }
  };

  const openExpandedView = () => {
    setModalOpen(true);
  };

  const toggleSimpleMode = () => {
    setSimpleMode((prev) => {
      const newValue = !prev;
      if (showSimpleModeToggle && typeof window !== "undefined") {
        localStorage.setItem(
          "rulebricks-editor-advanced-mode",
          String(!newValue)
        );
      }
      return showSimpleModeToggle ? newValue : false;
    });
  };

  const handleSimpleModeChange = (newData) => {
    try {
      setValue(JSON.stringify(newData, null, 2));
    } catch (e) {
      console.error("Error updating JSON value:", e);
    }
  };

  return (
    <div className="relative w-full h-full z-0">
      <div className="absolute right-1.5 top-1.5 flex z-[1]">
        {showSimpleModeToggle && (
          <button
            onClick={toggleSimpleMode}
            className={classNames(
              "cursor-pointer w-6 h-6 justify-center items-center align-middle mr-1 text-xs",
              simpleMode
                ? "text-blue-500 hover:text-blue-700"
                : "text-neutral-400 hover:text-neutral-800",
              "duration-100"
            )}
            title={simpleMode ? "Switch to code view" : "Switch to simple view"}
          >
            {simpleMode ? (
              <IconBraces className="w-full h-full p-0.5 self-center" />
            ) : (
              <IconLayoutList className="w-full h-full p-0.5 self-center" />
            )}
          </button>
        )}
        <button
          onClick={openExpandedView}
          className={classNames(
            "cursor-pointer w-6 h-6 justify-center items-center align-middle mr-1 text-xs text-neutral-400 hover:text-neutral-800 duration-100"
          )}
          title="Expand view"
        >
          <IconMaximize className="w-full h-full p-0.5 self-center" />
        </button>
        <button
          onClick={copyToClipboard}
          className={classNames(
            "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
          )}
          title="Copy to clipboard"
        >
          {justCopied ? (
            <IconCheck className="w-full h-full p-0.5 self-center" />
          ) : (
            <IconCopy className="w-full h-full p-0.5 self-center" />
          )}
        </button>
      </div>
      <div className="transition-all duration-300 ease-in-out w-full h-full">
        {simpleMode ? (
          <DragProvider>
            <div className="pt-8 -ml-2 h-full overflow-auto animate-fadeIn">
              <SimpleObjectEditor
                data={parsedData}
                onChange={handleSimpleModeChange}
                path={{ readOnly }}
                enableFunctions={enableFunctions}
                parentPath="root"
              />
            </div>
          </DragProvider>
        ) : (
          <Json5Editor
            style={{
              fontSize: "0.75rem",
              fontFamily: "JetBrains Mono",
            }}
            className={classNames(
              "text-xs p-1 font-mono rounded-sm border",
              !valid && "border border-red-500"
            )}
            placeholder={placeholder || "[]"}
            value={
              typeof value === "string" ? value : JSON.stringify(value, null, 2)
            }
            readOnly={readOnly}
            onChange={setValue}
            formatConfig={{
              type: "whole",
            }}
          />
        )}
      </div>
      <EmbeddedModalOverlay
        open={modalOpen}
        close={() => setModalOpen(false)}
        title="Edit JSON/Schema"
      >
        <div className="relative rounded-b-sm p-4 h-auto text-neutral-600 max-h-[80vh] overflow-y-auto">
          <div className="absolute right-5 top-2.5 flex z-[1]">
            {showSimpleModeToggle && (
              <button
                onClick={toggleSimpleMode}
                className={classNames(
                  "cursor-pointer w-6 h-6 justify-center items-center align-middle mr-1 text-xs",
                  simpleMode
                    ? "text-blue-500 hover:text-blue-700"
                    : "text-neutral-400 hover:text-neutral-800",
                  "duration-100"
                )}
                title={
                  simpleMode ? "Switch to code view" : "Switch to simple view"
                }
              >
                {simpleMode ? (
                  <IconBraces className="w-full h-full p-0.5 self-center" />
                ) : (
                  <IconLayoutList className="w-full h-full p-0.5 self-center" />
                )}
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className={classNames(
                "cursor-pointer w-6 h-6 justify-center items-center align-middle text-xs text-neutral-400 hover:text-neutral-800 duration-100"
              )}
              title="Copy to clipboard"
            >
              {justCopied ? (
                <IconCheck className="w-full h-full p-0.5 self-center" />
              ) : (
                <IconCopy className="w-full h-full p-0.5 self-center" />
              )}
            </button>
          </div>
          <div className="transition-all duration-300 ease-in-out w-full pt-6">
            {simpleMode ? (
              <DragProvider>
                <div className="px-2 pb-4 animate-fadeIn">
                  <SimpleObjectEditor
                    data={parsedData}
                    onChange={handleSimpleModeChange}
                    path={{ readOnly }}
                    parentPath="root"
                  />
                </div>
              </DragProvider>
            ) : (
              <Json5Editor
                style={{
                  fontSize: "0.875rem",
                  height: "auto",
                  maxHeight: "100%",
                  fontFamily: "monospace",
                }}
                className="text-sm !max-h-[unset] p-2 font-mono h-full border border-neutral-200 rounded-sm"
                placeholder={placeholder || "[]"}
                value={
                  typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2)
                }
                readOnly={readOnly}
                onChange={setValue}
                showLineNumber
                formatConfig={{
                  type: "whole",
                }}
              />
            )}
          </div>
        </div>
      </EmbeddedModalOverlay>
    </div>
  );
}
