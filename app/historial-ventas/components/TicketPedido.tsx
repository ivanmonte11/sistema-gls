"use client";
import { useState, useEffect } from 'react';
import { Pedido } from '../types/pedidos.types';
import { formatearCantidadConMedida } from '../utils/formatters';

export function TicketPedido({
  pedido,
  onPedidoImpreso
}: {
  pedido: Pedido;
  onPedidoImpreso?: (pedidoId: number) => void;
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [localImpreso, setLocalImpreso] = useState(false);

  useEffect(() => {
    console.log(`🔍 TicketPedido ${pedido.id} - impreso recibido:`, pedido.impreso);
    setLocalImpreso(pedido.impreso || false);
  }, [pedido.id, pedido.impreso]);

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

  const generarHTMLTicket = () => {
    const productos = obtenerProductosAgrupados();

    return `<!DOCTYPE html>
<html lang="es"><head><title>Ticket #${pedido.numero_pedido}</title><style>
body { width: 80mm; font-family: Arial, sans-serif; font-size: 14px; padding: 5mm; }
.header { text-align: center; font-weight: bold; margin-bottom: 5mm; font-size: 16px; }
.divider { border-top: 1px dashed #000; margin: 3mm 0; }
.footer { margin-top: 5mm; font-size: 12px; text-align: center; }
.hora-destacada {
  text-align: center; margin: 5mm 0; padding: 3mm; border: 2px solid #000;
  border-radius: 5px; background-color: #f8f8f8; font-weight: bold;
  font-size: 14px;
}
.hora-texto { font-size: 1.3em; margin-top: 2mm; }
.producto { margin: 6px 0; font-size: 14px; line-height: 1.3; }
.producto-cantidad { font-weight: bold; font-size: 14px; }
.producto-nombre { font-size: 14px; }
.cliente-nombre { font-size: 1.3em; font-weight: bold; letter-spacing: 0.5px; }
.detalles-titulo { font-size: 1.2em; font-weight: bold; margin: 10px 0; text-align: center; }
.total-precio { font-size: 1.1em; font-weight: bold; }
</style></head><body onload="window.print();">
<div class="header">GRANJA LA COLONIA</div>
<div class="header">Francisco Viano 130 - Tel: 3856146824</div>
<div class="divider"></div>
<div class="header" style="font-size: 18px;">PEDIDO #${pedido.numero_pedido}</div>
<div class="hora-destacada">
  <div>🕒 HORA DE ENTREGA 🕒</div>
  <div class="hora-texto">${pedido.hora_entrega_real || pedido.hora_entrega_solicitada || '--:--'}</div>
</div>
<div class="divider"></div>
<div style="margin: 8px 0;">
  <div style="font-size: 12px; color: #555;">CLIENTE</div>
  <div class="cliente-nombre">${pedido.nombre_cliente.toUpperCase()}</div>
  ${pedido.telefono_cliente ? `<div style="font-size: 1.1em; margin-top: 4px;">📞 ${pedido.telefono_cliente}</div>` : ''}
</div>
<p style="font-size: 14px;"><strong>Tipo entrega:</strong> ${
      pedido.tipo_entrega === 'envio'
        ? `<span style="font-weight: bold">ENVÍO (${formatTipoEnvio(pedido.tipo_envio)})</span>`
        : '<span style="font-weight: bold">RETIRA EN LOCAL</span>'
    }</p>
${pedido.tipo_entrega === 'envio' && pedido.direccion ? `<p style="font-size: 14px;"><strong>Dirección:</strong> <span style="font-weight: bold">${pedido.direccion}</span></p>` : ''}
<div class="divider"></div>
<div class="detalles-titulo">📝 DETALLES DEL PEDIDO</div>
${productos.map(producto => `
  <div class="producto">
    <span class="producto-cantidad">${formatearCantidadConMedida(producto.cantidad, producto.tipo_medida, producto.nombre)}</span>
    <span class="producto-nombre"> ${producto.nombre}</span>
  </div>
`).join('')}
${pedido.con_chimichurri ? `<div style="font-weight: bold; font-size: 1.1em; margin: 8px 0;">🌿 CHIMICHURRI INCLUIDO</div>` : ''}
${productos.length === 0 ? '<div style="text-align: center; color: #999; font-size: 14px;">No hay productos</div>' : ''}
<div class="divider"></div>
<p style="font-size: 14px;"><strong>TOTAL:</strong> <span class="total-precio">${formatPrecio(pedido.precio_total)}</span></p>
<p style="font-size: 14px;"><strong>Método pago:</strong> ${formatMetodoPago(pedido.metodo_pago)}</p>
<div class="divider"></div>
<div class="footer">${pedido.estado === 'entregado' ? `Entregado: ${pedido.hora_entrega_real || '--:--'}` : 'Pendiente de entrega'}<br>¡Gracias por su compra!</div>
</body></html>`;
  };

  const marcarComoImpresoEnBackend = async (): Promise<boolean> => {
    try {
      console.log(`📤 Enviando PATCH para pedido ${pedido.id}...`);
      const response = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          id: pedido.id,
          impreso: true
        })
      });

      if (!response.ok) {
        console.error(`❌ PATCH falló: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return false;
      }

      const result = await response.json();
      console.log(`✅ PATCH exitoso:`, result);
      return result.success === true;

    } catch (error) {
      console.error('❌ Error en marcarComoImpresoEnBackend:', error);
      return false;
    }
  };

  const imprimirTicket = async () => {
    console.log(`🎯 Iniciando impresión para pedido ${pedido.id}`);
    console.log(`📊 Estado antes: localImpreso=${localImpreso}, pedido.impreso=${pedido.impreso}`);

    setIsPrinting(true);

    // 1. PRIMERO: Marcar como impreso en backend
    const marcadoExitoso = await marcarComoImpresoEnBackend();

    if (marcadoExitoso) {
      // 2. Actualizar UI inmediatamente
      setLocalImpreso(true);
      console.log(`✅ UI actualizada: localImpreso=true`);

      // 3. Notificar al padre
      onPedidoImpreso?.(pedido.id);
      console.log(`📤 Padre notificado para ${pedido.id}`);
    } else {
      console.warn(`⚠️ No se pudo marcar como impreso en backend, pero continuando...`);
    }

    // 4. Luego intentar imprimir (esto puede fallar)
    let impresionRealizada = false;

    try {
      // Intentar con timeout para evitar bloqueos largos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(`${process.env.NEXT_PUBLIC_IMPRESORA_API}/api/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Impresión API exitosa:', result);
        impresionRealizada = true;
      } else {
        throw new Error(`API impresión respondió con: ${response.status}`);
      }

    } catch (impresionError) {
      console.log('⚠️ API de impresión no disponible, usando fallback...', impresionError);

      // Fallback a impresión en ventana del navegador
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(generarHTMLTicket());
          printWindow.document.close();
          impresionRealizada = true;
          console.log('✅ Impresión fallback exitosa');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError);
      }
    }

    console.log(`🏁 Impresión finalizada para ${pedido.id}. Marcado: ${marcadoExitoso}, Impreso: ${impresionRealizada}`);
    setIsPrinting(false);
  };

  return (
    <button
      onClick={imprimirTicket}
      disabled={isPrinting}
      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPrinting ? 'Imprimiendo...' :
        (localImpreso ? 'Reimprimir Ticket' : 'Imprimir Ticket')}
    </button>
  );
}