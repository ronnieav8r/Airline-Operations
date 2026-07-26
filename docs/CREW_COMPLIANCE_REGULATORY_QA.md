# Crew Compliance Regulatory QA

Last reviewed: 2026-06-19

This is a warning-first product QA note, not a legal compliance signoff. Source-backed
defaults must still be reconciled with operator manuals, OpSpecs, LOAs, approved training
programs, aircraft-specific programs, and stricter company policy.

## Current Starter Coverage

- Shared medical certificate duration: 14 CFR 61.23.
- PIC aircraft type rating for large/turbojet/type-specified aircraft: 14 CFR 61.31.
- SIC qualification / SIC type privileges or familiarization evidence: 14 CFR 61.55.
- Part 91 PIC proficiency checks for multi-crew or turbojet aircraft: 14 CFR 61.58.
- Part 91 flight review: 14 CFR 61.56.
- Part 91 instrument experience / IPC support: 14 CFR 61.57.
- Part 91 takeoff and landing recency: 14 CFR 61.57.
- Part 135 recurrent knowledge/testing: 14 CFR 135.293.
- Part 135 competency check: 14 CFR 135.293.
- Part 135 PIC IFR proficiency check: 14 CFR 135.297.
- Part 135 PIC line check: 14 CFR 135.299.
- Part 135 grace context: 14 CFR 135.301.
- Part 91K recurrent knowledge/testing: 14 CFR 91.1065.
- Part 91K competency check: 14 CFR 91.1065.
- Part 91K PIC/SIC instrument proficiency checks: 14 CFR 91.1069.
- Part 91K grace context: 14 CFR 91.1071.

## Automated Due-Date Behavior

- Medical due dates are calculated from medical class, issue date, DOB, and manually entered
  expiration where supplied.
- Fixed interval checks use completed date plus the configured interval unless a manual
  expiration override is supplied.
- Takeoff/landing recency uses a 90-day interval from the recorded recency event.
- Evidence records can now carry operating-part coverage and satisfied-requirement tags.
  Empty coverage remains legacy broad coverage; explicit coverage only satisfies matching rules.
- CPT/PIC aircraft qualifications look for aircraft-specific type-rating certificate evidence.
- FO/SIC aircraft qualifications look for SIC familiarization, SIC type privileges, aircraft-rating,
  or endorsement-style evidence.
- Planned compliance events remain planning context only and do not satisfy a rule.

## Known Gaps To Model Later

- Part 61.57 instrument currency needs detailed approach, hold, and tracking counts rather
  than a single IPC/instrument evidence proxy.
- Part 61.57 passenger recency needs day/night and tailwheel nuance if the operation needs it.
- Part 135.297 and 91.1069 approach-procedure demonstrations need procedure-type detail.
- Part 135.299 route/airport familiarity after 90 days belongs in dispatch/release context,
  not only crew profile compliance.
- 135.293 and 91.1065 knowledge tests may deserve their own evidence type instead of using
  training records as a starter proxy.
- BasicMed and special issuance medical cases remain manual-first in this slice.
- ATP certificate requirements under Part 135 passenger/IFR/turbojet contexts need a dedicated
  PIC certificate-qualification rule after the crew certificate model can distinguish ATP certificate
  level from aircraft type-rating endorsement cleanly.
- Aircraft metadata should eventually mark which types are large, turbojet, require two pilots,
  or require type-specific SIC/PIC evidence. The current CL-65 and EMB-135/145 starter fleet is
  treated as type-rating/SIC-qualification relevant.

## Acceptance Checks

- Turning off an operator operating part must remove that part's crew warnings while preserving
  shared medical warnings.
- Missing medical evidence must always surface as a crew warning.
- Evidence entered from the crew drawer must return to the drawer and recalculate warnings.
- Manual expiration overrides are allowed, but blank expiration fields should let the evaluator
  calculate due dates from the rule catalog.
