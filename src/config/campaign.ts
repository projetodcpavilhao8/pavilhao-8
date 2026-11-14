// ============================================================================
// Espelho da campanha para EXIBIÇÃO no site.
// A fonte da verdade é supabase/functions/_shared/campaign.ts — o valor cobrado
// é sempre recalculado no servidor. Ao mudar a campanha, altere os dois.
// ============================================================================

export interface CampaignTier {
  /** Quantidade EXATA de aulas no pedido */
  items: number;
  /** Desconto percentual sobre o subtotal… */
  percent?: number;
  /** …ou preço fechado do pacote, em centavos (tem prioridade sobre percent) */
  totalCents?: number;
}

export interface Campaign {
  id: string;
  name: string;
  active: boolean;
  /** Instantes exatos com o fuso de Brasília. Início inclusive, fim exclusivo. */
  startsAt: string | null;
  endsAt: string | null;
  tiers: CampaignTier[];
  /** Cor do site enquanto a campanha vale ("yellow" = identidade padrão). */
  theme: "yellow" | "pink";
}

// Em ordem cronológica. Vale a PRIMEIRA cujo período contém o instante atual.
export const CAMPAIGNS: Campaign[] = [
  {
    id: "black-friday-spinning-2026",
    name: "Black Friday",
    active: true,
    startsAt: "2026-11-09T05:00:00-03:00", // segunda 09/11, 5h
    endsAt: "2026-11-14T00:00:00-03:00",   // fim do dia 13/11
    tiers: [{ items: 4, totalCents: 9900 }], // 4 aulas por R$ 99,00
    theme: "pink",
  },
  {
    id: "novos-planos-spinning-2026",
    name: "Novos Planos Spinning",
    active: true,
    startsAt: "2026-11-14T00:00:00-03:00", // sábado 14/11, 0h
    endsAt: null,                          // sem data de término
    tiers: [
      { items: 3, percent: 5 },
      { items: 5, percent: 10 },
      { items: 10, percent: 15 },
    ],
    theme: "yellow",
  },
];

export const DEFAULT_PRICE_CENTS = 2990;
export const MAX_ITEMS_PER_ORDER = 10;

function isWithin(c: Campaign, now: Date): boolean {
  if (!c.active) return false;
  const t = now.getTime();
  if (c.startsAt && t < Date.parse(c.startsAt)) return false;
  if (c.endsAt && t >= Date.parse(c.endsAt)) return false;
  return true;
}

/** Campanha valendo neste instante, ou null. */
export function getActiveCampaign(now = new Date()): Campaign | null {
  return CAMPAIGNS.find((c) => isWithin(c, now)) ?? null;
}

export function isCampaignActive(now = new Date()): boolean {
  return getActiveCampaign(now) !== null;
}

/** Tier que vale para essa quantidade de aulas, ou null. */
export function getCampaignTier(itemsCount: number, now = new Date()): CampaignTier | null {
  return getActiveCampaign(now)?.tiers.find((t) => t.items === itemsCount) ?? null;
}

/** Desconto em centavos que um tier dá sobre um subtotal (nunca negativo). */
export function tierDiscountCents(tier: CampaignTier, subtotalCents: number): number {
  if (tier.totalCents != null) return Math.max(0, subtotalCents - tier.totalCents);
  if (tier.percent && tier.percent > 0) return Math.trunc((subtotalCents * tier.percent) / 100);
  return 0;
}

export interface PriceBreakdown {
  itemsCount: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
}

/** Mesma aritmética inteira do servidor. */
export function computeOrderPrice(itemPricesCents: number[], now = new Date()): PriceBreakdown {
  const itemsCount = itemPricesCents.length;
  const subtotalCents = itemPricesCents.reduce((a, b) => a + b, 0);
  const tier = getCampaignTier(itemsCount, now);
  const discountCents = tier ? tierDiscountCents(tier, subtotalCents) : 0;
  return {
    itemsCount,
    subtotalCents,
    discountPercent: discountCents > 0 ? Math.round((discountCents * 100) / subtotalCents) : 0,
    discountCents,
    totalCents: subtotalCents - discountCents,
  };
}

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const tierPriceText = (t: CampaignTier) => (t.totalCents != null ? brl(t.totalCents) : `${t.percent}% a menos`);

/** "4 aulas por R$ 99,00" / "4 aulas com 10% OFF" */
export function tierOfferText(tier: CampaignTier): string {
  return tier.totalCents != null
    ? `${tier.items} aulas por ${brl(tier.totalCents)}`
    : `${tier.items} aulas com ${tier.percent}% OFF`;
}

/** "3 aulas com 5% OFF, 5 aulas com 10% OFF ou 10 aulas com 15% OFF" */
export function campaignOffersText(campaign: Campaign): string {
  const parts = [...campaign.tiers].sort((a, b) => a.items - b.items).map(tierOfferText);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} ou ${parts[parts.length - 1]}` : parts.join("");
}

/**
 * Dica para o carrinho quando a quantidade ainda não fecha uma promoção.
 * Ex.: "Adicione 1 aula e leve 5 aulas com 10% OFF".
 */
export function campaignCartHint(itemsCount: number, now = new Date()): string | null {
  const campaign = getActiveCampaign(now);
  if (!campaign || itemsCount === 0) return null;
  const tiers = [...campaign.tiers].sort((a, b) => a.items - b.items);
  if (tiers.some((t) => t.items === itemsCount)) return null;
  const next = tiers.find((t) => t.items > itemsCount);
  if (next) {
    const missing = next.items - itemsCount;
    return `Adicione ${missing} aula${missing === 1 ? "" : "s"} e leve ${tierOfferText(next)}`;
  }
  // Passou de todas as faixas: a promoção é por quantidade exata.
  const top = tiers[tiers.length - 1];
  if (!top) return null;
  const extra = itemsCount - top.items;
  return `A promoção vale para exatamente ${top.items} aulas — remova ${extra} para pagar ${tierPriceText(top)}`;
}

const fmtBR = (ms: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(new Date(ms));

/** Datas para exibição: { start: "09/11", startTime: "5h", end: "13/11" } (horário de Brasília). */
export function campaignPeriod(campaign: Campaign) {
  const startMs = campaign.startsAt ? Date.parse(campaign.startsAt) : null;
  // endsAt é exclusivo (00:00 do dia 14) → o último dia válido é o 13.
  const endMs = campaign.endsAt ? Date.parse(campaign.endsAt) - 1 : null;
  return {
    start: startMs ? fmtBR(startMs, { day: "2-digit", month: "2-digit" }) : "",
    startWeekday: startMs ? fmtBR(startMs, { weekday: "long" }) : "",
    startTime: startMs ? `${Number(fmtBR(startMs, { hour: "2-digit", hour12: false }))}h` : "",
    end: endMs ? fmtBR(endMs, { day: "2-digit", month: "2-digit" }) : "",
  };
}

/** Tempo até o fim da campanha: "2 dias e 5h", "3h 20min", "15min". */
export function timeLeftLabel(campaign: Campaign, now = new Date()): string {
  if (!campaign.endsAt) return "";
  const ms = Date.parse(campaign.endsAt) - now.getTime();
  if (ms <= 0) return "";
  const min = Math.floor(ms / 60000);
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (days > 0) return `${days} dia${days === 1 ? "" : "s"}${hours ? ` e ${hours}h` : ""}`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, "0")}min`;
  return `${mins}min`;
}
