# Changelog

## 1.2.0

Reconciliation with the main Rulebricks rule editor (changes through June 2026).

### Added

- Row keyboard shortcuts: Cmd/Ctrl+Enter inserts a row below the focused cell, Cmd/Ctrl+Backspace/Delete deletes the selected (or focused) rows.
- "Move selected rows to position…" toolbar button with a numeric popover, alongside the existing move-to-top/bottom buttons. Focus and scroll now follow moved rows.
- Edge auto-scroll while dragging the cell fill handle or drag-reordering rows on tables taller than the viewport.
- "Current Date" button in date cells; the date picker now renders in a portal so it is no longer clipped inside cell popovers.
- Optional publish version notes: set `publishVersionNotes` to show a note popover when publishing. Notes are stored on the published version's history entry.
- Publish errors are now surfaced through the `onError` callback (previously only logged to the console).

### Fixed

- Operator/value dropdowns in cell editors no longer remount and lose state while the grid rerenders.
- Pinned (frozen) column layout overhaul: section header widths and frozen column offsets are now measured centrally, with opaque cell backgrounds while horizontally scrolling.
- Pasting from Excel/Sheets: blank cells now clear the target cells instead of collapsing the column upward, boolean columns map values to "is true"/"is false" operators, and interior blank rows are preserved. Also fixed a bug where external paste could fail silently.
- JSON object editor keeps focus while renaming fields, no longer reshuffles integer-like keys while typing, and no longer replays row animations on every change.
- Vocabulary (global value) chips now render in display cells, use the platform's current styling, and show only the last segment of namespaced value names.
- String cells no longer display "null" for empty values; setting default values on missing nested paths no longer throws.
- Publishing now updates the local rule state, so the publish button correctly disables until new changes are made.
- Row counts (`no_conditions`) are kept accurate across row add/duplicate/delete/move operations.

### Removed

- Dead code: unused sidebar JSON editor, broken `updateSectionSchema` action, unused `embedMode` prop.
