import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthShell from "@/components/auth-shell";
import { ProfileProvider } from "@/lib/profile";
import { RateModeProvider } from "@/lib/rate-mode";
import { CurrencyModeProvider } from "@/lib/currency-mode";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "probook",
  description: "Management consulting pricing tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased flex">
        <ProfileProvider>
          <RateModeProvider>
            <CurrencyModeProvider>
              <AuthShell>{children}</AuthShell>
            </CurrencyModeProvider>
          </RateModeProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
