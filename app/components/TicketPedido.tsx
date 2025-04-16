"use client";
import { useState } from 'react';

interface Pedido {
  id: number;
  numero_pedido: string;
  nombre_cliente: string;
  telefono_cliente?: string;
  tipo_entrega: 'retira' | 'envio';
  tipo_envio: 'cercano' | 'lejano' | 'la_banda' | 'gratis' | null;
  direccion?: string;
  metodo_pago: string;
  con_chimichurri: boolean;
  con_papas: boolean;
  cantidad_papas: number;
  cantidad_pollo: number;
  precio_unitario: number;
  precio_total: number | string;
  fecha_pedido: string;
  hora_entrega_real?: string | null;
  estado?: string;
}

export function TicketPedido({ pedido }: { pedido: Pedido }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imprimirTicket = async () => {
    setIsPrinting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al comunicarse con el servidor de impresión');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'La impresión falló');
      }
    } catch (err) {
      console.error('Error al imprimir:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al imprimir');
      
      // Fallback a impresión en navegador
      imprimirFallback();
    } finally {
      setIsPrinting(false);
    }
  };

  const imprimirFallback = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('No se pudo abrir ventana de impresión. Deshabilita bloqueadores de ventanas.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket #${pedido.numero_pedido}</title>
          <style>
            @page { size: 80mm; margin: 0; }
            body { 
              width: 76mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 2mm;
            }
            .header { text-align: center; font-weight: bold; margin-bottom: 2mm; }
            .divider { border-top: 1px dashed #000; margin: 2mm 0; }
            .footer { margin-top: 3mm; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">GRANJA LA COLONIA</div>
          <div class="header">Francisco Viano 130</div>
          <div class="header">Tel: 3856146824</div>
          <div class="divider"></div>
          
          <!-- Resto del contenido del ticket... -->
          
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button 
        onClick={imprimirTicket}
        disabled={isPrinting}
        className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isPrinting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isPrinting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Imprimiendo...
          </span>
        ) : 'Imprimir Ticket'}
      </button>
      
      {error && (
        <div className="text-red-600 text-sm max-w-xs text-center">
          {error}
        </div>
      )}
    </div>
  );
}