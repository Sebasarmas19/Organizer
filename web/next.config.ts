import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Next 16 bloquea /_next/* cuando la peticion no viene de localhost. Sin
     esto, abrir la app desde el iPhone en la red local sirve el HTML y el CSS
     pero no el JavaScript: la pantalla se ve bien y no responde a nada.

     Solo aplica a `next dev`. En produccion no hace nada. */
  allowedDevOrigins: ['192.168.1.94', '10.2.0.2', '172.21.16.1'],
};

export default nextConfig;
