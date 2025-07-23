import type { Metadata } from 'next';
import './globals.css';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sistema de Pedidos',
  description: 'Sistema para gestionar pedidos y stock de pollo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-100 relative min-h-screen">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-primary text-white p-4">
            <div className="container mx-auto flex items-center gap-4">
              {/* Logo clickeable */}
              <Link
                href="https://sistema-gls.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/logo.png"
                  alt="Logo Granja la Colonia"
                  width={60}
                  height={60}
                  className="rounded-full cursor-pointer"
                />
              </Link>
              <h1 className="text-2xl font-bold">Sistema de Pedidos</h1>
            </div>
          </header>

          {/* Contenido */}
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-primary text-white p-4">
            <div className="container mx-auto text-center">
              <p>Granja la Colonia.</p>
              <p>© {new Date().getFullYear()} Desarrollado por MonteStack | Todos los derechos reservados</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
