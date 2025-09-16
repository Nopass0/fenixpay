import type { Metadata } from "next";
import "./globals.css";
import "./radix-fixes.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chase Platform",
  description: "Trading and payment platform",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
const maintenanceTitle = "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d";
const maintenanceMessage = "\u041c\u044b \u043f\u0440\u043e\u0432\u043e\u0434\u0438\u043c \u043f\u043b\u0430\u043d\u043e\u0432\u044b\u0435 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u044b \u0438 \u0441\u043a\u043e\u0440\u043e \u0432\u0435\u0440\u043d\u0451\u043c\u0441\u044f. \u0411\u043b\u0430\u0433\u043e\u0434\u0430\u0440\u0438\u043c \u0437\u0430 \u043f\u043e\u043d\u0438\u043c\u0430\u043d\u0438\u0435.";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-[#eeeeee]">
        <Providers>
          {isMaintenance ? (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-12 text-center">
              <div className="max-w-2xl space-y-6">
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-4 py-1 text-sm font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
                  Maintenance in progress
                </span>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{maintenanceTitle}</h1>
                <p className="text-lg text-gray-200/90 leading-relaxed">{maintenanceMessage}</p>
              </div>
            </div>
          ) : (
            children
          )}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
