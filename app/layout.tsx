import type { Metadata } from 'next';
import './globals.css';
import Image from 'next/image';

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
        {/* Logo de fondo */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
  <div className="relative w-full max-w-[min(90vw,1200px)] h-[min(80vh,800px)] opacity-10">
    <Image
      src="/logo.png" 
      alt="Logo Granja la Colonia"
      fill
      className="object-contain"
      priority
      quality={100}
    />
  </div>
</div>

        {/* Contenido principal */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-primary text-white p-4">
            <div className="container mx-auto flex items-center">
              <div className="mr-4">
                <Image 
                  src="/logo.png"
                  alt="Logo Granja la Colonia"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
              </div>
              <h1 className="text-2xl font-bold">Sistema de Pedidos</h1>
            </div>
          </header>

          {/* Contenido */}
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-primary text-white p-4 mt-auto">
            <div className="container mx-auto text-center">
              <p>© {new Date().getFullYear()} Todos los derechos reservados | Granja la Colonia.</p>
            </div>
            <div className="container mx-auto text-center">
              <p>Desarrollado por MonteStack.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}