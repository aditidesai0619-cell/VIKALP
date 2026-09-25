import { AICopilotPage } from "../../pages/AICopilotPage";
import { DataGovernancePage } from "../../pages/DataGovernancePage";
import { DecisionWorkspacePage } from "../../pages/DecisionWorkspacePage";
import { DestinationExplorerPage } from "../../pages/DestinationExplorerPage";
import { LoginPage } from "../../pages/LoginPage";
import { MapIntelligencePage } from "../../pages/MapIntelligencePage";
import { OverviewPage } from "../../pages/OverviewPage";
import { RelocationPlannerPage } from "../../pages/RelocationPlannerPage";
import { ReportsPage } from "../../pages/ReportsPage";
import { RiskAnalysisPage } from "../../pages/RiskAnalysisPage";
import { TerrainMapPage } from "../../pages/TerrainMapPage";
import type { PageId } from "../../types/navigation";

export function PageRouter({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  switch (activePage) {
    case "login":
      return <LoginPage onNavigate={onNavigate} />;
    case "overview":
      return <OverviewPage activePage={activePage} onNavigate={onNavigate} />;
    case "map-intelligence":
      return (
        <MapIntelligencePage
          activePage={activePage}
          onNavigate={onNavigate}
        />
      );
    case "risk-analysis":
      return (
        <RiskAnalysisPage activePage={activePage} onNavigate={onNavigate} />
      );
    case "decision-workspace":
      return (
        <DecisionWorkspacePage
          activePage={activePage}
          onNavigate={onNavigate}
        />
      );
    case "destination-explorer":
      return (
        <DestinationExplorerPage
          activePage={activePage}
          onNavigate={onNavigate}
        />
      );
    case "relocation-planner":
      return (
        <RelocationPlannerPage
          activePage={activePage}
          onNavigate={onNavigate}
        />
      );
    case "reports":
      return <ReportsPage activePage={activePage} onNavigate={onNavigate} />;
    case "data-governance":
      return (
        <DataGovernancePage activePage={activePage} onNavigate={onNavigate} />
      );
    case "copilot":
      return <AICopilotPage activePage={activePage} onNavigate={onNavigate} />;
    case "terrain-3d":
      return <TerrainMapPage activePage={activePage} onNavigate={onNavigate} />;
    default:
      return <LoginPage onNavigate={onNavigate} />;
  }
}
