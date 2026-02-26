# Isolation Forest Anomaly Interpretation Logic

**File:** `frontend/components/clinicians/map-page/map-container.tsx` — `anomalySummary` useMemo  
**Feature:** Natural language interpretation panel under the *"{Disease} Anomaly Overview"* heading on the Map page (Anomaly tab).

---

## Purpose

The Isolation Forest model produces numerical anomaly scores and counts that are meaningless to most clinicians. The interpretation layer translates these into three plain-English sentences that answer the three questions a clinician actually needs:

1. **How concerning is this?** (severity signal)
2. **Where should I look?** (geographic focus)
3. **Is this happening now?** (recency + deviation summary)

---

## Output Format

The rendered paragraph has two lines:

```
[⚠️ Outbreak threshold exceeded.] {N} anomalies detected for {Disease}
({rate}% of {total} records), {severity}, {geographic focus}.

{Deviation statement}. Pattern {recency statement}.
```

**Example — high burden, active:**
> ⚠️ Outbreak threshold exceeded. **47 anomalies** detected for **Dengue** (8.3% of 566 records), high anomaly burden, concentrated in NCR.
>
> Strong statistical deviation from expected patterns. Pattern active — latest case Feb 24, 2026.

**Example — low burden, historical:**
> **12 anomalies** detected for **Typhoid** (2.1% of 571 records), low anomaly level, spread across multiple regions.
>
> Mild statistical deviation (borderline cases). Pattern no recent cases — latest was Jan 3, 2026.

---

## Signal 1 — Anomaly Rate Severity

### What it measures
The disease-specific anomaly rate: `(anomalies for disease X / total records across ALL diseases) × 100`.

### Thresholds and justification

| Label | Condition | Basis |
|---|---|---|
| `"high anomaly burden"` | Rate > **10%** (2× contamination) | The backend calls the model with `contamination=0.05`. In Isolation Forest, `contamination` is the *a priori* expected proportion of anomalies across the **entire** dataset—it is the decision boundary the model uses internally. If a single disease accounts for more than **twice** this ceiling (>10%), the disease-specific anomaly density far exceeds what the model was calibrated to expect. This is a structural signal of a genuine cluster or emerging outbreak, not background noise. |
| `"moderate anomaly signal"` | Rate ≥ **5%** and ≤ **10%** | The rate is at or above the model's own alarm ceiling but not dramatically so. This warrants attention: the model is working exactly as designed by flagging this proportion, and the disease is at the outer edge of the expected distribution. |
| `"low anomaly level"` | Rate < **5%** | Below the model's alarm ceiling. These anomalies are within the range the model was trained to consider plausible background variation. They may still be meaningful but should not trigger immediate concern. |

> **Key point:** the 5% and 10% thresholds are *derived from* `contamination=0.05` and will scale automatically if the contamination parameter is ever changed in the API call. They are not clinically chosen cutoffs.

---

## Signal 2 — Geographic Focus

### What it measures
Whether the anomalies for the selected disease are concentrated in one region or scattered.

### Rule and justification

The **40% dominance rule** is applied: if the top region's anomaly count is ≥ 40% higher than the second-ranked region's count, it is declared dominant.

```
dominance = (top_count − second_count) / second_count
if dominance >= 0.4 → "concentrated in {top region}"
else               → "spread across multiple regions"
```

**Justification:** This is the same rule already used in the K-Means cluster interpretation (in `cluster-overview-cards.tsx`). Reusing it ensures **interpretive consistency** — clinicians learn one threshold that means the same thing in both clustering and anomaly contexts. The 40% gap is a conservative choice that avoids labelling marginally dominant regions as "concentrated."

| Output | Condition |
|---|---|
| `"concentrated in {Region}"` | Top region has ≥ 40% more anomalies than second, OR only one region has data |
| `"spread across multiple regions"` | No single region dominates |
| `"no regional data available"` | No region field in any anomaly record |

---

## Signal 3 — Recency

### What it measures
How long ago the most recent anomaly for this disease was recorded (`created_at` field on the anomaly record).

### Thresholds and justification

| Label | Condition | Basis |
|---|---|---|
| `"active — latest case {date}"` | Most recent anomaly ≤ **7 days** ago | One week is the standard window for acute surveillance follow-up in most national health programs (including DOH Philippines). Cases within this window require immediate investigation. |
| `"recent — latest case {date} (within WHO 21-day window)"` | Most recent anomaly 8–**21 days** ago | The **WHO outbreak investigation window is 21 days**, derived from the maximum incubation period of most notifiable infectious diseases (e.g., Dengue: 3–14 days, Typhoid: 6–30 days, Measles: 7–21 days). If the latest case falls inside this window, the pattern is still within the period where investigation and contact tracing are epidemiologically actionable. |
| `"no recent cases — latest was {date}"` | Most recent anomaly > **21 days** ago | Outside the standard WHO investigation window. The anomalies may represent a resolved cluster or historical data artifact rather than an active transmission chain. |

> **References:**  
> - WHO *Field Epidemiology Manual* — Outbreak Investigation chapter (21-day case definition window)  
> - WHO *Dengue: Guidelines for Diagnosis, Treatment, Prevention and Control* (2009), incubation 3–14 days  
> - DOH Philippines *Integrated Disease Surveillance and Response* (IDSR) — 7-day reporting cycle

---

## Signal 4 — Statistical Deviation Strength

### What it measures
The **mean Isolation Forest score** of all flagged anomaly records for the selected disease.

### How Isolation Forest scores work

Isolation Forest assigns each record a score via:

```
score(x, n) = 2^(−E(h(x)) / c(n))
```

where `E(h(x))` is the expected path length to isolate record `x` across all trees, and `c(n)` is the expected path length of an unsuccessful binary search in a tree of `n` nodes (the normalisation constant).

- **Score → 0.5**: record is normal (long path lengths — hard to isolate)
- **Score → 0**: record is on the classification boundary
- **Score → −0.5**: record is deeply anomalous (short path lengths — very easy to isolate)

The classification threshold (determined by `contamination=0.05`) sits approximately in the **−0.1 to −0.2 range** depending on the dataset. Flagged anomalies always have scores below this threshold.

### Threshold and justification

```
mean_score = mean(anomaly_score for all filtered anomaly records)

if mean_score <= -0.15 → "strong statistical deviation from expected patterns"
else                   → "mild statistical deviation (borderline cases)"
```

**Why −0.15?**  
The decision threshold sits near the midpoint of [−0.1, −0.2]. −0.15 is the midpoint of this range and represents a principled dividing line between:
- Cases that are **marginally anomalous** (score just below the threshold, near the classification boundary) — these are flagged by the model but are structurally close to normal records. Clinicians should be aware but not alarmed.
- Cases that are **deeply anomalous** (score significantly below the threshold) — short isolation paths indicate records that are structurally very different from the rest of the dataset. These deserve more urgent clinical attention.

This threshold is **not derived from clinical literature** — it is a mathematical property of the scoring function. It is therefore labelled in terms of the model's own language ("statistical deviation") rather than clinical risk language.

---

## Signal 5 — Outbreak Alert Flag

### What it measures
The `outbreak_alert` boolean returned by the backend alongside the anomaly records.

### Justification
This is the **most authoritative signal** in the panel. It is computed server-side by the Isolation Forest model itself (not by the frontend). When `true`, the model has determined that the total anomaly count exceeds the expected threshold globally across all diseases. It is surfaced first and in bold so clinicians cannot miss it.

The frontend does not recompute or second-guess this value. It renders it verbatim.

---

## Implementation Notes

- `CONTAMINATION = 0.05` is a module-level constant in `map-container.tsx`. It must be kept in sync with the `contamination` query parameter sent to `${BACKEND_URL}/api/surveillance/outbreaks`.
- The recency calculation uses `Date.now()` at render time. This is intentional — anomaly data is fetched fresh on each mount, so staleness is not a concern.
- The deviation threshold (−0.15) and dominance rule (0.40) are inline constants. If the model's calibration changes substantially, these should be revisited.
