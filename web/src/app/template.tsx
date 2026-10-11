'use client';

/* ============================================================================
   Organizer · <Template> (Transiciones de pantalla iOS)
   
   Crea una instancia nueva en cada navegación de Next.js App Router,
   permitiendo la transición física fluida estilo iPhone.
   ========================================================================= */

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="ios-page-wrap" key={pathname}>
      {children}
    </div>
  );
}
