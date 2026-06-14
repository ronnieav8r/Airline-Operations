import Link from "next/link";

import { localAdminLoginAction, loginAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    email?: string | string[];
    error?: string | string[];
    loggedOut?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const email = firstParam(params.email) ?? "";
  const loggedOut = firstParam(params.loggedOut) === "1";
  const showLocalAdminShortcut =
    process.env.AEROOPS_ENABLE_TEST_AUTH === "1" && process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
            AeroOps Center
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Local demo authentication is active. Route protection and role gates
            are staged for the next auth slice.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        {loggedOut ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            You have been signed out.
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Email</span>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              defaultValue={email}
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Password</span>
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              name="password"
              required
              type="password"
            />
          </label>

          <button
            className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            type="submit"
          >
            Sign in
          </button>
        </form>

        {showLocalAdminShortcut ? (
          <form action={localAdminLoginAction} className="mt-3">
            <button
              className="w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-100"
              type="submit"
            >
              Continue as local admin
            </button>
          </form>
        ) : null}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Seeded local credentials use <span className="font-semibold">admin@aeroops.local</span>{" "}
          and <span className="font-semibold">ops@aeroops.local</span>. Set
          environment-specific seed passwords before using seeded accounts outside
          local development.
        </div>

        <Link className="mt-5 inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-950" href="/">
          Continue to dashboard
        </Link>
      </section>
    </main>
  );
}
