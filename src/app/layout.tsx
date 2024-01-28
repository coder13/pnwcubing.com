import classnames from "classnames";
import { Header, Footer } from "@/components/Layout";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pacific Northwest Cubing",
  description: "The official home to all things Pacific Northwest Cubing",
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
        {children}
        <Footer />
      </body>
    </html>
  );
}
