import './globals.css'
import GlobalNav from '@/components/GlobalNav'
import { BackendProvider } from '@/context/BackendContext'

export const metadata = {
  title: 'Revenue Recovery — Explainable ML Retry System',
  description: 'Automatically recover failed payments. Explainable AI, rule guardrails, zero issuer friction.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <BackendProvider>
          <GlobalNav />
          {children}
        </BackendProvider>
      </body>
    </html>
  )
}
