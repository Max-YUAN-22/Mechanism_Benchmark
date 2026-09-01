# MechanismBench — Manual Review Site

A self-contained static website for group members to help audit the benchmark's
human-review queues. **No install, no server, no upload** — open the file, review,
export a CSV, send it back.

## For reviewers (how to use)

1. Open **`index.html`** in any browser (double-click, or drag it into a tab).
2. Type your **Reviewer ID** (your name) at the top right.
3. Pick a queue. You'll see one unit at a time: its evidence on top, your decision
   controls below.
4. Make the call, add a short reason, click **Save & Next**. Your progress is saved
   in *this browser* automatically — you can close the tab and resume later.
5. When done (or partway), click **Export CSV**. Send that file back to the maintainer.

Tips: use **only unreviewed** to hide finished units; **Jump to #** to go to a
specific position; **Skip** to pass without saving.

## Queues

| Queue | N | What you're deciding |
|-------|---|----------------------|
| Layer-1 GOLD primary audit | 640 | Does the evidence support the derived mechanism label? |
| Launch-critical 50 | 50 | Accept/reject each Layer-2/3 gating row |
| Layer 2 — G4 candidates | 22 | Is this a Layer-2-eligible counterfactual? |
| Layer 3 — NKX2-1 candidates | 28 | Is the mechanism stable across contexts? |
| **NEW: coactivator-dependent** | 120 | Is this target BRD4-dependent? (candidate 3rd class) |

## Governance (do not weaken)

- Decision fields are **authoritative human fields**. The site never pre-fills them.
- Any `assistant_*` / `machine_*` field shown is **guidance only**, clearly labeled.
- **candidate ≠ eligible.** Exporting decisions does not promote anything; the
  maintainer merges signed-off decisions back into the master templates and reruns
  the validators.

## For the maintainer (rebuild after data changes)

```bash
python3 scripts/build_review_site.py     # regenerates review_site/queues.js
```

The bundle `queues.js` is generated from:
- `data/processed/benchmark_release/gold_labels_v0.2.csv` (gold evidence)
- `data/processed/manual_audit/launch_critical_full_ai_triage_v0.3_DRAFT.csv`
- `data/processed/manual_audit/layer2_g4_manual_audit_template_v0.3_DRAFT.csv`
- `data/processed/manual_audit/layer3_nkx21_manual_audit_template_v0.3_DRAFT.csv`
- `data/processed/mechanism_class_expansion/coactivator_dependent_candidates_v0.3.csv`

Exported CSV columns map back to each template's human decision columns
(`unit_id, <decision fields>, reviewer_id, review_date`) for a straight merge.

### Sharing
Zip the `review_site/` folder and send it, or host it on any static host
(GitHub Pages, an internal share). It is pure HTML/CSS/JS with the data baked into
`queues.js`, so it works offline from `file://`.
