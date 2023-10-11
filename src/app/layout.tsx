import classnames from "classnames";
import { Header, Footer } from "@/components/Layout";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
          "flex flex-col w-screen h-screen overflow-x-hidden space-y-2",
        )}
      >
        <Header />

        <main className="flex justify-center flex-1">
          <div className="flex flex-col w-2/3">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
