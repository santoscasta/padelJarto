export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center text-zinc-800">
      <h1 className="text-3xl font-semibold">Sin conexión</h1>
      <p className="mt-3 text-sm text-zinc-600">
        No hay internet ahora mismo. Cuando vuelvas a estar online, recarga la página para seguir donde lo dejaste.
      </p>
    </main>
  );
}
