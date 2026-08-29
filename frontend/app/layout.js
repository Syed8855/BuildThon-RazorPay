import './globals.css'
import GlobalNav from '@/components/GlobalNav'

export const metadata = {
  title: 'Revenue Recovery — Explainable ML Retry System',
  description: 'Automatically recover failed payments. Explainable AI, rule guardrails, zero issuer friction.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalNav />
        {children}
      </body>
    </html>
  )
}
