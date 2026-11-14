import { useEffect, useState } from "react";
import { getActiveCampaign, type Campaign } from "@/config/campaign";
import { applyCampaignTheme } from "@/lib/campaignTheme";

/** Relógio que atualiza a cada 30s (a campanha vira sozinha no horário). */
export function useCampaignClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Campanha valendo agora (reavaliada a cada 30s) e o relógio usado. */
export function useActiveCampaign(): { campaign: Campaign | null; now: Date } {
  const now = useCampaignClock();
  return { campaign: getActiveCampaign(now), now };
}

/** Mantém a cor do site alinhada com a campanha que está valendo. */
export function useCampaignTheme(): void {
  const { campaign } = useActiveCampaign();
  useEffect(() => applyCampaignTheme(campaign), [campaign]);
}
