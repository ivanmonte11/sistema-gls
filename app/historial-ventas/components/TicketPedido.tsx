"use client";
import { useState } from 'react';
import { Pedido } from '../types/pedidos.types';
import {
  formatearCantidadConMedida,
  obtenerIconoProducto
} from '../utils/formatters';

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

  // Función para obtener productos agrupados
  const obtenerProductosAgrupados = () => {
    if (!pedido.items || !Array.isArray(pedido.items)) return [];

    const productosAgrupados: Record<string, { cantidad: number, tipo_medida: string }> = {};

    pedido.items.forEach(item => {
      const nombre = item.producto_nombre || 'Producto sin nombre';
      const cantidad = parseFloat(item.cantidad.toString()) || 0;
      const tipo_medida = item.tipo_medida || 'unidad';

      const clave = `${nombre}-${tipo_medida}`;

      if (productosAgrupados[clave]) {
        productosAgrupados[clave].cantidad += cantidad;
      } else {
        productosAgrupados[clave] = { cantidad, tipo_medida };
      }
    });

    return Object.entries(productosAgrupados).map(([clave, datos]) => ({
      nombre: clave.split('-')[0],
      cantidad: datos.cantidad,
      tipo_medida: datos.tipo_medida
    }));
  };

  // Verificar si tiene papas
  const tienePapas = () => {
    return pedido.items?.some(item =>
      item.producto_nombre?.toLowerCase().includes('papa') ||
      item.producto_nombre?.toLowerCase().includes('papas')
    ) || false;
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

  const generarHTMLTicket = () => {
  const productos = obtenerProductosAgrupados();
  const tieneProductosPapas = tienePapas();

  return `<!DOCTYPE html>
<html lang="es"><head><title>Ticket #${pedido.numero_pedido}</title><style>
body { width: 80mm; font-family: Arial, sans-serif; font-size: 16px; padding: 5mm; }
.header { text-align: center; font-weight: bold; margin-bottom: 5mm; font-size: 18px; }
.divider { border-top: 1px dashed #000; margin: 3mm 0; }
.footer { margin-top: 5mm; font-size: 14px; text-align: center; }
.hora-destacada {
  text-align: center; margin: 5mm 0; padding: 3mm; border: 2px solid #000;
  border-radius: 5px; background-color: #f8f8f8; font-weight: bold;
  font-size: 16px;
}
.hora-texto { font-size: 1.5em; margin-top: 2mm; }
.producto { margin: 8px 0; font-size: 18px; line-height: 1.3; } /* AUMENTÉ DE 16px A 18px Y AGREGUE LINE-HEIGHT */
.producto-cantidad { font-weight: bold; font-size: 18px; } /* AUMENTÉ DE 16px A 18px */
.producto-nombre { font-size: 18px; } /* NUEVA CLASE PARA EL NOMBRE DEL PRODUCTO */
.cliente-nombre { font-size: 1.5em; font-weight: bold; letter-spacing: 0.5px; }
.detalles-titulo { font-size: 1.4em; font-weight: bold; margin: 12px 0; text-align: center; } /* AUMENTÉ DE 1.3em A 1.4em */
.total-precio { font-size: 1.3em; font-weight: bold; } /* AUMENTÉ DE 1.2em A 1.3em */
</style></head><body onload="window.print();">
<div class="header">GRANJA LA COLONIA</div>
<div class="header">Francisco Viano 130 - Tel: 3856146824</div>
<div class="divider"></div>
<div class="header" style="font-size: 20px;">PEDIDO #${pedido.numero_pedido}</div>
<div class="hora-destacada">
  <div>🕒 HORA DE ENTREGA 🕒</div>
  <div class="hora-texto">${pedido.hora_entrega_real || pedido.hora_entrega_solicitada || '--:--'}</div>
</div>
<div class="divider"></div>
<div style="margin: 8px 0;">
  <div style="font-size: 14px; color: #555;">CLIENTE</div>
  <div class="cliente-nombre">${pedido.nombre_cliente.toUpperCase()}</div>
  ${pedido.telefono_cliente ? `<div style="font-size: 1.2em; margin-top: 4px;">📞 ${pedido.telefono_cliente}</div>` : ''}
</div>
<p style="font-size: 16px;"><strong>Tipo entrega:</strong> ${
  pedido.tipo_entrega === 'envio'
    ? `<span style="font-weight: bold">ENVÍO (${formatTipoEnvio(pedido.tipo_envio)})</span>`
    : '<span style="font-weight: bold">RETIRA EN LOCAL</span>'
}</p>
${pedido.tipo_entrega === 'envio' && pedido.direccion ? `<p style="font-size: 16px;"><strong>Dirección:</strong> <span style="font-weight: bold">${pedido.direccion}</span></p>` : ''}
<div class="divider"></div>
<div class="detalles-titulo">📝 DETALLES DEL PEDIDO</div>
${productos.map(producto => `
  <div class="producto">
    <span class="producto-cantidad">${formatearCantidadConMedida(producto.cantidad, producto.tipo_medida, producto.nombre)}</span>
    <span class="producto-nombre"> ${producto.nombre}</span>
  </div>
`).join('')}
${pedido.con_chimichurri ? `<div style="font-weight: bold; font-size: 1.3em; margin: 10px 0;">🌿 CHIMICHURRI INCLUIDO</div>` : ''} <!-- AUMENTÉ DE 1.2em A 1.3em -->
${productos.length === 0 ? '<div style="text-align: center; color: #999; font-size: 18px;">No hay productos</div>' : ''} <!-- AUMENTÉ DE 16px A 18px -->
<div class="divider"></div>
<p style="font-size: 16px;"><strong>TOTAL:</strong> <span class="total-precio">${formatPrecio(pedido.precio_total)}</span></p>
<p style="font-size: 16px;"><strong>Método pago:</strong> ${formatMetodoPago(pedido.metodo_pago)}</p>
<div class="divider"></div>
<div class="footer">${pedido.estado === 'entregado' ? `Entregado: ${pedido.hora_entrega_real || '--:--'}` : 'Pendiente de entrega'}<br>¡Gracias por su compra!</div>
</body></html>`;
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
        printWindow.document.write(generarHTMLTicket());
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