import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KnowledgeTree · SDWorx",
  description: "One organigram per customer. Every node owns its knowledge. Every change has a name.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.sdworx.com/ignite/assets/v2/fonts/all.css" />
      </head>
      <body className="min-h-full">
        <Shell user={user ? { id: user.id, name: user.name, role: user.role, customers: user.customerIds.length } : null}>{children}</Shell>
      </body>
    </html>
  );
}
