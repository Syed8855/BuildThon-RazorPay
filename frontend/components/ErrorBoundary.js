'use client'

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI exception captured by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#FFFFFF',
            fontFamily: 'var(--font, sans-serif)',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: 'rgba(11, 16, 29, 0.95)',
              border: '1px solid rgba(201, 90, 90, 0.35)',
              borderRadius: '16px',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(201, 90, 90, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#E07070',
              }}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#FFFFFF' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13.5, color: '#A0A8C0', lineHeight: 1.55, marginBottom: 24 }}>
              The application encountered an unexpected state. Please reload to resume your recovery session.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{
                height: 42,
                padding: '0 24px',
                fontSize: 13.5,
                gap: 8,
                margin: '0 auto',
              }}
              aria-label="Refresh and reload the page"
            >
              <RotateCcw className="w-4 h-4" /> Refresh & Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
