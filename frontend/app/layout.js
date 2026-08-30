import './globals.css'
import GlobalNav from '@/components/GlobalNav'
import BackgroundVideo from '@/components/BackgroundVideo'
import ErrorBoundary from '@/components/ErrorBoundary'
import { BackendProvider } from '@/context/BackendContext'

export const metadata = {
  title: 'Revenue Recovery — Explainable ML Retry System',
  description: 'Automatically recover failed payments. Explainable AI, rule guardrails, zero issuer friction.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ position: 'relative', background: '#000000', minHeight: '100vh', overflowX: 'hidden' }}>
        <BackendProvider>
          <BackgroundVideo />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <GlobalNav />
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </BackendProvider>
      </body>
    </html>
  )
}

