import { PortfolioPanel } from './PortfolioPanel';
import './dashboards.css';

export function PortfolioView() {
  return (
    <div data-testid="portfolio-view">
      <div className="db-page">
        <PortfolioPanel />
      </div>
    </div>
  );
}
