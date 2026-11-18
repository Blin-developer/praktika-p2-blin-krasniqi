/**
 * Utility për ndërtimin dhe validimin e URL-së së verifikimit për Kodin QR të Tastio.
 * Garanton që vlera e QR Code-it është gjithmonë një URL absolute, e vlefshme dhe e skanueshme nga telefonat.
 */

export function getOrderVerificationUrl(order) {
  if (!order) return 'https://tastio.com';

  const orderId = order.id || order.order_number;
  const baseUrl = import.meta.env?.VITE_PUBLIC_APP_URL || 'https://tastio.com';

  const rawPayload = order.pickup_token?.qr_payload;

  // 1. Nëse tashmë është një URL e plotë http/https
  if (rawPayload && (rawPayload.startsWith('http://') || rawPayload.startsWith('https://'))) {
    return rawPayload;
  }

  // 2. Nëse ka qenë formati i vjetër TASTIO:ORDER:...
  let token = '';
  if (rawPayload && typeof rawPayload === 'string') {
    if (rawPayload.startsWith('TASTIO:ORDER:')) {
      const parts = rawPayload.split(':');
      token = parts[parts.length - 1] || '';
    } else if (rawPayload.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawPayload);
        token = parsed.token || parsed.order_number || '';
      } catch {
        // fallback
      }
    }
  }

  // 3. Fallback tek token_hash, short_code ose order_number
  if (!token && order.pickup_token?.token_hash) {
    token = order.pickup_token.token_hash.substring(0, 32);
  }

  if (!token && order.pickup_token?.short_code) {
    token = order.pickup_token.short_code;
  }

  if (!token) {
    token = order.order_number ? String(order.order_number) : String(orderId);
  }

  return `${baseUrl}/orders/${orderId}/verify?token=${encodeURIComponent(token)}`;
}
