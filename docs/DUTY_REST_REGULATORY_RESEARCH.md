# FAA Duty/Rest and Crew Scheduling Research for AeroOps

Accessed: 2026-06-11  
Scope: U.S. FAA/eCFR duty, rest, flight-time, and crew-scheduling rules relevant to Part 91, Part 91K fractional operations, and Part 135 on-demand/scheduled operations.  
Use: Implementation research for a warning-first compliance engine. This is not legal advice and should be reviewed by the operator, counsel, and FAA-facing compliance personnel before enforcement or release blocking.

## 1. Executive Summary

The most important regulations for a first AeroOps duty/rest warning engine are:

- Ordinary Part 91: there is no Part 91-wide commercial-style duty/rest table for private operations. AeroOps should not invent one. It may support optional operator fatigue policies for Part 91, but regulatory warnings should clearly say "operator policy" unless a specific Part 91 rule applies.
- Part 91K fractional operations: 14 CFR Secs. 91.1057 through 91.1062 are the core duty/rest, flight-time, reserve/standby, augmented-crew, and flight-attendant rules.
- Part 135: 14 CFR Secs. 135.263 through 135.273 are the core Subpart F rules. For on-demand unscheduled one- and two-pilot operations, Sec. 135.267 is usually the first engine target. Scheduled operations use Sec. 135.265. Augmented crews use Sec. 135.269. HEMES helicopter operations use Sec. 135.271. Flight attendants use Sec. 135.273.
- Part 117: generally governs Part 121 passenger operations, not Part 91K or Part 135. It is useful for terminology comparison, but should not be applied to AeroOps Part 91K/135 warnings unless the operator is actually operating under a Part 121 context.

Biggest implementation risks:

- Applying Part 135 scheduled rules to unscheduled on-demand operations, or the reverse.
- Treating "reserve" or "standby" as rest when the regulation defines it otherwise.
- Missing "all commercial flying" cumulative flight-time inputs. A system that only sees AeroOps legs cannot fully validate quarterly/yearly limits without outside commercial flying disclosures or imports.
- Incorrect time basis. Rules use rolling 24-consecutive-hour windows, calendar quarters, calendar years, calendar days, and sometimes UTC or local time.
- Hard-blocking ambiguous cases too early. Many duty/rest questions depend on the certificate holder's OpSpecs, management specifications, written procedures, aircraft rest facilities, exact crewmember role, and whether the operation is scheduled, unscheduled, HEMES, fractional, or ordinary Part 91.

Warning-only at first:

- All regulatory duty/rest findings.
- All reserve, standby, on-call, deadhead/positioning, and non-local transportation findings.
- Any cumulative-limit finding where outside commercial flying is missing or self-reported.
- Flight-attendant reduced-rest, augmented-crew, multi-time-zone, and extension cases.
- Any Part 91 operator-policy fatigue rule, because ordinary Part 91 does not supply a general FAA duty/rest table comparable to Part 91K or Part 135.

## 2. Source Inventory

| Official source title | Regulation section | URL | Date accessed | What it governs |
|---|---:|---|---:|---|
| eCFR, Title 14, Part 91, Subpart K | 14 CFR Sec. 91.1057 | https://www.ecfr.gov/current/title-14/section-91.1057 | 2026-06-11 | Part 91K definitions and all-crewmember duty/rest rules, including reserve, standby, transportation, 10-hour rest in preceding 24 hours, 13 quarterly 24-hour rest periods, and Part 135/121 substitution if FAA-authorized. |
| eCFR, Title 14, Part 91, Subpart K | 14 CFR Sec. 91.1059 | https://www.ecfr.gov/current/title-14/section-91.1059 | 2026-06-11 | Part 91K one- and two-pilot flight-time, duty-period, rest, and cumulative commercial flying limits. |
| eCFR, Title 14, Part 91, Subpart K | 14 CFR Sec. 91.1061 | https://www.ecfr.gov/current/title-14/section-91.1061 | 2026-06-11 | Part 91K augmented-crew duty, rest, flight-time, flight-deck-duty, and onboard sleeping facility requirements. |
| eCFR, Title 14, Part 91, Subpart K | 14 CFR Sec. 91.1062 | https://www.ecfr.gov/current/title-14/section-91.1062 | 2026-06-11 | Part 91K flight-attendant duty-period and rest requirements, reduced rest, extra flight attendant requirements, and approved alternative use of flightcrew rules. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.261 | https://www.ecfr.gov/current/title-14/section-135.261 | 2026-06-11 | Scope of Part 135 flight-time limitations and rest requirements. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.263 | https://www.ecfr.gov/current/title-14/section-135.263 | 2026-06-11 | All-certificate-holder rules: assignment only when Subpart F applies, no duty during required rest, non-local required transportation is not rest, and uncontrolled extensions. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.265 | https://www.ecfr.gov/current/title-14/section-135.265 | 2026-06-11 | Scheduled Part 135 flight-time and rest requirements. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.267 | https://www.ecfr.gov/current/title-14/section-135.267 | 2026-06-11 | Unscheduled Part 135 one- and two-pilot flight-time, rest, extensions, and cumulative commercial flying limits. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.269 | https://www.ecfr.gov/current/title-14/section-135.269 | 2026-06-11 | Unscheduled Part 135 three- and four-pilot augmented-crew limits, rest, sleeping facilities, and quarterly rest. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.271 | https://www.ecfr.gov/current/title-14/section-135.271 | 2026-06-11 | Part 135 helicopter hospital emergency medical evacuation service rules. |
| eCFR, Title 14, Part 135, Subpart F | 14 CFR Sec. 135.273 | https://www.ecfr.gov/current/title-14/section-135.273 | 2026-06-11 | Part 135 flight-attendant duty-period and rest requirements. |
| eCFR, Title 14, Part 117 | 14 CFR Secs. 117.1, 117.3, 117.21, 117.25 | https://www.ecfr.gov/current/title-14/part-117 | 2026-06-11 | Part 121 passenger flightcrew duty/rest rules and definitions; useful contrast, generally not applicable to Part 91K/135. |
| GPO bulk eCFR XML | Title 14 current XML | https://www.govinfo.gov/bulkdata/ECFR/title-14/ECFR-title14.xml | 2026-06-11 | Government-published current eCFR XML used to extract regulation text when section pages were not automation-friendly. |

## 3. Applicability Matrix

| Operating context | Regulation / section | Applies to | Does not apply to | Notes / caveats |
|---|---|---|---|---|
| Ordinary Part 91 private/non-fractional operation | Part 91 generally | Part 91 operators and pilots under the specific operating rules applicable to the flight. | Does not provide a general Part 135-style flight/duty/rest table for ordinary private operations. | Treat fatigue rules as operator policy unless a specific Part 91, Part 61, insurance, SMS, or OpSpec-like requirement applies. |
| Part 91K fractional program | Secs. 91.1057-91.1062 | Fractional program manager crewmembers and flight attendants in program operations. | Ordinary Part 91 operations outside Subpart K. | Core AeroOps `PART_91K` rule set. |
| Part 91K one- or two-pilot crew | Sec. 91.1059 | Flight crewmembers assigned as one- or two-pilot crews. | Augmented crews and flight attendants except where cross-applied by approved procedures. | Includes cumulative limits in "all commercial flying." |
| Part 91K augmented crew | Sec. 91.1061 | Three- or four-pilot augmented crews. | One- or two-pilot crews. | Requires adequate sleeping facilities and flight-deck-duty tracking. |
| Part 91K flight attendants | Sec. 91.1062 | Flight attendants assigned by the program manager. | Flightcrew unless operator elects approved alternative procedures. | Reduced-rest and extra-flight-attendant logic should be policy-aware. |
| Part 135 all certificate holders | Secs. 135.261, 135.263 | Part 135 certificate holders and flight crewmembers. | Part 91K unless authorized separately; Part 117 passenger Part 121. | Common Part 135 rules: no duty in rest; required non-local transportation is not rest. |
| Part 135 scheduled operations | Sec. 135.265 | Scheduled operations and other commercial flying limits for assigned flight crewmembers. | Unscheduled on-demand operations governed by Sec. 135.267/269. | Do not apply scheduled rest table to on-demand operations unless the leg is actually scheduled under Part 135. |
| Part 135 unscheduled one- or two-pilot operations | Sec. 135.267 | On-demand/unscheduled one- and two-pilot crews. | Scheduled operations, augmented crews, HEMES-specific assignments. | Likely first Part 135 on-demand engine target. |
| Part 135 unscheduled augmented operations | Sec. 135.269 | Three- and four-pilot unscheduled crews. | One- and two-pilot crews; HEMES-specific rules. | Requires crew composition, sleeping facilities, flight-deck-duty, and duty-hour tracking. |
| Part 135 HEMES | Sec. 135.271 | Helicopter hospital emergency medical evacuation service assignments. | Non-HEMES Part 135 operations. | Specialized; defer unless AeroOps targets helicopter EMS. |
| Part 135 flight attendants | Sec. 135.273 | Flight attendants assigned by certificate holder. | Flightcrew except where approved procedures apply flightcrew rules to attendants. | Similar shape to Sec. 91.1062 but tied to certificate holder OpSpecs. |
| Part 121 passenger operations | Part 117 | Part 121 passenger flightcrew and certain Part 91 operations directed by a Part 121 certificate holder. | Part 91K and ordinary Part 135 operations. | Do not include in AeroOps `PART_91K` or `PART_135` engine unless a future authority context exists. |

## 4. Key Definitions

- Calendar day: For Part 91K and Part 135 flight-attendant rules, a period using UTC or local time that begins at midnight and ends 24 hours later. See Secs. 91.1057(a), 135.273(a).
- Consecutive hours: A continuous elapsed-time block. AeroOps should calculate in absolute instants, then render in the operator's selected time basis.
- Duty period, Part 91K: elapsed time between reporting for an assignment involving flight time and release by the program manager. All time between counts, even if flight time is interrupted by nonflight duties. See Sec. 91.1057(a).
- Duty period, Part 135 flight attendants: elapsed time between reporting for an assignment involving flight time and release by the certificate holder. See Sec. 135.273(a).
- Rest period, Part 91K: required time free of all responsibility for work or duty, and the crewmember/flight attendant cannot be required to receive program manager contact. It excludes any imposed duty or restraint. See Sec. 91.1057(a).
- Rest period, Part 135 flight attendants: period free of all responsibility for work or duty should the occasion arise. See Sec. 135.273(a).
- Required non-local transportation: For Part 91K and Part 135, transportation required and provided by the program manager/certificate holder to or from an airport for crewmember service is not rest. See Secs. 91.1057(d), 135.263(c), 135.273(b)(12).
- Reserve status, Part 91K: status where a flight crewmember holds fit to fly, remains within agreed response time, and is contactable by the program manager. It is not duty and not rest. See Sec. 91.1057(a).
- Standby, Part 91K: portion of a duty period where a flight crewmember is under program manager control and ready to undertake a flight. It is not rest. See Sec. 91.1057(a).
- Augmented flight crew, Part 91K: at least three pilots. See Sec. 91.1057(a).
- Flight attendant: individual other than a flight crewmember assigned by the program manager/certificate holder to duty in an aircraft during flight time with cabin-safety-related duties. See Secs. 91.1057(a), 135.273(a).
- Multi-time-zone flight, Part 91K: east/west flight or same-duty-period flights in one direction resulting in a 5-or-more-hour time-zone difference within the latitude bounds in Sec. 91.1057(a).
- All commercial flying: appears in Secs. 91.1059, 91.1061, 135.265, 135.267, 135.269, and 135.271 cumulative limits. AeroOps must capture external commercial flying to fully validate these rules.

## 5. Rule Catalog

| ruleId | authorityContext | crewRoleScope | triggerCondition | lookbackWindow | requiredInputs | calculation | passCondition | failCondition | warningVsBlockRecommendation | citation | implementationNotes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FAA-91K-REST-001 | PART_91K | All crewmembers | Assignment involving flight time | Required rest periods around assignment | Duty/rest records; assigned duty start/end; required rest windows | Check no duty assigned during required rest | No duty overlaps required rest | Any duty overlaps required rest | Warning only | 14 CFR Sec. 91.1057(c) | Requires reliable rest classification. |
| FAA-91K-REST-002 | PART_91K | All crewmembers | Flight assignment planned | 24 hours preceding assignment completion | Rest periods; planned completion time | Sum/identify at least one 10-consecutive-hour rest period during preceding 24 hours | >= 10 consecutive hours rest exists | No 10-hour rest block | Warning only | 14 CFR Sec. 91.1057(f) | Use planned completion for schedule warnings; actual completion for post-flight audit. |
| FAA-91K-REST-003 | PART_91K | All crewmembers | Any quarterly schedule review | Calendar quarter | Rest periods | Count rest periods of at least 24 consecutive hours | At least 13 in quarter | Fewer than 13 | Warning only | 14 CFR Sec. 91.1057(g) | Needs complete quarter data and external operator coverage. |
| FAA-91K-RESERVE-001 | PART_91K | Flight crewmembers | Crew marked reserve | Current reserve interval | Reserve status; contactability; response time policy | Reserve is neither duty nor rest | Reserve not counted as rest | Reserve used to satisfy rest | Warning only | 14 CFR Sec. 91.1057(a) | Store reserve separately from rest/duty. |
| FAA-91K-STANDBY-001 | PART_91K | Flight crewmembers | Crew marked standby | Standby interval | Standby start/end; duty period | Standby is part of duty and not rest | Standby counted as duty | Standby counted as rest | Warning only | 14 CFR Sec. 91.1057(a) | This is high-value early warning logic. |
| FAA-91K-FLT-001 | PART_91K | One- or two-pilot flightcrew | Assignment accepted | Calendar quarter; two consecutive quarters; calendar year | Flight time in AeroOps and outside commercial flying | Sum all commercial flight time | <= 500/qtr, <= 800/2 qtrs, <= 1400/year | Any threshold exceeded | Warning only | 14 CFR Sec. 91.1059(a) | If outside flying unknown, warn "cannot fully validate." |
| FAA-91K-FLT-002 | PART_91K | One-pilot flightcrew | One-pilot assignment | Rolling 24 consecutive hours | Assigned and other commercial flight time | Sum flight time in rolling 24-hour period | <= 8 hours unless extension table applies | > 8 hours without valid extension | Warning only | 14 CFR Sec. 91.1059(b)-(c) | Extension max is up to 9 hours for one pilot. |
| FAA-91K-FLT-003 | PART_91K | Two-pilot flightcrew | Two-pilot assignment | Rolling 24 consecutive hours | Crew size; pilot qualifications; assigned and other commercial flight time | Sum flight time in rolling 24-hour period | <= 10 hours unless extension table applies | > 10 hours without valid extension | Warning only | 14 CFR Sec. 91.1059(b)-(c) | Extension max is up to 12 hours for two pilots. |
| FAA-91K-DUTY-001 | PART_91K | One- or two-pilot flightcrew | Duty assignment | Duty period | Report/release times; crew size; extension flag | Calculate elapsed duty period | <= 14 hours | > 14 hours | Warning only | 14 CFR Sec. 91.1059(c) | Same 14-hour duty limit under normal and extension columns. |
| FAA-91K-POSTREST-001 | PART_91K | One- or two-pilot flightcrew | Duty completion | Rest after duty | Duty completion; next duty; multi-time-zone flag; extension flag | Required after-duty rest: 10 normal, 12 extension; multi-time-zone 14 normal, 18 extension | Rest meets applicable minimum | Rest below applicable minimum | Warning only | 14 CFR Sec. 91.1059(c); Sec. 91.1057(a) | Needs route time-zone delta for multi-time-zone flights. |
| FAA-91K-AUG-001 | PART_91K | Augmented flightcrew | Three- or four-pilot crew assignment | Calendar quarter; two consecutive quarters; calendar year | All commercial flight time | Sum all commercial flight time | <= 500/qtr, <= 800/2 qtrs, <= 1400/year | Any threshold exceeded | Warning only | 14 CFR Sec. 91.1061(a) | Same cumulative limits as one/two-pilot 91K. |
| FAA-91K-AUG-002 | PART_91K | Augmented flightcrew | Augmented crew assignment | Rolling 24 consecutive hours | Flight-deck-duty intervals | Sum flight deck duty | <= 8 hours | > 8 hours | Warning only | 14 CFR Sec. 91.1061(b)(2) | Requires flight-deck-duty data separate from duty period. |
| FAA-91K-AUG-003 | PART_91K | Augmented flightcrew | Three-pilot assignment | Duty period | Crew count; rest; duty; flight time; sleeping facilities | Check 10-hour prior rest, <=16 duty, <=12 flight, >=12 after rest or >=18 multi-time-zone | All conditions met | Any condition missing | Warning only | 14 CFR Sec. 91.1061(b)-(c) | Also validate crew composition and onboard sleeping facilities. |
| FAA-91K-AUG-004 | PART_91K | Augmented flightcrew | Four-pilot assignment | Duty period | Crew count; rest; duty; flight time; sleeping facilities | Check 10-hour prior rest, <=18 duty, <=16 flight, >=18 after rest or >=24 multi-time-zone | All conditions met | Any condition missing | Warning only | 14 CFR Sec. 91.1061(b)-(c) | Requires role/qualification detail. |
| FAA-91K-FA-001 | PART_91K | Flight attendants | FA duty period <= 14 hours | Between duty periods | FA duty start/end; rest periods | Minimum rest 9 hours, reducible to 8 with 10-hour compensatory rest beginning within 24 hours | Meets normal or reduced-rest pattern | Rest below minimum or missing compensation | Warning only | 14 CFR Sec. 91.1062(a)(1)-(3) | Reduced rest should stay warning-only until policy reviewed. |
| FAA-91K-FA-002 | PART_91K | Flight attendants | FA duty period >14 and <=20 hours | Between duty periods | Duty length; extra FA count; route geography; rest periods | Validate extra FA requirements and 12-hour rest, reducible to 10 with 14-hour compensatory rest | Meets all conditions | Duty/rest/extra-FA condition missing | Warning only | 14 CFR Sec. 91.1062(a)(4)-(9) | >18 to 20 hours requires qualifying outside-contiguous-US flight. |
| FAA-135-GEN-001 | PART_135 | Flight crewmembers | Any Part 135 assignment | Required rest period | Duty/rest records | Check no duty assigned during required rest | No duty overlaps required rest | Duty overlaps required rest | Warning only | 14 CFR Sec. 135.263(b) | Common Part 135 invariant. |
| FAA-135-GEN-002 | PART_135 | Flight crewmembers | Required non-local transportation | Transportation interval | Transportation required/provided flag; origin/destination; rest period | Exclude required non-local transportation from rest | Transportation not counted as rest | Transportation counted as rest | Warning only | 14 CFR Sec. 135.263(c) | Needs deadhead/positioning/transportation data. |
| FAA-135-SCH-001 | PART_135 | Scheduled flightcrew | Scheduled operation assignment | Calendar year/month; 7 consecutive days; 24 consecutive hours; between rest periods | Operation type; flight time; crew size; outside commercial flying | Sum all commercial flight time by window | <=1200/year, <=120/month, <=34/7 days, one-pilot <=8/24h, two-pilot <=8 between rests | Any threshold exceeded | Warning only | 14 CFR Sec. 135.265(a) | Only for scheduled operations. |
| FAA-135-SCH-002 | PART_135 | Scheduled flightcrew | Scheduled flight segment | 24 hours before scheduled completion | Scheduled flight time; scheduled rest | Required rest: 9h for <8h flight; 10h for >=8 and <9h; 11h for >=9h | Required rest exists | Missing required rest | Warning only | 14 CFR Sec. 135.265(b) | Reduced-rest alternatives in Sec. 135.265(c). |
| FAA-135-SCH-003 | PART_135 | Scheduled flightcrew | Scheduled reduced rest | 24 hours after reduced rest begins | Reduced rest; compensatory rest | 8h minimum with 10h/11h comp depending original category; 9h minimum with 12h comp for >=9h flight | Meets reduced-rest and compensation timing | Missing/minimum/late compensation | Warning only | 14 CFR Sec. 135.265(c) | Needs explicit reduced-rest marker. |
| FAA-135-SCH-004 | PART_135 | Scheduled flightcrew | Scheduled air transportation | 7 consecutive days | Duty records | Relieve from all further duty for >=24 consecutive hours | 24h duty-free exists | No 24h duty-free block | Warning only | 14 CFR Sec. 135.265(d) | Applies to scheduled air transportation. |
| FAA-135-UNSCH-001 | PART_135 | Unscheduled one- or two-pilot flightcrew | Assignment accepted | Calendar quarter; two consecutive quarters; calendar year | All commercial flight time | Sum all commercial flight time | <=500/qtr, <=800/2 qtrs, <=1400/year | Any threshold exceeded | Warning only | 14 CFR Sec. 135.267(a) | Must capture outside commercial flying. |
| FAA-135-UNSCH-002 | PART_135 | Unscheduled one-pilot flightcrew | Assignment accepted | Rolling 24 consecutive hours | Assigned and other commercial flight time | Sum flight time | <=8 hours, unless Sec. 135.267(c) pattern applies | >8 hours without valid condition | Warning only | 14 CFR Sec. 135.267(b)-(c) | Sec. 135.267(c) has specific 14-hour duty/rest pattern. |
| FAA-135-UNSCH-003 | PART_135 | Unscheduled two-pilot flightcrew | Assignment accepted | Rolling 24 consecutive hours | Crew size/qualification; assigned and other commercial flight time | Sum flight time | <=10 hours, unless Sec. 135.267(c) pattern applies | >10 hours without valid condition | Warning only | 14 CFR Sec. 135.267(b)-(c) | Validate both pilots qualified under Part 135. |
| FAA-135-UNSCH-004 | PART_135 | Unscheduled one- or two-pilot flightcrew | Assignment under Sec. 135.267(b) | 24 hours preceding planned completion | Rest periods; planned completion | Identify at least 10 consecutive hours rest in preceding 24 hours | >=10 consecutive hours rest | No qualifying rest | Warning only | 14 CFR Sec. 135.267(d) | Scheduled/planned completion for preflight warning; actual for audit. |
| FAA-135-UNSCH-005 | PART_135 | Unscheduled one- or two-pilot flightcrew | Flight time limit exceeded due to uncontrolled circumstances | Rest before next assignment | Overage minutes; rest before next assignment | Required rest: 11h if <=30 min over; 12h if >30 and <=60; 16h if >60 | Rest meets applicable tier | Rest below tier | Warning only | 14 CFR Sec. 135.267(e) | Needs reason code for extension/overage. |
| FAA-135-UNSCH-006 | PART_135 | Unscheduled one- or two-pilot flightcrew | Quarterly review | Calendar quarter | Rest periods | Count 24-hour rest periods | At least 13 in quarter | Fewer than 13 | Warning only | 14 CFR Sec. 135.267(f) | Same risk as 91K: incomplete outside data. |
| FAA-135-AUG-001 | PART_135 | Unscheduled three- or four-pilot flightcrew | Augmented assignment accepted | Calendar quarter; two consecutive quarters; calendar year | All commercial flight time | Sum all commercial flight time | <=500/qtr, <=800/2 qtrs, <=1400/year | Any threshold exceeded | Warning only | 14 CFR Sec. 135.269(a) | Same cumulative limits as unscheduled one/two-pilot. |
| FAA-135-AUG-002 | PART_135 | Unscheduled augmented pilots | Three- or four-pilot assignment | Rolling 24 consecutive hours and duty period | Prior rest; flight-deck duty; duty hours; aloft hours; sleeping facilities; crew composition | Three-pilot: 10h prior rest, <=8h flight deck duty, <=18 duty, <=12 aloft, >=12 after rest. Four-pilot: <=20 duty, <=16 aloft, other listed conditions | All applicable conditions met | Any condition missing | Warning only | 14 CFR Sec. 135.269(b) | Requires flight-deck duty and aloft time, not just block time. |
| FAA-135-AUG-003 | PART_135 | Unscheduled augmented pilots | Flight deck duty exceeded by >60 minutes due to uncontrolled circumstances | Before next duty period | Overage; next rest period | Rest must be >=16 consecutive hours | >=16h rest | <16h rest | Warning only | 14 CFR Sec. 135.269(c) | Store extension reason and minutes. |
| FAA-135-AUG-004 | PART_135 | Unscheduled augmented pilots | Quarterly review | Calendar quarter | Rest periods | Count 24-hour rest periods | At least 13 in quarter | Fewer than 13 | Warning only | 14 CFR Sec. 135.269(d) | Same as other unscheduled quarterly rest rule. |
| FAA-135-HEMES-001 | PART_135 | HEMES helicopter flightcrew | HEMES assignment | Assignment and rolling 24 hours | Operation type; rest; flight time; assignment duration; rest facility | Prior 10h rest; <=8h flight time/24h unless prolonged emergency; 8h rest/24h; assignment <=72h; rest facility; no other duties | All conditions met | Any condition missing | Warning only | 14 CFR Sec. 135.271(b)-(g) | Defer unless AeroOps supports helicopter EMS. |
| FAA-135-HEMES-002 | PART_135 | HEMES pilots | HEMES assignment completed | After assignment | Assignment length; post-assignment rest | Rest >=12h if assignment <48h; >=16h if >48h | Required rest met | Rest below minimum | Warning only | 14 CFR Sec. 135.271(h) | Ambiguity: exactly 48h should be operator/legal reviewed. |
| FAA-135-HEMES-003 | PART_135 | HEMES flightcrew | Quarterly review | Calendar quarter | Rest periods | Count 24-hour rest periods | At least 13 in quarter | Fewer than 13 | Warning only | 14 CFR Sec. 135.271(i) | HEMES-specific quarterly rule. |
| FAA-135-FA-001 | PART_135 | Flight attendants | FA duty period <=14 hours | Between duty periods | Duty start/end; rest periods | Rest >=9h, reducible to 8h with 10h subsequent rest beginning within 24h | Meets normal or reduced-rest pattern | Rest below minimum/missing compensation | Warning only | 14 CFR Sec. 135.273(b)(1)-(3) | Similar to 91K FA rule. |
| FAA-135-FA-002 | PART_135 | Flight attendants | FA duty period >14 and <=20 hours | Between duty periods | Duty length; extra FA count; outside-contiguous-US flag; rest periods | Validate extra FA requirements; rest >=12h, reducible to 10h with 14h subsequent rest beginning within 24h | Meets all conditions | Any condition missing | Warning only | 14 CFR Sec. 135.273(b)(4)-(9) | >18 to 20 hours requires qualifying geography. |
| FAA-135-FA-003 | PART_135 | Flight attendants | Any FA duty | Required rest / 7 calendar days | Duty/rest records; transportation; calendar-day basis | No duty during rest; required non-local transportation not rest; 24h duty-free in 7 consecutive calendar days | Meets all | Any violation | Warning only | 14 CFR Sec. 135.273(b)(10)-(13) | Requires FA-specific duty records. |
| FAA-117-NOTAPPLY-001 | NON_APPLICABLE_REFERENCE | Flightcrew | AeroOps authority is PART_91K or PART_135 | N/A | Operating authority | Do not apply Part 117 unless actual Part 121-directed context exists | Part 117 warnings suppressed | Part 117 applied to wrong authority | Warning only / configuration guard | 14 CFR Sec. 117.1 | Useful product guardrail. |

## 6. Data Requirements

### Fields already likely supported by `CrewDutyPeriod`

- `crewMemberId`: required for per-person rule windows.
- `startsAt` and `endsAt`: required for duty-period elapsed time, rolling windows, overlap checks, and standby-as-duty calculations.
- `status` and `dutyStatus`: useful for planned/actual/verified and duty status categories.
- `source`: useful to distinguish schedule, actual flight log, manual adjustment, import, and operator policy.
- `createdById`, `verifiedById`, `verifiedAt`, `notes`: useful for audit, warning explanations, and later legal review.

Needed later on or adjacent to `CrewDutyPeriod`:

- `authorityContext` or link to authority revision in force.
- `dutyKind`: flight duty, standby, training, admin, deadhead/transportation, HEMES hospital availability, reserve availability, flight-deck duty.
- `reportTime` and `releaseTime` if different from generic start/end.
- `isStandby`, `isReserve`, `isRequiredTransportation`, or normalized activity/event type.
- `timeBasis`: UTC/local/operator base; selected calculation basis.
- `extensionReason`, `extensionKnownAtDeparture`, `extensionMinutes`.
- `flightDeckDutyMinutes` and `aloftMinutes` for augmented crews.

### Fields already likely supported by `CrewRestPeriod`

- `crewMemberId`: required.
- `startsAt` and `endsAt`: required for consecutive rest calculations.
- `status`, `source`, `createdById`, `verifiedById`, `verifiedAt`, `notes`: useful for planned/actual/rest-quality audit.

Needed later on or adjacent to `CrewRestPeriod`:

- `restKind`: required regulatory rest, compensatory rest, quarterly 24-hour rest, operator-policy rest.
- `isReducedRest` and `compensatoryRestDueBy`.
- `freeFromContactConfirmed` for Part 91K.
- `notLocalTransportationExcluded` marker when a proposed rest block contains required transportation.
- `timezoneBasis` and location/base context for rest calculations and calendar-day grouping.

### Fields likely needed on `FlightLeg`

- Operating authority and section context: Part 91, Part 91K, Part 135 scheduled, Part 135 unscheduled/on-demand, HEMES, future Part 121 if ever added.
- Scheduled and actual departure/arrival, wheels-off/wheels-on if used to calculate flight time.
- Flight-time minutes, block-time minutes, aloft minutes, and whether the leg is commercial flying.
- Crew complement and role assignments: PIC, SIC, additional pilot, relief pilot, flight attendant.
- Required minimum crew complement and actual additional crewmembers.
- Aircraft rest/sleeping facility capability for augmented operations.
- Route geography/time-zone data: departure/arrival time zones, time-zone delta, outside contiguous United States flag.
- Extension/irregularity data: adverse weather or other uncontrolled circumstance, known/not known at departure, minutes over planned limit.

### Fields likely needed on `CrewScheduleEntry`

- Crew member, planned duty status, planned start/end, station/base, source request.
- Entry type: duty, reserve, standby, rest, off duty, training, vacation/sick, required transportation, HEMES availability.
- Authority context and operating part for assignment-linked entries.
- Publish/finalize status so warnings can distinguish draft vs released schedule.
- Link to duty/rest evidence record when a schedule entry becomes compliance evidence.

### New fields/tables likely required later

- `CrewCommercialFlyingLedger`: external commercial flying disclosures/imports by crewmember, date, authority, flight-time minutes, source, verified status.
- `CrewDutyActivity`: normalized duty sub-events inside a duty period: report, flight deck duty, standby, deadhead, training, admin, release.
- `CrewReservePeriod`: reserve availability with response-time policy, contact method, reserve type, and whether it is Part 91K reserve.
- `CrewTransportationEvent`: required/provided non-local transport and deadhead records.
- `CrewRestDebt` or `ReducedRestCompensation`: tracks reduced rest and compensatory rest due windows.
- `OperatorDutyRestPolicyProfile`: selectable operator/legal-reviewed choices, including Part 91 policy warnings, interpretation settings, and OpSpecs/MSpecs references.
- `AircraftRestFacilityCapability`: aircraft-level onboard sleeping facility evidence.
- `CrewDutyRestWarning`: persisted warning result, severity, rule ID, calculation snapshot, inputs used, missing inputs, override/acknowledgment metadata.

## 7. Ambiguities / Operator Policy Decisions

- Ordinary Part 91 fatigue policy: AeroOps should not present ordinary Part 91 operator fatigue limits as FAA black-letter duty/rest rules unless a specific authority exists.
- Scheduled vs unscheduled Part 135 classification: must come from the authority/operation profile, not guessed from whether a leg has a schedule.
- "All commercial flying": operator must decide how to collect outside flying and how to warn when it is unknown.
- Local vs UTC calculation basis: several definitions allow UTC or local time. Operator should choose and document the basis for each rule family.
- Reserve/on-call under Part 135: Subpart F does not define reserve as explicitly as Part 91K. Treat on-call/rest availability conservatively and warning-only until legal/operator interpretation is approved.
- Required transportation: need operator policy for what is "not local in character" and how to classify company-required repositioning.
- Flight-time measurement: operator must define whether AeroOps uses block, airborne, or logged flight time for each rule, consistent with regulatory and operator recordkeeping practice.
- Assignment completion time: preflight warnings may use planned completion; actual compliance review should use actual completion.
- Extension reason validation: the system can flag overages and collect reasons, but should not decide legal sufficiency of "circumstances beyond control" without review.
- Multi-time-zone detection: Part 91K has a specific definition; operator must confirm whether to compute from airport time zones, route direction, and duty-period sequence.
- Flight-attendant complement: rules depend on minimum required complement under MSpecs/OpSpecs and additional assigned attendants. AeroOps must store those values rather than infer from passenger count alone.
- HEMES exact 48-hour boundary: Sec. 135.271(h) says less than 48 hours and more than 48 hours; exactly 48 hours should be reviewed before hardcoding.
- Applying flightcrew limits to flight attendants: Part 91K and Part 135 allow this only with approved written procedures/specifications. Do not assume.
- Part 121/Part 117 crossover: only apply if AeroOps later models a true Part 121-directed context.

## 8. Suggested Implementation Phases

### Phase 1: warning-only calculator

- Implement rule IDs and deterministic calculations for Part 91K Secs. 91.1057-91.1062 and Part 135 Secs. 135.263, 135.267, 135.269, and selected Sec. 135.273 warnings.
- Do not block release or schedule publication.
- Show missing-input warnings, especially for outside commercial flying, rest classification, actual release time, and operation type.
- Persist warning snapshots so later reviewers can see which inputs were used.

### Phase 2: configurable operator policy profile

- Add operator-reviewed profile settings for calculation time basis, ordinary Part 91 fatigue policy, reserve/on-call treatment, scheduled vs unscheduled authority mapping, external commercial flying source policy, and reduced-rest handling.
- Link settings to `OperatingAuthority` / `AuthorityRevision`.
- Add OpSpecs/MSpecs references where the rule requires them.

### Phase 3: release readiness integration

- Surface warnings in `FlightRelease`, schedule publication/finalization, and crew assignment review.
- Keep actions continue-capable.
- Require acknowledgment for high-risk warnings, but avoid legal signature semantics.
- Add post-flight audit warnings when actual times differ from planned times.

### Phase 4: hard blocking/signature/legal enforcement

- Only after operator/legal review.
- Limit hard blocks to a reviewed subset of black-letter rules with complete data.
- Keep configurable exceptions and documented override workflow.
- Preserve calculation snapshots, input data, authority revision, reviewer identity, and final release decision.

## 9. Test Cases

| Test case | Scenario | Expected warning result | Rule coverage |
|---|---|---|---|
| Compliant Part 135 on-demand duty/rest | Two-pilot unscheduled Part 135 leg; each pilot has 10 consecutive hours rest in the 24 hours before planned completion; total commercial flight time in rolling 24 hours is 9.5 hours; quarterly totals below limits. | Pass/no warning for daily flight time and preceding rest; informational if outside commercial flying source is self-reported only. | Sec. 135.267(a), (b), (d), (f) |
| Insufficient rest | Part 135 unscheduled one-pilot assignment planned to complete at 1800Z; pilot has only 8 consecutive hours rest in the preceding 24 hours. | Warning: missing 10 consecutive hours rest during 24 hours before planned completion. | Sec. 135.267(d) |
| Exceeded daily flight time | Part 91K one-pilot crew assigned 8.7 hours flight time in a rolling 24-hour period with extension reason recorded as weather unknown at departure. | Warning requiring extension review; allowed maximum under Sec. 91.1059(c) extension table is up to 9 hours, with after-duty rest requirement increased to 12 hours or 18 hours if multi-time-zone. | Secs. 91.1057(e), 91.1059(b)-(c) |
| Cumulative limit issue | Part 135 unscheduled SIC has 790 hours commercial flying in two consecutive quarters before a proposed 20-hour assignment. | Warning: projected two-quarter total exceeds 800 hours. If outside flying data incomplete, warning should state validation is incomplete. | Sec. 135.267(a) |
| Part 91 vs Part 135 difference | Same planned private owner Part 91 reposition leg and Part 135 charter leg. Pilot has 9 hours rest. | Ordinary Part 91: no FAA Part 135-style regulatory rest warning unless operator policy says so. Part 135: apply Sec. 135.267(d) and warn if no 10-hour rest block in preceding 24 hours. | Part 91 general; Sec. 135.267(d) |
| Reserve/standby ambiguity | Part 91K pilot is on reserve 0600-1800, then assigned to fly. Scheduler tries to count reserve as rest. | Warning: reserve status is neither duty nor rest; cannot satisfy required rest. If marked standby, warning that standby is duty and not rest. | Sec. 91.1057(a) |
| Crossing midnight/time zones | Part 91K two-pilot crew reports at 2200 local, operates westbound sequence crossing 5 time zones, releases 1200Z next day. | Calculate duty as elapsed time from report to release; detect multi-time-zone flight and require 14-hour after-duty rest normally or 18-hour after-duty rest if extension. | Secs. 91.1057(a), 91.1059(c) |
| Flight attendant reduced rest | Part 135 FA duty 13.5 hours, rest scheduled 8 hours, then next compensatory rest begins 28 hours after reduced rest began. | Warning: 8-hour reduced rest requires subsequent 10-hour rest beginning no later than 24 hours after reduced rest began. | Sec. 135.273(b)(2)-(3) |
| Augmented crew missing data | Part 135 three-pilot unscheduled assignment has duty 17 hours and aloft 11 hours, but aircraft sleeping facility capability is unknown. | Warning: duty/aloft values appear within limits, but cannot validate augmented assignment without adequate sleeping facility evidence. | Sec. 135.269(b) |

## 10. Open Questions For Product Owner

1. Which exact launch contexts should Phase 1 support: ordinary Part 91 only, Part 91K, Part 135 on-demand, Part 135 scheduled, or all of these?
2. Is AeroOps expected to support flight attendants/cabin crew in Phase 1, or should FA rules be documented but deferred?
3. Will AeroOps collect outside commercial flying from crew self-report, imports, payroll/flight-log systems, or manual admin entry?
4. What is the operator-approved calculation basis for calendar day and elapsed windows: UTC, local station time, home-base time, or per-rule configurable?
5. How should ordinary Part 91 fatigue warnings be presented so users do not mistake operator policy for FAA regulatory compliance?
6. Does the operator use reserve, standby, airport standby, short-call, long-call, or informal on-call labels today?
7. Does the operator have approved OpSpecs/MSpecs or written procedures that apply flightcrew limits to flight attendants?
8. Does the fleet include aircraft with approved/adequate sleeping facilities for augmented crews?
9. Are HEMES helicopter operations in scope?
10. Should warnings be calculated from planned times only, actual times only, or both planned preflight and actual post-flight audit?
11. Who may acknowledge or override high-risk warnings, and should that be an operational acknowledgment or a legal compliance signoff?
12. Should the first persisted warning model store full calculation snapshots for audit, even before hard blocking exists?



