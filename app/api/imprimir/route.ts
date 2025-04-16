import { NextResponse } from 'next/server';
import { printer as Printer, types } from 'node-thermal-printer';

type PrinterInstance = InstanceType<typeof Printer> & {
  isPrinterConnected(): Promise<boolean>;
  execute(): Promise<boolean>;
  close(): Promise<void>;
};

// Configuración mejorada para Epson por red
export async function POST(request: Request) {
  let printer: PrinterInstance | undefined;
  
  try {
    const pedido = await request.json();

    // 1. Configuración mejorada de la impresora
    printer = new Printer({
      type: types.EPSON,
      interface: process.env.PRINTER_IP || 'tcp://192.168.1.100',
      characterSet: 'PC860_PORTUGUESE', // Para caracteres en español
      removeSpecialCharacters: false,
      lineCharacter: "-",
      options: { 
        timeout: 3000, // Timeout más corto
        encoding: 'UTF-8' // Asegura caracteres especiales
      }
    }) as PrinterInstance;

    // 2. Verificación de conexión con reintentos
    let connected = false;
    for (let i = 0; i < 3; i++) {
      if (await printer.isPrinterConnected()) {
        connected = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1s entre intentos
    }

    if (!connected) {
      throw new Error('No se pudo conectar a la impresora después de 3 intentos');
    }

    // 3. Construcción del ticket (optimizado)
    printer.alignCenter();
    printer.bold(true);
    printer.println("GRANJA LA COLONIA");
    printer.bold(false);
    printer.println("Francisco Viano 130");
    printer.println("Tel: 3856146824");
    printer.drawLine();

    // [...] (resto del contenido del ticket igual al que tienes)

    // 4. Enviar a imprimir con manejo de errores
    try {
      const success = await printer.execute();
      if (!success) {
        throw new Error('La impresora no respondió correctamente');
      }
    } catch (printError) {
      throw new Error(`Error al enviar a imprimir: ${printError instanceof Error ? printError.message : 'Error desconocido'}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Ticket impreso correctamente'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
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
      await printer.close().catch(e => console.error('Error cerrando impresora:', e));
    }
  }
}