import './globals.css';
import { ReactNode } from 'react';
import { Providers } from '../components/providers';
import { LanguageSwitcher } from '../components/language-switcher';

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
