import { IconCalendarEvent } from "@tabler/icons-react";
import json5 from "json5";
import moment from "moment-timezone";

function handleRulebricksObject(value, globalValues) {
  if (!globalValues) {
    return false;
  }
  if (
    Array.isArray(value) &&
    value.every((item) => item?.$rb === "globalValue")
  ) {
    return (
      <div className="font-mono">
        <span className="text-orange-500 font-semibold rounded-sm w-full">
          {value.slice(0, 3).map((item, index) => (
            <>
              <span
                key={index}
                title={JSON.stringify(
                  globalValues.find((v) => v.id === item.id)?.value,
                  null,
                  2
                )}
                className="bg-orange-50/50 border shadow-sm border-orange-800 border-opacity-10 h-8 p-1.5 rounded-sm"
              >
                {item.name}
              </span>
              {index < value.length - 1 && " "}
            </>
          ))}
          {value.length > 3 && `... + ${value.length - 3} more`}
        </span>
      </div>
    );
  }
  if (typeof value === "object" && value?.$rb === "globalValue") {
    return (
      <div
        className="font-mono self-center h-full"
        title={JSON.stringify(
          globalValues.find((v) => v.id === value.id)?.value,
          null,
          2
        )}
      >
        <span className="text-orange-500 font-semibold shadow-sm bg-orange-50/50 border border-orange-800 border-opacity-10 h-8 p-1.5 flex place-items-center rounded-sm w-fit">
          {value.name}
        </span>
      </div>
    );
  }
  return false;
}

function StringFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (typeof children === "object") {
    return <div className="font-mono pb-0.5" />;
  }
  const isTruncated = children.length > 35;
  return (
    <div className="font-mono pb-0.5">
      <span
        className="text-lime-600 font-semibold w-full"
        title={isTruncated ? children : undefined}
      >
        "{isTruncated ? `${children.slice(0, 35)}...` : `${children}"`}
      </span>
    </div>
  );
}

function NumberFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (typeof children === "object") {
    return <div className="font-mono pb-0.5" />;
  }
  return (
    <div className="font-mono pb-0.5">
      <span className="text-rose-800 font-semibold">{children}</span>
    </div>
  );
}

function BooleanFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (typeof children === "object") {
    return <div className="font-mono pb-0.5" />;
  }
  return (
    <div className="font-mono pb-0.5">
      <span className="text-sky-600 font-semibold">{`${children}`}</span>
    </div>
  );
}

function ListFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (children.length === 0 && Array.isArray(children))
    return <div className="text-editorDisabledGray font-mono">[]</div>;
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (typeof children === "object" && !Array.isArray(children)) {
    return <div className="font-mono pb-0.5" />;
  }
  if (children.length === 0 || !Array.isArray(children))
    return <div className="text-editorDisabledGray font-mono">[]</div>;
  return (
    <div className="font-mono flex flex-row">
      <span className="text-sky-600 font-semibold">[</span>
      {children.slice(0, 3).map((child, index) => (
        <div key={index} className={`flex flex-row ${index > 0 && "pl-3"}`}>
          {Array.isArray(child) && (
            <TypeFormatter type="list" children={child} />
          )}
          {typeof child === "object" && (
            <TypeFormatter type="generic" children={child} />
          )}
          {!Array.isArray(child) && typeof child !== "object" && (
            <TypeFormatter type={typeof child} children={child} />
          )}
          {index < children.length - 1 && (
            <span className="text-sky-600 font-semibold">,</span>
          )}
        </div>
      ))}
      {children.length > 3 && (
        <div className="flex flex-row pl-3">
          <span className="text-sky-600 font-semibold">...</span>
        </div>
      )}
      <span className="text-sky-600 font-semibold">]</span>
    </div>
  );
}

function ObjectFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (Object.keys(children).length === 0 || typeof children !== "object")
    return <div className="text-editorDisabledGray font-mono">{"{}"}</div>;
  return (
    <div className="font-mono pb-0.5 inline-flex">
      <span className="text-neutral-400 mr-1 font-semibold">{"{"}</span>
      {Object.keys(children)
        .slice(0, 3)
        .map((key, index) => (
          <div key={index} className={`flex flex-row ${index > 0 && "pl-3"}`}>
            <span className="text-sky-600 font-semibold">{key}</span>
            {index < Object.keys(children).length - 1 && (
              <span className="text-sky-600 font-semibold">,</span>
            )}
          </div>
        ))}
      {Object.keys(children).length > 3 && (
        <div className="flex flex-row pl-3">
          <span className="text-sky-600 font-semibold">...</span>
        </div>
      )}
      <span className="text-neutral-400 ml-1 font-semibold">{"}"}</span>
    </div>
  );
}

function DateFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  if (typeof children === "object") {
    return <div className="font-mono pb-0.5" />;
  }
  return (
    <div className="font-mono pb-0.5">
      <IconCalendarEvent
        className="inline-block mr-1 opacity-30 mb-0.5"
        size={16}
      />
      <span className="text-lime-600 font-semibold">
        "{moment(children).tz("UTC").toString()}"
      </span>
    </div>
  );
}

function GenericFormatter({ children, globalValues }) {
  const rulebricksObjectFormat = handleRulebricksObject(children, globalValues);
  if (rulebricksObjectFormat) {
    return rulebricksObjectFormat;
  }
  return (
    <div className="font-mono pb-0.5">
      {typeof children === "string" ? (
        <span className="text-lime-600 font-semibold">"{children}"</span>
      ) : (
        <span className="text-rose-800 font-semibold">
          {json5.stringify(children)}
        </span>
      )}
    </div>
  );
}

function FunctionFormatter({ children }) {
  if (typeof children === "string" && children) {
    return <span className="font-mono">{children}</span>;
  }
  return <div className="text-editorDisabledGray font-mono">null</div>;
}

const Formatters = {
  string: StringFormatter,
  number: NumberFormatter,
  boolean: BooleanFormatter,
  list: ListFormatter,
  date: DateFormatter,
  generic: GenericFormatter,
  function: FunctionFormatter,
  object: ObjectFormatter,
};

export default function TypeFormatter({ type, children }) {
  // In embed mode, global values come from parent component
  const globalValues = [];

  if (children === null) {
    return <div className="text-editorDisabledGray font-mono">null</div>;
  }

  const Formatter = Formatters[type];
  return (
    <Formatter globalValues={globalValues}>
      {children}
    </Formatter>
  );
}
