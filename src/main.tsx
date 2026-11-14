import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getActiveCampaign } from "./config/campaign";
import { applyCampaignTheme } from "./lib/campaignTheme";

// Aplica a cor da campanha antes do primeiro render (sem piscar a cor errada).
applyCampaignTheme(getActiveCampaign());

createRoot(document.getElementById("root")!).render(<App />);
