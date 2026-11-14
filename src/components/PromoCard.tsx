import { useActiveCampaign } from "@/hooks/use-campaign";
import BlackFridayCard from "@/components/promo/BlackFridayCard";
import PlansCard from "@/components/promo/PlansCard";

interface PromoCardProps {
  onScheduleClick: () => void;
}

/**
 * Card da campanha que está valendo agora. Troca sozinho na virada de uma
 * campanha para a outra (o relógio reavalia a cada 30s); sem campanha, some.
 */
const PromoCard = ({ onScheduleClick }: PromoCardProps) => {
  const { campaign, now } = useActiveCampaign();
  if (!campaign) return null;
  if (campaign.tiers.some((t) => t.totalCents != null)) {
    return <BlackFridayCard campaign={campaign} now={now} onScheduleClick={onScheduleClick} />;
  }
  return <PlansCard campaign={campaign} onScheduleClick={onScheduleClick} />;
};

export default PromoCard;
