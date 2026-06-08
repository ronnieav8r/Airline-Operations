import {
  ImportBatchStatus,
  ImportDomain,
  ImportFindingSeverity,
  ImportMappingDecisionStatus,
  ImportValidationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CountBy<T extends string> = {
  key: T | "UNSET";
  count: number;
};

export type ImportStagingRecentBatch = {
  id: string;
  batchKey: string | null;
  importDomain: ImportDomain;
  status: ImportBatchStatus;
  sourceSystem: string | null;
  notesPresent: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
  sourceCount: number;
  rowCount: number;
  findingCount: number;
  decisionCount: number;
};

export type ImportStagingSourceSummary = {
  id: string;
  batchKey: string | null;
  sourceName: string;
  sourceType: string;
  sourceHash: string | null;
  rowCount: number;
  createdAt: Date;
};

export type ImportStagingDiagnosticReport = {
  generatedAt: Date;
  summary: {
    importBatches: number;
    importSources: number;
    importStagingRows: number;
    importValidationFindings: number;
    importMappingDecisions: number;
  };
  batchDomainCounts: CountBy<ImportDomain>[];
  batchStatusCounts: CountBy<ImportBatchStatus>[];
  rowValidationCounts: CountBy<ImportValidationStatus>[];
  rowTargetTypeCounts: CountBy<string>[];
  findingSeverityCounts: CountBy<ImportFindingSeverity>[];
  findingCodeCounts: CountBy<string>[];
  mappingDecisionCounts: CountBy<ImportMappingDecisionStatus>[];
  mappingTargetTypeCounts: CountBy<string>[];
  recentBatches: ImportStagingRecentBatch[];
  recentSources: ImportStagingSourceSummary[];
};

function mapGroupCount<T extends string, TRow extends Record<string, unknown>>(
  rows: TRow[],
  key: keyof TRow,
): CountBy<T>[] {
  return rows.map((row) => ({
    key: (row[key] ?? "UNSET") as T | "UNSET",
    count: (row._count as number | undefined) ?? 0,
  }));
}

export async function getImportStagingDiagnosticReport(): Promise<ImportStagingDiagnosticReport> {
  const [
    importBatches,
    importSources,
    importStagingRows,
    importValidationFindings,
    importMappingDecisions,
    batchDomainGroups,
    batchStatusGroups,
    rowValidationGroups,
    rowTargetTypeGroups,
    findingSeverityGroups,
    findingCodeGroups,
    mappingDecisionGroups,
    mappingTargetTypeGroups,
    recentBatchRows,
    recentSourceRows,
  ] = await Promise.all([
    prisma.importBatch.count(),
    prisma.importSource.count(),
    prisma.importStagingRow.count(),
    prisma.importValidationFinding.count(),
    prisma.importMappingDecision.count(),
    prisma.importBatch.groupBy({
      by: ["importDomain"],
      _count: true,
      orderBy: { importDomain: "asc" },
    }),
    prisma.importBatch.groupBy({
      by: ["status"],
      _count: true,
      orderBy: { status: "asc" },
    }),
    prisma.importStagingRow.groupBy({
      by: ["validationStatus"],
      _count: true,
      orderBy: { validationStatus: "asc" },
    }),
    prisma.importStagingRow.groupBy({
      by: ["mappedTargetType"],
      _count: true,
      orderBy: { mappedTargetType: "asc" },
    }),
    prisma.importValidationFinding.groupBy({
      by: ["severity"],
      _count: true,
      orderBy: { severity: "asc" },
    }),
    prisma.importValidationFinding.groupBy({
      by: ["code"],
      _count: true,
      orderBy: { code: "asc" },
    }),
    prisma.importMappingDecision.groupBy({
      by: ["decision"],
      _count: true,
      orderBy: { decision: "asc" },
    }),
    prisma.importMappingDecision.groupBy({
      by: ["targetType"],
      _count: true,
      orderBy: { targetType: "asc" },
    }),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: {
          select: {
            sources: true,
            stagingRows: true,
          },
        },
      },
    }),
    prisma.importSource.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        batch: { select: { batchKey: true } },
        _count: { select: { stagingRows: true } },
      },
    }),
  ]);

  const recentBatches = await Promise.all(
    recentBatchRows.map(async (batch): Promise<ImportStagingRecentBatch> => {
      const [findingCount, decisionCount] = await Promise.all([
        prisma.importValidationFinding.count({
          where: { stagingRow: { batchId: batch.id } },
        }),
        prisma.importMappingDecision.count({
          where: { stagingRow: { batchId: batch.id } },
        }),
      ]);

      return {
        id: batch.id,
        batchKey: batch.batchKey,
        importDomain: batch.importDomain,
        status: batch.status,
        sourceSystem: batch.sourceSystem,
        notesPresent: Boolean(batch.notes),
        reviewedAt: batch.reviewedAt,
        createdAt: batch.createdAt,
        sourceCount: batch._count.sources,
        rowCount: batch._count.stagingRows,
        findingCount,
        decisionCount,
      };
    }),
  );

  return {
    generatedAt: new Date(),
    summary: {
      importBatches,
      importSources,
      importStagingRows,
      importValidationFindings,
      importMappingDecisions,
    },
    batchDomainCounts: mapGroupCount<ImportDomain, (typeof batchDomainGroups)[number]>(
      batchDomainGroups,
      "importDomain",
    ),
    batchStatusCounts: mapGroupCount<ImportBatchStatus, (typeof batchStatusGroups)[number]>(
      batchStatusGroups,
      "status",
    ),
    rowValidationCounts: mapGroupCount<
      ImportValidationStatus,
      (typeof rowValidationGroups)[number]
    >(rowValidationGroups, "validationStatus"),
    rowTargetTypeCounts: mapGroupCount<string, (typeof rowTargetTypeGroups)[number]>(
      rowTargetTypeGroups,
      "mappedTargetType",
    ),
    findingSeverityCounts: mapGroupCount<
      ImportFindingSeverity,
      (typeof findingSeverityGroups)[number]
    >(findingSeverityGroups, "severity"),
    findingCodeCounts: mapGroupCount<string, (typeof findingCodeGroups)[number]>(
      findingCodeGroups,
      "code",
    ),
    mappingDecisionCounts: mapGroupCount<
      ImportMappingDecisionStatus,
      (typeof mappingDecisionGroups)[number]
    >(mappingDecisionGroups, "decision"),
    mappingTargetTypeCounts: mapGroupCount<string, (typeof mappingTargetTypeGroups)[number]>(
      mappingTargetTypeGroups,
      "targetType",
    ),
    recentBatches,
    recentSources: recentSourceRows.map((source) => ({
      id: source.id,
      batchKey: source.batch.batchKey,
      sourceName: source.sourceName,
      sourceType: source.sourceType,
      sourceHash: source.sourceHash,
      rowCount: source._count.stagingRows,
      createdAt: source.createdAt,
    })),
  };
}
