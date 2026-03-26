---
status: diagnosed
trigger: "Investigate hydration mismatch in Projeto/apps/web/app/root.tsx where SSR html lacks class/style but client has class=\"light\" and color-scheme from next-themes ThemeProvider. Return concise findings: root cause, minimal safe fix, and any caveats. Do not edit files."
created: 2026-03-25T23:32:20-03:00
updated: 2026-03-25T23:33:32-03:00
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: Confirmed. Root html mismatch is caused by next-themes mutating document.documentElement class and style.colorScheme on the client while server html from Layout renders without those attrs.
test: Evidence gathered from root.tsx and next-themes dist implementation.
expecting: Apply hydration suppression on html element to acknowledge expected client mutation.
next_action: return concise diagnosis with minimal safe fix and caveats.

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: SSR and client initial markup should match without hydration warnings.
actual: SSR html lacks class/style but client html has class="light" and style containing color-scheme due to theme initialization.
errors: Hydration mismatch warning involving html class/style differences.
reproduction: Load app route rendered from root.tsx with next-themes ThemeProvider enabled.
started: Current behavior during SSR hydration flow.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-25T23:32:20-03:00
  checked: User report
  found: Mismatch specifically on html class/style with next-themes ThemeProvider.
  implication: Likely theme attribute mutation not represented in SSR output.

- timestamp: 2026-03-25T23:33:32-03:00
  checked: Projeto/apps/web/app/root.tsx
  found: Layout renders html as <html lang="pt-BR"> without suppressHydrationWarning or initial theme attrs, while App wraps content in ThemeProvider attribute="class" with enableSystem and defaultTheme="light".
  implication: Server markup has no theme class/style; client can diverge immediately.

- timestamp: 2026-03-25T23:33:32-03:00
  checked: Projeto/apps/web/node_modules/next-themes/dist/index.mjs
  found: ThemeProvider initialization script and runtime set document.documentElement class and style.colorScheme when enableColorScheme is true (default).
  implication: next-themes intentionally mutates html attrs pre/post hydration, which triggers hydration warning unless suppressed at html boundary.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: SSR html emitted by Layout does not include theme-driven class/style, but next-themes mutates html class and color-scheme on the client, creating expected but unsuppressed hydration attribute mismatch at html.
fix: Minimal safe fix is adding suppressHydrationWarning to html in Layout so React ignores known attribute mismatch from next-themes. Keep ThemeProvider at app root with attribute class; no behavioral change required.
verification: Static verification only (code inspection). Runtime verification pending user/browser check of hydration warning disappearance.
files_changed: []
