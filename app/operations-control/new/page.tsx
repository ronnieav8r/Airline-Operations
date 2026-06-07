import { createFlightLegAction } from "@/app/operations-control/actions";
import { FlightLegForm } from "@/app/operations-control/flightleg-form";
import { getFlightLegFormOptions } from "@/lib/flightleg-form-queries";

export const dynamic = "force-dynamic";

type PageProps = {
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

export default async function NewFlightLegPage({ searchParams }: PageProps) {
  const [options, params] = await Promise.all([getFlightLegFormOptions(), searchParams]);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <FlightLegForm
          action={createFlightLegAction}
          error={firstSearchParam(params.error)}
          mode="create"
          options={options}
        />
      </div>
    </main>
  );
}
