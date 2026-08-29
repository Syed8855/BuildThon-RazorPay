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
            <div className="shap-row__track">
              <div
                className={isPos ? 'shap-row__fill--pos' : 'shap-row__fill--neg'}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`shap-row__val ${isPos ? 'shap-row__val--pos' : 'shap-row__val--neg'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
