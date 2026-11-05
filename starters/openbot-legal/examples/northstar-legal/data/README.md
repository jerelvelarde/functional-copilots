# Northstar Legal data

Byte-identical copies of the Open Harvey web app's data, copied once on 2026-11-05 at 01:35 PST so
Northstar Legal reviews the same contracts against the same playbook as the web app. Edit the source,
not these copies, then copy again.

| File | Copied from (`starters/open-harvey/`) |
| --- | --- |
| `company.json` | `src/data/company.json` |
| `playbook.md` | `src/data/playbook.md` |
| `review-history.jsonl` | `src/data/review-history.jsonl` |
| `contracts/acme-msa.md` | `src/data/contracts/acme-msa.md` |
| `contracts/acme-msa.terms.json` | `src/data/contracts/acme-msa.terms.json` |
| `contracts/brightwater-order-form.md` | `src/data/contracts/brightwater-order-form.md` |
| `contracts/brightwater-order-form.terms.json` | `src/data/contracts/brightwater-order-form.terms.json` |

The web app's `src/data/collection/` (signed documents) is not copied: Northstar Legal does not serve it.

`biome.json` turns OpenBot's formatter off for this folder (as the HR package does), so its
`format:check` leaves the copies byte-identical.

Two files are Northstar Legal's own, not copies:

- `acme-security-evidence.json`: Acme Cloud's SOC 2 Type II report and pen-test summary, as metadata
  (fictional auditor and firm), received Friday 2026-11-06 at 08:50. It passes PB-SEC-01.
- `friday-state.json`: the state the clip starts in, after slides 13 and 14. Acme was submitted on
  Thursday; Rachel Adler approved; Jordan Blake sent it back for the SOC 2 Type II report and pen-test
  summary; Elena Ortiz is queued; PB-SEC-01 v1 was published by Rachel Adler.
