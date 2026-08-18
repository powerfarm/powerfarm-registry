import "./globals.css";

export const metadata = { title: "PowerFarm — Registry" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <header>
          <b>PowerFarm</b>
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
