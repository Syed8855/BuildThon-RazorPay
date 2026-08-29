// ShapBars — UI_SPEC.md shared component
// Shows top 3-4 SHAP contributions as horizontal bars.
// positive = blue, negative = dark gray. Sign + magnitude.

export default function ShapBars({ contributions = [] }) {
  if (!contributions || contributions.length === 0) return null;

  const maxAbs = Math.max(...contributions.map(c => Math.abs(c.impact)), 0.001);

  return (
    <div className="shap-bars">
      {contributions.slice(0, 4).map((c) => {
        const pct = (Math.abs(c.impact) / maxAbs) * 100;
        const isPos = c.impact >= 0;
        const label = isPos
          ? `+${(c.impact * 100).toFixed(1)}%`
          : `${(c.impact * 100).toFixed(1)}%`;

        return (
          <div key={c.feature} className="shap-row">
            <span className="shap-row__name" title={c.feature}>
              {c.feature.replace(/_/g, ' ')}
            </span>
            <div className="shap-row__bar-track">
              <div
                className={`shap-row__bar-fill ${isPos ? 'shap-row__bar-fill--pos' : 'shap-row__bar-fill--neg'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`shap-row__value ${isPos ? 'shap-row__value--pos' : 'shap-row__value--neg'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
