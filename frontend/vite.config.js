import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'os';

// Zbulojmë dinamikisht IP-në e rrjetit lokal (Wi-Fi / Ethernet) pa hardkodim
function detectLocalLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.')) {
          return iface.address;
        }
        if (iface.address.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(iface.address)) {
          candidates.push(iface.address);
        }
      }
    }
  }
  return candidates[0] || 'localhost';
}

const lanIp = detectLocalLanIp();
process.env.VITE_LAN_IP = lanIp;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_LAN_IP__: JSON.stringify(lanIp),
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Dëgjon në të gjitha ndërfaqet e rrjetit për qasje LAN nga iPhone Safari
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
