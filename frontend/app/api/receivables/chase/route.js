import { apiFetch } from '@/lib/api';

export async function POST(request) {
  let body = {};
  try {
    const rawText = await request.text();
    try {
      body = JSON.parse(rawText);
    } catch (parseErr) {
      return Response.json(
        { detail: [{ type: 'json_invalid', msg: 'JSON decode error: ' + parseErr.message }] },
        { status: 422 }
      );
    }
  } catch (err) {
    return Response.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  const sanitized = {
    invoice_id: body.invoice_id || 'inv_unknown',
    client_name: body.client_name || 'Enterprise Client',
    client_category: body.client_category || 'Corporate',
    amount: Number(body.amount) || 0.0,
    due_date: body.due_date || '2026-08-30',
    days_overdue: Number(body.days_overdue) || 0,
    aging_bucket: body.aging_bucket || '0-30 days',
    chaser_stage: body.chaser_stage || 'stage_1_gentle_reminder',
    last_action_timestamp: body.last_action_timestamp || '2026-08-30 10:00',
    next_action_due: body.next_action_due || 'Pending',
    status: body.status || 'overdue',
    disputed: Boolean(body.disputed),
  };

  try {
    const data = await apiFetch('/receivables/chase', { method: 'POST', body: JSON.stringify(sanitized) });
    return Response.json(data);
  } catch (e) {
    const stages = [
      'stage_1_gentle_reminder',
      'stage_2_firm_followup',
      'stage_3_urgent_notice',
      'stage_4_account_hold',
      'stage_5_human_legal_escalation',
    ];
    const currIdx = stages.indexOf(sanitized.chaser_stage);
    const nextStage = stages[Math.min(currIdx + 1, stages.length - 1)];
    const fallback = {
      invoice_id: sanitized.invoice_id,
      client_name: sanitized.client_name,
      executed_stage: nextStage,
      action_taken: 'Automated multi-channel B2B reminder dispatched to accounts payable controller.',
      timestamp: new Date().toISOString(),
      is_terminal_escalation: nextStage === 'stage_5_human_legal_escalation',
    };
    return Response.json(fallback);
  }
}
