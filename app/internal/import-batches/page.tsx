import { ImportDomain, ImportSourceType } from "@prisma/client";
import Link from "next/link";

import {
  createImportBatchAction,
  createImportSourceAction,
  updateImportBatchAction,
} from "@/app/internal/import-batches/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDateTimeLabel(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function SelectField<T extends string>({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: T;
  label: string;
  name: string;
  options: T[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm"
        defaultValue={defaultValue ?? ""}
        name={name}
        required
      >
        <option disabled value="">
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      />
    </label>
  );
}

function NotesField({ defaultValue, name = "notes" }: { defaultValue?: string | null; name?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700">Notes</span>
      <textarea
        className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm"
        defaultValue={defaultValue ?? ""}
        name={name}
      />
    </label>
  );
}

export default async function ImportBatchesPage({ searchParams }: PageProps) {
  const [params, batches] = await Promise.all([
    searchParams,
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sources: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            sources: true,
            stagingRows: true,
          },
        },
      },
    }),
  ]);
  const error = firstSearchParam(params.error);
  const message = firstSearchParam(params.message);
  const importDomains = Object.values(ImportDomain);
  const sourceTypes = Object.values(ImportSourceType);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Metadata Workflow
          </p>
          <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Import Batches
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Create import batch and source metadata only. This page does not upload,
                parse, stage rows, run dry-runs, apply imports, or write operational records.
              </p>
            </div>
            <Link
              className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              href="/internal/import-staging-readiness"
            >
              View staging diagnostic
            </Link>
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </section>
        ) : null}
        {message ? (
          <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <form
            action={createImportBatchAction}
            className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-zinc-900">Create batch metadata</h2>
            <div className="mt-4 grid gap-3">
              <SelectField label="Import domain" name="importDomain" options={importDomains} />
              <TextField label="Source system" name="sourceSystem" required />
              <TextField label="Batch key" name="batchKey" />
              <NotesField />
            </div>
            <button
              className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
              type="submit"
            >
              Create batch
            </button>
          </form>

          <form
            action={createImportSourceAction}
            className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-zinc-900">Add source metadata</h2>
            {batches.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                Create a batch before adding source metadata.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-zinc-700">Import batch</span>
                    <select
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm"
                      name="batchId"
                      required
                    >
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchKey ?? batch.id} | {batch.importDomain}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField label="Source name" name="sourceName" required />
                  <SelectField label="Source type" name="sourceType" options={sourceTypes} />
                  <TextField label="Source hash" name="sourceHash" />
                  <NotesField />
                </div>
                <button
                  className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                  type="submit"
                >
                  Add source metadata
                </button>
              </>
            )}
          </form>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Recent batches</h2>
          {batches.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No import batches have been created.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {batches.map((batch) => (
                <article className="rounded-md border border-zinc-200 p-4" key={batch.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">
                        {batch.batchKey ?? "No batch key"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {batch.importDomain} | {batch.status} | {batch.sourceSystem ?? "No source system"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-zinc-400">{batch.id}</p>
                    </div>
                    <div className="text-sm text-zinc-600">
                      <p>{batch._count.sources} source(s)</p>
                      <p>{batch._count.stagingRows} staging row(s)</p>
                      <p>Created {toDateTimeLabel(batch.createdAt)}</p>
                    </div>
                  </div>

                  <form
                    action={updateImportBatchAction.bind(null, batch.id)}
                    className="mt-4 grid gap-3 border-t border-zinc-100 pt-4"
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <SelectField
                        defaultValue={batch.importDomain}
                        label="Import domain"
                        name="importDomain"
                        options={importDomains}
                      />
                      <TextField
                        defaultValue={batch.sourceSystem}
                        label="Source system"
                        name="sourceSystem"
                        required
                      />
                      <TextField
                        defaultValue={batch.batchKey}
                        label="Batch key"
                        name="batchKey"
                      />
                    </div>
                    <NotesField defaultValue={batch.notes} />
                    <button
                      className="w-fit rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
                      type="submit"
                    >
                      Save batch metadata
                    </button>
                  </form>

                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <h4 className="text-sm font-semibold text-zinc-900">Source metadata</h4>
                    {batch.sources.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">No source metadata yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {batch.sources.map((source) => (
                          <li className="rounded-md bg-zinc-50 p-3 text-sm" key={source.id}>
                            <p className="font-medium text-zinc-900">{source.sourceName}</p>
                            <p className="mt-1 text-zinc-600">
                              {source.sourceType} | hash {source.sourceHash ?? "not set"} | created{" "}
                              {toDateTimeLabel(source.createdAt)}
                            </p>
                            {source.notes ? (
                              <p className="mt-1 text-zinc-500">{source.notes}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
