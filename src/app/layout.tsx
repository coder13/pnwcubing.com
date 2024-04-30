import classnames from "classnames";
import { Header } from "@/components/Layout";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pacific Northwest Cubing",
  description: "The official home to all things Pacific Northwest Cubing",
  keywords: "pnw, cubing, speedcubing, wca, competitions",
  metadataBase: new URL("https://www.pnwcubing.com/"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={classnames(
          inter.className,
          "flex flex-col flex-1 w-screen h-screen overflow-x-hidden",
        )}
      >
        <Analytics />

        <Header />
        <div className="h-full overflow-x-hidden overflow-y-auto">
          {children}
        </div>
        {/* <Footer /> */}
      </body>
      <GoogleAnalytics gaId="G-8WCK0QNYH3" />
    </html>
  );
}
