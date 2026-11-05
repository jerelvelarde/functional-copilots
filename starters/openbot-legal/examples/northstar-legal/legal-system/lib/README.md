# The legal logic, copied from the web app

These modules and their tests are copies of `starters/open-harvey/src/lib/`, made on 2026-11-05 at
01:35 PST. The only change is the import path of the data files: `@/data/...` became `../../data/...`
in `matters.ts` and `company.ts`. `testing.ts` is adapted: it reads from `northstar-legal/data/` and
leaves out the signed-document collection and the tool library, which are not copied.

| Module | Copied tests |
| --- | --- |
| `contract.ts` | `contract.test.ts` |
| `playbook.ts` | (covered by `contract.test.ts`) |
| `review.ts` | `review.test.ts` |
| `plan.ts` | `plan.test.ts` |
| `blackline.ts` | `blackline.test.ts` |
| `learning.ts` | `learning.test.ts` |
| `matters.ts`, `company.ts` | (covered by the tests above) |

Removed test cases: none. Every case in the five copied test files runs unchanged under `bun test`
(their `vitest` imports resolve to Bun's runner). The worked example (7 deviations, 3 high, 5 passes,
$720,000, route Rachel Adler → Jordan Blake → Elena Ortiz) is asserted in `review.test.ts`.
