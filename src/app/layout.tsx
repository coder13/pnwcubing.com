import classnames from "classnames";
import { getNavigation } from "@/lib/editor/navigation";
import { Header } from "@/components/Layout";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

// Render every page on request. Individual public API requests can still be cached.
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pacific Northwest Cubing",
  description: "The official home to all things Pacific Northwest Cubing",
  keywords: "pnw, cubing, speedcubing, wca, competitions",
  metadataBase: new URL("https://www.pnwcubing.com/"),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = await getNavigation();
  return (
    <html lang="en">
      <body
        className={classnames(
          inter.className,
          "flex flex-col flex-1 w-screen h-screen overflow-x-hidden",
        )}
      >
        <Analytics />

        <Header navigation={navigation} />
        <div className="h-full overflow-x-hidden overflow-y-auto">
          {children}
        </div>
        {/* <Footer /> */}
      </body>
      <GoogleAnalytics gaId="G-8WCK0QNYH3" />
    </html>
  );
}
