# Project Clippy UI Redesign: Folder Tabs

## Overall Goal: Redesign folder display to be a horizontal tab-like bar at the top with small icons and titles.

## Task 1: Restructure `App.tsx` Layout (COMPLETE)
- [x] **Subtask 1.1:** Remove the existing two-column layout structure in `App.tsx`. The `FolderPane` and the main content area will no longer be side-by-side.
- [x] **Subtask 1.2:** Position the new `FolderTabs` component (to be created) at the top of the `App.tsx` content area.
- [x] **Subtask 1.3:** Ensure the `SnippetList` (or equivalent) displays below the `FolderTabs`.

## Task 2: Create `FolderTabs` Component (COMPLETE)
- [x] **Subtask 2.1:** Create a new component file: `src/popup/components/FolderTabs.tsx`.
- [x] **Subtask 2.2:** Implement the basic structure of `FolderTabs` to receive `folders`, `activeFilterFolderId`, and `setActiveFilterFolderId` as props.
- [x] **Subtask 2.3:** Add an "All Snippets" tab with appropriate styling and click handler.
- [x] **Subtask 2.4:** Iterate over the `folders` prop to render individual folder tabs, each with a small icon and a very small title. Implement click handlers to set the active folder.
- [x] **Subtask 2.5:** Implement styling for the horizontal layout of tabs.
- [x] **Subtask 2.6:** Implement styling for active tab indication.

## Task 3: Style Folder Icons and Titles in `FolderTabs.tsx` (COMPLETE)
- [x] **Subtask 3.1:** Select or create a small, generic folder icon (SVG or from a library).
- [x] **Subtask 3.2:** Style folder icons to be very small.
- [x] **Subtask 3.3:** Style folder titles to be very small (approx. 1/4 of icon height) and position them appropriately relative to the icons.

## Task 4: Adapt Tooltips for Folders (COMPLETE)
- [x] **Subtask 4.1:** Review `src/components/ui/animated-tooltip.tsx`.
- [x] **Subtask 4.2:** Modify `AnimatedTooltip` or create a variant to be "really small" (adjusting font sizes, padding, dimensions).
- [x] **Subtask 4.3:** Ensure the tooltip animation is also scaled down or simplified.
- [x] **Subtask 4.4:** Integrate these small tooltips with the folder icons in `FolderTabs.tsx` to show the full folder name on hover.

## Task 5: Update Filtering Logic and UI in `App.tsx` (COMPLETE)
- [x] **Subtask 5.1:** Verify the `filteredSnippets` logic (from MEMORY[25319ff4-e085-4fdd-91f8-4f98a38b8e13]) correctly uses `activeFilterFolderId` set by `FolderTabs`.
- [x] **Subtask 5.2:** Adjust the `h3` title above the snippet list to accurately reflect the selected folder tab (e.g., "All Snippets" or the active folder's name).

## Task 6: Refactor/Remove Old `FolderPane.tsx` (COMPLETE)
- [x] **Subtask 6.1:** Remove or comment out the import and usage of the old `FolderPane.tsx` component in `App.tsx`.
- [x] **Subtask 6.2 (Optional Cleanup):** Consider deleting the `FolderPane.tsx` file if it's no longer needed.

## Task 7: Testing and Refinement
- [ ] **Subtask 7.1:** Test "All Snippets" tab functionality.
- [ ] **Subtask 7.2:** Test individual folder tab filtering.
- [ ] **Subtask 7.3:** Verify visual appearance of icons, titles, and tooltips.
- [ ] **Subtask 7.4:** Check for console errors or warnings.
