# Invalid Account Rejection — Deduction Model Spec

## Purpose
A scorecard deduction model for bank employees, penalizing invalid account
rejections. Deductions scale with the *rejection rate* relative to monthly
volume, rather than a fixed number of rejections — so the same rejection
count is judged differently depending on how many accounts were completed
that month.

## Core Formula

```
Final Deduction = ((RR − T) / (M − T))^k × 5 × (N / VF)
```

Bounded: minimum deduction = 0, maximum deduction = 5.

## Variables

| Symbol | Name | Meaning |
|---|---|---|
| **RR** | Rejection Rate | Rejections ÷ Total Accounts (N), as a percentage |
| **T** | Threshold | Rejection rate below which no deduction applies |
| **M** | Max Rate | Rejection rate at which the rate-based deduction hits full severity |
| **k** | Curve Exponent | Shapes how deduction scales between T and M. k=1 linear, k>1 lenient-then-harsh, k<1 harsh-then-flat |
| **N** | Total Accounts | Accounts completed that month |
| **VF** | Volume Floor | Accounts needed before the rate is treated as fully reliable; below this, deduction is scaled down proportionally |

## Hard Override: Rejection Cap

Regardless of the formula result, **5 or more rejections in a single month
automatically triggers the full maximum deduction (5 points)** — bypassing
the rate-based calculation, T, M, k, and VF entirely. This exists as a
non-negotiable ceiling: no volume or curve adjustment can excuse a raw
rejection count of 5+.

```javascript
const REJECTION_CAP = 5;
if (rejections >= REJECTION_CAP) {
  return maxDeduction; // 5, no other factors considered
}
```

## Roles and Account Types

Deduction strictness is controlled by presets, selected via three tiers:
**Account Type → Role → Monthly Volume Tier.**

### Account Opening
Modifiers typically complete 80 accounts/month; verifiers are expected to
complete 2x that (160/month). Like Account Maintenance, VF is looked up
from the shared monthly volume tier table based on accounts actually
entered — it is not fixed to a single value per role.

| Role | T | M | k |
|---|---|---|---|
| Modifier | 0 | 5 | 1 |
| Verifier | 0 | 5 | 0.6 |

VF is drawn from the same tier table used for Account Maintenance (see
below) — both account types now share identical tier logic.

### Account Maintenance (volume varies monthly)
Base curve settings are the same as Account Opening; VF is looked up from a
tier table based on the employee's actual monthly volume.

| Role | T | M | k |
|---|---|---|---|
| Modifier | 0 | 5 | 1 |
| Verifier | 0 | 5 | 0.6 |

**Volume Floor (VF) by tier:**

| Monthly Volume | Modifier VF | Verifier VF |
|---|---|---|
| Under 30 | 20 | 15 |
| 30–75 | 50 | 30 |
| 75–150 | 100 | 60 |
| 150+ | 130 | 80 |

Verifier VF is always set lower than modifier VF at the same tier — since
verifiers are the stricter checkpoint, their rejection rate is trusted
(and penalized) with less accumulated volume.

## Design Rationale

- **Rate over raw count:** protects high-volume employees from being
  penalized as harshly as low-volume employees for the same number of
  errors, since a rejection means more when there's less total work to
  judge it against.
- **Threshold (T = 0):** no free pass — deductions begin from the very
  first rejection for both roles.
- **Shared Max Rate (M = 5%):** both roles reach full rate-based severity
  at the same rejection rate; strictness differentiation happens through
  k and VF instead.
- **Curve Exponent (k):** verifiers use k = 0.6 (harsh-then-flat), which
  makes their deduction rise faster than a modifier's at every point
  along the scale — not just near the ceiling.
- **Volume Floor (VF):** lower for verifiers at every tier, so their rate
  is trusted sooner. This keeps their overall strictness consistent —
  they aren't accidentally given more benefit of the doubt for a small
  sample than modifiers get.
- **Rejection Cap override:** ensures no combination of high volume, low
  curve severity, or volume-floor discounting can excuse an employee who
  hits 5 rejections outright — this is a hard ceiling independent of the
  formula.

## Files
- `index.html` — page structure, employee inputs, account type / role /
  tier selectors, curve display, result panel, footnote
- `styles.css` — all styling
- `script.js` — `computeDeduction()`, validation, presets, event wiring
