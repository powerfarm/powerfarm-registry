import "./globals.css";

export const metadata = { title: "PowerFarm — Registry" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="pf-theme-dark">
      <body>
        <header>
          <span
            className="marca pf-brand-logo pf-brand-wordmark-horizontal-cream"
            role="img"
            aria-label="Powerfarm"
          />
          <nav>
            <a href="/">Identidades</a>
            <a href="/chaves">Chaves</a>
            <a href="/store">Store</a>
            <a href="/gadgets/hello-agentic">Gadget</a>
            <a href="/clientes">Clientes OAuth</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
