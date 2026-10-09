import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getScope, getUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/db/schema";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sutra ESG",
  description: "Evidence-backed BRSR and GHG reporting for the MEIL Group",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const scope = user && (await getScope(user));
  const home = scope?.nodes.find((n) => n.id === user?.node);
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} antialiased`}>
        {user && scope ? (
          <AppShell
            user={{ name: user.name, role: ROLE_LABEL[user.role], node: home?.name ?? user.node }}
            nodes={scope.nodes.map((n) => ({ id: n.id, name: n.name, depth: n.node_path.length - 1 }))}
            nodeId={scope.node?.id ?? ""}
            fys={scope.fys}
            fyId={scope.fy?.id ?? ""}
          >
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
