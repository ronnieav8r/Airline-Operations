# ReleasePackage Plan

Last updated: 2026-06-10

## Decision

`ReleasePackage` is the durable release packet/bundle. It is additive and wraps
the current `FlightRelease`; it does not replace `FlightRelease` as the release
decision/status record.

## Purpose

The package answers:

- What evidence was included in the release packet?
- Which readiness snapshot or package preview did the operator see?
- Which operational-control record and FlightRelease does the packet belong to?
- Which aircraft, airworthiness, manifest, W&B, locating, dispatch, weather,
  NOTAM, and flight-plan artifacts were present at capture time?

## Relationship To Existing Records

- `FlightLeg`: package belongs to one operational leg.
- `OperationalControlRecord`: package records the governing operator,
  operating authority, revision, and controlling entity.
- `FlightRelease`: package wraps the release decision/status record.
- `ReleaseReadinessSnapshot`: package may link to a captured readiness view.
- Evidence records: package links to current evidence artifacts rather than
  duplicating every table.

## First Schema Direction

Add:

- `ReleasePackage` header.
- `ReleasePackageEvidenceLink` rows.
- Package status enum.
- Evidence link type enum.

Use JSON only for copied metadata/summaries where source record structures vary.
Keep hard relational links for core records: FlightLeg, OperationalControlRecord,
FlightRelease, and optional readiness snapshot.

Prompt 170 implementation status: complete as an additive schema foundation.
Package preview UI and capture actions remain deferred.

Prompt 171 implementation status: complete. FlightLeg detail now shows a
read-only ReleasePackage completeness preview and existing package evidence
links when present. Capture actions remain deferred.

Prompt 172 implementation status: complete. FlightLeg detail now supports an
explicit preview capture action that creates a ReleasePackage header plus
evidence links without changing `FlightRelease.status`.

Prompt 173 QA status: static validation complete. Runtime workflow smoke is
pending because Docker Desktop was unavailable.

Prompt 224 planning status: complete. `ReleasePackage` remains the evidence
bundle around `FlightRelease`. Final package capture should be planned
separately in Prompt 226 and must not replace `FlightRelease` or introduce hard
blocking.

## First Workflow Direction

Start with read-only preview, then explicit preview capture. Do not create
packages automatically on page load or as a side effect of release actions.

## Deferred

- Hard release blocking.
- Final legal release signatures.
- File uploads or document generation.
- Provider evidence fetching.
- Override workflow.
- Replacing `FlightRelease`.
