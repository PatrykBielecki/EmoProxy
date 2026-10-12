import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '../components/providers';
import { LanguageSwitcher } from '../components/language-switcher';

export const metadata: Metadata = {
  title: 'EmoProxy',
  description: 'Emotion visualization research platform'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <LanguageSwitcher />
          {children}
        </Providers>
      </body>
    </html>
  );
}
