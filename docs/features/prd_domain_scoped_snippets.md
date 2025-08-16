# PRD — Domain‑Scoped Snippets (MV3)

Technical specification for adding domain/app context scoping to snippets and folders. This document omits marketing, timelines, and goals, and focuses on system behavior, UX, data model, logic, integration points, testing, and references.

## Summary

- Add allow/deny domain scoping to snippets and folders to control where snippets are visible and pasteable.
- Filter candidate snippets by current page domain before showing in the overlay or handling hotkeys.
- Provide clear, minimal UI to manage allowed/blocked domains per snippet and per folder, with inheritance (deny overrides allow).

## Non‑Goals

- No automatic creation of site‑specific templates.
- No per‑window‑title or app‑name scoping in this MVP (browser domain only).
- No cross‑device sync design beyond existing storage strategy.

## User Stories

- As a user, I can restrict a snippet to specific websites so it only appears where it’s relevant.
- As a user, I can block a snippet from certain websites so it never appears there.
- As a user, I can define allowed/blocked domains at a folder level so all contained snippets inherit those rules.
- As a user, when I open the overlay on a page, I only see snippets that are allowed on that domain (or global snippets that aren’t blocked).
- As a user, when I press a hotkey for a snippet that is blocked on the current domain, nothing is pasted and I get a subtle notice explaining why and how to change it.

## UX — Click‑by‑Click Flows

### A) Configure per‑snippet domain scope
1) Open popup and create/edit a snippet in `src/popup/components/SnippetFormModal.tsx`.
2) In the form, a new "Domain Scope" section shows two multi‑value inputs:
   - Allowed domains (optional)
   - Blocked domains (optional)
3) Enter domains as eTLD+1 (e.g., `example.com`) or wildcard subdomains (e.g., `*.google.com`).
4) Save. The snippet is persisted with these fields in storage.

### B) Configure folder‑level domain scope
1) Open a folder in the popup UI (folder management view). 
2) In the folder settings panel, set Allowed/Blocked domains similarly.
3) Save. All snippets inside inherit these constraints unless overridden by snippet‑level settings.

### C) Overlay visibility and usage
1) On any page, trigger the overlay (selection or hotkey) handled via `src/overlay/Overlay.tsx` and messages from `src/background/background.ts`.
2) The background filters snippets by domain scope before sending to the overlay.
3) The overlay lists only the filtered snippets. Optionally, show a small badge for snippets explicitly allowed on this domain.
4) Selecting a snippet pastes normally (existing paste pipeline).

### D) Paste blocked scenario (hotkey)
1) User presses a snippet hotkey on a page where the snippet is blocked.
2) Background detects domain mismatch and cancels paste.
3) A minimal, non‑intrusive notification (existing overlay toast or chrome.notifications) explains: "This snippet is blocked on this site. Edit scope in the snippet settings."

## Data Model

Types are extended in `src/utils/types.ts`:

```ts
// New reusable type
export type DomainScope = {
  allowedDomains?: string[]; // e.g., ["example.com", "*.google.com"]
  blockedDomains?: string[]; // e.g., ["ads.example.com", "*.tracker.com"]
};

// Folder addition
export type Folder = {
  // ...existing fields
  scope?: DomainScope; // optional folder‑level scope
};

// Snippet addition
export type Snippet = {
  // ...existing fields
  scope?: DomainScope; // optional snippet‑level scope
  // (no breaking changes)
};
```

Storage format remains JSON‑serializable and backward compatible. Undefined or empty arrays imply "global".

### Migration

- Implement a no‑op migration in `src/background/migration.ts` that ensures `scope` fields exist (optional) when reading old records.
- No destructive changes. Version bump in storage metadata only.

## Domain Normalization and Matching

- Normalize page hostname to eTLD+1 (effective domain) for matching.
- Support wildcard subdomains: `*.example.com` matches `example.com` and any subdomain.
- Matching order/precedence:
  - If any blocked pattern matches, the entity is blocked.
  - If allowed list is non‑empty, entity is allowed only if any allowed pattern matches.
  - If both lists are empty/undefined, entity is globally allowed.
- Inheritance: snippet is visible only if folder scope allows AND snippet scope allows (deny at either level blocks it).

Pseudocode:

```ts
type Scope = { allowedDomains?: string[]; blockedDomains?: string[] };

const domainMatches = (domain: string, pattern: string): boolean => {
  if (pattern.startsWith("*.")) {
    const core = pattern.slice(2); // example.com
    return domain === core || domain.endsWith(`.${core}`);
  }
  return domain === pattern;
};

const matchesScope = (scope: Scope | undefined, domain: string): boolean => {
  if (!scope) return true;
  const { allowedDomains = [], blockedDomains = [] } = scope;
  if (blockedDomains.some(p => domainMatches(domain, p))) return false;
  if (allowedDomains.length > 0) return allowedDomains.some(p => domainMatches(domain, p));
  return true;
};

const visibleOnDomain = (domain: string, folderScope?: Scope, snippetScope?: Scope) =>
  matchesScope(folderScope, domain) && matchesScope(snippetScope, domain);
```

- Utility: `getEffectiveDomain(urlOrHostname)` living in a small util (if not present) and shared by background/overlay.

## Integration Points

- `src/background/background.ts`
  - On overlay open (e.g., `toggleOverlay` flow):
    - Derive `domain = getEffectiveDomain(currentTabUrlOrHost)`.
    - Pre‑filter all snippets: `visibleOnDomain(domain, folder.scope, snippet.scope)`.
    - Optionally boost rank for explicitly allowed snippets (small score bonus) before existing ranking.
  - On paste/hotkey handler:
    - Re‑check scope. If blocked, abort paste and emit subtle notification.
  - Logging & diagnostics: add per‑event logs like `[Clippy] Scope filter: {total, visible, domain}`.

- `src/overlay/Overlay.tsx`
  - Receives already‑filtered snippets from background.
  - Optional: display a domain chip/badge, and a tiny hint if results are filtered (e.g., "Filtered for example.com").

- `src/popup/components/SnippetFormModal.tsx`
  - Add a Domain Scope section with two tag‑like inputs (allowed / blocked).
  - Validate patterns; normalize on save (lowercase, trim, reject invalid values).
  - Small helper text explaining wildcard support.

- Folder settings (popup)
  - Mirror the same section at folder level.

## Permissions & Security

- No new permissions required.
- All user‑entered domain patterns stored in `chrome.storage.local`.
- No keys or PII exposed to page scope.
- CSP unchanged.

## Performance

- Filter step: O(N) on snippet count; wildcard checks are constant‑time string ops.
- No increase in content script size (logic in background/UI only).
- Domain normalization cached per tab invocation when feasible.

## Internationalization

- Externalize new UI strings via `chrome.i18n` and `_locales/`.
- Test basic string expansion and RTL layout.

## Accessibility

- Ensure inputs have labels and descriptions.
- Keyboard operability for tag input (add/remove with Enter/Backspace).
- Overlay badges have ARIA labels.

## Testing Strategy

- Unit tests (Vitest):
  - `getEffectiveDomain()` edge cases (localhost, multi‑part TLDs).
  - `domainMatches()` and `matchesScope()` including wildcards and precedence.
  - `visibleOnDomain()` inheritance combinations.
- Integration (Playwright):
  - Overlay shows only allowed snippets on a domain.
  - Snippet blocked on current domain does not paste; notification appears.
  - Folder‑level scopes affect contained snippets; snippet‑level overrides.

## Diagnostics & Telemetry (local)

- Background logs for filtering counts and domain.
- Optional local counters: per‑domain usage of snippets to inform ranking (future).

## Edge Cases

- Empty allowed & blocked lists → global visibility.
- Conflicting configs: any block wins (deny overrides allow).
- Wildcards should not accept `*.` alone; require at least `*.tld`.
- IDNs/punycode: store and compare in lowercased ASCII form; future enhancement to support/display unicode labels.
- File URLs and chrome:// pages: treat as no effective domain; snippets with global scope only.

## Acceptance Criteria

- Users can add/remove allowed and blocked domains for snippets and folders in the popup.
- Overlay and hotkeys only surface snippets permitted for the current domain.
- Blocked snippets never paste on blocked domains and give a clear notice.
- No new permissions; storage remains local; performance remains responsive.
- Unit and E2E tests cover matching, inheritance, and blocked‑paste behavior.

## Open Questions

- Should folder‑level allowed lists implicitly apply to snippets with their own allowed lists (intersection vs. union)? Proposed: intersection via AND semantics (implemented above).
- Should explicitly allowed snippets receive ranking priority? Proposed: small bonus so scoped snippets appear before global ones.
- Should we expose a quick “Allow this site” action in the blocked toast? (Nice‑to‑have.)

## Research References

- Text Blaze — Connected Snippets (folder‑level domain allowlists):
  - https://blaze.today/connected/
- Espanso — App‑specific configurations (concept for context scoping):
  - https://espanso.org/docs/configuration/app-specific-configurations/
  - https://espanso.org/docs/matches/basics/
- PhraseExpress — Program restriction (per‑phrase/folder include/exclude by app/window):
  - https://www.phraseexpress.com/doc/edit/program-restriction/
