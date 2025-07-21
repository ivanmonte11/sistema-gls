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
  impreso?: boolean;
}

export function TicketPedido({ pedido, onPedidoImpreso }: { pedido: Pedido; onPedidoImpreso?: () => void }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      lejano: 'Lejano',
      la_banda: 'La Banda',
      gratis: 'Gratis'
    };
    return tipos[tipo] || tipo;
  };

  const formatCantidadPollo = (cantidad: number): string => {
    return cantidad % 1 === 0 ? cantidad.toString() : cantidad.toFixed(1);
  };

  const marcarComoImpreso = async () => {
    try {
      await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pedido.id, impreso: true })
      });
    } catch (err) {
      console.error('Error al marcar como impreso en el backend:', err);
    }
  };

  const imprimirTicket = async () => {
    setIsPrinting(true);
    setError(null);
    let impresionExitosa = false;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_IMPRESORA_API}/api/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error al imprimir el ticket');
      }

      impresionExitosa = true;
    } catch (err) {
      console.error('Error con API de impresión, se usará fallback:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html>
<html lang="es"><head><title>Ticket #${pedido.numero_pedido}</title><style>
body { width: 80mm; font-family: Arial, sans-serif; font-size: 14px; padding: 5mm; }
.header { text-align: center; font-weight: bold; margin-bottom: 5mm; }
.divider { border-top: 1px dashed #000; margin: 3mm 0; }
.footer { margin-top: 5mm; font-size: 12px; text-align: center; }
.hora-destacada {
  text-align: center; margin: 5mm 0; padding: 3mm; border: 2px solid #000;
  border-radius: 5px; background-color: #f8f8f8; font-weight: bold;
}
.hora-texto { font-size: 1.3em; margin-top: 2mm; }
</style></head><body onload="window.print();">
<div class="header">GRANJA LA COLONIA</div>
<div class="header">Francisco Viano 130 - Tel: 3856146824</div>
<div class="divider"></div>
<div class="header">PEDIDO #${pedido.numero_pedido}</div>
<div class="hora-destacada">
  <div>🕒 HORA DE ENTREGA 🕒</div>
  <div class="hora-texto">${pedido.hora_entrega_real || pedido.hora_entrega_solicitada || '--:--'}</div>
</div>
<div class="divider"></div>
<div style="margin: 8px 0;">
  <div style="font-size: 12px; color: #555;">CLIENTE</div>
  <div style="font-size: 1.4em; font-weight: bold; letter-spacing: 0.5px;">${pedido.nombre_cliente.toUpperCase()}</div>
  ${pedido.telefono_cliente ? `<div style="font-size: 1.1em; margin-top: 4px;">📞 ${pedido.telefono_cliente}</div>` : ''}
</div>
<p><strong>Tipo entrega:</strong> ${
  pedido.tipo_entrega === 'envio'
    ? `<span style="font-weight: bold">ENVÍO (${formatTipoEnvio(pedido.tipo_envio)})</span>`
    : '<span style="font-weight: bold">RETIRA EN LOCAL</span>'
}</p>
${pedido.tipo_entrega === 'envio' && pedido.direccion ? `<p><strong>Dirección:</strong> <span style="font-weight: bold">${pedido.direccion}</span></p>` : ''}
<div class="divider"></div>
<div style="text-align: center; font-weight: bold; font-size: 1.2em; margin: 10px 0;">📝 DETALLES DEL PEDIDO</div>
<div style="font-weight: bold; font-size: 1.3em; color: #d35400; margin: 8px 0;">➤ ${formatCantidadPollo(pedido.cantidad_pollo)} POLLO(S)</div>
${pedido.con_papas ? `<div style="font-weight: bold; font-size: 1.1em; margin: 6px 0;">🍟 ${pedido.cantidad_papas} PAPAS FRITAS</div>` : ''}
${pedido.con_chimichurri ? `<div style="font-weight: bold; font-size: 1.1em; margin: 6px 0;">🌿 CHIMICHURRI INCLUIDO</div>` : ''}
<div class="divider"></div>
<p><strong>TOTAL:</strong> ${formatPrecio(pedido.precio_total)}</p>
<p><strong>Método pago:</strong> ${formatMetodoPago(pedido.metodo_pago)}</p>
<div class="divider"></div>
<div class="footer">${pedido.estado === 'entregado' ? `Entregado: ${pedido.hora_entrega_real || '--:--'}` : 'Pendiente de entrega'}<br>¡Gracias por su compra!</div>
</body></html>`);
        printWindow.document.close();
        impresionExitosa = true;
      }
    }

    if (impresionExitosa) {
      await marcarComoImpreso();
      onPedidoImpreso?.();
    }

    setIsPrinting(false);
  };

  return (
    <button
      onClick={imprimirTicket}
      disabled={isPrinting || pedido.impreso}
      className={`
        bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors
        ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}
        ${pedido.impreso ? '!bg-green-500 hover:!bg-green-500' : ''}
      `}
    >
      {pedido.impreso ? '✓ Impreso' : isPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
    </button>
  );
}
