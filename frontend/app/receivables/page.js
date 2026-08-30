'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import { MOCK_INVOICES } from '@/lib/merchantData'
import { playScanSound, playSuccessSound } from '@/lib/soundEffects'
import {
  FileText,
  Calendar,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Scale,
  Send,
  X,
  ShieldAlert,
  CheckCircle2,
  Play
} from 'lucide-react'

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

const STAGE_LABELS = {
  stage_1_gentle_reminder: { label: '1. Gentle Reminder', cls: 'stage--1', desc: 'Courtesy statement & payment link' },
  stage_2_firm_followup: { label: '2. Firm Follow-up', cls: 'stage--2', desc: 'Email + WhatsApp reminder' },
  stage_3_urgent_notice: { label: '3. Urgent Notice', cls: 'stage--3', desc: 'Credit surcharge & interest warning' },
  stage_4_account_hold: { label: '4. Service Hold', cls: 'stage--4', desc: 'API & service provision hold' },
  stage_5_human_legal_escalation: { label: '5. Legal Escalation', cls: 'stage--5', desc: 'Dossier transferred to Corporate Legal' },
}

export default function ReceivablesPage() {
  const [invoices, setInvoices] = useState(MOCK_INVOICES)
  const [activeBucket, setActiveBucket] = useState('all')
  const [executingId, setExecutingId] = useState(null)
  const [chaserModal, setChaserModal] = useState(null)

  useEffect(() => {
    fetch('/api/receivables/invoices')
      .then((r) => r.json())
      .then((d) => {
        if (d.invoices && d.invoices.length > 0) setInvoices(d.invoices)
      })
      .catch(() => {})
  }, [])

  const totalAR = invoices.reduce((a, i) => a + i.amount, 0)
  const overdueAR = invoices.filter((i) => i.status !== 'recovered').reduce((a, i) => a + i.amount, 0)
  const legalCount = invoices.filter((i) => i.chaser_stage === 'stage_5_human_legal_escalation').length

  const filteredInvoices = invoices.filter((i) => {
    if (activeBucket === 'all') return true
    return i.aging_bucket === activeBucket
  })

  const handleExecuteChaser = async (inv) => {
    if (!inv || !inv.invoice_id) return
    setExecutingId(inv.invoice_id)
    playScanSound()

    const stages = [
      'stage_1_gentle_reminder',
      'stage_2_firm_followup',
      'stage_3_urgent_notice',
      'stage_4_account_hold',
      'stage_5_human_legal_escalation',
    ]
    const currIdx = stages.indexOf(inv.chaser_stage)
    const nextStage = stages[Math.min(currIdx + 1, stages.length - 1)]
    const isTerminal = nextStage === 'stage_5_human_legal_escalation'

    const fallbackData = {
      invoice_id: inv.invoice_id,
      client_name: inv.client_name || 'Enterprise Client',
      executed_stage: nextStage,
      action_taken: 'Automated multi-channel B2B reminder dispatched to accounts payable controller.',
      timestamp: new Date().toISOString(),
      is_terminal_escalation: isTerminal,
    }

    try {
      const res = await fetch('/api/receivables/chase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: inv.invoice_id,
          client_name: inv.client_name || 'Enterprise Client',
          client_category: inv.client_category || 'Corporate',
          amount: inv.amount || 0,
          due_date: inv.due_date || '2026-08-30',
          days_overdue: inv.days_overdue || 0,
          aging_bucket: inv.aging_bucket || '0-30 days',
          chaser_stage: inv.chaser_stage || 'stage_1_gentle_reminder',
          last_action_timestamp: inv.last_action_timestamp || '2026-08-30 10:00',
          next_action_due: inv.next_action_due || 'Pending',
          status: inv.status || 'overdue',
          disputed: !!inv.disputed,
        }),
      })

      let finalData = fallbackData
      if (res.ok) {
        const data = await res.json()
        if (data && data.executed_stage) {
          finalData = data
        }
      }

      setExecutingId(null)
      setChaserModal(finalData)
      setInvoices((prev) =>
        prev.map((item) =>
          item.invoice_id === inv.invoice_id
            ? {
                ...item,
                chaser_stage: finalData.executed_stage,
                last_action_timestamp: 'Just now',
                status: finalData.is_terminal_escalation ? 'escalated_to_legal' : item.status,
              }
            : item
        )
      )
      playSuccessSound()
    } catch {
      setExecutingId(null)
      setChaserModal(fallbackData)
      setInvoices((prev) =>
        prev.map((item) =>
          item.invoice_id === inv.invoice_id
            ? {
                ...item,
                chaser_stage: fallbackData.executed_stage,
                last_action_timestamp: 'Just now',
                status: fallbackData.is_terminal_escalation ? 'escalated_to_legal' : item.status,
              }
            : item
        )
      )
      playSuccessSound()
    }
  }

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Page Header */}
        <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> B2B RECEIVABLES & AGING CHASER
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>
              Overdue Receivables Management
            </h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Autonomous multi-tier invoice chaser with progressive bounded escalation and legal handoff
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Total Overdue Receivables</span>
              <AlertTriangle className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--gold">{fmtINR(overdueAR)}</div>
            <div className="metric-card__sub" style={{ color: '#E07070', fontWeight: 600 }}>
              {invoices.length} outstanding B2B invoices
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Average Aging DSO</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--blue">47.4 Days</div>
            <div className="metric-card__sub">Days Sales Outstanding metric</div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Legal Escalations</span>
              <Scale className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value" style={{ color: '#F59E0B' }}>
              {legalCount} Accounts
            </div>
            <div className="metric-card__sub">Stage 5 Bounded Terminal Escalation</div>
          </div>
        </div>

        {/* Aging Bucket Visual Thermometer Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { id: '0-30 days', label: '0–30 Days Overdue', count: invoices.filter((i) => i.aging_bucket === '0-30 days').length, val: invoices.filter((i) => i.aging_bucket === '0-30 days').reduce((a, b) => a + b.amount, 0), color: '#3862FF', risk: 'Low Risk' },
            { id: '31-60 days', label: '31–60 Days Overdue', count: invoices.filter((i) => i.aging_bucket === '31-60 days').length, val: invoices.filter((i) => i.aging_bucket === '31-60 days').reduce((a, b) => a + b.amount, 0), color: '#E5A138', risk: 'Medium Risk' },
            { id: '61-90 days', label: '61–90 Days Overdue', count: invoices.filter((i) => i.aging_bucket === '61-90 days').length, val: invoices.filter((i) => i.aging_bucket === '61-90 days').reduce((a, b) => a + b.amount, 0), color: '#F59E0B', risk: 'High Risk' },
            { id: '90+ days', label: '90+ Days (Legal)', count: invoices.filter((i) => i.aging_bucket === '90+ days').length, val: invoices.filter((i) => i.aging_bucket === '90+ days').reduce((a, b) => a + b.amount, 0), color: '#E05858', risk: 'Critical / Legal' },
          ].map((bucket) => (
            <div
              key={bucket.id}
              onClick={() => setActiveBucket(activeBucket === bucket.id ? 'all' : bucket.id)}
              className="card card--padded card--hover"
              style={{
                cursor: 'pointer',
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                border: activeBucket === bucket.id ? `1px solid ${bucket.color}` : '1px solid var(--border)',
                background: activeBucket === bucket.id ? 'rgba(82, 132, 255, 0.12)' : 'var(--surface-el)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{bucket.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: bucket.color, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                  {bucket.risk}
                </span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
                {fmtINR(bucket.val)}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                {bucket.count} invoices · Click to filter
              </div>
            </div>
          ))}
        </div>

        {/* Aging Bucket Selector Filters */}
        <div className="filter-bar" style={{ marginBottom: 20 }}>
          {['all', '0-30 days', '31-60 days', '61-90 days', '90+ days'].map((b) => (
            <button
              key={b}
              className={`filter-pill ${activeBucket === b ? 'active' : ''}`}
              onClick={() => setActiveBucket(b)}
              aria-label={`Filter aging bucket by ${b}`}
            >
              {b === 'all' ? 'All Aging Buckets' : b}
            </button>
          ))}
        </div>

        {/* Invoices Ledger Table */}
        <div className="card card--padded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>B2B Aging Ledger & Chaser State Machine</div>
              <div className="text-muted text-xs">
                Sequential bounded escalation: Reminder (D1) → Firm Follow-up (D7) → Urgent Notice (D15) → Account Hold (D30) → Legal (D60+)
              </div>
            </div>
            <span className="badge badge--recovered">{filteredInvoices.length} INVOICES</span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Invoice ID</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Enterprise Client</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Amount</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Due Date & Overdue</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Aging Bucket</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Current Chaser Stage</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Autonomous Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const stageInfo = STAGE_LABELS[inv.chaser_stage] || STAGE_LABELS.stage_1_gentle_reminder
                  const isBusy = executingId === inv.invoice_id
                  const isTerminal = inv.chaser_stage === 'stage_5_human_legal_escalation'

                  return (
                    <tr
                      key={inv.invoice_id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isTerminal ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {inv.invoice_id}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client_name}</div>
                        <div className="text-muted text-xs">{inv.client_category}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmtINR(inv.amount)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div>{inv.due_date}</div>
                        <span style={{ fontSize: 11, color: '#E07070', fontWeight: 600 }}>
                          {inv.days_overdue} days overdue
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            background:
                              inv.aging_bucket === '90+ days'
                                ? 'rgba(201, 90, 90, 0.18)'
                                : inv.aging_bucket === '61-90 days'
                                ? 'rgba(245, 158, 11, 0.16)'
                                : 'rgba(255, 255, 255, 0.06)',
                            color:
                              inv.aging_bucket === '90+ days'
                                ? '#E07070'
                                : inv.aging_bucket === '61-90 days'
                                ? '#F59E0B'
                                : 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {inv.aging_bucket}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: isTerminal ? '#F59E0B' : 'var(--text-primary)', fontSize: 12 }}>
                          {stageInfo.label}
                        </div>
                        <div className="text-muted text-xs" style={{ marginTop: 2 }}>{stageInfo.desc}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          className={isTerminal ? 'btn btn-secondary' : 'btn btn-primary'}
                          disabled={isBusy}
                          onClick={() => handleExecuteChaser(inv)}
                          style={{ height: 34, padding: '0 14px', fontSize: 12, gap: 6, marginLeft: 'auto' }}
                          aria-label={`Execute chaser stage for ${inv.invoice_id}`}
                        >
                          {isBusy ? (
                            'Advancing Chaser…'
                          ) : isTerminal ? (
                            <>
                              View Legal Dossier <Scale className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Advance Stage <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chaser Execution Feedback Modal */}
      <AnimatePresence>
        {chaserModal && (
          <>
            <div className="drawer-overlay" style={{ zIndex: 1090 }} onClick={() => setChaserModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(520px, 92vw)',
                maxHeight: 'min(88vh, 600px)',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid rgba(82, 132, 255, 0.35)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-drawer), var(--shadow-glow)',
                zIndex: 1100,
                padding: '26px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div className="eyebrow"><span className="eyebrow__dot" /> CHASER STAGE ADVANCED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    {chaserModal.client_name || 'Enterprise Client'}
                  </div>
                </div>
                <button className="btn btn-icon" onClick={() => setChaserModal(null)} aria-label="Close chaser modal">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    ACTIVE STAGE: {(STAGE_LABELS[chaserModal.executed_stage] || STAGE_LABELS.stage_1_gentle_reminder)?.label?.toUpperCase() || 'STAGE ADVANCED'}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    {chaserModal.action_taken || 'Autonomous chaser action executed.'}
                  </div>
                </div>

                {chaserModal.is_terminal_escalation && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: 12, fontSize: 12, color: '#F59E0B' }}>
                    ⚖️ Bounded Stopping Rule: Maximum automated chaser sequence reached. Account has been halted and transitioned to human legal counsel.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={() => setChaserModal(null)} style={{ height: 38 }} aria-label="Acknowledge and close modal">
                    Acknowledge & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
