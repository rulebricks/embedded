/**
 * Toggle component for embed package
 */
import { useState, useCallback } from "react";
import classNames from "classnames";

export default function Toggle({
  enabled = false,
  onChange,
  disabled = false,
  label,
  size = "md",
}) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    onChange?.(newValue);
  }, [isEnabled, disabled, onChange]);

  const sizeClasses = {
    sm: "w-8 h-4",
    md: "w-11 h-6",
    lg: "w-14 h-7",
  };

  const dotSizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const translateClasses = {
    sm: isEnabled ? "translate-x-4" : "translate-x-0.5",
    md: isEnabled ? "translate-x-5" : "translate-x-0.5",
    lg: isEnabled ? "translate-x-7" : "translate-x-0.5",
  };

  return (
    <button
      type="button"
      className={classNames(
        "relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        sizeClasses[size],
        isEnabled ? "bg-blue-600" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={handleToggle}
      disabled={disabled}
      aria-pressed={isEnabled}
    >
      <span
        className={classNames(
          "inline-block rounded-full bg-white shadow transform transition-transform",
          dotSizeClasses[size],
          translateClasses[size]
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

