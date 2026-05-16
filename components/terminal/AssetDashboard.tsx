import { TopBar } from '@/components/terminal/TopBar';
import { PriceHero } from '@/components/terminal/PriceHero';
import { AlertsBar } from '@/components/terminal/AlertsBar';
import { VerdictPanel } from '@/components/terminal/VerdictPanel';
import { SignalsGrid } from '@/components/terminal/SignalsGrid';
import { IndicatorsGrid } from '@/components/terminal/IndicatorsGrid';
import { PatternsPanel } from '@/components/terminal/PatternsPanel';
import { PriceChart } from '@/components/terminal/PriceChart';
import { RSIChart } from '@/components/terminal/RSIChart';
import { NewsFeed } from '@/components/terminal/NewsFeed';
import { Footer } from '@/components/terminal/Footer';
import type { AssetSpec } from '@/lib/asset-registry';

export function AssetDashboard({ asset }: { asset: AssetSpec }) {
  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar asset={asset} />
      <AlertsBar asset={asset} />
      <div className="mx-auto max-w-[1400px]">
        <PriceHero asset={asset} />
      </div>
      <VerdictPanel asset={asset} />
      <SignalsGrid asset={asset} />
      <IndicatorsGrid asset={asset} />
      <PatternsPanel asset={asset} />
      <PriceChart asset={asset} />
      <RSIChart asset={asset} />
      <NewsFeed asset={asset} />
      <Footer />
    </main>
  );
}
