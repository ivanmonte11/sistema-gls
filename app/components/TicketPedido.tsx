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
   hora_entrega_solicitada?: string | null;
   estado?: string;
 }
 
 export function TicketPedido({ pedido }: { pedido: Pedido }) {
   const [isPrinting, setIsPrinting] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [impreso, setImpreso] = useState(false);
 
   const formatPrecio = (precio: number | string): string => {
     const numero = typeof precio === 'string' ? parseFloat(precio) : precio;
     return isNaN(numero) ? '$0.00' : `$${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
   };
 
   const formatMetodoPago = (metodo: string): string => {
     const metodos: Record<string, string> = {
       efectivo: 'EFECTIVO',
       debito: 'TARJETA DÉBITO',
       credito: 'TARJETA CRÉDITO',
       transferencia: 'TRANSFERENCIA'
     };
     return metodos[metodo.toLowerCase()] || metodo.toUpperCase();
   };
 
   const formatTipoEnvio = (tipo: string | null): string => {
     if (!tipo) return '';
     const tipos: Record<string, string> = {
       cercano: 'Cercano',
       lejano: 'Lejano (+$500)',
       la_banda: 'La Banda (+$800)',
       gratis: 'Gratis'
     };
     return tipos[tipo] || tipo;
   };
 
   const imprimirTicket = async () => {
     setIsPrinting(true);
     setError(null);
 
     try {
       const response = await fetch(`${process.env.NEXT_PUBLIC_IMPRESORA_API}/api/imprimir`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(pedido),
       });
 
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Error al imprimir el ticket');
       }
 
       const result = await response.json();
       if (!result.success) {
         throw new Error(result.message || 'Error en la impresión');
       }
 
       // Marcar como impreso si fue exitoso
       setImpreso(true);
 
     } catch (err) {
       console.error('Error al imprimir:', err);
       setError(err instanceof Error ? err.message : 'Error desconocido al imprimir');
 
       const printWindow = window.open('', '_blank');
       printWindow?.document.write(`
         <html>
           <head>
             <title>Ticket #${pedido.numero_pedido}</title>
             <style>
               body { 
                 width: 80mm; 
                 font-family: Arial, sans-serif; 
                 font-size: 14px; 
                 padding: 5mm; 
               }
               .header { 
                 text-align: center; 
                 font-weight: bold; 
                 margin-bottom: 5mm; 
               }
               .divider { 
                 border-top: 1px dashed #000; 
                 margin: 3mm 0; 
               }
               .footer { 
                 margin-top: 5mm; 
                 font-size: 12px; 
                 text-align: center; 
               }
               .hora-destacada {
                 text-align: center;
                 margin: 5mm 0;
                 padding: 3mm;
                 border: 2px solid #000;
                 border-radius: 5px;
                 background-color: #f8f8f8;
                 font-weight: bold;
               }
               .hora-texto {
                 font-size: 1.3em;
                 margin-top: 2mm;
               }
             </style>
           </head>
           <body>
             <div class="header">GRANJA LA COLONIA</div>
             <div class="header">Francisco Viano 130 - Tel: 3856146824</div>
             <div class="divider"></div>
             <div class="header">PEDIDO #${pedido.numero_pedido}</div>
             <p><strong>Fecha del pedido:</strong> ${new Date(pedido.fecha_pedido).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}</p>

            <div class="hora-destacada">
               <div>🕒 HORA DE ENTREGA 🕒</div>
               <div class="hora-texto">${pedido.hora_entrega_real || pedido.hora_entrega_solicitada || '--:--'}</div>
             </div>
       
             <div class="divider"></div>
             <p><strong>Cliente:</strong> ${pedido.nombre_cliente}</p>
             ${pedido.telefono_cliente ? `<p><strong>Teléfono:</strong> ${pedido.telefono_cliente}</p>` : ''}
             <p><strong>Entrega:</strong> ${pedido.tipo_entrega === 'envio'
                 ? `Envío (${formatTipoEnvio(pedido.tipo_envio)})`
               : 'Retira en local'}</p>
            ${pedido.tipo_entrega === 'envio' && pedido.direccion
              ? `<p><strong>Dirección:</strong> ${pedido.direccion}</p>`
              : ''}
            <div class="divider"></div>
             <p><strong>DETALLE:</strong></p>
             <p>• ${pedido.cantidad_pollo} Pollo(s) - ${formatPrecio(pedido.precio_unitario)}</p>
             ${pedido.con_papas ? `<p>• ${pedido.cantidad_papas} Papas fritas</p>` : ''}
             ${pedido.con_chimichurri ? '<p>• Chimichurri incluido</p>' : ''}
             <div class="divider"></div>
             <p><strong>TOTAL:</strong> ${formatPrecio(pedido.precio_total)}</p>
             <p><strong>Método pago:</strong> ${formatMetodoPago(pedido.metodo_pago)}</p>
             <div class="divider"></div>
             <div class="footer">
               ${pedido.estado === 'entregado'
                    ? `Entregado: ${pedido.hora_entrega_real || '--:--'}`
                 : 'Pendiente de entrega'}<br>
              ¡Gracias por su compra!
            </div>
          </body>
        </html>
      `);
      printWindow?.document.close();
      printWindow?.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      onClick={imprimirTicket}
      disabled={isPrinting || impreso}
      className={`bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}
       ${impreso ? '!bg-green-500 hover:!bg-green-500' : ''}`}
    >
      {impreso ? '✓ Impreso' : isPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
    </button>
  );
}