# Prompt 221: FlightLeg Legacy Dependency Inventory

## Summary

Inventory remaining legacy `Flight` dependencies and classify each as
cutover-ready, compatibility-required, or archive/diagnostic.

## Result

Added `docs/FLIGHTLEG_LEGACY_DEPENDENCY_INVENTORY.md`.

## Key Decision

Prompt 222 should only move remaining Flight-first internal read consumers to
FlightLeg-primary reads. It must not remove legacy tables, compatibility API
paths, bridge writes, seed/backfill behavior, or parity diagnostics.

## Validation

- `git diff --check`
