import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multilingual Spam Detector — Thesis Dashboard',
  description:
    'Multilingual email spam detection using a fine-tuned XLM-RoBERTa model with embedded ONNX inference.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
