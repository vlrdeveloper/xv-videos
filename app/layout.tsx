import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["500", "600", "700", "800"] });
const site = process.env.NEXT_PUBLIC_SITE_NAME ?? "XV Videos";
export const metadata: Metadata = { title: site, robots: { index: false, follow: false } };
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch(e){}})()`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = process.env.NEXT_PUBLIC_BRAND === "red" ? "red" : "navy";
  return (
    <html lang="en" data-brand={brand} data-theme="dark" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}