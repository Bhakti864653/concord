import type { Metadata } from "next";
import { Inter } from "next/font/google";
import HelpWidget from "@/components/HelpWidget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Concord",
  description: "Mentorship matching, done with real stable matching.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <HelpWidget />
      </body>
    </html>
  );
}
