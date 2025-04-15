import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Spending Dashboard',
  description: 'Track and analyze your spending',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
} 