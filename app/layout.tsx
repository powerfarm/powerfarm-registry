import { Anton, Inter } from "next/font/google";
import "./globals.css";

// As duas famílias que o manual declara. Carregadas pelo Next, não por pedido
// externo em runtime: a app continua a servir-se a si própria.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--pf-font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--pf-font-text" });

export const metadata = { title: "PowerFarm — Registry" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${anton.variable} ${inter.variable}`}>
      <body>
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="marca" src="/wordmark.svg" alt="PowerFarm" />
          <nav>
            <a href="/">Identidades</a>
            <a href="/chaves">Chaves</a>
            <a href="/clientes">Clientes OAuth</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
