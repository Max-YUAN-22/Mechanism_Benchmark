# MechanismBench manual-review guide

This website records **human decisions only**. It does not upload them, merge
them, or change any frozen release.

## Reviewer workflow

1. Enter a recognizable **Reviewer ID**.
2. Choose one queue and review units in order (or enable *only unreviewed*).
3. Inspect the evidence table before making any call.
4. Complete every required decision and write a concrete reason. A reason should
   say which evidence you checked, not merely “OK”.
5. Use **Save & Next** only when the decision is complete. Use **Skip** to leave
   a difficult item for later.
6. Export the CSV after a work session or when the queue is complete. Keep the
   filename unchanged if possible.

For assigned work, use **Find ID / target / batch**. For example,
`BRD4-INDEP-B02` jumps to the first row in that operational review batch;
press **Find** again to move to the next matching row.

Progress is stored only in that browser's `localStorage`. Clearing site data or
using another computer creates a separate local store.

## Current queues

| Queue | N | Primary question |
|---|---:|---|
| `gold_primary` | 640 | Does the evidence support the derived v0.2 mechanism label? |
| `launch_critical` | 50 | Accept or reject a Layer-2/3 route prerequisite/row? |
| `layer2_g4` | 22 | Is this forced-Q row a Layer-2-eligible counterfactual? |
| `layer3_nkx21` | 28 | Is mechanism stability across contexts eligible? |
| `coactivator_dependent` | 51 | Does BRD4 degradation DOWN + BRD4 binding support dependence? |
| `coactivator_independent` | 1071 | Is a BRD4-bound no-change gene an independent contrast candidate? |
| `foxo1_axisa` | 403 | Does deposited FOXO1 PRO+ATAC evidence support this context-unit candidate? |
| `foxo1_layer3` | 7 | Is this two-context FOXO1 pair a review-only pilot candidate? |

## Operational review batches

Batches split workload only. They do **not** change evidence, candidate status,
eligibility, or the frozen release.

Machine-readable assignment boundaries:
[review_execution_plan_v0.3.csv](review_execution_plan_v0.3.csv).

| Queue | Batch rule | Batches |
|---|---|---|
| `gold_primary` | 20 rows per batch | `GOLD-B01` … `GOLD-B32` |
| `launch_critical` | 10 rows per batch | `LAUNCH-B01` … `LAUNCH-B05` |
| `layer2_g4` | all rows | `L2-G4-B01` |
| `layer3_nkx21` | all rows | `L3-NKX21-B01` |
| `coactivator_dependent` | all rows | `BRD4-DEP-B01` |
| `coactivator_independent` | 179 rows per batch (final batch: 176) | `BRD4-INDEP-B01` … `BRD4-INDEP-B06` |
| `foxo1_axisa` | 20 rows per batch (final batch: 3) | `FOXO1-A-B01` … `FOXO1-A-B21` |
| `foxo1_layer3` | all rows | `FOXO1-L3-B01` |

### Recommended sequencing

1. **Route gates first:** `LAUNCH-B01`–`B05`, then `L2-G4-B01` and
   `L3-NKX21-B01`.
2. **Third-axis critical side:** all 51 rows in `BRD4-DEP-B01` receive two
   independent primary reviews because this side is thin and determines whether
   a third scored axis can be proposed.
3. **Independent contrast:** review `BRD4-INDEP-B01` before parallelizing.
   B01 is the calibration batch and receives two independent reviews. B02–B06
   require at least one complete primary review each; every non-accept call,
   cross-reviewer conflict, or systematic signal receives a second review.
4. **GOLD audit:** review `GOLD-B01`–`B32` in high-risk-first order when
   available. At minimum, all flagged/high-risk rows and every proposed
   relabel/remove/inconclusive call require a second independent review.
5. **FOXO1 factor pilot:** `FOXO1-A-B01` is the calibration batch; then
   parallelize B02–B21. Every relabel/reject/needs-binding call gets a second
   review. `FOXO1-L3-B01` is diagnostic only because 7 pairs is below the
   Layer-3 numeric gate and cannot create eligibility.

These are review-completion rules, not promotion rules. A completed CSV still
requires validation, conflict resolution, any required second review, and a
versioned v0.3 decision before the benchmark changes.

## BRD4 coactivator review checks

The new coactivator queues use a **gene-level** table, not the original response
rows. Before accepting:

- check `duplicate_status`: discordant multi-row genes should already be absent;
- check `log2fc` / `padj` against the displayed response call;
- check `n_binding_files_supported` and `binding_files_supported`: the primary
  rule requires support in at least 2 of 3 released ENCODE IDR peak sets;
- check `best_binding_tier` and `best_distance_to_TSS`;
- for the independent side, remember that **unbound** no-change genes are not in
  this queue; the question is whether a *bound* no-change gene is a clean contrast;
- reject or mark inconclusive when gene-model identity, low expression, distal
  assignment, or source context makes the unit unsuitable.

These rows are `SILVER_PLUS_BINDING_CANDIDATE`, not GOLD and not eligible.

## FOXO1 DLBCL review checks

FOXO1 rows are `SILVER_MULTI_AXIS_CANDIDATE`, not GOLD and not an official
sixth factor. Before accepting:

- check that the selected PRO transcript has adequate base level and that
  `transcript_status` is not ambiguous;
- check `pro_call`, `pro_log2fc`, and `pro_padj` against the preregistered
  thresholds;
- check the assigned `atac_feature`, `atac_assignment`, and distance to TSS:
  promoter assignment is preferable; distal 50 kb nearest-gene assignments need
  a biological reason;
- check `atac_call`, `atac_log2fc`, and `atac_padj` rather than assuming that a
  nearby peak supports direct regulation;
- remember that no exact-context FOXO1 ChIP/CUT&RUN filter has yet been added;
  `needs_binding_data` is preferable to an unsupported directness claim;
- use `foxo1_layer3` only to audit the seven two-context pairs. It cannot
  promote Layer 3 because the route is below the numeric gate.

## What happens after export

```bash
python3 scripts/validate_review_site_exports.py <exported-csvs>
```

The validator checks exact columns, controlled vocabulary, reviewer/date/reason,
unknown and duplicate IDs, coverage, and cross-reviewer conflicts. It writes a
report under `data/processed/review_site_exports/`.

For a final batch submission, add `--require-complete --require-review-plan`.
This additionally checks that each observed batch has the pre-specified number
of independent reviewers (for example, two for all BRD4 dependent rows and for
the `BRD4-INDEP-B01` calibration batch).

A passing report still does **not** import decisions. A maintainer must resolve
conflicts, obtain any required second review, and propose a versioned v0.3
change. No script silently edits the frozen benchmark.
