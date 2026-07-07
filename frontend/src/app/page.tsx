import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-900 font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="font-extrabold text-white text-lg">P</span>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Puna Tech
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 text-center my-auto flex flex-col items-center justify-center z-10 py-16">
        <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 mb-6 text-xs text-teal-400 font-medium">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span>Google Antigravity 2.0 Engine ready</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Automatiza tu marketing de contenidos B2B con{' '}
          <span className="bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Inteligencia Artificial
          </span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          El motor cognitivo de Puna Tech consume de forma autónoma tu backlog de ideas, genera copys estructurados para redes sociales con Gemini 3.5 Flash y crea visuales con Flux a través de Replicate.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-extrabold rounded-xl hover:opacity-95 shadow-xl shadow-teal-500/20 transition-all duration-300 hover:scale-[1.02]"
          >
            Acceder al Panel de Control (Dashboard)
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950/20 py-8 text-center text-xs text-slate-600 z-10">
        <p>© 2026 Puna Tech. Todos los derechos reservados. Diseñado para automatización B2B autónoma.</p>
      </footer>
    </div>
  );
}
