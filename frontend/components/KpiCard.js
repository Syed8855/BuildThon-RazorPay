// KpiCard — UI_SPEC.md shared component
// surface bg, 12px border-radius, label above value.

export default function KpiCard({ label, value, sub, colorClass = '' }) {
  return (
    <div className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <span className={`kpi-card__value ${colorClass}`}>{value}</span>
      {sub && <span className="kpi-card__sub">{sub}</span>}
    </div>
  );
}
