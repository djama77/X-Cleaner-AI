import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "X-Cleaner-AI", description: "Analyse les archives X et repère les publications automatisées sans rien supprimer." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="fr"><body>{children}</body></html>; }
