/**
 * Utility për ndërtimin dhe validimin e URL-së së verifikimit për Kodin QR të Tastio.
 * Zgjidh përfundimisht problemin e 404 duke lidhur saktësisht telefonin me aplikacionin Tastio
 * në rrjetin lokal (LAN) ose domain-in e konfigurueshëm, dhe jo me domene të jashtme të palëve të treta.
 */

export function getBaseAppUrl() {
  // 1. Nëse është konfiguruar specifikisht në .env (p.sh. VITE_PUBLIC_APP_URL)
  if (import.meta.env?.VITE_PUBLIC_APP_URL) {
    return import.meta.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Nëse jemi në mjedis shfletuesi
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, protocol, origin } = window.location;

    // Nëse po shfletohet tashmë përmes një IP-je në rrjet (si 192.168.x.x) ose domain-i real
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }

    // Nëse në PC po shfletohet në localhost:5173:
    // Për Kodin QR që do të skanohet me telefon në të njëjtin Wi-Fi, përdorim IP-në e makinës në LAN
    // në mënyrë që Safari/Chrome në telefon të hapë direkt aplikacionin lokal Tastio dhe jo 404!
    const lanIp = import.meta.env?.VITE_LAN_IP || '192.168.0.163';
    const currentPort = port ? `:${port}` : ':5173';
    return `${protocol}//${lanIp}${currentPort}`;
  }

  return 'http://192.168.0.163:5173';
}

export function getOrderVerificationUrl(order) {
  if (!order) return '';

  const orderId = order.id || order.order_number;
  const baseUrl = getBaseAppUrl();

  let token = '';
  const rawPayload = order.pickup_token?.qr_payload;

  if (rawPayload && typeof rawPayload === 'string') {
    // Nëse payload ka përmbajtur një URL të vjetër (p.sh. me tastio.com të jashtme), nxjerrim token-in
    if (rawPayload.includes('/orders/') && (rawPayload.includes('verify') || rawPayload.includes('verifiko'))) {
      try {
        const parsedUrl = new URL(rawPayload);
        const urlToken = parsedUrl.searchParams.get('token');
        if (urlToken) token = urlToken;
      } catch {
        // fallback
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

  // Kthejmë URL-në zyrtare drejt aplikacionit Tastio (e arritshme nga Safari në telefon)
  return `${baseUrl}/orders/${orderId}/verify?token=${encodeURIComponent(token)}`;
}
