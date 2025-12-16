import { PencilIcon } from "@heroicons/react/24/solid"
import classNames from "classnames"
import { useMemo, useState } from "react"

export default function CellWrapper({ selected, children, className }) {
  const [referenceElement, setReferenceElement] = useState()
  const [editing, setEditing] = useState(false)

  // when cell is deselected, cancel edit
  useMemo(() => {
    if (!selected) {
      setEditing(false)
    }
  }, [selected])

  function forceSelect() {
    // HACK; click the current cell in order to select it
    if (referenceElement) {
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: false
      })
      referenceElement.dispatchEvent(clickEvent)
    }
  }

  return (
    <div
      className={classNames(
        "group flex items-center shadow-none hover:shadow-md duration-100 px-3 h-full",
        className
      )}
      ref={setReferenceElement}
      onDoubleClick={() => {
        setEditing(true)
      }}
    >
      <div className="flex-1">
        {children({
          referenceElement,
          editing,
          setEditing,
          showPopover: selected && editing
        })}
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 ml-2"
        onClick={() => {
          setEditing(true)
          forceSelect()
        }}
      >
        <PencilIcon className="w-5 h-4 text-gray-400 hover:text-gray-800 duration-100" />
      </button>
    </div>
  )
}
