import './globals.css'
import NavSwitcher from '@/components/NavSwitcher'
import ContentWrapper from '@/components/ContentWrapper'

export const metadata = {
  title: 'Revenue Recovery — Explainable ML Retry System',
  description:
    'An explainable, rules-guarded ML system for failed payment retry. ' +
    'Predicts retry success probability and explains every decision.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavSwitcher />
        <ContentWrapper>{children}</ContentWrapper>
      </body>
    </html>
  )
}
