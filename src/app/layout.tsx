import type { Metadata } from "next";
import "./globals.css";
import AuthShell from "@/components/auth-shell";
import { ProfileProvider } from "@/lib/profile";
import { RateModeProvider } from "@/lib/rate-mode";
import { CurrencyModeProvider } from "@/lib/currency-mode";

export const metadata: Metadata = {
  title: "PROBOOK",
  description: "Pricing — architectural grid on white",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased flex bg-[#ffffff] text-[#292929]">
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
