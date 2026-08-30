'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/components/StatusBadge'
import { MOCK_CHECKOUT_EVENTS } from '@/lib/merchantData'
import {
  ShoppingCart,
  TrendingUp,
  Percent,
  MessageCircle,
  Mail,
  Smartphone,
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

  const totalCarts = events.length
  const totalAbandonedValue = events.reduce((acc, c) => acc + (c.cart_value || 0), 0)
  const recoveredValue = events.reduce((acc, c) => acc + (c.recovered_amount || 0), 0)
  const recoveredCount = events.filter((c) => c.status === 'recovered').length
  const convRate = totalCarts > 0 ? (recoveredCount / totalCarts) * 100 : 0

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
        <div className="card card--padded" style={{ marginBottom: 24, padding: '18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Offer Incentive:
              </span>
              {[0, 5, 10, 15].map((d) => (
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

        {/* Dual-Pane Workbench */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}>
          {/* Abandoned Cart Feed Table */}
          <div className="card card--padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Real-Time Abandoned Cart Stream</div>
                <div className="text-muted text-xs">Click any customer row to preview omnichannel communication</div>
              </div>
              <span className="badge badge--retrying">{events.length} ACTIVE CARTS</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Checkout ID</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Customer</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Cart Value</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Exit Stage</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '12px 14px', color: 'var(--text-muted)', textAlign: 'right' }}>Recovery Channel</th>
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
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--accent-bright)',
                              background: 'rgba(82, 132, 255, 0.08)',
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(82, 132, 255, 0.2)',
                            }}
                          >
                            <ChannelIcon className="w-3.5 h-3.5" />
                            {e.recovery_channel?.toUpperCase()}
                          </span>
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
    </div>
  )
}
