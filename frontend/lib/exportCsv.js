// lib/exportCsv.js — Helper to format & trigger instant CSV report downloads

export function exportTransactionsCSV(transactions = [], filename = 'razorpay-recovery-audit.csv') {
  if (!transactions || transactions.length === 0) return

  const headers = [
    'Transaction ID',
    'Amount (INR)',
    'Status',
    'Failure Reason',
    'Payment Method',
    'Merchant Category',
    'Customer Segment',
    'Attempt Count',
    'Max Attempts',
    'ML Success Probability',
  ]

  const rows = transactions.map((t) => [
    `"${t.transaction_id || ''}"`,
    t.amount || 0,
    `"${t.status || ''}"`,
    `"${(t.failure_reason || '').replace(/_/g, ' ')}"`,
    `"${t.payment_method || ''}"`,
    `"${(t.merchant_category || '').replace(/_/g, ' ')}"`,
    `"${t.customer_segment || ''}"`,
    t.attempt_count || 1,
    t.max_attempts || 4,
    t.ml_result?.success_probability != null
      ? `${(t.ml_result.success_probability * 100).toFixed(1)}%`
      : 'N/A',
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportSummaryCSV(analytics = {}, filename = 'razorpay-summary-report.csv') {
  const f = analytics.funnel || {}
  const r = analytics.revenue || {}

  const rows = [
    ['Metric', 'Value'],
    ['Total Failed Transactions', f.total_failed || 0],
    ['Hard Failed Discarded', f.hard_failed || 0],
    ['In Retry Cycle', f.retrying || 0],
    ['Successfully Recovered', f.recovered || 0],
    ['Overall Recovery Rate', `${((f.recovery_rate || 0) * 100).toFixed(1)}%`],
    ['Recovered Revenue (INR)', r.recovered || 0],
    ['Revenue at Risk (INR)', r.at_risk || 0],
  ]

  const csvContent = rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
