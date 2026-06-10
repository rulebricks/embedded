// Shared auto-scroll helpers for the rule editor table. These centralise the
// logic used by cell-fill drags, row-reorder drags, and post-move row focus so
// working with very large decision tables stays practical.

export function getGridContainer() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".rdg-light");
}

// Returns an auto-scroller that scrolls the container (provided via getter so
// we re-resolve the scroll target each frame in case the grid remounts)
// whenever `update(clientY)` is called with a pointer near the top or bottom
// edge. `stop()` cancels any pending animation frame.
export function createEdgeAutoScroller(
  getContainer,
  { threshold = 60, maxSpeed = 20 } = {}
) {
  let rafId = null;
  let currentClientY = null;

  const tick = () => {
    rafId = null;
    const container =
      typeof getContainer === "function" ? getContainer() : getContainer;
    if (!container || currentClientY == null) return;

    const rect = container.getBoundingClientRect();
    const distanceFromTop = currentClientY - rect.top;
    const distanceFromBottom = rect.bottom - currentClientY;

    let delta = 0;
    if (distanceFromTop < threshold) {
      const ratio = Math.max(0, Math.min(1, 1 - distanceFromTop / threshold));
      delta = -Math.ceil(maxSpeed * ratio);
    } else if (distanceFromBottom < threshold) {
      const ratio = Math.max(
        0,
        Math.min(1, 1 - distanceFromBottom / threshold)
      );
      delta = Math.ceil(maxSpeed * ratio);
    }

    if (delta !== 0) {
      container.scrollTop += delta;
      rafId = requestAnimationFrame(tick);
    }
  };

  const update = (clientY) => {
    currentClientY = clientY;
    if (rafId == null) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    currentClientY = null;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return { update, stop };
}

// Smoothly scrolls the grid container so the given row is nicely visible. If
// the row is already comfortably within the viewport no scroll occurs. Uses
// the same header/row-height constants the rest of the table uses.
export function scrollRowIntoView(
  container,
  rowIdx,
  { rowHeight = 44, headerHeight = 75, padding = 20, behavior = "smooth" } = {}
) {
  const el =
    container ||
    (typeof document !== "undefined"
      ? document.querySelector(".rdg-light")
      : null);
  if (!el || typeof rowIdx !== "number" || rowIdx < 0) return;

  const rowTop = rowIdx * rowHeight;
  const visibleTop = el.scrollTop + headerHeight;
  const visibleBottom = el.scrollTop + el.clientHeight - padding;

  let nextTop = el.scrollTop;
  if (rowTop + rowHeight > visibleBottom) {
    nextTop = rowTop + rowHeight - (el.clientHeight - padding);
  } else if (rowTop < visibleTop) {
    nextTop = rowTop - headerHeight - padding;
  } else {
    return;
  }

  el.scrollTo({ top: Math.max(0, nextTop), behavior });
}
