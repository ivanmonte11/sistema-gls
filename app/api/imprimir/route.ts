import { NextResponse } from 'next/server';
import { printer as Printer, types } from 'node-thermal-printer';

type PrinterInstance = InstanceType<typeof Printer> & {
  isPrinterConnected(): Promise<boolean>;
  execute(): Promise<boolean>;
  close(): Promise<void>;
};

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

const formatFechaArgentina = (fechaInput: string | Date): string => {
  try {
    const fecha = new Date(fechaInput);
    const offsetArgentina = -3 * 60 * 60 * 1000; // GMT-3 para Argentina
    const fechaArgentina = new Date(fecha.getTime() + offsetArgentina);
    
    const dia = fechaArgentina.getDate().toString().padStart(2, '0');
    const mes = (fechaArgentina.getMonth() + 1).toString().padStart(2, '0');
    const año = fechaArgentina.getFullYear();
    
    return `${dia}/${mes}/${año}`;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Fecha inválida';
  }
};

export async function POST(request: Request) {
  let printer: PrinterInstance | undefined;
  let pedido: Pedido | null = null;

  try {
    pedido = await request.json() as Pedido;
    
    console.log('[DEBUG] Fecha recibida:', {
      original: pedido.fecha_pedido,
      tipo: typeof pedido.fecha_pedido,
      parsed: new Date(pedido.fecha_pedido).toISOString()
    });

    printer = new Printer({
      type: types.EPSON,
      interface: process.env.PRINTER_IP || 'tcp://192.168.1.100',
      removeSpecialCharacters: false,
      lineCharacter: "-",
      options: {
        timeout: 3000
      }
    }) as PrinterInstance;

    let connected = false;
    for (let i = 0; i < 3; i++) {
      if (await printer.isPrinterConnected()) {
        connected = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!connected) {
      throw new Error('No se pudo conectar a la impresora después de 3 intentos');
    }

    printer.alignCenter();
    printer.bold(true);
    printer.println("GRANJA LA COLONIA");
    printer.bold(false);
    printer.println("Francisco Viano 130");
    printer.println("Tel: 3856146824");
    printer.drawLine();

    printer.alignLeft();
    printer.println(`Pedido Nº: ${pedido.numero_pedido}`);
    printer.bold(true);
    printer.setTextSize(1, 2); 
    printer.println(`CLIENTE: ${pedido.nombre_cliente.toUpperCase()}`);
    printer.setTextSize(1, 1); 
    printer.bold(false);
    if (pedido.telefono_cliente) printer.println(`Teléfono: ${pedido.telefono_cliente}`);
    if (pedido.tipo_entrega === 'envio') {
      printer.println("Tipo de entrega: Envío");
      printer.println(`Zona: ${pedido.tipo_envio}`);
      if (pedido.direccion) printer.println(`Dirección: ${pedido.direccion}`);
    } else {
      printer.println("Tipo de entrega: Retira por local");
    }

    printer.drawLine();
    printer.bold(true);
    printer.println("--- ITEMS DEL PEDIDO ---");
    printer.bold(false);
    
    printer.setTextSize(2, 2);
    printer.println("» POLLOS: " + pedido.cantidad_pollo);
    printer.setTextSize(1, 1);
    
    if (pedido.con_papas) {
      printer.println("* PAPAS: " + pedido.cantidad_papas);
    }
    
    if (pedido.con_chimichurri) {
      printer.println("> CHIMICHURRI INCLUIDO");
    }
    printer.drawLine();

    printer.drawLine();
    printer.println(`Método de pago: ${pedido.metodo_pago}`);
    printer.println(`Total: $${pedido.precio_total}`);
    printer.drawLine();
    printer.println(`Fecha del pedido: ${formatFechaArgentina(pedido.fecha_pedido)}`);

    const horaEntrega = pedido.hora_entrega_real || pedido.hora_entrega_solicitada;
    if (horaEntrega) {
      let horaFormateada = horaEntrega;

      if (horaEntrega.includes('T') || horaEntrega.includes('-')) {
        try {
          const [horaPart] = horaEntrega.split('T')[1]?.split('.') || [null];
          if (horaPart) {
            horaFormateada = horaPart.substring(0, 5);
          } else {
            const dateObj = new Date(horaEntrega);
            if (!isNaN(dateObj.getTime())) {
              horaFormateada = dateObj.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          }
        } catch (e) {
          console.warn('Error al formatear hora:', e);
          horaFormateada = horaEntrega;
        }
      }

      printer.drawLine();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.alignCenter();
      printer.println(pedido.hora_entrega_real ? ">>> HORA DE ENTREGA <<<" : ">>> HORA SOLICITADA <<<");
      printer.setTextSize(2, 2);
      printer.println(horaFormateada);
      printer.setTextSize(1, 1);
      printer.bold(false);
      printer.drawLine();
    }

    const success = await printer.execute();
    if (!success) {
      throw new Error('La impresora no respondió correctamente');
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket impreso correctamente',
      fechaFormateada: formatFechaArgentina(pedido.fecha_pedido)
    });

  } catch (error: unknown) {
    console.error('[ERROR]', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      pedido: pedido ? {
        fecha: pedido.fecha_pedido,
        tipo: typeof pedido.fecha_pedido
      } : 'No se recibió pedido',
      stack: error instanceof Error ? error.stack : null
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al imprimir ticket',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : null
      },
      { status: 500 }
    );
  } finally {
    if (printer) {
      try {
        await printer.close();
      } catch (e) {
        console.warn('Error al cerrar impresora:', e);
      }
    }
  }
}