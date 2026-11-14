import type { Campaign } from "@/config/campaign";

/** Liga a cor da campanha no <html> (o amarelo padrão não precisa de atributo). */
export function applyCampaignTheme(campaign: Campaign | null): void {
  const root = document.documentElement;
  if (campaign && campaign.theme !== "yellow") root.dataset.theme = campaign.theme;
  else delete root.dataset.theme;
}
