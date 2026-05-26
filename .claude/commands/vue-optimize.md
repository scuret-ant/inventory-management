# Vue Optimize

Analyze Vue 3 component structure and produce a prioritized report of performance and code-reuse improvements. **This is a read-only review — do not edit files.**

## Input

- **With argument**: `/vue-optimize <path>` — analyze a single `.vue` file (e.g. `client/src/views/Orders.vue`). This is the common case.
- **No argument**: scan every `.vue` file under `client/src/`. Warn the user this is slower and noisier before starting.

If the path is a directory, scan every `.vue` file under it.

## Required context to load first

Before analyzing anything, read these so findings align with project conventions and don't duplicate work that's already abstracted:

1. `client/CLAUDE.md` — documented Vue 3 patterns and anti-patterns for this project.
2. `client/src/composables/` — list every file. Findings should reference existing composables (`useFilters`, `useI18n`, `useAuth`, `useRestocking`) when recommending extraction rather than inventing new names.
3. `client/src/api.js` — the centralized API client. Components calling `axios` directly should be flagged.

## What to check

For each target file, walk through these categories. Cite findings as `path:line` so the user can navigate directly.

### High severity — correctness and reactivity bugs

- `v-for` with `:key="index"` or no `:key` at all.
- Props mutated directly (assignment to `props.foo` or `props.foo.bar = ...`).
- Destructured props inside `setup()` arguments (loses reactivity — should use `toRefs` or access via `props.x`).
- `.value` accessed inside `<template>` (refs auto-unwrap there — this is always a bug or confusion).
- `new Date(...)` used without an `isNaN(d.getTime())` guard before calling `.getMonth()` / `.getDate()` / etc.
- Options API (`data() {}`, `methods: {}`, `computed: {}`) mixed with Composition API (`setup()`) in the same file.
- `setup()` returning a binding used in the template that is *not* a ref/reactive (will not update).

### Medium severity — performance

- Methods invoked in templates (`{{ getFoo() }}`, `v-if="isFoo()"`) that depend on reactive state — should be `computed`. Computed is cached; methods re-run on every render.
- Inline object/array literals in template attributes (`:style="{ color: x }"`, `:class="[...]"`, `:options="[1,2,3]"`) — new identity every render, defeats memoization. Move to `computed`.
- `v-if` used on a node that toggles frequently (search inputs, modals, tab panels) — `v-show` is usually cheaper.
- Heavy reactive arrays (>500 items expected) declared with `ref` where `shallowRef` would suffice (the component never mutates nested fields).
- Route-level or modal components imported eagerly that could be `defineAsyncComponent(() => import(...))`. Anything used behind a `v-if` or a route boundary is a candidate.
- `watch` on a text input or filter without a debounce — every keystroke fires the side effect.
- Deep watchers (`{ deep: true }`) where a `computed` projection would work.
- Large `v-for` lists rendering static content without `v-memo`.

### Medium severity — code reuse

- The `loading` / `error` / `data` triplet plus a `try { loading=true } catch { error=... } finally { loading=false }` block — if this appears in 3+ views, recommend extracting a `useAsyncData` composable.
- Date / currency / number formatting helpers defined inline in multiple components — should move to `client/src/utils/` (note if that directory doesn't yet exist).
- Direct `axios` imports in a `.vue` file — should go through `client/src/api.js`.
- Repeated template fragments (stat-card grid, table-container + table pattern, page-header block) appearing across views — candidates for `client/src/components/`.
- Hardcoded user-visible strings that bypass `t('...')` — should live in `client/src/locales/{en,ja}.js`.
- Filter state managed locally when `useFilters()` already exposes it as a singleton.
- Hardcoded design-system colors (#0f172a, #64748b, #e2e8f0, status greens/blues/yellows/reds) inline in `<style>` blocks instead of CSS variables.

### Low severity — hygiene

- Component missing `name:` field (hurts DevTools and recursive references).
- Props declared without `type` or `default`/`required`.
- `console.log` / `console.error` left in production paths (the Reports view is a known offender — flag it if scanning it).
- Unused imports.
- Magic numbers in template/script that should be named constants.
- Inline `style="..."` attributes on multiple elements that should move to scoped CSS.

## Output format

Produce a single markdown report. Do not edit any file. Structure:

```
# Vue Optimization Report

Scanned: <files analyzed>

## High severity
- **<file>:<line>** — <one-line finding>. <Why it matters in one sentence.> Fix: <concrete suggestion, ideally referencing an existing pattern in this repo>.

## Medium severity — performance
- ...

## Medium severity — code reuse
- ...

## Low severity
- ...

## Summary
<2–3 sentences: biggest wins, recommended order of attack.>
```

Rules for findings:

- One line per finding. No multi-paragraph explanations — the user is scanning.
- Always cite `file:line`.
- "Fix:" must reference a concrete approach. If a composable / utility / pattern already exists in this repo that solves it, name it. Don't invent generic advice.
- If a section has no findings, write "None." under it — don't omit the section.
- If you're scanning multiple files, group findings by file *within* each severity bucket.
- Cap the report at the top 20 findings per severity. If there are more, say so at the bottom and offer to dig into a specific file.

## What not to do

- Do not edit any file. This skill is read-only.
- Do not flag stylistic preferences not documented in `client/CLAUDE.md`.
- Do not suggest TypeScript migration, `<script setup>` migration, or framework changes — this project deliberately uses `setup()` returning bindings.
- Do not flag things that are correct by this project's conventions (e.g., custom SVG charts, slate/gray color palette, no emojis in UI).
- Do not recurse into `node_modules`, `dist`, or `.playwright-mcp`.
