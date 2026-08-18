/**
 * A identidade pública deste serviço. Explícita, nunca derivada do host do
 * pedido nem de um deploy de preview: o que vai para OAuth, email e manifesto
 * não pode mudar a cada push.
 */
export const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const callbackUrl = () => `${PUBLIC_BASE_URL}/auth/callback`;
