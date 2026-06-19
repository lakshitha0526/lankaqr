# lankaqr — working rules

## Reading order
- SPEC.md is the source of truth. Read the relevant sections before writing code.
- Existing source in src/ defines the patterns. Match style, type shapes, and naming exactly.
- The lk-id library is the sibling pattern reference for code style, test naming, and result-type discriminated unions.

## Code style
- TypeScript strict. No `any`. No `as` casts unless documented inline with why.
- Named exports only. No default exports anywhere.
- Result types are discriminated unions: `{ ok: true; ... } | { ok: false; reason: string }`.
- Failure reasons are short lowercase English strings. Examples: "invalid crc", "merchant name too long", "reference label required".
- Functions are pure where possible. No hidden state.
- No new runtime dependencies. devDependencies require an explicit reason.
- Bundle size budget: 8 KB ESM total for the published artefact.

## Tests
- vitest, 100 percent coverage on src/.
- Test names describe intent, not implementation. Example: "rejects payload when reference label is missing", not "test_isValid_false_case_3".
- Fixtures live in tests/fixtures/vectors.ts. Reuse them across files where it makes sense.

## Done means
- biome lint clean.
- tsc --noEmit clean.
- vitest run with 100% coverage on src/.
- tsup build green, ESM bundle under 8 KB.
- README and CHANGELOG updated where the step touches the public surface.

## Reporting back
At the end of every step, output:
1. Files created or modified.
2. Test count and coverage delta.
3. Bundle size delta.
4. Any deviation from the prompt with a one-sentence justification.
5. Any spec ambiguity discovered that needs a decision before the next step.
