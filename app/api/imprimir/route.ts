import { NextResponse } from 'next/server';
import { printer as Printer, types } from 'node-thermal-printer';

type PrinterInstance = InstanceType<typeof Printer> & {
  isPrinterConnected(): Promise<boolean>;
  execute(): Promise<boolean>;
  close(): Promise<void>;
};

export async function POST(request: Request) {
  let printer: PrinterInstance | undefined;

  try {
    const pedido = await request.json();

    // Configuración de la impresora (sin encoding ni charset inválido)
    printer = new Printer({
      type: types.EPSON,
      interface: process.env.PRINTER_IP || 'tcp://192.168.1.100',
      removeSpecialCharacters: false,
      lineCharacter: "-",
      options: {
        timeout: 3000
      }
    }) as PrinterInstance;

    // Verificar conexión con 3 intentos
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

    // Construcción del ticket
    printer.alignCenter();
    printer.bold(true);
    printer.println("GRANJA LA COLONIA");
    printer.bold(false);
    printer.println("Francisco Viano 130");
    printer.println("Tel: 3856146824");
    printer.drawLine();

    // Aquí agregas los datos del pedido...

    // Ejecutar impresión
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
