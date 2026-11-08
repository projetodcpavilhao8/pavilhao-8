import { describe, expect, it } from "vitest";
import { dbDayOfWeek, formatDateBR, isPastDate, todayInBrasilia } from "@/lib/date";
import { CAMPAIGN, computeOrderPrice, getDiscountPercent, isCampaignActive } from "@/config/campaign";

describe("todayInBrasilia", () => {
  it("às 22h de Brasília (01h UTC do dia seguinte) ainda é o mesmo dia", () => {
    expect(todayInBrasilia(new Date("2026-11-09T01:00:00Z"))).toBe("2026-11-08");
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

describe("campanha", () => {
  it("está desativada", () => {
    expect(CAMPAIGN.active).toBe(false);
    expect(isCampaignActive()).toBe(false);
  });
  it("sem desconto em nenhuma quantidade", () => {
    for (const n of [3, 5, 10]) expect(getDiscountPercent(n)).toBe(0);
    const p = computeOrderPrice(Array(10).fill(2990));
    expect(p.discountCents).toBe(0);
    expect(p.totalCents).toBe(29900);
  });
});

describe("campanha do servidor (fonte da verdade)", () => {
  it("está desativada e usa o dia de Brasília", async () => {
    const server = await import("../../supabase/functions/_shared/campaign.ts");
    const time = await import("../../supabase/functions/_shared/time.ts");
    expect(server.CAMPAIGN.active).toBe(false);
    expect(server.getDiscountPercent(10)).toBe(0);
    expect(server.computeOrderPrice([2990, 2990, 2990]).campaignId).toBeNull();
    expect(time.todayInBrasilia(new Date("2026-11-09T01:00:00Z"))).toBe("2026-11-08");
  });
});
