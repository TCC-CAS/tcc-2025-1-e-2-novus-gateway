---
status: fixing
trigger: "Fix chat layout: messages list must scroll independently, input must always stay visible at the bottom."
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:00:00Z
---

## Current Focus

hypothesis: The chat section uses `flex flex-1 flex-col` but lacks `min-h-0`, causing the flex child to grow beyond the parent height. The ScrollArea with `flex-1` on the messages panel cannot scroll because the parent column has no height constraint. The input is pushed off-screen as a result.
test: Add `min-h-0` to the chat `<section>` and `flex-shrink-0` to the input div. Also add `useRef` + `useEffect` to auto-scroll to latest message.
expecting: Messages area scrolls independently, input stays pinned at the bottom.
next_action: Apply fix to both mensagens.tsx files and commit.

## Symptoms

expected: Messages area scrolls when content overflows; input box always visible at the bottom
actual: When many messages accumulate, no scroll on messages, input gets pushed off-screen
errors: No JS errors — pure CSS/layout issue
reproduction: Open conversation with many messages → layout breaks
started: Always present

## Eliminated

## Evidence

- timestamp: 2026-03-26T00:00:00Z
  checked: jogador/mensagens.tsx and time/mensagens.tsx layout classes
  found: section has `flex flex-1 flex-col` but NO `min-h-0`; ScrollArea has `flex-1` but no `min-h-0`; input div has no `flex-shrink-0`; no auto-scroll useEffect present
  implication: Without `min-h-0` on both the section and the ScrollArea, CSS flex allows the children to overflow the container instead of scrolling. The input gets pushed off-screen because nothing constrains the section height.

## Resolution

root_cause: Missing `min-h-0` on the chat `<section>` (flex child of the outer row) and on the `<ScrollArea>` (flex child of that section). Without `min-h-0`, flex items can grow beyond their parent's bounds — the messages area never triggers scroll and the input is displaced.
fix: Add `min-h-0` to section and ScrollArea; add `flex-shrink-0` to input container; add useRef + useEffect for auto-scroll to bottom on messages change.
verification: []
files_changed:
  - Projeto/apps/web/app/routes/jogador/mensagens.tsx
  - Projeto/apps/web/app/routes/time/mensagens.tsx
