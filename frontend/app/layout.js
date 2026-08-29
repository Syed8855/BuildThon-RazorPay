import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Revenue Recovery — Explainable ML Retry System',
  description:
    'An explainable, rules-guarded ML system for failed payment retry. ' +
    'Predicts retry success probability and explains every decision.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
