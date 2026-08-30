// StatusBadge — UI_SPEC.md shared component
// Pill shape, status color at 12% opacity bg, full-strength text.

const STATUS_MAP = {
  recovered:          { cls: 'badge--recovered', label: 'Recovered' },
  retrying:           { cls: 'badge--retrying',  label: 'Retrying' },
  pending_retry:      { cls: 'badge--pending',   label: 'Pending retry' },
  hard_failed:        { cls: 'badge--failed',    label: 'Hard-failed' },
  churned:            { cls: 'badge--churned',   label: 'Churned' },
  escalated_to_human: { cls: 'badge--escalated', label: 'Escalated to Human' },
  dnd_blocked:        { cls: 'badge--churned',   label: 'Skipped (DND)' },
  dnd_restricted:     { cls: 'badge--churned',   label: 'Skipped (DND)' },
  quiet_hours_held:   { cls: 'badge--pending',   label: 'Quiet Hours Hold' },
  skipped_compliance: { cls: 'badge--churned',   label: 'Compliance Hold' },
  success:            { cls: 'badge--recovered', label: 'Success' },
  fail:               { cls: 'badge--failed',    label: 'Failed' },
  not_attempted:      { cls: 'badge--churned',   label: 'Not attempted' },
};

export default function StatusBadge({ status, label }) {
  const def = STATUS_MAP[status] || { cls: 'badge--pending', label: status };
  return (
    <span className={`badge ${def.cls}`}>
      {label ?? def.label}
    </span>
  );
}
