import { AssetDashboard } from '@/components/terminal/AssetDashboard';
import { ASSETS } from '@/lib/asset-registry';

export default function Page() {
  return <AssetDashboard asset={ASSETS.BTC!} />;
}
