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
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('checkout_recovery_events_v1')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return MOCK_CHECKOUT_EVENTS
  })
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [discountPct, setDiscountPct] = useState(5)
  const [activeChannel, setActiveChannel] = useState('whatsapp')
  const [simulatingId, setSimulatingId] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)
  const [sessionRestoredNotice, setSessionRestoredNotice] = useState(null)

  // Persist session updates
  useEffect(() => {
    if (typeof window !== 'undefined' && events && events.length > 0) {
      try {
        sessionStorage.setItem('checkout_recovery_events_v1', JSON.stringify(events))
      } catch {}
    }
  }, [events])

  // Check URL params for session re-engagement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const targetId = params.get('checkout_id') || params.get('session_id')
      if (targetId) {
        const found = events.find((e) => e.checkout_id === targetId)
        if (found) {
          setSelectedEvent(found)
          setSessionRestoredNotice(`Active recovery session restored for ${found.customer_name} (${found.checkout_id})`)
        }
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/checkout-abandonment/events')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then((d) => {
        if (d && Array.isArray(d.events) && d.events.length > 0) {
          // Merge with any local in-flight session updates
          setEvents((prev) => {
            const map = new Map(prev.map((e) => [e.checkout_id, e]))
            return d.events.map((e) => map.get(e.checkout_id) || e)
          })
        }
      })
      .catch(() => {})
  }, [])

  const totalCarts = events.length
  const totalAbandonedValue = events.reduce((acc, c) => acc + (c.cart_value || 0), 0)
  const recoveredValue = events.reduce((acc, c) => acc + (c.recovered_amount || 0), 0)
  const recoveredCount = events.filter((c) => c.status === 'recovered').length
  const convRate = totalCarts > 0 ? (recoveredCount / totalCarts) * 100 : 0

  const handleTriggerRecovery = async (event) => {
    if (!event || !event.checkout_id) return

    const currentNudges = event.nudge_count || 1
    const nextNudge = currentNudges + 1
    const isTerminal = nextNudge >= 3

    setSimulatingId(event.checkout_id)
    setSelectedEvent(event)
    playScanSound()

    const fallbackResult = {
      checkout_id: event.checkout_id,
      intervention: {
        channel: activeChannel,
        scheduled_after_minutes: 15,
        discount_offered_pct: discountPct,
        recovery_url: `https://pay.rzp.io/${event.checkout_id}?rec=${activeChannel.slice(0, 2)}${discountPct}`,
        copy: `Hi ${event.customer_name || 'there'}, your cart is waiting! Complete your order now and enjoy ${discountPct}% off: https://pay.rzp.io/${event.checkout_id}?rec=${activeChannel.slice(0, 2)}${discountPct}`,
      },
      projected_recovery_value: (event.cart_value || 0) * (1 - discountPct / 100),
      projected_conversion_probability: activeChannel === 'whatsapp' ? 0.72 : 0.48,
      nudge_count: nextNudge,
      isTerminal,
    }

    try {
      const res = await fetch('/api/checkout-abandonment/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_id: event.checkout_id,
          customer_name: event.customer_name || 'Customer',
          customer_email: event.customer_email || 'customer@example.com',
          customer_phone: event.customer_phone || '+91 98000 00000',
          cart_value: event.cart_value || 0,
          items: Array.isArray(event.items) ? event.items : [],
          abandoned_at_minutes_ago: event.abandoned_at_minutes_ago || 15,
          abandonment_stage: event.abandonment_stage || 'payment_step',
          recovery_channel: activeChannel,
          discount_offered_pct: discountPct,
          recovery_link: event.recovery_link || `https://pay.rzp.io/${event.checkout_id}`,
          nudge_count: nextNudge,
          max_nudges: 3,
        }),
      })

      let finalResult = fallbackResult
      if (res.ok) {
        const data = await res.json()
        if (data && data.intervention) {
          finalResult = {
            ...data,
            nudge_count: nextNudge,
            isTerminal,
          }
        }
      }

      setSimulatingId(null)
      setRecoveryModal(finalResult)
      setEvents((prev) =>
        prev.map((e) =>
          e.checkout_id === event.checkout_id
            ? {
                ...e,
                status: isTerminal ? 'expired' : 'recovered',
                nudge_count: nextNudge,
                recovered_amount: finalResult.projected_recovery_value || e.cart_value,
                recovery_channel: activeChannel,
                discount_offered_pct: discountPct,
              }
            : e
        )
      )
      playSuccessSound()
    } catch {
      setSimulatingId(null)
      setRecoveryModal(fallbackResult)
      setEvents((prev) =>
        prev.map((e) =>
          e.checkout_id === event.checkout_id
            ? {
                ...e,
                status: isTerminal ? 'expired' : 'recovered',
                nudge_count: nextNudge,
                recovered_amount: fallbackResult.projected_recovery_value,
                recovery_channel: activeChannel,
                discount_offered_pct: discountPct,
              }
            : e
        )
      )
      playSuccessSound()
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

        {/* Session Restored Feedback Banner */}
        {sessionRestoredNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 20,
              padding: '12px 18px',
              background: 'rgba(82, 132, 255, 0.12)',
              border: '1px solid rgba(82, 132, 255, 0.35)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--accent-bright)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✦</span> {sessionRestoredNotice}
            </div>
            <button
              onClick={() => setSessionRestoredNotice(null)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', cursor: 'pointer', fontSize: 16 }}
              aria-label="Dismiss session restored notice"
            >
              ×
            </button>
          </motion.div>
        )}

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

        {/* Dual-Pane Workbench: Stream + Smartphone Simulator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 620 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Checkout ID</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Customer</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Cart Value</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Stage</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const ChannelIcon = CHANNEL_ICONS[e.recovery_channel] || MessageCircle
                    const isBusy = simulatingId === e.checkout_id
                    const isSelected = (selectedEvent?.checkout_id || events[0]?.checkout_id) === e.checkout_id

                    return (
                      <tr
                        key={e.checkout_id}
                        onClick={() => setSelectedEvent(e)}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: isSelected ? 'rgba(82, 132, 255, 0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {e.checkout_id}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.customer_name}</div>
                          <div className="text-muted text-xs">{e.customer_email}</div>
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
                            {e.abandonment_stage?.replace(/_/g, ' ')}
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
                            onClick={(evt) => {
                              evt.stopPropagation()
                              handleTriggerRecovery(e)
                            }}
                            style={{ height: 32, padding: '0 12px', fontSize: 11.5, gap: 5, marginLeft: 'auto' }}
                            aria-label={`Trigger recovery for ${e.checkout_id}`}
                          >
                            {isBusy ? (
                              'Dispatching…'
                            ) : e.status === 'expired' ? (
                              'Expired (3/3)'
                            ) : e.status === 'recovered' ? (
                              <>
                                Re-engage <ChannelIcon className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Re-engage <Send className="w-3 h-3" />
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

          {/* Live Smartphone Omnichannel Preview Simulator */}
          <div className="phone-simulator">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                    R
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Razorpay Recovery</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Verified Business</div>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--accent-bright)', fontWeight: 600 }}>● {activeChannel.toUpperCase()}</span>
              </div>

              {/* Message Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end', paddingTop: 16 }}>
                <div className="phone-bubble phone-bubble--incoming">
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Order Pending</div>
                  <div>Hi {selectedEvent?.customer_name || events[0]?.customer_name || 'Customer'}, you left items in your cart:</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-bright)', margin: '4px 0' }}>
                    {(selectedEvent || events[0])?.items?.join(', ') || 'Items in cart'} ({fmtINR((selectedEvent || events[0])?.cart_value)})
                  </div>
                </div>

                <div className={`phone-bubble ${activeChannel === 'whatsapp' ? 'phone-bubble--whatsapp' : 'phone-bubble--incoming'}`}>
                  <div>
                    Complete your checkout with {discountPct > 0 ? `an instant ${discountPct}% discount code applied!` : '1-click Razorpay link:'}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 10px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: 11,
                      wordBreak: 'break-all',
                    }}
                  >
                    🔗 pay.rzp.io/{(selectedEvent || events[0])?.checkout_id}?rec={activeChannel.slice(0, 2)}{discountPct}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.65, marginTop: 4, textAlign: 'right' }}>Just now · Sent via AI Recovery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Dispatch Modal */}
      <AnimatePresence>
        {recoveryModal && (
          <>
            <div className="drawer-overlay" style={{ zIndex: 1090 }} onClick={() => setRecoveryModal(null)} />
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
                maxHeight: 'min(88vh, 620px)',
                overflowY: 'auto',
                background: 'var(--surface)',
                border: '1px solid rgba(82, 132, 255, 0.35)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-drawer), var(--shadow-glow)',
                zIndex: 1100,
                padding: '26px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow__dot" />{' '}
                    {recoveryModal.status === 'expired' ? 'RECOVERY SEQUENCE TERMINATED' : 'RECOVERY DISPATCHED'}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    {recoveryModal.status === 'expired'
                      ? 'Maximum Nudges Reached (3/3 Expired)'
                      : `Automated Cart Re-engagement Sent (Nudge ${recoveryModal.nudge_count || 1}/3)`}
                  </div>
                </div>
                <button className="btn btn-icon" onClick={() => setRecoveryModal(null)} aria-label="Close recovery modal">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {recoveryModal.status === 'expired' ? (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: 14, fontSize: 13, color: '#F59E0B', lineHeight: 1.5 }}>
                    ⚖️ <strong>Bounded Stopping Rule:</strong> This customer cart has received the maximum 3 automated recovery nudges without checkout completion. Per anti-spam regulatory guardrails, further automated messaging is terminated.
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                      DISPATCHED COPY ({recoveryModal.intervention?.channel?.toUpperCase() || 'OMNICHANNEL'})
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      "{recoveryModal.intervention?.copy || 'Recovery re-engagement initiated.'}"
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--surface-el)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Projected Salvage Value</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-bright)', marginTop: 2 }}>
                      {fmtINR(recoveryModal.projected_recovery_value || 0)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-el)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion Probability</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: recoveryModal.status === 'expired' ? '#E07070' : '#22c55e', marginTop: 2 }}>
                      {recoveryModal.status === 'expired' ? '0%' : `${((recoveryModal.projected_conversion_probability || 0.68) * 100).toFixed(0)}%`}
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
