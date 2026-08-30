'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import { MOCK_CHECKOUT_EVENTS } from '@/lib/merchantData'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import {
  ShoppingCart,
  TrendingUp,
  Percent,
  MessageCircle,
  Mail,
  Smartphone,
  Send,
  X,
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

  // Loading & Result States
  const [loadingEvent, setLoadingEvent] = useState(null)
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const [loadingError, setLoadingError] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)

  useEffect(() => {
    fetch('/api/checkout-abandonment/events')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then((d) => {
        if (d && Array.isArray(d.events) && d.events.length > 0) {
          setEvents(d.events)
        }
      })
      .catch(() => {})
  }, [])

  // Timer for tracking request in-flight duration
  useEffect(() => {
    if (!loadingEvent || loadingError) return
    const timer = setInterval(() => {
      setLoadingSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [loadingEvent, loadingError])

  const totalCarts = events.length
  const totalAbandonedValue = events.reduce((acc, c) => acc + (c.cart_value || 0), 0)
  const recoveredValue = events.reduce((acc, c) => acc + (c.recovered_amount || 0), 0)
  const recoveredCount = events.filter((c) => c.status === 'recovered').length
  const convRate = totalCarts > 0 ? (recoveredCount / totalCarts) * 100 : 0

  const handleTriggerRecovery = async (event) => {
    if (!event || !event.checkout_id) return

    setLoadingEvent(event)
    setLoadingSeconds(0)
    setLoadingError(null)
    setSelectedEvent(event)

    const currentNudges = event.nudge_count || 1
    const nextNudge = currentNudges + 1
    const isTerminal = nextNudge >= 3

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

      if (!res.ok) {
        throw new Error(`Upstream server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      const finalResult = {
        ...data,
        nudge_count: data.nudge_count || nextNudge,
        isTerminal: Boolean(data.is_terminal || isTerminal || data.status === 'expired'),
        status: data.status || (isTerminal ? 'expired' : 'recovered'),
      }

      const isExp = Boolean(finalResult.is_terminal || finalResult.status === 'expired' || isTerminal)
      const updatedStatus = isExp ? 'expired' : 'recovered'
      const updatedNudge = finalResult.nudge_count || nextNudge

      setLoadingEvent(null)
      setRecoveryModal(finalResult)
      setEvents((prev) =>
        prev.map((e) =>
          e.checkout_id === event.checkout_id
            ? {
                ...e,
                status: updatedStatus,
                nudge_count: updatedNudge,
                recovered_amount: finalResult.projected_recovery_value ?? e.cart_value,
                recovery_channel: activeChannel,
                discount_offered_pct: discountPct,
              }
            : e
        )
      )
      setSelectedEvent((prev) =>
        prev && prev.checkout_id === event.checkout_id
          ? {
              ...prev,
              status: updatedStatus,
              nudge_count: updatedNudge,
              recovered_amount: finalResult.projected_recovery_value ?? prev.cart_value,
            }
          : prev
      )
    } catch (err) {
      setLoadingError({
        message: err.message || 'Payment recovery service timed out or was unreachable.',
      })
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
        <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Recovered Cart Revenue</span>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--gold">{fmtINR(recoveredValue)}</div>
            <div className="metric-card__sub" style={{ color: '#688CFF', fontWeight: 600 }}>
              {recoveredCount} of {totalCarts} carts converted
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Recovery Conversion Rate</span>
              <Percent className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value metric-card__value--blue">{convRate.toFixed(1)}%</div>
            <div className="metric-card__sub">Omnichannel multi-nudge conversion</div>
          </div>

          <div className="metric-card">
            <div className="metric-card__hdr">
              <span className="metric-card__label">Total Cart At-Risk</span>
              <ShoppingCart className="w-4 h-4 text-accent" />
            </div>
            <div className="metric-card__value" style={{ color: 'var(--text-primary)' }}>
              {fmtINR(totalAbandonedValue)}
            </div>
            <div className="metric-card__sub">Gross pipeline opportunity</div>
          </div>
        </div>

        {/* Omnichannel Dispatch Controller Configuration */}
        <div className="card card--padded" style={{ marginBottom: 24, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Channel Protocol:
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'email', label: 'Email' },
                  { id: 'sms', label: 'SMS' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: activeChannel === ch.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: activeChannel === ch.id ? 'rgba(82, 132, 255, 0.16)' : 'rgba(255,255,255,0.03)',
                      color: activeChannel === ch.id ? 'var(--accent-bright)' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Offer Incentive:
              </span>
              {[0, 5, 10, 15].map((d) => (
                <button
                  key={d}
                  onClick={() => setDiscountPct(d)}
                  style={{
                    padding: '4px 10px',
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

        {/* Dual-Pane Workbench */}
        <div className="workbench-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}>
          {/* Abandoned Cart Feed Table */}
          <div className="card card--padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Real-Time Abandoned Cart Stream</div>
                <div className="text-muted text-xs">Click any row to preview message · Dispatch re-engagement with 1 click</div>
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
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Exit Stage</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const ChannelIcon = CHANNEL_ICONS[e.recovery_channel] || MessageCircle
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
                            disabled={e.status === 'expired'}
                            onClick={(evt) => {
                              evt.stopPropagation()
                              handleTriggerRecovery(e)
                            }}
                            style={{ height: 32, padding: '0 12px', fontSize: 11.5, gap: 5, marginLeft: 'auto' }}
                            aria-label={`Trigger recovery for ${e.checkout_id}`}
                          >
                            {e.status === 'expired' ? (
                              'Expired (3/3)'
                            ) : (
                              <>
                                Re-engage <ChannelIcon className="w-3 h-3" />
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

      {/* ── 3D Vaulta Rotating Card Loader for In-Flight Re-engagement ── */}
      {loadingEvent && (
        <VaultaLoadingScreen
          mode="modal"
          title={`Re-engaging ${loadingEvent.customer_name}…`}
          subtitles={[
            'Synthesizing personalized omnichannel copy',
            'Applying dynamic discount incentives',
            'Generating 1-click tokenized checkout URL',
            'Dispatching priority message gateway',
          ]}
          elapsedSeconds={loadingSeconds}
          error={loadingError}
          onRetry={() => handleTriggerRecovery(loadingEvent)}
          onClose={() => {
            setLoadingEvent(null)
            setLoadingError(null)
          }}
        />
      )}

      {/* ── Success Intervention Result Modal ── */}
      <AnimatePresence>
        {recoveryModal && (
          <>
            <div className="drawer-overlay" style={{ zIndex: 1090 }} onClick={() => setRecoveryModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
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
