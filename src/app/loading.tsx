export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-xl px-8 py-10 text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-gradient-to-r from-lime-400 via-cyan-300 to-blue-500" />
        <p className="mt-5 text-lg font-semibold text-ink">
          Preparing your Chemate study workspace...
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Loading notes, lab tools, revision analytics, and grounded answer memory.
        </p>
      </div>
    </main>
  );
}
