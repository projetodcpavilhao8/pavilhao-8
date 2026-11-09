import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bike, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CAMPAIGN,
  DEFAULT_PRICE_CENTS,
  campaignPeriod,
  getCampaignPhase,
  timeLeftLabel,
  type CampaignPhase,
} from "@/config/campaign";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Atualiza a fase da campanha a cada 30s (vira sozinho às 5h e some no fim). */
function useCampaignClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

interface PromoCardProps {
  onScheduleClick: () => void;
}

/**
 * Card da campanha (Black Friday Spinning P8). Aparece antes do início como
 * "em breve", fica clicável durante a campanha e some quando ela termina.
 */
const PromoCard = ({ onScheduleClick }: PromoCardProps) => {
  const now = useCampaignClock();
  const phase: CampaignPhase = getCampaignPhase(now);
  const tier = CAMPAIGN.tiers.find((t) => t.totalCents != null);

  if ((phase !== "active" && phase !== "upcoming") || !tier?.totalCents) return null;

  const period = campaignPeriod();
  const regular = DEFAULT_PRICE_CENTS * tier.items;
  const savings = regular - tier.totalCents;
  const perClass = Math.floor(tier.totalCents / tier.items);
  const [reais, centavos] = (tier.totalCents / 100).toFixed(2).split(".");

  return (
    <section id="promocao" className="relative px-4 py-12 md:py-20" aria-label={`${CAMPAIGN.name} Spinning P8`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-[hsl(330_40%_4%)] shadow-neon">
          {/* Brilhos de fundo */}
          <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative grid items-center gap-8 p-5 sm:p-10 md:grid-cols-[1.15fr_1fr] md:gap-10">
            {/* Lado esquerdo: título */}
            <div className="min-w-0 text-center md:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.35em]">
                Pavilhão <span className="text-primary">8</span> · Academia
              </p>

              <h2 className="mt-4 font-black uppercase italic leading-[0.85] tracking-tight">
                <span className="block text-[44px] text-white text-neon-white sm:text-6xl lg:text-7xl">Black</span>
                <span className="block text-[52px] text-primary text-neon sm:text-7xl lg:text-8xl">Friday</span>
              </h2>

              <p className="mt-3 flex items-center justify-center gap-2 text-xl font-extrabold uppercase italic sm:text-2xl md:justify-start">
                Spinning P8
                <Bike className="h-7 w-7 text-primary drop-shadow-[0_0_8px_hsl(328_100%_54%)]" />
              </p>

              <div className="mt-6 flex justify-center md:justify-start">
              <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-primary/80 bg-black/40 px-4 py-2.5 shadow-neon-sm">
                <CalendarDays className="h-6 w-6 shrink-0 text-primary" />
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Válido para compras de</p>
                  <p className="text-lg font-black italic text-primary text-neon">
                    {period.start} a {period.end}
                  </p>
                </div>
              </div>
              </div>
            </div>

            {/* Lado direito: oferta */}
            <div className="min-w-0 text-center">
              <div className="relative mx-auto inline-block">
                <span className="absolute inset-x-[-12px] inset-y-1 -skew-x-12 bg-gradient-primary opacity-90" aria-hidden />
                <span className="relative block px-2 text-[40px] font-black uppercase italic text-black sm:text-6xl">
                  {tier.items} aulas
                </span>
              </div>
              <p className="mt-2 text-lg font-black uppercase italic text-white">por</p>

              <div className="mx-auto mt-1 w-fit rounded-2xl border-2 border-primary px-5 py-3 shadow-neon sm:px-6">
                <p className="flex items-start justify-center font-black italic leading-none text-white">
                  <span className="mr-1 mt-2 text-2xl sm:text-3xl">R$</span>
                  <span className="text-[64px] sm:text-8xl text-neon-white">{reais}</span>
                  <span className="mt-2 text-2xl sm:text-3xl">,{centavos}</span>
                </p>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                de <span className="line-through">{brl(regular)}</span> ·{" "}
                <span className="font-semibold text-foreground">{brl(perClass)} por aula</span> · economize{" "}
                <span className="font-bold text-primary">{brl(savings)}</span>
              </p>

              {phase === "active" ? (
                <>
                  <Button
                    size="lg"
                    onClick={onScheduleClick}
                    className="mt-5 h-auto w-full whitespace-normal rounded-full bg-gradient-primary px-6 py-4 text-base font-black uppercase sm:w-auto sm:px-8 sm:py-6 sm:text-lg text-primary-foreground animate-pulse-glow transition-transform hover:scale-105 sm:w-auto"
                  >
                    Garantir minhas {tier.items} aulas
                  </Button>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Termina em <strong className="text-foreground">{timeLeftLabel(now)}</strong>
                  </p>
                </>
              ) : (
                <div className="mt-5 rounded-full border border-primary/50 bg-primary/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary">
                  Começa {period.startWeekday}, {period.start} às {period.startTime}
                </div>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Escolha {tier.items} aulas no agendamento e o desconto entra automaticamente.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default PromoCard;
