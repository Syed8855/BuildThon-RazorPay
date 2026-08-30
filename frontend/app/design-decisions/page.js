'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Cpu, ShieldCheck, Database, GitBranch, Play, CheckCircle2, ArrowRight } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1]

/* ── Interactive Architecture Diagram Component ──────────────── */
const ARCH_NODES = [
  { id: 'payment', label: 'PAYMENT INITIATED', desc: 'Customer initiates payment checkout transaction', icon: '💳' },
  { id: 'event', label: 'EVENT RECEIVED', desc: 'Webhook event received by Revenue Recovery listener', icon: '⚡' },
  {
    id: 'engine',
    label: 'RECOVERY ENGINE',
    desc: 'Hybrid decision orchestrator evaluating rules, ML models, and historical state',
    subnodes: [
      { id: 'rules', label: 'RULES ENGINE', desc: 'Hard-fail short circuit (card_stolen, max attempts)' },
      { id: 'ml', label: 'XGBOOST ML MODEL', desc: 'Calculates P(success) & SHAP feature contributions' },
      { id: 'history', label: 'ATTEMPT HISTORY', desc: 'Tracks attempt numbers, spacing & payday indicators' },
    ],
    icon: '🧠',
  },
  { id: 'decision', label: 'DECISION LOGIC', desc: 'Orchestrator resolves action: RETRY, WAIT, SKIP, or DISCARD', icon: '⚖️' },
  { id: 'retry', label: 'SMART RETRY', desc: 'Dispatches retry to gateway at optimal time window', icon: '🔄' },
  { id: 'recovered', label: '✓ RECOVERED', desc: 'Authorization successful; ARR salvaged with zero issuer friction', icon: '🏆' },
]

function ArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState('engine')

  const currentNode = ARCH_NODES.find((n) => n.id === selectedNode) || ARCH_NODES[2]

  return (
    <div className="card card--padded" style={{ marginBottom: 32, padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="eyebrow"><span className="eyebrow__dot" /> INTERACTIVE SYSTEM PIPELINE</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>End-to-End Recovery Architecture</div>
        </div>
        <span className="text-muted text-xs">Click any component to inspect its role</span>
      </div>

      {/* Pipeline Diagram Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: 'var(--surface-el)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 16px',
          marginBottom: 20,
        }}
      >
        {ARCH_NODES.map((node, i) => {
          const isSel = selectedNode === node.id
          return (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.button
                type="button"
                onClick={() => setSelectedNode(node.id)}
                whileHover={{ scale: 1.04 }}
                style={{
                  background: isSel ? 'var(--accent-cta)' : 'var(--surface)',
                  border: `1px solid ${isSel ? 'var(--accent-bright)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: isSel ? '#FFFFFF' : 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 4px 20px rgba(49,92,255,0.35)' : 'none',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{node.icon}</span>
                <span>{node.label}</span>
              </motion.button>
              {i < ARCH_NODES.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted opacity-40" />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Node Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentNode.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
          style={{
            background: 'rgba(82,132,255,0.06)',
            border: '1px solid rgba(82,132,255,0.20)',
            borderRadius: 'var(--radius-md)',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{currentNode.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{currentNode.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{currentNode.desc}</div>
            </div>
          </div>

          {currentNode.subnodes && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
              {currentNode.subnodes.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                    {sub.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub.desc}</div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Interactive 6-Section Technical Story ──────────────────── */
const SECTIONS = [
  {
    num: '01',
    title: 'THE PROBLEM',
    short: 'Why traditional payment retries destroy merchant revenue & customer trust.',
    decisions: [
      {
        topic: 'Involuntary Churn via Dumb Retries',
        decision: 'Traditional gateways blindly retry failed cards at fixed 24-hour intervals without checking failure codes or customer payday indicators.',
        why: 'Statistically 40%+ of recurring subscription cancellations stem from transient payment failures that could be recovered if retried at the right time.',
        rejected: 'Continuous daily retry spam — triggers issuer fraud flags and cardholder account blocks.',
      },
    ],
  },
  {
    num: '02',
    title: 'RECOVERY ENGINE',
    short: 'Hybrid rules + ML architecture for explainable autonomous recovery.',
    decisions: [
      {
        topic: 'Hybrid Rules + XGBoost Model',
        decision: 'Hard safety rules fire first to eliminate hard fails (stolen cards, closed accounts). Genuine ambiguity passes to XGBoost ML classifier.',
        why: 'Zero latency wasted on non-recoverable transactions while applying machine learning confidence scoring where it actually matters.',
        rejected: 'Pure ML routing (too risky for compliance) or Pure static rules (fails on subtle patterns).',
      },
    ],
  },
  {
    num: '03',
    title: 'DECISION LOGIC',
    short: 'Multi-stage evaluation order and safety cutoffs.',
    decisions: [
      {
        topic: 'Strict Orchestration Priority',
        decision: 'Order: 1. Hard-Fail Check → 2. Attempt Cutoff → 3. Spacing Guardrail → 4. ML Probability Gate → 5. Execution.',
        why: 'Ensures system never violates issuer compliance rules regardless of what the machine learning model predicts.',
        rejected: 'Unordered evaluation or rule override by ML predictions.',
      },
    ],
  },
  {
    num: '04',
    title: 'RETRY STRATEGY',
    short: 'Intelligent timing, spacing, and payday alignment.',
    decisions: [
      {
        topic: 'Payday-Aware & Spacing Schedules',
        decision: 'Incorporate customer payday indicators (1st–5th & 28th–31st of month) and minimum 12-hour spacing between attempts.',
        why: 'Recovery probability increases by 3.2x when retrying within 48 hours of regional payday windows for insufficient funds.',
        rejected: 'Uniform linear retries or immediate retry bursts.',
      },
    ],
  },
  {
    num: '05',
    title: 'ARCHITECTURE',
    short: 'Next.js API proxy and server-side model evaluation.',
    decisions: [
      {
        topic: 'Server Proxy Architecture',
        decision: 'All frontend calls pass through Next.js /api/ proxy endpoints; backend FastAPI handles inference and state machine logic.',
        why: 'Protects backend endpoints, avoids CORS configuration issues, and enables zero-downtime model updates.',
        rejected: 'Direct client-to-Python backend fetches.',
      },
    ],
  },
  {
    num: '06',
    title: 'WHY THIS APPROACH',
    short: 'Perturbed-parameter testing & verifiability.',
    decisions: [
      {
        topic: 'OOD Validation & SHAP Explainability',
        decision: 'Validate model via out-of-distribution perturbed datasets (Val AUC = 0.73, Perturbed = 0.72) and TreeExplainer SHAP attribution.',
        why: 'Proves model learned true payment dynamics rather than over-fitting to generator artifacts.',
        rejected: 'Naive 80/20 train/test split on a single dataset.',
      },
    ],
  },
]

export default function DesignDecisionsPage() {
  const [openSections, setOpenSections] = useState({ '01': true, '02': true, '03': false, '04': false, '05': false, '06': false })

  const toggleSection = (num) => {
    setOpenSections((prev) => ({ ...prev, [num]: !prev[num] }))
  }

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="page-hdr">
          <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
            <span className="eyebrow__dot" /> TECHNICAL STORY
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>Design Decisions & Architecture</h1>
          <p className="page-hdr__sub">
            An interactive technical story — inspect system architecture, decision logic, and why every tradeoff was made.
          </p>
        </div>

        {/* Interactive Architecture Diagram */}
        <ArchitectureDiagram />

        {/* 6 Expandable Accordion Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SECTIONS.map((sec) => {
            const isOpen = !!openSections[sec.num]
            return (
              <div
                key={sec.num}
                className="card"
                style={{
                  borderLeft: `4px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                  overflow: 'hidden',
                  transition: 'border-color 200ms ease',
                }}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(sec.num)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {sec.num}
                    </span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>{sec.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{sec.short}</div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease }}
                      style={{ padding: '0 24px 24px 24px', borderTop: '1px solid var(--border)' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 18 }}>
                        {sec.decisions.map((d, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                            <div style={{ background: 'rgba(82, 132, 255, 0.05)', border: '1px solid rgba(82, 132, 255, 0.15)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
                                ✦ Decision
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{d.decision}</p>
                            </div>

                            <div style={{ background: 'rgba(242, 183, 5, 0.04)', border: '1px solid rgba(242, 183, 5, 0.14)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-gold)', textTransform: 'uppercase', marginBottom: 6 }}>
                                ◈ Why
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{d.why}</p>
                            </div>

                            <div style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                ✕ Rejected
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{d.rejected}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link href="/playground" className="btn btn-primary" style={{ height: 46, padding: '0 28px' }}>
            Launch Simulation Playground <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
