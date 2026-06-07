import { notFound } from "next/navigation";

import { updateFlightLegAction } from "@/app/operations-control/actions";
import { FlightLegForm } from "@/app/operations-control/flightleg-form";
import { getFlightLegEditData, getFlightLegFormOptions } from "@/lib/flightleg-form-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function EditFlightLegPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const [options, initial] = await Promise.all([
    getFlightLegFormOptions(),
    getFlightLegEditData(flightLegId),
  ]);

  if (!initial) {
    notFound();
  }

  const action = updateFlightLegAction.bind(null, flightLegId);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <FlightLegForm
          action={action}
          error={firstSearchParam(queryParams.error)}
          initial={initial}
          mode="edit"
          options={options}
        />
      </div>
    </main>
  );
}
