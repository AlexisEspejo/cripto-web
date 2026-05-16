import Link from 'next/link';

export const metadata = {
  title: 'Disclaimer · BTC Terminal',
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-xs uppercase tracking-widest text-brand hover:underline">
        ← Volver al terminal
      </Link>
      <h1 className="title-serif mt-6 text-3xl">
        <em>Disclaimer</em> · Términos de uso
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-text-dim">
        <p>
          Esta plataforma proporciona análisis técnico automatizado con fines exclusivamente
          informativos. <strong className="text-text">No constituye asesoramiento financiero,
          recomendación de inversión, ni invitación a operar.</strong>
        </p>
        <p>
          Las señales generadas son agregaciones técnicas que pueden fallar. Los indicadores se
          calculan sobre datos OHLCV provistos por exchanges públicos y reflejan únicamente la
          estructura matemática del precio en intervalos de tiempo definidos.
        </p>
        <p>
          El usuario es el único responsable de sus decisiones de inversión y del
          dimensionamiento de riesgo. Bitcoin y los activos digitales son instrumentos de alto
          riesgo que pueden perder todo su valor.
        </p>
        <p>
          Los datos provienen de fuentes públicas (Binance, CoinGecko, CryptoCompare) y pueden
          contener errores, retrasos o interrupciones. El operador del sitio no garantiza la
          disponibilidad, completitud ni exactitud de la información.
        </p>
        <p>
          Al usar este sitio aceptas estos términos. Si no estás de acuerdo, abandona la página.
        </p>
      </div>
    </main>
  );
}
