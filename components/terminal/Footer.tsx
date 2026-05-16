import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-strong bg-bg-elev px-4 py-8 text-xs text-text-mute sm:px-6">
      <div className="mx-auto max-w-[1400px] space-y-3">
        <div className="title-serif text-base text-text">
          <span className="text-brand">BTC</span>
          <span className="mx-1 text-text-mute">/</span>
          <em>Terminal</em>
        </div>
        <p className="max-w-3xl leading-relaxed">
          <strong className="text-text-dim">Disclaimer:</strong> Esta plataforma proporciona
          análisis técnico automatizado con fines exclusivamente informativos. <strong>No
          constituye asesoramiento financiero, recomendación de inversión, ni invitación a
          operar.</strong> Las señales generadas son agregaciones técnicas que pueden fallar. El
          usuario es el único responsable de sus decisiones de inversión y del dimensionamiento de
          riesgo. Los datos provienen de fuentes públicas (Binance, CoinGecko, CryptoCompare) y
          pueden contener errores o retrasos.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/disclaimer" className="underline hover:text-text">
            Disclaimer completo
          </Link>
          <span>Datos: Binance · CoinGecko · CryptoCompare</span>
          <span className="ml-auto">© {new Date().getFullYear()} BTC Terminal</span>
        </div>
      </div>
    </footer>
  );
}
