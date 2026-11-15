import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Nunito } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OtaPath — step outside, feel brighter",
    template: "%s · OtaPath",
  },
  description:
    "A warm, playful walking companion. Peel back the golden fog, collect places, and leave little voice memories along the way.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OtaPath",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBE8A6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink-charcoal font-sans">
        {children}
      </body>
    </html>
  );
}
