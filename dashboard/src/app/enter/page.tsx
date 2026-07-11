export const metadata = { title: "Enter — A11y Watchdog" };

export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-card-hover ring-1 ring-navy/5">
        <div
          aria-hidden="true"
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-light text-5xl ring-4 ring-teal/10"
        >
          🐕‍🦺
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-navy">A11y Watchdog</h1>
        <p className="mt-2 text-sm text-slate-500">
          The watchdog guards this kennel. Enter the kennel code to see how Trilogy Care scores
          on accessibility.
        </p>

        <form method="POST" action="/api/auth" className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <label htmlFor="password" className="sr-only">
            Kennel code
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            placeholder="Kennel code"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-widest outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-bad">
              Wrong code — the watchdog growls. Try again. 🐾
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-linear-to-r from-teal to-teal-dark px-4 py-3 text-base font-bold text-white shadow-sm transition hover:brightness-110"
          >
            Unlock the gate
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Access is by shared code only — ask Mehrnaz for the key.
        </p>
      </div>
    </div>
  );
}
