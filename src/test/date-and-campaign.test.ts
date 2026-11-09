import { describe, expect, it } from "vitest";
import { dbDayOfWeek, formatDateBR, isPastDate, todayInBrasilia } from "@/lib/date";
import * as site from "@/config/campaign";
import * as server from "../../supabase/functions/_shared/campaign.ts";
import * as serverTime from "../../supabase/functions/_shared/time.ts";

// Horários de Brasília (UTC-3) convertidos para UTC
const BRT = (iso: string) => new Date(`${iso}-03:00`);

describe("todayInBrasilia", () => {
  it("às 22h de Brasília (01h UTC do dia seguinte) ainda é o mesmo dia", () => {
    expect(todayInBrasilia(new Date("2026-11-09T01:00:00Z"))).toBe("2026-11-08");
    expect(serverTime.todayInBrasilia(new Date("2026-11-09T01:00:00Z"))).toBe("2026-11-08");
  });
  it("vira o dia à meia-noite de Brasília (03h UTC)", () => {
    expect(todayInBrasilia(new Date("2026-11-09T02:59:00Z"))).toBe("2026-11-08");
    expect(todayInBrasilia(new Date("2026-11-09T03:00:00Z"))).toBe("2026-11-09");
  });
});

describe("helpers de data", () => {
  it("isPastDate compara com hoje em Brasília", () => {
    const now = new Date("2026-11-09T01:00:00Z"); // 08/11 22h em Brasília
    expect(isPastDate("2026-11-07", now)).toBe(true);
    expect(isPastDate("2026-11-08", now)).toBe(false);
    expect(isPastDate(null, now)).toBe(false);
  });
  it("formatDateBR", () => {
    expect(formatDateBR("2026-11-08")).toBe("08/11/2026");
  });
  it("dbDayOfWeek: segunda = 1, domingo = 7", () => {
    expect(dbDayOfWeek("2026-11-09")).toBe(1);
    expect(dbDayOfWeek("2026-11-08")).toBe(7);
  });
});

// Os testes rodam iguais para o site (exibição) e o servidor (cobrança).
describe.each([
  ["site", site],
  ["servidor", server],
] as const)("Black Friday Spinning P8 — %s", (_label, c) => {
  const DURING = BRT("2026-11-10T12:00:00");
  const four = [2990, 2990, 2990, 2990];

  it("é a única campanha configurada: 4 aulas por R$ 99,00", () => {
    expect(c.CAMPAIGN.active).toBe(true);
    expect(c.CAMPAIGN.tiers).toEqual([{ items: 4, totalCents: 9900 }]);
  });

  it("começa exatamente às 05:00 de 09/11 (horário de Brasília)", () => {
    expect(c.isCampaignActive(BRT("2026-11-09T04:59:59"))).toBe(false);
    expect(c.isCampaignActive(BRT("2026-11-09T05:00:00"))).toBe(true);
  });

  it("vale o dia 13/11 inteiro e termina à meia-noite", () => {
    expect(c.isCampaignActive(BRT("2026-11-13T23:59:59"))).toBe(true);
    expect(c.isCampaignActive(BRT("2026-11-14T00:00:00"))).toBe(false);
  });

  it("4 aulas de R$ 29,90 saem por R$ 99,00", () => {
    const p = c.computeOrderPrice(four, DURING);
    expect(p.subtotalCents).toBe(11960);
    expect(p.discountCents).toBe(2060);
    expect(p.totalCents).toBe(9900);
    expect(p.discountPercent).toBe(17);
  });

  it("vale também se uma aula tiver preço diferente (total fecha em R$ 99,00)", () => {
    expect(c.computeOrderPrice([2990, 3000, 2990, 2990], DURING).totalCents).toBe(9900);
  });

  it("nunca aumenta o preço: se 4 aulas já custam menos que R$ 99,00, fica o preço normal", () => {
    const p = c.computeOrderPrice([2000, 2000, 2000, 2000], DURING);
    expect(p.discountCents).toBe(0);
    expect(p.totalCents).toBe(8000);
  });

  it.each([1, 2, 3, 5, 8, 10])("%i aulas pagam preço cheio", (n) => {
    const p = c.computeOrderPrice(Array(n).fill(2990), DURING);
    expect(p.discountCents).toBe(0);
    expect(p.totalCents).toBe(2990 * n);
  });

  it("antes das 5h de 09/11 e depois de 13/11, 4 aulas pagam preço cheio", () => {
    expect(c.computeOrderPrice(four, BRT("2026-11-09T04:59:00")).totalCents).toBe(11960);
    expect(c.computeOrderPrice(four, BRT("2026-11-14T00:00:01")).totalCents).toBe(11960);
  });
});

describe("textos da campanha no site", () => {
  const DURING = BRT("2026-11-10T12:00:00");

  it("fases: em breve → ativa → encerrada", () => {
    expect(site.getCampaignPhase(BRT("2026-11-08T20:00:00"))).toBe("upcoming");
    expect(site.getCampaignPhase(DURING)).toBe("active");
    expect(site.getCampaignPhase(BRT("2026-11-14T00:00:00"))).toBe("ended");
  });

  it("período exibido: 09/11 às 5h até 13/11", () => {
    const p = site.campaignPeriod();
    expect(p).toMatchObject({ start: "09/11", startTime: "5h", end: "13/11" });
    expect(p.startWeekday).toBe("segunda-feira");
  });

  it("dica do carrinho", () => {
    expect(site.campaignCartHint(3, DURING)).toBe("Adicione 1 aula e leve 4 aulas por R$ 99,00");
    expect(site.campaignCartHint(1, DURING)).toBe("Adicione 3 aulas e leve 4 aulas por R$ 99,00");
    expect(site.campaignCartHint(4, DURING)).toBeNull();
    expect(site.campaignCartHint(6, DURING)).toBe("A promoção vale para exatamente 4 aulas — remova 2 para pagar R$ 99,00");
    expect(site.campaignCartHint(3, BRT("2026-11-08T20:00:00"))).toBeNull();
  });

  it("contagem regressiva", () => {
    expect(site.timeLeftLabel(BRT("2026-11-09T05:00:00"))).toBe("4 dias e 19h");
    expect(site.timeLeftLabel(BRT("2026-11-13T21:40:00"))).toBe("2h 20min");
    expect(site.timeLeftLabel(BRT("2026-11-14T00:00:00"))).toBe("");
  });
});

describe("descrição da cobrança (Asaas)", () => {
  it("leva o nome da promoção e respeita 150 caracteres", () => {
    const tier = server.CAMPAIGN.tiers[0];
    expect(server.tierLabel(tier)).toBe("Black Friday 4 aulas R$ 99,00");
    const d = server.buildChargeDescription(
      ["10/11 18:15", "11/11 18:15", "12/11 20:15", "13/11 19:15"],
      { customerName: "Maria Aparecida dos Santos Oliveira", itemsCount: 4, promoLabel: server.tierLabel(tier) },
    );
    expect(d).toContain("Black Friday 4 aulas R$ 99,00");
    expect(d.length).toBeLessThanOrEqual(150);
  });
});
