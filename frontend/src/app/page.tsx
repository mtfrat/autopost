import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-caoba-black text-crema flex flex-col justify-between selection:bg-terracota selection:text-caoba-black font-sans relative overflow-hidden">
      
      {/* Decorative Grid Pattern (High Authority Terminal Look) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#6d2c2c0a_1px,transparent_1px),linear-gradient(to_bottom,#6d2c2c0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-terracota/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-caoba/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10 border-b border-caoba-dark/60 bg-caoba-black/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-sm bg-terracota flex items-center justify-center shadow-md">
            <span className="font-mono font-bold text-crema text-md">P</span>
          </div>
          <div>
            <span className="font-bold text-md tracking-wider text-crema">
              PUNA TECH
            </span>
            <span className="text-[9px] text-terracota block font-mono tracking-widest leading-none">B2B COGNITIVE SYSTEMS</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px] text-crema-muted">
          <span>SECURE GATEWAY v2.0</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 text-center my-auto flex flex-col items-center justify-center z-10 py-16">
        <div className="inline-flex items-center space-x-2 bg-caoba-dark border border-caoba/40 rounded-sm px-3.5 py-1 mb-8 text-[11px] text-terracota font-mono tracking-wider">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracota opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-terracota"></span>
          </span>
          <span>ANTIGRAVITY 2.0 ENGINE // ONLINE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-crema mb-6 leading-tight max-w-3xl">
          Automatización de Contenidos B2B mediante{' '}
          <span className="text-terracota underline decoration-caoba decoration-2 underline-offset-4">
            Agentes Autónomos
          </span>
        </h1>

        <p className="text-crema-muted text-sm sm:text-base max-w-xl mb-12 leading-relaxed font-sans">
          El motor cognitivo de Puna Tech consume de forma autónoma tu backlog de ideas, genera copys estructurados para redes sociales con Gemini 3.5 Flash y crea visuales con Flux a través de Replicate.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 font-mono">
          <Link
            href="/dashboard"
            className="px-6 py-3.5 bg-terracota hover:bg-terracota-dark text-crema font-bold rounded-sm border border-terracota hover:border-terracota-dark shadow-lg shadow-terracota/10 transition-all duration-200 hover:scale-[1.01] text-xs tracking-wider"
          >
            INGRESAR AL PANEL EJECUTIVO
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-caoba-dark/60 bg-caoba-black/40 py-8 text-center text-[10px] text-crema-muted/40 font-mono z-10">
        <p>© 2026 PUNA TECH. TODOS LOS DERECHOS RESERVADOS. PROCESAMIENTO AUTÓNOMO DE ALTA AUTORIDAD.</p>
      </footer>
    </div>
  );
}
