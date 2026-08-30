'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import { MOCK_CHECKOUT_EVENTS } from '@/lib/merchantData'
import { playScanSound, playSuccessSound } from '@/lib/soundEffects'
import {
  ShoppingCart,
  Send,
  Sparkles,
  Zap,
  TrendingUp,
  Percent,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Mail,
  Smartphone,
  RefreshCw,
  X
} from 'lucide-react'

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
}

export default function CheckoutRecoveryPage() {
  const [events, setEvents] = useState(MOCK_CHECKOUT_EVENTS)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [discountPct, setDiscountPct] = useState(5)
  const [activeChannel, setActiveChannel] = useState('whatsapp')
  const [simulatingId, setSimulatingId] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)

  useEffect(() => {
    fetch('/api/checkout-abandonment/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.events && d.events.length > 0) setEvents(d.events)
      })
      .catch(() => {})
  }, [])

  const totalCarts = events.length
  const totalAbandonedValue = events.reduce((acc, c) => acc + c.cart_value, 0)
  const recoveredValue = events.reduce((acc, c) => acc + (c.recovered_amount || 0), 0)
  const recoveredCount = events.filter((c) => c.status === 'recovered').length
  const convRate = totalCarts > 0 ? (recoveredCount / totalCarts) * 100 : 0

  const handleTriggerRecovery = async (event) => {
    const currentNudges = event.nudge_count || 1
    const nextNudge = currentNudges + 1
    const isTerminal = nextNudge >= 3

    setSimulatingId(event.checkout_id)
    playScanSound()

    try {
      const res = await fetch('/api/checkout-abandonment/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          nudge_count: nextNudge,
          max_nudges: 3,
          recovery_channel: activeChannel,
          discount_offered_pct: discountPct,
        }),
      })
      const result = await res.json()
      setTimeout(() => {
        setSimulatingId(null)
        setRecoveryModal({
          ...result,
          nudge_count: nextNudge,
          isTerminal,
        })
        // Mark event with bounded workflow state
        setEvents((prev) =>
          prev.map((e) =>
            e.checkout_id === event.checkout_id
              ? {
                  ...e,
                  status: isTerminal ? 'expired' : 'recovered',
                  nudge_count: nextNudge,
                  recovered_amount: result.projected_recovery_value,
                  recovery_channel: activeChannel,
                  discount_offered_pct: discountPct,
                }
              : e
          )
        )
        playSuccessSound()
      }, 1200)
    } catch {
      setTimeout(() => {
        setSimulatingId(null)
        const mockResult = {
          checkout_id: event.checkout_id,
          intervention: {
            channel: activeChannel,
            scheduled_after_minutes: 15,
            discount_offered_pct: discountPct,
            recovery_url: `https://pay.rzp.io/${event.checkout_id}?rec=${activeChannel.slice(0, 2)}${discountPct}`,
            copy: `Hi ${event.customer_name}, your cart is waiting! Complete your order now and enjoy ${discountPct}% off: https://pay.rzp.io/${event.checkout_id}?rec=${activeChannel.slice(0, 2)}${discountPct}`,
          },
          projected_recovery_value: event.cart_value * (1 - discountPct / 100),
          projected_conversion_probability: activeChannel === 'whatsapp' ? 0.72 : 0.48,
          nudge_count: nextNudge,
          isTerminal,
        }
        setRecoveryModal(mockResult)
        setEvents((prev) =>
          prev.map((e) =>
            e.checkout_id === event.checkout_id
              ? {
                  ...e,
                  status: isTerminal ? 'expired' : 'recovered',
                  nudge_count: nextNudge,
                  recovered_amount: mockResult.projected_recovery_value,
                  recovery_channel: activeChannel,
                  discount_offered_pct: discountPct,
                }
              : e
          )
        )
        playSuccessSound()
      }, 1200)
    }
  }

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> CHECKOUT ABANDONMENT SUITE
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>
              Checkout Drop-off Recovery
            </h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Autonomous intent detection, dynamic cart re-engagement, and 1-click tokenized checkout links
            </p>
          </div>
        </div>

        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Recovered Cart Revenue</span>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--gold">{fmtINR(recoveredValue)}</div>
            <div className="metric-card__sub" style={{ color: '#22c55e', fontWeight: 600 }}>
              ✦ {recoveredCount} checkouts salvaged
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Cart Recovery Rate</span>
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--blue">{convRate.toFixed(1)}%</div>
            <div className="metric-card__sub">Conversion via automated nudges</div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Total Cart Value at Risk</span>
              <ShoppingCart className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--dim">{fmtINR(totalAbandonedValue)}</div>
            <div className="metric-card__sub">{totalCarts} detected abandonment sessions</div>
          </div>
        </div>

        {/* Configuration & Action Banner */}
        <div
          className="card card--padded"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 28,
            background: 'linear-gradient(180deg, rgba(14, 22, 41, 0.9) 0%, rgba(8, 12, 24, 0.95) 100%)',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Recovery Intervention Parameters</div>
            <div className="text-muted text-xs" style={{ marginTop: 2 }}>
              Select automated delivery channel & dynamic incentive credit applied to recovery links
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Channel selector */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--surface-el)', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: Smartphone },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveChannel(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: activeChannel === id ? 'var(--accent-cta)' : 'transparent',
                    color: activeChannel === id ? '#FFFFFF' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Discount selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-el)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Percent className="w-3.5 h-3.5 text-muted" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Discount Incentive:</span>
              {[0, 5, 10].map((d) => (
                <button
                  key={d}
                  onClick={() => setDiscountPct(d)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: discountPct === d ? 'var(--accent-bright)' : 'rgba(255,255,255,0.06)',
                    color: discountPct === d ? '#05070d' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Abandoned Cart Feed Table */}
        <div className="card card--padded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Real-Time Abandoned Cart Stream</div>
              <div className="text-muted text-xs">Customer exit sessions captured by Razorpay Checkout SDK</div>
            </div>
            <span className="badge badge--retrying">{events.length} ACTIVE CARTS</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Checkout ID</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Customer</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Items in Cart</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Cart Value</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Drop-off Stage</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Autonomous Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const ChannelIcon = CHANNEL_ICONS[e.recovery_channel] || MessageCircle
                  const isBusy = simulatingId === e.checkout_id

                  return (
                    <tr key={e.checkout_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {e.checkout_id}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.customer_name}</div>
                        <div className="text-muted text-xs">{e.customer_email}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: 220 }}>
                        {e.items.join(', ')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmtINR(e.cart_value)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {e.abandonment_stage?.replace(/_/g, ' ')} ({e.abandoned_at_minutes_ago}m ago)
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={e.status} />
                        {e.nudge_count && (
                          <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                            Nudge {e.nudge_count}/3
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          className="btn btn-primary"
                          disabled={isBusy || e.status === 'expired'}
                          onClick={() => handleTriggerRecovery(e)}
                          style={{ height: 34, padding: '0 14px', fontSize: 12, gap: 6, marginLeft: 'auto' }}
                          aria-label={`Trigger recovery for ${e.checkout_id}`}
                        >
                          {isBusy ? (
                            'Dispatching…'
                          ) : e.status === 'expired' ? (
                            'Expired (3/3 reached)'
                          ) : e.status === 'recovered' ? (
                            <>
                              Re-engage ({e.nudge_count || 1}/3) <ChannelIcon className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Trigger Recovery <Send className="w-3.5 h-3.5" />
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

      {/* Recovery Dispatch Modal */}
      <AnimatePresence>
        {recoveryModal && (
          <>
            <div className="drawer-overlay" onClick={() => setRecoveryModal(null)} />
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
                width: 'min(540px, 92vw)',
                background: 'var(--surface)',
                border: '1px solid rgba(82, 132, 255, 0.35)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-drawer), var(--shadow-glow)',
                zIndex: 400,
                padding: '26px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div className="eyebrow"><span className="eyebrow__dot" /> RECOVERY DISPATCHED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    Automated Cart Re-engagement Sent (Nudge {recoveryModal.nudge_count || 1}/3)
                  </div>
                </div>
                <button className="btn btn-icon" onClick={() => setRecoveryModal(null)} aria-label="Close recovery modal">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    DISPATCHED COPY ({recoveryModal.intervention?.channel?.toUpperCase()})
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{recoveryModal.intervention?.copy}"
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--surface-el)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Projected Salvage Value</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-bright)', marginTop: 2 }}>
                      {fmtINR(recoveryModal.projected_recovery_value)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-el)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion Probability</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', marginTop: 2 }}>
                      {((recoveryModal.projected_conversion_probability || 0.68) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => setRecoveryModal(null)} style={{ height: 38 }}>
                    Done
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
