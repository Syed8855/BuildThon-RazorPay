// OrchestratorLine — UI_SPEC.md shared component
// Single-line callout: icon + plain-english orchestrator decision.
// Always shown alongside (not instead of) the model probability.

const ACTION_STYLE = {
  retry_now:  { cls: 'orch-line--retry',     icon: '🔄' },
  wait:       { cls: 'orch-line--wait',      icon: '⏳' },
  skip_retry: { cls: 'orch-line--skip',      icon: '⏭️' },
  no_retry:   { cls: 'orch-line--no-retry',  icon: '🚫' },
  hard_fail:  { cls: 'orch-line--hard-fail', icon: '⛔' },
  churned:    { cls: 'orch-line--churned',   icon: '📋' },
};

export default function OrchestratorLine({ decision }) {
  if (!decision) return null;
  const action = decision.action || 'no_retry';
  const style = ACTION_STYLE[action] || ACTION_STYLE['no_retry'];

  return (
    <div className={`orch-line ${style.cls}`}>
      <span className="orch-line__icon">{style.icon}</span>
      <span className="orch-line__text">{decision.plain_english}</span>
    </div>
  );
}
