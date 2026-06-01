export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">AeroOps Center</h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        Foundation slice is active: Next.js, TypeScript, Prisma, and PostgreSQL
        schema are configured for v1 airline operations.
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        This page is intentionally minimal for Builder Prompt 01.
      </p>
      <div className="mt-8 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700">
        <code>DATABASE_URL</code> is required before running database migrations
        and seeding.
      </div>
    </main>
  );
}
