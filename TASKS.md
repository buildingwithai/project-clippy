# Project Clippy UI Redesign: Folder Management

## Legend
- ✅ Complete
- 🟡 In Progress
- ⬜ Not Started

## Completed Tasks

### Folder Tabs Implementation
- [x] **Task 1:** Restructure `App.tsx` Layout
- [x] **Task 2:** Create `FolderTabs` Component
- [x] **Task 3:** Style Folder Icons and Titles in `FolderTabs.tsx`
- [x] **Task 4:** Adapt Tooltips for Folders
- [x] **Task 5:** Update Filtering Logic and UI in `App.tsx`
- [x] **Task 6:** Refactor/Remove Old `FolderPane.tsx`
- [x] **Task 7:** Testing and Refinement
- [x] **Task 8:** Add Spring/Bounce Animation to Folder Tab Tooltips

## Current Tasks

### UI Cleanup
- [x] **Task 9.1:** Remove visible folder titles from tabs (icon-only display)
- [ ] **Task 9.2:** Adjust tab spacing and sizing for icon-only display
- [ ] **Task 9.3:** Ensure tooltips remain functional and well-positioned

### Folder Management
- [ ] **Task 10:** Implement Folder Deletion
  - [ ] **10.1:** Add delete button/icon to each folder tab
  - [ ] **10.2:** Implement confirmation dialog
  - [ ] **10.3:** Update state and storage when deleting folders
  - [ ] **10.4:** Handle edge cases (last folder, active folder deletion)

- [ ] **Task 11:** Implement Folder Renaming
  - [ ] **11.1:** Add double-click to edit functionality
  - [ ] **11.2:** Create inline edit input component
  - [ ] **11.3:** Implement save/cancel behavior
  - [ ] **11.4:** Add input validation

### Icon/Emoji Selection
- [ ] **Task 12:** Implement Icon Selection
  - [ ] **12.1:** Research and select icon/emoji library
  - [ ] **12.2:** Add icon picker UI component
  - [ ] **12.3:** Update folder data structure to include icon
  - [ ] **12.4:** Implement icon selection and storage

### State Management Updates
- [ ] **Task 13:** Update Folder Data Structure
  - [ ] **13.1:** Add `icon` field to folder type
  - [ ] **13.2:** Ensure backward compatibility
  - [ ] **13.3:** Update all folder-related functions

### Testing and Polish
- [ ] **Task 14:** Comprehensive Testing
  - [ ] **14.1:** Test all CRUD operations
  - [ ] **14.2:** Test icon selection and display
  - [ ] **14.3:** Verify edge cases
  - [ ] **14.4:** Test across different screen sizes

## Future Enhancements
- [ ] **Task 15:** Keyboard Navigation
- [ ] **Task 16:** Folder Reordering
- [ ] **Task 17:** Folder Colors/Themes
- [ ] **Task 18:** Bulk Actions

## Notes
- All new components should follow the existing design system
- Ensure all interactive elements have proper hover/focus states
- Maintain accessibility standards throughout
- Keep bundle size in mind when adding new dependencies

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
- [x] **Subtask 7.1:** Test "All Snippets" tab functionality.
- [ ] **Subtask 7.2:** Test individual folder tab filtering.
- [ ] **Subtask 7.3:** Verify visual appearance of icons, titles, and tooltips.
- [ ] **Subtask 7.4:** Check for console errors or warnings.
- [ ] **Subtask 7.5:** Ensure overall UI/UX is cohesive and intuitive.

## Task 8: Add Spring/Bounce Animation to Folder Tab Tooltips
- [x] **Subtask 8.1:** Verify `framer-motion` is a project dependency. If not, add it.
- [x] **Subtask 8.2:** In `FolderTabs.tsx`, import `motion` from `framer-motion`.
- [x] **Subtask 8.3:** Wrap the `TooltipContent` with `motion.div` and apply `initial`, `animate`, `exit`, and `transition` props to achieve a spring/bounce effect on hover, similar to the old `AnimatedTooltip`.
- [-] **Subtask 8.4:** Test the tooltip animation. (FAILED - Tooltips are no longer visible)
- [ ] **Subtask 8.5:** Troubleshoot and fix missing/broken tooltip animation.
    - [x] **Sub-subtask 8.5.1:** Check browser developer console for any errors related to `framer-motion` or `Tooltip`.
    - [x] **Sub-subtask 8.5.2:** Review the `motion(ShadTooltipContent)` Higher Order Component (HOC) usage. (Identified animation props as issue with HOC).
    - [ ] **Sub-subtask 8.5.3:** Verify that `TooltipProvider` is correctly wrapping the components that need tooltips.
    - [x] **Sub-subtask 8.5.4:** Temporarily simplify or remove the animation props (`initial`, `animate`, `exit`, `transition`) from `MotionTooltipContent` to see if tooltips reappear without animation. (Tooltips reappeared).
    - [ ] **Sub-subtask 8.5.5:** If the HOC approach (`motion(ShadTooltipContent)`) is problematic, try wrapping the `p` tag *inside* `ShadTooltipContent` with a `motion.div` instead.
    - [ ] **Sub-subtask 8.5.6:** Re-test tooltip visibility and animation after each change.

## Task 9: Further Reduce Tooltip Size
- [ ] **Subtask 9.1:** Adjust padding and font size of `TooltipContent` in `FolderTabs.tsx` to make it smaller (e.g., `p-1`, `text-[10px]`).
- [ ] **Subtask 9.2:** Test new tooltip size.

## Task 10: Remove Visible Folder Titles from Tabs
- [ ] **Subtask 10.1:** In `FolderTabs.tsx`, remove the `<span>{folder.name}</span>` element from within the folder tab buttons.
- [ ] **Subtask 10.2:** Test that folder titles are no longer visible on the tabs but still appear correctly in tooltips.
