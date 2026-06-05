type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: Readonly<PlaceholderPageProps>) {
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {description}
        </p>
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          This page is a read-only placeholder for the next approved build
          slice. No scheduling, crew, aircraft, or dispatch actions are
          available here yet.
        </div>
      </section>
    </main>
  );
}
