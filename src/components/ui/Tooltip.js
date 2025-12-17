import { cloneElement } from "react";

export default function Tooltip({ children, hint }) {
  if (!hint) {
    return children;
  }
  return <div title={hint}>{cloneElement(children)}</div>;
}
