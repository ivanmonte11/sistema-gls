import { NextResponse } from 'next/server';
import { printer as Printer, types } from 'node-thermal-printer';

// Definimos un tipo para la impresora que incluya los métodos que necesitamos
type PrinterInstance = InstanceType<typeof Printer> & {
  isPrinterConnected(): Promise<boolean>;
  execute(): Promise<boolean>;
  close(): Promise<void>;
};

// Función auxiliar para formato de tipo de envío
function formatTipoEnvio(tipo: string | null): string {
  if (!tipo) return '';
  const tipos: Record<string, string> = {
    cercano: 'Cercano',
    lejano: 'Lejano (+$500)',
    la_banda: 'La Banda (+$800)',
    gratis: 'Gratis'
  };
  return tipos[tipo] || tipo;
}

// Función auxiliar para formato de precio
function formatPrecio(precio: number | string): string {
  const numero = typeof precio === 'string' ? parseFloat(precio) : precio;
  return isNaN(numero) ? '$0.00' : `$${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export async function POST(request: Request) {
  let printer: PrinterInstance | undefined;
  
  try {
    const pedido = await request.json();

    // 1. Configuración inicial de la impresora
    printer = new Printer({
      type: types.EPSON,
      interface: process.env.PRINTER_IP || 'tcp://192.168.1.100',
      removeSpecialCharacters: false,
      lineCharacter: "-",
      options: { timeout: 5000 }
    }) as PrinterInstance;

    // 2. Verificar conexión
    if (!(await printer.isPrinterConnected())) {
      throw new Error('No se pudo conectar a la impresora');
    }

    // 3. Construcción del ticket
    // Encabezado
    printer.alignCenter();
    printer.bold(true);
    printer.println("POLLERÍA EL BUEN SABOR");
    printer.bold(false);
    printer.println("Av. San Martín 1234");
    printer.println("Tel: 381-1234567");
    printer.drawLine();

    // Información del pedido
    printer.alignCenter();
    printer.bold(true);
    printer.println(`PEDIDO #${pedido.numero_pedido}`);
    printer.bold(false);
    printer.println(new Date(pedido.fecha_pedido).toLocaleString('es-AR'));
    printer.drawLine();

    // Datos del cliente
    printer.alignLeft();
    printer.println(`Cliente: ${pedido.nombre_cliente}`);
    if (pedido.telefono_cliente) {
      printer.println(`Tel: ${pedido.telefono_cliente}`);
    }
    if (pedido.tipo_entrega === 'envio') {
      printer.println(`Dirección: ${pedido.direccion || 'No especificada'}`);
      printer.println(`Tipo envío: ${formatTipoEnvio(pedido.tipo_envio)}`);
    } else {
      printer.println("Retira en local");
    }
    printer.drawLine();

    // Detalle del pedido
    printer.println("DETALLE DEL PEDIDO:");
    printer.println(`• ${pedido.cantidad_pollo} Pollo(s) - ${formatPrecio(pedido.precio_unitario)}`);
    if (pedido.con_papas) {
      printer.println(`• ${pedido.cantidad_papas} Papas fritas`);
    }
    if (pedido.con_chimichurri) {
      printer.println("• Chimichurri incluido");
    }
    printer.drawLine();

    // Totales y pago
    printer.println(`TOTAL: ${formatPrecio(pedido.precio_total)}`);
    printer.println(`Método pago: ${pedido.metodo_pago.toUpperCase()}`);
    printer.drawLine();

    // Pie del ticket
    printer.alignCenter();
    printer.println(pedido.estado === 'entregado' 
      ? `Entregado: ${pedido.hora_entrega_real || '--:--'}` 
      : "Pendiente de entrega");
    printer.println("¡Gracias por su compra!");
    printer.cut();

    // 4. Enviar a imprimir
    const success = await printer.execute();
    if (!success) {
      throw new Error('La impresora no respondió correctamente');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Ticket impreso correctamente'
    });

  } catch (error: unknown) {
    let errorMessage = 'Error al imprimir ticket';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error('Error en impresión:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al imprimir ticket',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  } finally {
    if (printer) {
      await printer.close();
    }
  }
}