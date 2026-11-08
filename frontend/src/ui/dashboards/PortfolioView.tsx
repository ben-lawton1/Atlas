import { ViewFrame } from '../frames/ViewFrame';
import { PortfolioPanel } from './PortfolioPanel';

export function PortfolioView() {
  return (
    <ViewFrame id="portfolio" title="Portfolio" description="Value, change and holdings across your accounts.">
      <PortfolioPanel />
    </ViewFrame>
  );
}
