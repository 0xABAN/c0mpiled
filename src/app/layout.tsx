import type { Metadata } from "next";
import Link from "next/link";
import { Nunito } from "next/font/google";
import { ToastProvider } from "@/frontend/components/ui/toast";
import "@/frontend/styles/globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Roster",
  description: "Every club's resume book, in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <Link href="#main-content" className="skip-link">Skip to content</Link>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
