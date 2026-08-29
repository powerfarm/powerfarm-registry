import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@powerfarm/identity-ui/styles.css";

export const metadata: Metadata = {
  title: "Powerfarm Identity",
  description: "A identidade canônica dos aplicativos Powerfarm.",
};

export default function IdentityLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="pf-theme-dark">
      <body>{children}</body>
    </html>
  );
}
