# Debugging Log - Project Clippy

This file documents major debugging sessions and their resolutions for future reference.

## Issue #1: Hotkey Clipboard Fallback Inconsistency (August 2025)

### Problem Description
- **Issue**: Some hotkeys (hotkey-1, hotkey-2) were redirecting to URLs instead of pasting content
- **Symptoms**: 
  - Hotkey-3 worked correctly (copied to clipboard when paste failed)
  - Hotkey-1 and hotkey-2 failed silently, no clipboard fallback
  - User experienced data loss from unwanted page redirects

### Investigation Process

#### Console Log Analysis
```
Hotkey-3 (Working):
- Legacy paste success evaluation: false
- Final paste success status: false  
- → Clipboard fallback triggered ✅

Hotkey-1/2 (Broken):
- Legacy paste success evaluation: true
- Final paste success status: true
- → No clipboard fallback triggered ❌
```

#### Root Cause Identified
**HTML Content Causing False Success Detection**

1. **Data Structure Differences**:
   - Hotkey-3: Plain text only (`text: "https://linkedin.com/..."`)
   - Hotkey-1/2: Had HTML content (`html: "<p>https://example.com/</p>"`)

2. **Legacy Paste Function Behavior**:
   - `tryExecCommand()` method uses `document.execCommand('insertHTML')`
   - Successfully inserts HTML tags into DOM, returns `true`
   - HTML insertion "succeeds" but content not visible in target input field
   - False success prevents clipboard fallback

#### Theories Investigated
1. ✅ **False positive in paste success detection** - PRIMARY CAUSE
2. ✅ **HTML vs plain text handling differences** - CONFIRMED
3. ❌ **DOM insertion vs actual visibility** - Related to #1
4. ❌ **Input field compatibility issues** - Secondary symptom
5. ❌ **Content script timing race conditions** - Not the cause
6. ❌ **Browser paste API inconsistencies** - Not the cause
7. ❌ **Element focus state differences** - Not the cause
8. ❌ **Cross-frame injection issues** - Not the cause
9. ❌ **Content Security Policy interference** - Not the cause
10. ❌ **Chrome extension script injection limitations** - Not the cause

### Solution Implemented

#### File Modified
`/src/background/background.ts`

#### Changes Made
1. **Added `isHotkey` parameter** to `handlePasteRequest()` function:
   ```typescript
   async function handlePasteRequest(snippet: Snippet, isHotkey = false)
   ```

2. **HTML stripping logic** for hotkey calls:
   ```typescript
   // For hotkey pasting, strip HTML to prevent false success in legacy paste function
   if (isHotkey) {
     htmlToUse = '';
     console.log('[Clippy] Hotkey paste: HTML stripped, using plain text only');
   }
   ```

3. **Updated hotkey handler** to pass `isHotkey = true`:
   ```typescript
   handlePasteRequest(snippet, true); // isHotkey = true to strip HTML
   ```

4. **Additional stripping after variable resolution**:
   ```typescript
   // Strip HTML again after variable resolution for hotkey calls
   if (isHotkey) {
     htmlToUse = '';
     console.log('[Clippy] Hotkey paste: HTML stripped again after variable resolution');
   }
   ```

### Result
- **All hotkeys now use plain text only**
- **Consistent clipboard fallback behavior**
- **No more unwanted URL redirects**
- **Context menu retains HTML functionality**

### Trade-offs
**Pros:**
- Reliable hotkey functionality
- Consistent user experience
- No data loss from redirects
- Maintains rich text for context menu

**Cons:**
- Hotkeys lose rich text formatting (bold, bullets, headings)
- HTML content becomes plain text for hotkey operations

### Testing Confirmation
Console logs after fix:
```
[Clippy] Hotkey paste: HTML stripped, using plain text only
[Clippy] Legacy paste success evaluation: false
[Clippy] Final paste success status: false
[Clippy] Successfully copied to clipboard as fallback
```

### Future Considerations
- Consider implementing better HTML-to-text conversion for hotkeys
- Investigate more sophisticated paste success detection
- Explore hybrid approach that preserves some formatting while ensuring reliability

---

## Template for Future Issues

### Problem Description
[Describe the issue, symptoms, and impact]

### Investigation Process
[Document debugging steps, console outputs, theories tested]

### Root Cause Identified
[Explain the underlying technical cause]

### Solution Implemented
[Detail code changes, files modified, approach taken]

### Result
[Outcome, testing results, confirmation]

### Trade-offs
[Pros and cons of the solution]

### Future Considerations
[Ideas for improvement or alternative approaches]