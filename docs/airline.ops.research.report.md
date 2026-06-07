# Data Modeling Research for a Small Air Operator Operations App

## Regulatory drivers for the data model

For a small U.S. operator, the database is not just a scheduling tool. It is a compliance system of record. Baseline Part 91 creates the minimum foundation: aircraft documents and registration, airworthiness status, required instruments and equipment, handling of inoperative equipment through § 91.213, inspection and maintenance records, and pilot preflight information such as weather, fuel, alternatives, and runway performance data. In data-model terms, that means you need first-class entities for aircraft documents, equipment status, discrepancies and deferrals, maintenance records, and preflight briefing artifacts even before you add “airline-style” features. citeturn22view2turn22view3turn13view8turn22view1turn12view2turn13view7turn22view4turn33search0

Part 91K is much closer to a managed commercial operating environment than ordinary Part 91. A 91K program manager operates under FAA management specifications, must maintain an operating manual with electronically visible revision dates, keep pilot and flight attendant records, maintain a current list of fractional owners and associated aircraft, prepare load manifests, keep a written per-flight document naming the entity with operational control and the regulatory part under which the flight is operated, establish scheduling and release procedures, maintain flight locating procedures, run anonymous internal safety reporting and incident-response procedures, enforce flight/duty/rest limits, and—if operating under CAMP—maintain reliability, interruption, maintenance recording, and continuing-analysis records. From a schema perspective, 91K therefore needs authority, manual, owner-aircraft, flight-release, locating, safety, and CAMP entities that ordinary Part 91 does not demand in the same way. citeturn13view0turn32view1turn28view1turn23view2turn13view2turn24view2turn30search2turn29view0

Part 135 adds the formal certificate-holder structure most people associate with an airline or charter operator. Part 135 certificate holders need operating specifications, qualified management personnel, documented operational control, flight locating, pilot and required flight attendant records, multiengine load manifests, FAA-approved training programs, pilot testing and route checks, recent-experience tracking, duty/rest compliance, and service-difficulty reporting. On top of that, FAA Part 5 now applies to Part 135 operators; existing holders authorized before May 28, 2024 must implement a compliant SMS by May 28, 2027, and Part 5 defines SMS around safety policy, safety risk management, safety assurance, and safety promotion. The FAA’s small-operator guidance also makes clear that the SMS can scale to the organization’s size, scope, and complexity, with some carve-outs for single-pilot organizations. citeturn12view9turn21view2turn14search2turn32view0turn28view0turn21view4turn21view5turn23view3turn13view6turn31view0turn9view7turn10view6

## Recommended operational domains

The cleanest way to model a 10–100 aircraft operator is as a set of bounded domains rather than one giant `flights` table with a pile of nullable columns. Based on the FAA and IATA source material, the most useful domains are authority and organization, fleet and airworthiness, flight planning and execution, crew and training, owners/passengers, and safety/SMS. That structure maps better to how the regulations are written and to how real operations teams work day to day. citeturn12view9turn13view0turn32view1turn31view0turn11view0

**Authority and organization.** I would create tables such as `operator`, `operating_authority`, `authority_revision`, `authority_aircraft`, `authority_area`, `authority_airport_limit`, `authority_weight_balance_method`, `authority_hazmat_policy`, `base`, `management_role`, `person_role_assignment`, `manual`, `manual_revision`, `document_distribution`, and `document_acknowledgement`. Part 135 OpSpecs must carry kinds of operations, routes/areas, airport limitations, overhaul/inspection standards, weight-and-balance authorization, and hazmat authorization; Part 91K MSpecs and manuals must track owners, aircraft, authorized operations, procedures, and manual revisions; and Part 135 personnel must be informed of the OpSpecs and current documents that apply to their duties. citeturn12view9turn13view0turn32view1turn32view0turn21view2turn21view1

**Fleet and airworthiness.** I would create `aircraft`, `aircraft_configuration`, `aircraft_capability`, `engine`, `propeller_or_rotor`, `appliance_or_component`, `component_installation`, `inspection_program`, `maintenance_program`, `maintenance_event`, `airworthiness_release`, `discrepancy`, `deferral`, `mel_item`, `required_inspection_authorization`, `maintenance_provider`, `service_difficulty_report`, `mechanical_reliability_report`, and `interruption_summary`. The central reason is that the regulations track maintenance and airworthiness at multiple asset levels—airframe, engine, propeller, rotor, appliance, life-limited part, overhaul status, and return-to-service approval—rather than as a single aircraft status flag. Both Part 91K CAMP requirements and Part 135 maintenance reporting also push you toward explicit reliability and defect entities. citeturn12view2turn22view1turn30search2turn18search0turn31view0

**Flight planning and execution.** I would separate `trip_or_mission`, `trip_party`, `flight_number`, `flight_leg`, `turnaround_link`, `aircraft_assignment`, `crew_assignment`, `flight_release`, `operational_control_record`, `flight_locating_record`, `flight_plan_reference`, `dispatch_package`, `manifest`, `weight_balance_run`, `fuel_plan`, `delay_event`, and `irregularity`. This is the place where airline-style modeling matters most: IATA AIDX treats the flight leg as the principal operational data structure, not the whole customer trip, and it explicitly models turnarounds as relationships between arriving and departing legs. The FAA rules line up with that approach because the manifest, locating record, operational-control determination, charts/checklists, and many mechanical irregularities are all attached to the individual movement, not to a generic reservation. citeturn11view0turn10view4turn21view0turn12view7turn23view2turn23view0turn29view0

**Crew, qualifications, and training.** I would create `person`, `crew_member`, `crew_role`, `certificate_rating`, `medical_certificate`, `experience_ledger`, `recency_event`, `crew_assignment`, `designated_pic_sic`, `duty_period`, `rest_period`, `training_program`, `training_curriculum`, `training_event`, `check_event`, `route_check`, `qualification`, and `checker_authorization`. The rules are explicit that operators must keep detailed records of certificates, ratings, experience, medicals, tests, checks, route checks, training phases, and flight time, and that those records exist per person, per aircraft type, and over time. That makes a simple boolean field like `is_current = true` too weak for a production-grade operations system. citeturn28view0turn28view1turn14search3turn21view4turn21view5turn23view3turn24view1turn25search0turn24view2turn13view6

**Owners, passengers, and commercial context.** Even if you are not building a full reservation system yet, you still need `passenger`, `customer_or_account`, `fractional_owner`, `fractional_share`, `fractional_owner_aircraft`, `manifest_item`, `special_assistance_note`, and `trip_party_role`. Part 91K explicitly requires a current list of fractional owners and associated aircraft with enough detail to determine the minimum ownership interest, and both Part 91K and Part 135 require manifests with passenger counts and crew position assignments. That means owner and passenger relationships are operational records, not just CRM data. citeturn28view1turn23view0turn29view0

**Safety and SMS.** I would create `safety_report`, `incident_or_accident`, `hazard`, `risk_assessment`, `mitigation`, `corrective_action`, `safety_assurance_review`, `safety_promotion_event`, and possibly `sms_declaration_of_compliance`. Part 91K already requires internal anonymous safety reporting and incident-response procedures, and Part 5 now makes SMS a live requirement for Part 135. FAA guidance for small operators also shows that the process can be lightweight, but the underlying data objects still need to exist if you want trend analysis and closed-loop corrective action rather than ad hoc notes. citeturn13view2turn9view7turn10view6turn11view3

## Canonical entity relationships

If I had to reduce the entire design to a single principle, it would be this: make `flight_leg`, `operating_authority`, `aircraft`, and `crew_qualification` the four anchor entities. Almost every other table should hang cleanly off one or more of those anchors. That pattern matches both the AIDX operational model and the FAA’s recordkeeping logic. It also keeps one Part 91/91K/135 app from fragmenting into separate mini-systems. Part 91K even explicitly allows a dual-certificated program manager to satisfy its recordkeeping requirements with equivalent Part 121 or Part 135 records, which argues strongly for one shared canonical schema with rule-specific validations instead of separate databases by regulatory part. citeturn11view0turn29view0

```text
Operator
 ├── OperatingAuthority
 │    ├── AuthorityRevision
 │    ├── AuthorityAircraft
 │    ├── AuthorityArea
 │    ├── AuthorityAirportLimit
 │    └── AuthorityPolicy
 ├── Base
 ├── Manual
 │    └── ManualRevision
 └── PersonRoleAssignment

Aircraft
 ├── AircraftConfiguration
 ├── AircraftCapability
 ├── ComponentInstallationHistory
 │    └── ComponentSerial
 ├── InspectionProgram
 ├── MaintenanceProgram
 └── Discrepancy / Deferral / AirworthinessRelease

TripOrMission
 └── FlightLeg
      ├── AircraftAssignment
      ├── CrewAssignment
      ├── OperationalControlRecord
      ├── FlightRelease
      ├── FlightLocatingRecord
      ├── Manifest
      ├── WeightBalanceRun
      ├── DispatchPackage
      ├── DelayEvent / Irregularity
      └── TurnaroundLink to prior/subsequent FlightLeg

CrewMember
 ├── CertificateRating
 ├── MedicalCertificate
 ├── ExperienceLedger
 ├── Qualification
 ├── TrainingEvent
 ├── CheckEvent
 ├── RouteCheck
 └── DutyPeriod / RestPeriod / RecencyEvent

Safety
 ├── SafetyReport
 ├── Hazard
 ├── RiskAssessment
 ├── Mitigation
 └── CorrectiveAction
```

The most important relationship to encode explicitly is **flight leg to governing authority**. Do not assume one operator always flies under one rule set. Instead, each leg should carry an `authority_revision_id` or equivalent pointer to the governing operational context. That is especially important because Part 91K requires a written per-flight document stating both the entity having operational control and the part under which the flight is operated, while Part 135 requires named people authorized to exercise operational control and embeds those roles in the manual. In practice, that means `flight_leg` should join to `operational_control_record`, and that record should identify the controlling entity, the responsible authority profile, and the release decision. citeturn29view0turn14search2turn32view0

The next key relationship is **trip to leg to turnaround**. A customer trip, owner mission, or charter itinerary can include multiple flights; a single flight number can cover more than one leg; and an aircraft turnaround is really the relationship between the arriving leg and the departing leg of the same aircraft. That is why the internal model should treat `trip_or_mission` as the customer-facing container and `flight_leg` as the operational atomic unit. If you later exchange schedule or operational messages with external parties, map that structure outward to AIDX and SSIM rather than forcing your core schema to use a schedule-centric abstraction everywhere. citeturn11view0turn10view4turn5search1

You should also make **effective dating** a first-class design feature. Manuals are revision-controlled; OpSpecs and MSpecs are amended; route qualifications and checks expire; recency windows roll every 90 days or 12 months; and aircraft capabilities can change by configuration, inspection program, or authorization. That means many core junctions should have `effective_from`, `effective_to`, `supersedes_id`, and `status` columns rather than a single “current” row that gets overwritten. The same applies to pilot qualifications, manual revisions, aircraft capabilities, and rule-authority snapshots used by a specific leg. citeturn32view0turn32view1turn12view9turn13view0turn21view5turn23view3turn24view1turn24view2

Finally, do not model crew status as a single current flag. A better pattern is `crew_member` → `qualification` → `aircraft_type_or_family` + `seat_role` + `operation_type` + effective dates, with separate child events for training, competency checks, instrument checks, route checks, recency landings, and duty/rest history. The source material is too time-bound and too role-specific for anything flatter. citeturn28view0turn28view1turn21view4turn21view5turn23view3turn24view1turn25search0turn24view2

## Recordkeeping and audit design

Record retention should be designed into the schema itself, not left to application code. Part 135 requires the current aircraft list to be kept for at least six months, pilot and required flight-attendant records for at least twelve months, and multiengine load manifests for at least thirty days. Part 91K requires the aircraft-equipment list for at least six months, pilot and flight-attendant records for at least twelve months and at least twelve months after separation, load manifests for at least thirty days, and the per-flight operational-control document for at least thirty days. This is a strong argument for a `record_class` plus `retention_policy` layer and for avoiding hard deletes on operational records. citeturn28view0turn28view1turn29view0

For baseline Part 91 and for any 91K/135 maintenance module, maintenance records need their own audit shape. FAA rules require records of maintenance, preventive maintenance, alterations, required or approved inspections, the work performed, date of completion, and the signature/certificate number of the approving person, along with total time in service, life-limited-part status, and time since overhaul. Part 91 also requires owners/operators to ensure maintenance entries are made, and to repair, replace, remove, or inspect inoperative items allowed under § 91.213 at the next required inspection. In practical terms, this means every maintenance-related table should capture who did the work, who approved return to service, when it happened, what configuration state it affected, and whether it cleared a discrepancy or left a controlled deferral in place. citeturn12view2turn22view1turn13view8

Reliability and defect analytics should be backed by explicit event tables, not by parsing notes after the fact. Part 91K CAMP rules require mechanical reliability reports and a monthly mechanical-interruption summary for diversions, unscheduled changes, and propeller featherings; Part 135 requires service-difficulty reporting, including the defect nature, affected part/system, apparent cause, and other corrective-action information. FAA reliability guidance adds that CAMP reliability programs should support operational data collection, analysis, reporting, alerting, and time-limit decisions, and that operators may need a way to capture failures that ordinary reliability feeds miss but that are evident in logbook writeups or routine task findings. That points to dedicated entities like `reliability_event`, `service_difficulty_report`, `interruption_summary`, `alert_threshold`, and `corrective_action`. citeturn24view3turn31view0turn10view0turn10view2turn11view2

The safest data-governance pattern here is append-only operational history plus versioned “current view” tables. In other words, let users inactivate, supersede, or correct records, but do not let them silently overwrite the underlying operational trail. That approach is not merely a software preference; it is the easiest way to stay aligned with the FAA’s time-based records, revisions, checks, and return-to-service approvals. citeturn32view0turn32view1turn28view0turn28view1turn12view2

## External data and interoperability

Reference data should come from authoritative aviation sources and be stored with effective dates. FAA aeronautical data is disseminated on the AIRAC cycle, the Chart Supplement is issued every 56 days, the FAA’s Terminal Procedures Publication contains instrument approach, departure, arrival, and airport diagram content, and the FAA Data Portal exposes services such as airport status, chart supplement search, instrument procedure access, NOTAMs, and SWIM. For your schema, that means `airport`, `runway`, `navaid`, `procedure`, `airport_diagram`, `chart_edition`, `notam_reference`, and `airac_cycle` should be reference tables with valid-from / valid-to dates rather than static lookup rows. citeturn26search3turn26search1turn26search8turn26search14turn19search15turn19search16

Weather belongs in the system as both live data and dispatch evidence. The Aviation Weather Center’s Data API is explicitly built for machine-to-machine access to aviation weather information, and AWC documents METARs, TAFs, PIREPs, SIGMETs, G-AIRMETs, and related datasets through that API. Because Part 91 preflight rules and Part 91K/135 operating-information rules require current information to be available and used by the pilot, a good design pattern is to store the live weather feed in reference tables but also snapshot the exact weather, chart, and notice package attached to each released leg. That way, the app can answer both “what is current now?” and “what did the crew rely on when this flight launched?” citeturn27search0turn27search11turn27search13turn13view7turn12view7turn21view0

For interoperability, I would keep the internal model richer than any message standard, but publish through adapters that map your canonical entities outward. AIDX is especially useful for day-of-operations exchange because it centers the flight leg, supports multiple legs in a message, and explicitly models associated arrival/departure legs in a turnaround. SSIM is the relevant schedule-exchange standard if you later need schedule or slot-style outputs. In other words, use `flight_leg` as the internal truth, then map to AIDX or SSIM at the integration edge. citeturn11view0turn9view8turn5search1turn5search8

## Build sequence for a small operator

If I were building version one for a 10–100 aircraft operator, I would ship a compliance-first core before adding optimization or analytics. The first release would include `operator`, `operating_authority`, `manual_revision`, `aircraft`, `person`, `crew_assignment`, `flight_leg`, `operational_control_record`, `flight_locating_record`, `manifest`, `weight_balance_run`, and the minimum airport/procedure reference data needed to support current pilot information and safe release decisions. Those are the tables that most directly map to the FAA’s operational-control, locating, manifest, weight-and-balance, and current-information requirements. citeturn23view2turn23view0turn29view0turn21view0turn12view7

The second release would add the time-dependent logic that most often breaks real operations: `qualification`, `training_event`, `check_event`, `route_check`, `recency_event`, `duty_period`, `rest_period`, `discrepancy`, `maintenance_event`, and `airworthiness_release`. That step turns the product from a scheduling database into a dispatchable operations system, because it lets you answer “may this crew legally and safely fly this leg in this aircraft under this authority right now?” rather than only “is the aircraft and crew available on the calendar?” citeturn21view4turn21view5turn23view3turn24view1turn24view2turn32view1turn12view2

The third release would add the trend and assurance layers: `service_difficulty_report`, `mechanical_reliability_report`, `interruption_summary`, `hazard`, `risk_assessment`, `corrective_action`, and external-feed snapshots. That sequence fits the FAA’s own small-organization guidance, which recognizes that smaller operators can begin with simpler recording mechanisms, but it still sets you up for the Part 135 SMS environment and for CAMP-style reliability analysis as the fleet and operation grow. citeturn10view6turn11view3turn9view7turn10view0turn31view0turn30search2

The highest-confidence design choice across Part 91, Part 91K, and Part 135 is therefore a **shared canonical schema with authority-specific validations**: one core set of people, aircraft, flight-leg, maintenance, and safety entities; one explicit governing-authority link on each leg; and one versioned audit trail for manuals, qualifications, and releases. That structure lines up with FAA recordkeeping rules, with AIDX’s leg-centric model, and with the reality that 91K and 135 records overlap heavily enough for the FAA to allow equivalent records in dual-authority environments. citeturn29view0turn11view0