import type { Metadata } from 'next';
import './globals.css';

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
      <body className="bg-gray-100">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="bg-primary text-white p-4">
            <div className="container mx-auto">
              <h1 className="text-2xl font-bold">Sistema de Pedidos</h1>
            </div>
          </header>

          {/* Contenido principal */}
          <main className="flex-grow container mx-auto p-4">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-primary text-white p-4 mt-auto">
            <div className="container mx-auto text-center">
              <p>© 2023 Todos los derechos reservados | Granja la Colonia. Sistema de Pedidos. </p>
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