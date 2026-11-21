/**
 * Utility për ndërtimin dhe validimin e URL-së së verifikimit për Kodin QR të Tastio.
 * Zbulon dinamikisht IP-në LAN të kompjuterit në mënyrë që skanimi nga iPhone/Android në të njëjtin
 * rrjet lokal (Wi-Fi) të lidhet automatikisht dhe pa asnjë URL të hardkoduar.
 */

export function getBaseAppUrl() {
  // 1. Nëse është konfiguruar specifikisht në .env (p.sh. VITE_PUBLIC_APP_URL)
  if (import.meta.env?.VITE_PUBLIC_APP_URL) {
    return import.meta.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Nëse jemi në mjedis shfletuesi
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, protocol, origin } = window.location;

    // Nëse po shfletohet tashmë përmes një IP-je reale në rrjet (jo localhost) ose domain real
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }

    // Nëse në PC po shfletohet në localhost:
    // Për Kodin QR që do të skanohet me telefon në të njëjtin Wi-Fi, përdorim IP-në LAN
    // të zbuluar automatikisht gjatë build/dev kohës nga Vite (__APP_LAN_IP__ ose VITE_LAN_IP)
    const lanIp = (typeof __APP_LAN_IP__ !== 'undefined' && __APP_LAN_IP__)
      || import.meta.env?.VITE_LAN_IP;

    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      const currentPort = port ? `:${port}` : ':5173';
      return `${protocol}//${lanIp}${currentPort}`;
    }

    return origin;
  }

  const lanIp = (typeof __APP_LAN_IP__ !== 'undefined' && __APP_LAN_IP__)
    || import.meta.env?.VITE_LAN_IP;

  return lanIp && lanIp !== 'localhost' ? `http://${lanIp}:5173` : 'http://localhost:5173';
}

export function getOrderVerificationUrl(order) {
  if (!order) return '';

  const orderId = order.id || order.order_number;
  const baseUrl = getBaseAppUrl();

  let token = '';
  const rawPayload = order.pickup_token?.qr_payload;

  if (rawPayload && typeof rawPayload === 'string') {
    // Nëse payload ka përmbajtur një URL verifikimi, nxjerrim token-in autentik
    if (rawPayload.includes('/orders/') && (rawPayload.includes('verify') || rawPayload.includes('verifiko'))) {
      try {
        const parsedUrl = new URL(rawPayload);
        const urlToken = parsedUrl.searchParams.get('token');
        if (urlToken) {
          token = urlToken;
        }
      } catch {
        // Fallback me regex nëse nuk parsohet si URL absolute standarde
        const match = rawPayload.match(/[?&]token=([^&]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
    } else if (rawPayload.startsWith('TASTIO:ORDER:')) {
      const parts = rawPayload.split(':');
      token = parts[parts.length - 1] || '';
    } else if (rawPayload.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawPayload);
        token = parsed.token || parsed.order_number || '';
      } catch {}
    }
  }

  // Fallback tek token_hash, short_code ose order_number
  if (!token && order.pickup_token?.token_hash) {
    token = order.pickup_token.token_hash.substring(0, 32);
  }

  if (!token && order.pickup_token?.short_code) {
    token = order.pickup_token.short_code;
  }

  if (!token) {
    token = order.order_number ? String(order.order_number) : String(orderId);
  }

  // Kthejmë URL-në zyrtare drejt aplikacionit Tastio (e arritshme nga iPhone Safari në LAN)
  return `${baseUrl}/orders/${orderId}/verify?token=${encodeURIComponent(token)}`;
}
