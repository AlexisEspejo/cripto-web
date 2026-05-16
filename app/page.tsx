import { TopBar } from '@/components/terminal/TopBar';
import { PriceHero } from '@/components/terminal/PriceHero';
import { AlertsBar } from '@/components/terminal/AlertsBar';
import { VerdictPanel } from '@/components/terminal/VerdictPanel';
import { SignalsGrid } from '@/components/terminal/SignalsGrid';
import { IndicatorsGrid } from '@/components/terminal/IndicatorsGrid';
import { PriceChart } from '@/components/terminal/PriceChart';
import { RSIChart } from '@/components/terminal/RSIChart';
import { NewsFeed } from '@/components/terminal/NewsFeed';
import { Footer } from '@/components/terminal/Footer';

export default function Page() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <TopBar />
      <AlertsBar />
      <div className="mx-auto max-w-[1400px]">
        <PriceHero />
      </div>
      <VerdictPanel />
      <SignalsGrid />
      <IndicatorsGrid />
      <PriceChart />
      <RSIChart />
      <NewsFeed />
      <Footer />
    </main>
  );
}
