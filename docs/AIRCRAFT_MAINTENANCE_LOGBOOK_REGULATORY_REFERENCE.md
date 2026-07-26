# Aircraft Maintenance Logbook Regulatory Reference

Last updated: 2026-07-26

## MX-002R Product Boundary

AeroOps stores technician/inspector approval as immutable logbook signatures.
Maintenance Control release is a separate operational acknowledgement with its
own actor, time, and note; it does not impersonate the technician or inspector.
A required inspection item needs a different authorized inspector. Ordinary
maintenance does not universally require a second signature. The operator's
approved manual remains controlling.

This document is a working product reference for building an aircraft-tail-number maintenance logbook inside AeroOps. It is not legal advice, a substitute for an operator manual, or FAA approval. Before this feature is used as an official record system, the operator must align it with its FAA-approved or FAA-accepted manuals, OpSpecs/MSpecs, inspection program, MEL/CDL/NEF procedures, and the expectations of its assigned FAA oversight office.

## Product Intent

The maintenance logbook should become the aircraft-centered system of record for maintenance status, discrepancies, corrective actions, deferrals, inspections, return-to-service approvals, operator-specific airworthiness releases or maintenance log entries, component status, and supporting documents. The crew-facing maintenance tab can be a simplified view into that aircraft record, but the regulatory record must be tied primarily to the aircraft tail number and the operator's maintenance program.

Current AeroOps UI note: Maintenance Control uses the wide per-aircraft drawer
inside `/maintenance?view=logbook` as the normal working surface. The fleet
overview remains aircraft-grouped; summary clicks only expand or collapse the
quick list, while `View full logbook` and entry `Review` open URL-addressable
drawer state. The direct aircraft logbook route remains a compatible deep-link
and export surface. Both surfaces reuse the same domain services and
authorization rules; the drawer does not create a second record lifecycle.

The application must clearly distinguish between:

- Crew reports, squawks, and operational notes.
- Draft maintenance work records.
- Signed regulatory maintenance record entries.
- Return-to-service approvals.
- Operator-specific airworthiness releases or aircraft maintenance log entries.
- Deferrals under approved procedures, such as MEL, CDL, NEF, or operator-specific procedures.

The system should support Part 91 and Part 135 style workflows. Part 135 use is the higher compliance bar because the aircraft maintenance log and airworthiness release process must line up with the certificate holder's manual system.

Current AeroOps implementation note: routine aircraft serviceability is computed
from discrepancies, deferrals, maintenance events, Return to Service records,
and later inspection due tracking. A current `AirworthinessRelease` is no
longer the normal everyday maintenance gate. See
`docs/MAINTENANCE_SERVICEABILITY_RTS_LIFECYCLE.md`.

## Regulatory Baseline

### 14 CFR Part 43

Part 43 controls who may perform maintenance, who may approve return to service, and what the maintenance record entry must contain.

Feature implications:

- The app must capture the person performing the work when different from the person approving the work.
- The app must capture the approving person's signature, certificate number, and certificate type or authorization basis.
- A signed maintenance entry must identify the work performed or reference acceptable data.
- A signed maintenance entry must include the date the work was completed.
- A return-to-service approval must be explicit and tied only to the work actually performed.
- Inspection entries need a separate inspection-oriented record shape, including inspection type, extent, date, total time in service where applicable, approval or disapproval for return to service, and discrepancy handling.
- Major repairs and major alterations must be handled with FAA Form 337 support instead of pretending a normal logbook entry is enough.
- The system must make falsification, backdating, silent alteration, and signature reuse difficult or impossible.

Relevant sections:

- 14 CFR 43.3: persons authorized to perform maintenance.
- 14 CFR 43.5: approval for return to service after maintenance, preventive maintenance, rebuilding, or alteration.
- 14 CFR 43.7: persons authorized to approve return to service.
- 14 CFR 43.9: maintenance, preventive maintenance, rebuilding, and alteration record content.
- 14 CFR 43.11: inspection record content.
- 14 CFR 43.12: falsification, reproduction, or alteration of records.
- 14 CFR Part 43 Appendix B: recording major repairs and major alterations.

### 14 CFR Part 91

Part 91 places maintenance status and recordkeeping responsibility on the owner/operator and controls operation after maintenance.

Feature implications:

- The aircraft cannot be shown as maintenance-released after maintenance unless the required approval and record entry are complete.
- The aircraft profile must preserve records needed to prove total time in service, inspection status, AD compliance status, life-limited part status, time since overhaul where required, and major repair/alteration records.
- Retention categories matter. Some records may be retained until repeated or superseded, while status records and certain aircraft records must remain available and transfer with the aircraft.
- The system must be able to produce records for FAA or NTSB inspection.

Relevant sections:

- 14 CFR 91.405: owner/operator maintenance responsibility.
- 14 CFR 91.407: operation after maintenance, preventive maintenance, rebuilding, or alteration.
- 14 CFR 91.409: inspections.
- 14 CFR 91.411: altimeter and static system tests.
- 14 CFR 91.413: ATC transponder tests and inspections.
- 14 CFR 91.417: maintenance records.
- 14 CFR 91.419: transfer of maintenance records.

### 14 CFR Part 135

Part 135 adds certificate-holder procedures, aircraft maintenance log requirements, mechanical irregularity reporting, maintenance recording requirements, and airworthiness release or maintenance log entry requirements.

Feature implications:

- A Part 135 aircraft needs an aircraft maintenance log available to the crew for recording, deferring, and correcting mechanical irregularities.
- The pilot in command must be able to record or have recorded mechanical irregularities that come to the pilot's attention during flight time.
- Before flight, the crew needs an easy way to determine the status of each prior irregularity.
- Maintenance records must support the certificate holder's manual system.
- The application should be configurable to the operator's FAA-accepted manual language, including who may make entries, who may issue releases, what exact statements are required, how copies are distributed, and how long records are retained.
- Service difficulty and mechanical interruption reporting can be adjacent workflows, but should not be silently inferred from normal logbook entries. The app should flag candidates for review.

Relevant sections:

- 14 CFR 135.65: reporting mechanical irregularities and aircraft maintenance log.
- 14 CFR 135.411: applicability of Part 135 maintenance rules.
- 14 CFR 135.415: service difficulty reports.
- 14 CFR 135.417: mechanical interruption summary reports.
- 14 CFR 135.419: approved aircraft inspection programs, when used.
- 14 CFR 135.427: manual requirements for certificate holders subject to those rules.
- 14 CFR 135.437: authority to perform and approve maintenance.
- 14 CFR 135.439: maintenance recording requirements.
- 14 CFR 135.441: transfer of maintenance records.
- 14 CFR 135.443: airworthiness release or aircraft maintenance log entry.

## Electronic Records And Signatures

FAA AC 120-78B is the key design reference for electronic signatures, electronic recordkeeping, and electronic manuals. It describes acceptable means, but not the only means, for using digital systems for records and signatures required by 14 CFR.

The logbook must be designed around authenticity, integrity, security, retrieval, and preservation.

Minimum product requirements:

- Unique user accounts. No shared mechanic, crew, or maintenance-control logins.
- Role-based authority. A crew member can create a squawk, but cannot sign a maintenance return-to-service entry unless separately authorized.
- Strong authentication for users who sign regulatory records.
- Signature intent. The signer must take a deliberate action that says what they are signing and why.
- Signature meaning. The signature record must state whether it is a maintenance entry approval, inspection approval/disapproval, deferral authorization, airworthiness release, amendment, deletion request, or administrative review.
- Signature metadata. Store signer name, user id, certificate number, certificate type, authorization basis, timestamp, IP/device metadata where appropriate, and signed record hash.
- Record immutability. Once signed, the signed content must lock. Corrections should be amendments or superseding entries, not silent edits.
- Audit trail. Record create, view, edit, sign, amend, void, export, print, delete-request, attachment upload, attachment view, and permission changes.
- Export and retrieval. Authorized users must be able to retrieve and produce records in a readable form without relying on tribal knowledge or database access.
- Backup and disaster recovery. The operator must be able to recover records and prove integrity after system failure.
- Private storage. Attachments and signed documents should live in private object storage, not public URLs.

Part 91 operators that are not fractional ownership program managers may be able to use electronic systems without formal FAA authorization if the system meets the regulations. Part 135 certificate-holder use should be treated as requiring alignment with manuals and likely FAA acceptance or authorization through the operator's manual/OpSpec process.

## Logbook Data Model Requirements

### Aircraft Master Record

Each aircraft should have a durable aircraft maintenance identity:

- Tail number.
- Aircraft serial number.
- Make/model/series.
- Operator or certificate holder.
- Maintenance program basis.
- Inspection program basis.
- Current total time in service.
- Current cycles/landings if tracked.
- Tach/Hobbs if applicable.
- Engine, propeller, rotor, APU, and appliance/component identities where tracked.
- Current aircraft status: serviceable, unscheduled maintenance, deferred discrepancy, inspection due, grounded, sold/archived.

### Core Record Types

The first full version should support these record types:

- Crew discrepancy or squawk.
- Maintenance discrepancy.
- Corrective action.
- Preventive maintenance entry.
- Maintenance entry under 14 CFR 43.9.
- Inspection entry under 14 CFR 43.11.
- Airworthiness release or aircraft maintenance log entry under Part 135.
- Return to Service record tied to the corrective maintenance or inspection
  being approved.
- Deferral entry under MEL, CDL, NEF, or approved operator procedure.
- Component removal and installation.
- Part use and traceability attachment.
- AD compliance record.
- Service bulletin or service letter compliance record.
- Life-limited part status record.
- Time-controlled inspection or overhaul status record.
- Major repair/alteration record with FAA Form 337 attachment and tracking.
- Maintenance release amendment or correction.
- Void or administrative correction record.

### Common Fields

All logbook records should carry:

- Record id and human-readable log number.
- Aircraft id and tail number.
- Record type.
- Status: draft, open, deferred, corrected, ready for review, signed, released, voided, superseded.
- Date/time created.
- Date/time work completed, when applicable.
- Location/station.
- Source: crew, maintenance, inspection, ops, import, system.
- ATA/system category where useful.
- Title or short summary.
- Narrative description.
- References to manuals, task cards, ADs, SBs, MEL/CDL/NEF items, inspection program tasks, or approved data.
- Attachments.
- Related flight, if the issue was found during a specific flight.
- Related work order, if the operator uses work orders.
- Created by, last edited by, and signed by.
- Audit history.

### Signed Maintenance Entry Fields

For a Part 43 maintenance entry, require:

- Work description or reference to acceptable data.
- Completion date.
- Person performing the work, if different from the person approving.
- Approving person's legal name.
- Approving person's signature.
- Certificate number.
- Certificate type or authorization.
- Approval-for-return-to-service statement tied to the work performed.
- Signed content hash.

### Return To Service Fields

For a first-class Return to Service record, require:

- Aircraft and tail number.
- Linked discrepancy, maintenance event, and logbook entry when applicable.
- Work completed date/time.
- Return-to-service statement tied to the specific discrepancy or maintenance
  occurrence.
- Signer identity and maintenance authority profile.
- Certificate number, certificate type, and authorization basis.
- Signature timestamp.
- Signed-content hash.
- Status: draft, ready for signature, signed, voided, or superseded.

### Inspection Entry Fields

For an inspection entry, require:

- Inspection type.
- Brief description or scope/extent.
- Date.
- Aircraft total time in service.
- Inspection result: approved for return to service or disapproved.
- If disapproved, a list of discrepancies and unairworthy items provided to the owner/operator.
- Signer name, signature, certificate number, and certificate type/authorization.

### Part 135 Mechanical Irregularity Fields

For a Part 135 aircraft maintenance log entry, require:

- Irregularity text.
- Date/time reported.
- Flight leg and PIC, if reported during flight time.
- Status before next flight.
- Corrective action or deferral action.
- Person taking corrective action.
- Deferral authority, if deferred.
- Crew-visible status and limitations.
- Maintenance-control review status, if used by the operator.

### Deferral Fields

For MEL/CDL/NEF-style deferrals, require:

- Deferral type.
- Approved deferral authority.
- MEL/CDL/NEF item number.
- Category and repair interval, where applicable.
- Deferral open date/time.
- Expiration or repair due date/time.
- Placard requirement.
- Operating limitation text.
- Required procedures, such as M, O, or M/O procedure references.
- Who authorized the deferral.
- Who completed required procedures.
- Extension approval, if allowed and used.
- Closure corrective action.
- Link to the original discrepancy.

## User Experience Requirements

### Crew Mobile View

The crew interface should stay compact and action-oriented:

- Show aircraft maintenance status by tail number.
- Show whether the aircraft is serviceable, deferred with limitations, RTS
  required, not serviceable, or grounded.
- Show open discrepancies and active deferrals.
- Show any operating limitations that matter to today's flight.
- Allow a crew member to create a squawk quickly.
- Allow photo attachments for evidence.
- Allow severity flags such as safety critical, AOG, cabin, avionics, engine, landing gear, interior, or passenger comfort.
- Show prior irregularity status before flight.
- Do not expose maintenance signoff actions unless that user has a maintenance role and authority.

### Maintenance View

Maintenance users need a denser tablet/desktop workflow:

- Filter by tail, status, system, due date, MEL category, station, and assigned mechanic.
- Convert crew squawks into maintenance discrepancies.
- Add corrective action, parts, labor notes, references, and attachments.
- Use common-entry templates with required variables.
- Route entries for review.
- Sign regulatory entries.
- Issue return to service or airworthiness release when authorized.
- Amend or supersede signed entries without destroying the original.
- Export aircraft records for inspection or aircraft sale.

### Operations And Dispatch View

Ops should see a read-only operational snapshot:

- Current serviceability.
- Open discrepancies.
- Active deferrals.
- Crew-visible limitations.
- Next inspection or maintenance due.
- Whether serviceability conditions are met.
- Whether the dispatch package can proceed or needs maintenance review.

Ops should not be able to edit signed maintenance entries unless they also hold a separate maintenance-authorized role.

## Common Entry And Dropdown Template System

The common-entry feature is useful, but it must be designed as a controlled drafting aid, not an auto-signoff tool.

Template principles:

- Templates insert starter text and structured fields.
- The user must review and confirm the final entry before signing.
- Templates should be versioned.
- Templates should be approved by an administrator or maintenance program owner before production use.
- Templates should be scoped by aircraft type, operator, and maintenance program.
- Templates should carry required variables so the final entry is specific.
- Templates should include references to manuals, task cards, inspection program items, MEL/CDL/NEF items, or other approved data where applicable.
- Template changes should not alter already-signed entries.

Suggested template fields:

- Template title.
- Record type.
- ATA/system.
- Aircraft applicability.
- Operator applicability.
- Starter narrative.
- Required variables.
- Optional variables.
- Required references.
- Required attachments.
- Required signer role.
- Whether return to service language is allowed.
- Whether the template may be used by crew, maintenance, or both.
- Revision/version.
- Approval status.
- Retired/replaced-by template id.

Example crew squawk templates:

- Cabin item damaged.
- Passenger seat issue.
- Exterior light inoperative.
- Avionics message observed.
- Fluid leak observed.
- Tire/brake concern.
- Abnormal vibration/noise.
- Post-flight write-up.

Example maintenance corrective action templates:

- Operational check satisfactory.
- Replaced component and ops check good.
- Serviced fluid to specified level.
- Cleaned/inspected and returned to service.
- Adjusted per maintenance manual reference.
- Complied with inspection task.
- Deferred per MEL item with placard and procedure complete.

The final signed entry should still read like a real aircraft maintenance record, not a generic dropdown selection.

## Attachments And Document Storage

The logbook should support secure attachments:

- Photos from crew or maintenance.
- PDF work orders.
- Task cards.
- FAA Form 337.
- FAA Form 8130-3 or other approval tags.
- Invoices.
- Parts traceability documents.
- AD/SB compliance evidence.
- Inspection reports.
- Oil analysis or lab reports.

Storage requirements:

- Private object storage.
- No public file URLs.
- File checksum.
- Content type and file size.
- Uploaded by and uploaded at.
- Linked aircraft and linked logbook entry.
- Access log for upload, view, download, replace, and delete.
- Retention policy aligned with the record type.

## Corrections, Voids, And Amendments

Signed maintenance records should not be edited in place. The app should provide:

- Draft edits before signature.
- Signed lock after signature.
- Amendment entry that references the original signed entry.
- Superseding entry that preserves both old and new versions.
- Void action only for authorized administrators or maintenance-control users, with reason and audit history.
- Display of corrected/superseded status so users do not rely on stale records.

This is both a compliance issue and a trust issue. If signed records can silently change, the system is not suitable as a maintenance record system.

## Role And Permission Model

Suggested roles:

- Crew: create squawks, view crew-relevant aircraft status, add photos, view active limitations.
- PIC: create/confirm mechanical irregularities and review prior irregularity status.
- Maintenance technician: create corrective action drafts and attach evidence.
- Certificated mechanic: sign eligible maintenance entries within certificate authority.
- IA: sign annual/major-repair/major-alteration related records where applicable.
- Repair station authorized signer: sign entries under repair station authority where applicable.
- Maintenance controller: review, route, defer, release, and manage status according to operator policy.
- Maintenance program administrator: manage templates, applicability, inspection programs, retention settings, and user authority.
- Ops/dispatch: view status and release-impacting limitations, but not sign maintenance records.
- System administrator: manage access and infrastructure, but not alter signed maintenance content.

Every permission should be explicit. Administrative system access is not the same as maintenance authority.

## Integration With Current AeroOps Concepts

The existing AeroOps airworthiness work separates aircraft maintenance
serviceability from operational flight release. Keep that split.

Recommended mapping:

- `Discrepancy`: continue using this concept, but expand it into an aircraft logbook discrepancy/write-up.
- `Deferral`: keep as the structured MEL/CDL/NEF/approved-procedure deferral record.
- `MaintenanceEvent`: keep as corrective action and maintenance-work context.
- `ReturnToServiceRecord`: use as the signed approval that clears a corrected
  discrepancy.
- `AirworthinessRelease`: keep as historical/operator-specific Part 135/manual
  release evidence, distinct from operational `FlightRelease`, but do not use
  it as the normal everyday serviceability gate.
- Crew portal maintenance icons: show a summarized status only, with drill-in to aircraft-tail detail.

The crew portal should not become the full maintenance system. It should be the mobile crew access point into the aircraft-tail logbook.

## Suggested Build Slices

### Slice 1: Aircraft-Tail Logbook Foundation

- Add aircraft logbook list/detail by tail number.
- Show open discrepancies, active deferrals, recent corrective actions,
  Return-to-Service status, and computed serviceability.
- Add read-only crew and ops snapshots.
- Keep records non-official until signature controls are built.

### Slice 2: Crew Squawk Entry

- Let crew create a discrepancy from the crew portal.
- Support text, category, severity, phase of flight, flight leg, and photo.
- Show status before next flight.
- Do not allow crew to create a maintenance approval unless they have a maintenance role.

### Slice 3: Maintenance Corrective Action

- Let maintenance convert squawks into corrective actions.
- Add work description, references, parts, attachments, and draft review.
- Add role-gated signer profile fields.

### Slice 4: Electronic Signature And Record Lock

- Add explicit signature action.
- Capture certificate/authorization details.
- Hash signed content.
- Lock signed records.
- Add amendment/supersede flow.
- Add exportable PDF or printable signed record.

### Slice 5: Return To Service And Part 135 Log Entry

- Add signed Return to Service workflow for corrected discrepancies.
- Add operator-configurable release language.
- Add airworthiness release or maintenance log entry workflow.
- Add crew-visible release status and limitations.
- Add before-flight review of unresolved irregularities.

### Slice 6: Deferrals

- Add MEL/CDL/NEF deferral workflow.
- Track categories, intervals, placards, procedures, limitations, repair due, extension, and closure.
- Surface limitations in crew and dispatch views.

### Slice 7: Status Tracking

- Add AD status.
- Add life-limited part tracking.
- Add inspection due tracking.
- Add time since overhaul where applicable.
- Add aircraft sale/transfer export support.

### Slice 8: Common Entry Templates

- Add template library and dropdown insertion.
- Add versioning, approval, applicability, required variables, and retirement.
- Start with crew squawk templates and common corrective-action starter text.

### Slice 9: Compliance Export And Audit Package

- Export selected aircraft records by tail/date/range/status.
- Export FAA/NTSB inspection package.
- Export transfer package for aircraft sale.
- Include attachment manifest, checksums, signatures, and audit trail.

## Compliance Acceptance Checklist

Before treating the feature as official maintenance records:

- Signed maintenance entries satisfy the content expected by 14 CFR 43.9.
- Signed inspection entries satisfy the content expected by 14 CFR 43.11.
- Owner/operator retention and status records satisfy 14 CFR 91.417.
- Transferable records can be exported in readable form.
- Part 135 aircraft maintenance log procedures satisfy the operator manual and 14 CFR 135.65.
- Part 135 airworthiness release or maintenance log entry workflow aligns with 14 CFR 135.443 and the operator manual.
- Electronic records and signatures follow AC 120-78B principles for authenticity, integrity, security, retention, and retrieval.
- Signed records are immutable except through amendment/supersession.
- Users cannot sign records outside their configured authority.
- Attachments are private, access-controlled, checksummed, and retained.
- Audit logs preserve all meaningful access and mutation events.
- The operator can produce records for FAA or NTSB inspection without engineering help.
- The operator's FAA oversight office has accepted or approved the electronic-record process if required for the operation.

## Open Decisions

- Will the first production target be Part 91 only, Part 135, or both?
- Is the app intended to become the official maintenance record system, or an operational mirror of another official system?
- Which aircraft maintenance programs and inspection programs must be supported first?
- What exact Part 135 manual language should the software enforce?
- Does the operator use MEL only, or also CDL, NEF, and company deferral procedures?
- Who is allowed to issue airworthiness releases for each operator?
- What signature authentication level is required by the operator?
- What export format will satisfy the operator's FAA oversight office?

## Source References

- FAA, AC 43-9D, Maintenance Records and FAA Form 8130-3 Return to Service: https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1044416
- FAA, AC 120-78B, Electronic Signatures, Electronic Recordkeeping, and Electronic Manuals: https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1043396
- FAA, Form FAA 337, Major Repair and Alteration: https://www.faa.gov/forms/index.cfm/go/document.information/documentid/185675
- FAA, AC 43.9-1G, Instructions for Completion of FAA Form 337: https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1036848
- eCFR, 14 CFR Part 43: https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43
- eCFR, 14 CFR Part 91 Subpart E: https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-E
- eCFR, 14 CFR Part 135 Subpart B: https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-B
- eCFR, 14 CFR Part 135 Subpart J: https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135/subpart-J
- Cornell LII readable CFR mirror, 14 CFR 43.9: https://www.law.cornell.edu/cfr/text/14/43.9
- Cornell LII readable CFR mirror, 14 CFR 43.11: https://www.law.cornell.edu/cfr/text/14/43.11
- Cornell LII readable CFR mirror, 14 CFR 91.417: https://www.law.cornell.edu/cfr/text/14/91.417
- Cornell LII readable CFR mirror, 14 CFR 135.65: https://www.law.cornell.edu/cfr/text/14/135.65
- Cornell LII readable CFR mirror, 14 CFR 135.439: https://www.law.cornell.edu/cfr/text/14/135.439
- Cornell LII readable CFR mirror, 14 CFR 135.443: https://www.law.cornell.edu/cfr/text/14/135.443
