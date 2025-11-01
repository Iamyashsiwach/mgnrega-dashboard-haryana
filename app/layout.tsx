import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGNREGA Dashboard Haryana | मनरेगा डैशबोर्ड हरियाणा",
  description: "Track MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act) performance across Haryana districts. Real-time data on employment, wages, and works completed. | हरियाणा के जिलों में मनरेगा प्रदर्शन ट्रैक करें।",
  keywords: "MGNREGA, Haryana, Employment Guarantee, Rural Development, मनरेगा, हरियाणा",
  authors: [{ name: "MGNREGA Dashboard Team" }],
  openGraph: {
    title: "MGNREGA Dashboard Haryana",
    description: "Track employment guarantee scheme performance in Haryana districts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
