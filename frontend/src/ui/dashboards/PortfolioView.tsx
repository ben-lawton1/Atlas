import { PortfolioPanel } from './PortfolioPanel';
import './dashboards.css';

export function PortfolioView() {
  return (
    <div className="pane-scroll" data-testid="portfolio-view">
      <div className="db-page">
        <PortfolioPanel />
      </div>
    </div>
  );
}
