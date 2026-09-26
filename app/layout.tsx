import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Missing Access — Make the Quran reachable.', description: 'Read sourced Quran verses in Arabic and translation. Help others listen to the meaning of the Quran in their own language.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>;
}
