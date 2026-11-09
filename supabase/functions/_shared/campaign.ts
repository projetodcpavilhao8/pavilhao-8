// ============================================================================
// Configuração central da campanha promocional e da comissão da agência.
// FONTE DA VERDADE — o frontend (src/config/campaign.ts) só espelha o que é
// exibido; qualquer valor cobrado é sempre recalculado aqui, no servidor.
// ============================================================================

export interface CampaignTier {
  /** Quantidade EXATA de aulas no pedido */
  items: number;
  /** Desconto percentual sobre o subtotal… */
  percent?: number;
  /** …ou preço fechado do pacote, em centavos (tem prioridade sobre percent) */
  totalCents?: number;
}

export interface CampaignConfig {
  id: string;
  /** Nome curto, usado na descrição da cobrança */
  name: string;
  active: boolean;
  /**
   * Início (inclusive) e fim (exclusivo) como instante exato, sempre com o
   * fuso de Brasília explícito (-03:00). null = sem limite.
   */
  startsAt: string | null;
  endsAt: string | null;
  /** Desconto só se a quantidade bater EXATAMENTE com um tier */
  tiers: CampaignTier[];
}

// Histórico: "pacotes-2026" (3/5/10 aulas com 5/10/15% OFF) rodou de
// 03/08/2026 a 08/11/2026.
export const CAMPAIGN: CampaignConfig = {
  id: "black-friday-spinning-2026",
  name: "Black Friday",
  active: true,
  startsAt: "2026-11-09T05:00:00-03:00", // segunda 09/11, 5h
  endsAt: "2026-11-14T00:00:00-03:00",   // fim do dia 13/11 (meia-noite)
  tiers: [{ items: 4, totalCents: 9900 }], // 4 aulas por R$ 99,00
};

/** Preço padrão por aula quando a turma não tem preço próprio cadastrado. */
export const DEFAULT_PRICE_CENTS = 2990;

/** Máximo de aulas por pedido. */
export const MAX_ITEMS_PER_ORDER = 10;

/** Janela de pagamento — alinhada com o minutesToExpire do checkout Asaas. */
export const ORDER_TTL_MINUTES = 30;

// ===== Comissão da agência =====
/** Comissão da agência POR RESERVA (aula), em centavos. Não varia com desconto. */
export const AGENCY_FEE_CENTS_PER_ITEM = 70;

/**
 * Taxas da Asaas. Cada meio de pagamento é cobrado num fluxo separado (Pix vai
 * direto pela API de pagamentos, cartão continua no Checkout hospedado), então
 * o split é calculado com a taxa exata do meio escolhido — sem reserva de
 * "pior caso" nem sobra para a agência.
 */
export const ASAAS_FEE_MODEL = {
  /**
   * Pix: taxa fixa, conhecida antes de criar a cobrança.
   * Era R$0,99 (promocional) até ago/2026; passou a R$1,99 em set/2026.
   * Se a Asaas mudar de novo, o reserve se auto-ajusta: ele lê o "valor a
   * receber" informado no erro de split e recalcula — este valor aqui é só
   * o palpite da primeira tentativa.
   */
  pixFixedCents: 199,
  /** Cartão: percentual sobre o valor + parcela fixa. */
  cardPercent: 0.0299,
  cardFixedCents: 49,
  /** Margem extra de segurança sobre a estimativa (só usada no fluxo de cartão, que ainda não sabe o meio até o cliente escolher). */
  safetyMarginCents: 30,
};

/**
 * Split exato para pagamento via Pix (fluxo direto, fora do Checkout).
 * A taxa do Pix é fixa e conhecida antes de criar a cobrança, então a
 * comissão da agência fecha sempre em AGENCY_FEE_CENTS_PER_ITEM exato.
 */
export function computeExactPixSplitCents(totalCents: number, itemsCount: number): number {
  const agencyFee = AGENCY_FEE_CENTS_PER_ITEM * itemsCount;
  return Math.max(0, totalCents - agencyFee - ASAAS_FEE_MODEL.pixFixedCents);
}

/** Pior caso de taxa de cartão (em centavos) para um total de pedido. */
export function estimateCardWorstCaseFeeCents(totalCents: number): number {
  const card = Math.ceil(totalCents * ASAAS_FEE_MODEL.cardPercent) + ASAAS_FEE_MODEL.cardFixedCents;
  return card + ASAAS_FEE_MODEL.safetyMarginCents;
}

/**
 * Valor do split destinado à conta da cliente (academia) no Checkout de
 * cartão. A taxa real do cartão só é conhecida depois que a Asaas processa o
 * pagamento (varia com parcelamento), então reservamos o pior caso; o que
 * sobrar da reserva fica com a agência.
 */
export function computeCardSplitCents(totalCents: number, itemsCount: number, feeInflation = 0): number {
  const agencyFee = AGENCY_FEE_CENTS_PER_ITEM * itemsCount;
  const feeReserve = estimateCardWorstCaseFeeCents(totalCents) + feeInflation;
  return Math.max(0, totalCents - agencyFee - feeReserve);
}

/** Limite da Asaas para description de item/cobrança. */
export const ASAAS_DESCRIPTION_MAX = 150;

/**
 * Monta a descrição da cobrança respeitando o limite da Asaas.
 * Com muitas aulas a lista de datas estoura 150 caracteres, então caímos para
 * uma forma compacta antes de truncar — o cliente sempre entende o que comprou.
 */
export function buildChargeDescription(
  schedule: string[],
  opts: { customerName?: string; itemsCount: number; promoLabel?: string } = { itemsCount: 0 },
): string {
  const prefix = "Reserva Pavilhão 8";
  const who = opts.customerName ? ` — ${opts.customerName}` : "";
  const off = opts.promoLabel ? ` (${opts.promoLabel})` : "";

  const full = `${prefix}${who}${schedule.length ? ` — ${schedule.join(", ")}` : ""}${off}`;
  if (full.length <= ASAAS_DESCRIPTION_MAX) return full;

  // Sem o nome do cliente
  const noName = `${prefix}${schedule.length ? ` — ${schedule.join(", ")}` : ""}${off}`;
  if (noName.length <= ASAAS_DESCRIPTION_MAX) return noName;

  // Só a contagem e o período
  const first = schedule[0] || "";
  const last = schedule[schedule.length - 1] || "";
  const compact = `${prefix} — ${opts.itemsCount} aulas${first ? ` (${first} a ${last})` : ""}${off}`;
  if (compact.length <= ASAAS_DESCRIPTION_MAX) return compact;

  return compact.slice(0, ASAAS_DESCRIPTION_MAX);
}

/** A campanha está valendo neste instante? (início inclusive, fim exclusivo) */
export function isCampaignActive(now = new Date()): boolean {
  if (!CAMPAIGN.active) return false;
  const t = now.getTime();
  if (CAMPAIGN.startsAt && t < Date.parse(CAMPAIGN.startsAt)) return false;
  if (CAMPAIGN.endsAt && t >= Date.parse(CAMPAIGN.endsAt)) return false;
  return true;
}

/**
 * Tier que vale para essa quantidade de aulas, ou null.
 * Só há promoção em quantidades EXATAS configuradas.
 */
export function getCampaignTier(itemsCount: number, now = new Date()): CampaignTier | null {
  if (!isCampaignActive(now)) return null;
  return CAMPAIGN.tiers.find((t) => t.items === itemsCount) ?? null;
}

/** Desconto em centavos que um tier dá sobre um subtotal (nunca negativo). */
export function tierDiscountCents(tier: CampaignTier, subtotalCents: number): number {
  if (tier.totalCents != null) return Math.max(0, subtotalCents - tier.totalCents);
  if (tier.percent && tier.percent > 0) return Math.trunc((subtotalCents * tier.percent) / 100);
  return 0;
}

/** "Black Friday 4 aulas R$ 99,00" / "4 aulas 10% OFF" — vai na descrição da cobrança. */
export function tierLabel(tier: CampaignTier): string {
  if (tier.totalCents != null) {
    return `${CAMPAIGN.name} ${tier.items} aulas R$ ${(tier.totalCents / 100).toFixed(2).replace(".", ",")}`;
  }
  return `${CAMPAIGN.name} ${tier.items} aulas ${tier.percent}% OFF`;
}

export interface PriceBreakdown {
  itemsCount: number;
  subtotalCents: number;
  /** Percentual equivalente, só informativo (arredondado) */
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  campaignId: string | null;
}

/**
 * Cálculo do pedido — SOMENTE aritmética inteira em centavos.
 * Espelha a RPC create_booking_order, que é quem grava o valor de verdade.
 */
export function computeOrderPrice(
  itemPricesCents: number[],
  now = new Date(),
): PriceBreakdown {
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
    campaignId: discountCents > 0 ? CAMPAIGN.id : null,
  };
}
