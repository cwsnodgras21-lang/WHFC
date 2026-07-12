import { formatQuantity } from "@/lib/format/inventory";

type OnHandCardProps = {
  label: string;
  quantity: number | null;
  unit?: string;
  caption?: string;
};

function OnHandCard({ label, quantity, unit, caption }: OnHandCardProps) {
  const empty = quantity === null || quantity === 0;

  return (
    <div className={`readout-card${empty ? " readout-card-empty" : ""}`}>
      <span className="readout-card-label">{label}</span>
      <span className="readout-card-value">
        {quantity === null ? "—" : `${formatQuantity(quantity)}${unit ? ` ${unit}` : ""}`}
      </span>
      {caption ? <span className="readout-card-caption">{caption}</span> : null}
    </div>
  );
}

type OnHandSidebarProps = {
  cards: OnHandCardProps[];
};

export function OnHandSidebar({ cards }: OnHandSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-20">
      {cards.map((card) => (
        <OnHandCard key={card.label} {...card} />
      ))}
    </aside>
  );
}
