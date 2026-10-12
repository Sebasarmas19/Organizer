/**
 * Organizer · Landing Page pública
 * Accesible directamente en /landing para demostración, información y presentación.
 */

import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Organizer · Tu día resuelto antes de que abras la app',
  description:
    'La app de planificación personal diseñada para estudiantes y mentes con ADHD. Push, no pull: tu plan diario en tu pantalla de bloqueo cada mañana.',
};

export default function LandingRoute() {
  return <LandingPage />;
}
