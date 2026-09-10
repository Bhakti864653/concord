import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import HelpWidget from "@/components/HelpWidget";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Concord",
  description: "Mentorship matching, done with real stable matching.",
};

// Applies a saved explicit theme choice before first paint, so there's no
// flash of the system-default theme before React hydrates and the toggle
// takes over. suppressHydrationWarning on <html> below is needed because
// of this - the script mutates the DOM attribute outside React's own
// render, which React would otherwise flag as a mismatch.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("concord-theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {/* Top-center, not a corner - every corner has something else near
            it on at least one page: bottom-left/right are the mobile nav
            bar and the help widget, top-right collides with the dashboard's
            notification bell, top-left with the sidebar's own logo. */}
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <ThemeToggle />
        </div>
        <HelpWidget />
      </body>
    </html>
  );
}
