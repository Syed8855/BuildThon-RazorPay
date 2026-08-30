'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/components/StatusBadge'
import { MOCK_INVOICES } from '@/lib/merchantData'
import {
  FileText,
  Calendar,
  AlertTriangle,
  Building2,
  Clock,
  TrendingUp,
  UserCheck,
  Scale,
  ShieldAlert,
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

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> B2B ENTERPRISE LEDGER
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>
              Accounts Receivable & Chaser Engine
            </h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Autonomous 5-stage B2B debt collections, aging-bucket analytics, and human escalation guardrails
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Total A/R Outstanding</span>
              <Building2 className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value" style={{ color: 'var(--text-primary)' }}>{fmtINR(totalAR)}</div>
            <div className="metric-card__sub">{invoices.length} active enterprise client contracts</div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Overdue Outstanding</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--amber">{fmtINR(overdueAR)}</div>
            <div className="metric-card__sub">Actively enrolled in automated chaser sequences</div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Autonomous Salvage Rate</span>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--gold">91.4%</div>
            <div className="metric-card__sub" style={{ color: '#688CFF', fontWeight: 600 }}>
              Resolved before stage 5 escalation
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Legal Counsel Escalations</span>
              <Scale className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--red">{legalCount}</div>
            <div className="metric-card__sub">Transferred to corporate legal (90+ days)</div>
          </div>
        </div>

        {/* 5-Stage Visual Workflow Header */}
        <div className="card card--padded" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16 }}>
            5-Stage Sequential Chaser Cadence (Autonomous Governance)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(STAGE_LABELS).map(([key, val]) => (
              <div
                key={key}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-el)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: key === 'stage_5_human_legal_escalation' ? '#F59E0B' : 'var(--accent-bright)' }}>
                  {val.label}
                </div>
                <div className="text-muted text-xs" style={{ lineHeight: 1.4 }}>
                  {val.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aging Bucket Interactive Filter Bar */}
        <div className="card card--padded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>B2B Aging Ledger & Accounts Roster</div>
              <div className="text-muted text-xs">Real-time status of all accounts receivable and automated follow-up cadences</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Invoices' },
                { id: '0-30 days', label: '0–30 Days' },
                { id: '31-60 days', label: '31–60 Days' },
                { id: '61-90 days', label: '61–90 Days' },
                { id: '90+ days', label: '90+ Days' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBucket(b.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: activeBucket === b.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: activeBucket === b.id ? 'rgba(82, 132, 255, 0.16)' : 'transparent',
                    color: activeBucket === b.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Invoice ID</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Enterprise Client</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Amount</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Due Date & Overdue</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Aging Bucket</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Current Chaser Stage</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Follow-up Schedule</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const stageInfo = STAGE_LABELS[inv.chaser_stage] || STAGE_LABELS.stage_1_gentle_reminder
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
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: isTerminal ? '#F59E0B' : 'var(--text-secondary)',
                            background: 'rgba(255,255,255,0.04)',
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {inv.next_action_due || 'Automated Schedule Active'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
