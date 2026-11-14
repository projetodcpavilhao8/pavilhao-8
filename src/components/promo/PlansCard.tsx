import { motion } from "framer-motion";
import { Bike, Flame, HeartPulse, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRICE_CENTS, tierDiscountCents, type Campaign } from "@/config/campaign";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface PlansCardProps {
  campaign: Campaign;
  onScheduleClick: () => void;
}

/**
 * Card de campanha com desconto percentual por quantidade
 * (Novos Planos Spinning: 3 aulas 5% OFF, 5 aulas 10% OFF, 10 aulas 15% OFF).
 * Os preços são calculados a partir do preço padrão da aula, então se o
 * valor da aula mudar o card se ajusta sozinho.
 */
const PlansCard = ({ campaign, onScheduleClick }: PlansCardProps) => {
  const tiers = [...campaign.tiers].filter((t) => t.percent).sort((a, b) => a.items - b.items);
  if (tiers.length === 0) return null;

  return (
    <section id="promocao" className="relative px-4 py-12 md:py-20" aria-label={campaign.name}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="relative overflow-hidden rounded-3xl border border-primary/60 bg-card shadow-glow">
          <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative grid items-center gap-8 p-5 sm:p-10 md:grid-cols-[1fr_1.1fr] md:gap-10">
            {/* Título */}
            <div className="min-w-0 text-center md:text-left">
              <span className="inline-block -rotate-2 rounded-md bg-primary px-3 py-1 text-sm font-black uppercase tracking-wide text-primary-foreground">
                Lançamento
              </span>
              <h2 className="mt-4 font-black uppercase leading-[0.9] tracking-tight">
                <span className="block text-5xl text-white sm:text-6xl lg:text-7xl">Novos</span>
                <span className="block text-5xl text-primary sm:text-6xl lg:text-7xl">Planos</span>
              </h2>
              <p className="mt-2 flex items-center justify-center gap-2 text-2xl font-extrabold italic text-white sm:text-3xl md:justify-start">
                Spinning <Bike className="h-7 w-7 text-primary" />
              </p>
              <p className="mt-5 text-base font-semibold uppercase text-muted-foreground">
                Mais flexibilidade para você <span className="text-primary">ir mais longe!</span>
              </p>

              <div className="mt-6 hidden items-center gap-3 rounded-xl border border-primary/50 px-4 py-3 md:inline-flex">
                <Zap className="h-7 w-7 shrink-0 fill-primary text-primary" />
                <p className="text-left text-sm font-bold uppercase leading-tight text-white">
                  Mais aulas, mais energia,
                  <br />
                  <span className="text-primary">melhores resultados!</span>
                </p>
              </div>
            </div>

            {/* Faixas */}
            <div className="min-w-0 space-y-3">
              {tiers.map((tier) => {
                const regular = DEFAULT_PRICE_CENTS * tier.items;
                const total = regular - tierDiscountCents(tier, regular);
                return (
                  <div
                    key={tier.items}
                    className="flex items-center gap-4 rounded-2xl border border-primary/50 bg-black/40 p-3 sm:p-4"
                  >
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-primary text-primary sm:h-16 sm:w-16">
                      <span className="text-2xl font-black leading-none sm:text-3xl">{tier.items}</span>
                      <span className="text-[10px] font-bold uppercase">aulas</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Na compra de</p>
                      <p className="text-lg font-black uppercase text-white sm:text-xl">{tier.items} aulas</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="line-through">{brl(regular)}</span>{" "}
                        <span className="font-semibold text-foreground">por {brl(total)}</span>
                      </p>
                    </div>
                    <div className="min-w-[4.5rem] shrink-0 rounded-xl bg-primary px-3 py-2 text-center text-primary-foreground sm:px-4">
                      <p className="text-[10px] font-bold uppercase leading-none">Ganhe</p>
                      <p className="text-2xl font-black italic leading-none sm:text-3xl">{tier.percent}%</p>
                      <p className="text-[10px] font-black uppercase leading-none">off</p>
                    </div>
                  </div>
                );
              })}

              <Button
                size="lg"
                onClick={onScheduleClick}
                className="mt-2 h-auto w-full whitespace-normal rounded-full bg-gradient-primary px-6 py-4 text-base font-black uppercase text-primary-foreground animate-pulse-glow transition-transform hover:scale-105 sm:text-lg"
              >
                Escolher minhas aulas
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Escolha 3, 5 ou 10 aulas no agendamento e o desconto entra automaticamente.
              </p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-primary px-4 py-3 text-xs font-black uppercase text-primary-foreground sm:text-sm">
            <span className="inline-flex items-center gap-1.5"><HeartPulse className="h-4 w-4" /> Saúde</span>
            <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4" /> Disposição</span>
            <span className="inline-flex items-center gap-1.5"><Trophy className="h-4 w-4" /> Superação</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default PlansCard;
