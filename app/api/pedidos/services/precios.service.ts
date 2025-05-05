import pool from '@/lib/db';

export async function getPrecios(client: any) {
  const res = await client.query('SELECT item_key, item_value FROM precio_config');
  const precios: Record<string, number> = {};
  res.rows.forEach((row: any) => {
    precios[row.item_key] = parseFloat(row.item_value);
  });
  return precios;
}

export async function calcularPrecioTotal(client: any, data: any) {
  const precios = await getPrecios(client);
  const precioUnitario = Number(data.precioUnitario);
  let precioTotal = 0;
  const cantidadEntera = Math.floor(data.cantidadPollo);
  const tieneMedioPollo = data.cantidadPollo % 1 !== 0;

  // Precio base por pollos enteros
  precioTotal += cantidadEntera * precioUnitario;

  // Recargo por medio pollo
  if (tieneMedioPollo) {
    precioTotal += (precioUnitario / 2) + precios.medio_pollo_recargo;
  }

  // Costo de envío
  if (data.tipoEntrega === 'envio') {
    switch(data.tipoEnvio) {
      case 'cercano': 
        precioTotal += precios.envio_cercano; 
        break;
      case 'lejano': 
        precioTotal += precios.envio_lejano; 
        break;
      case 'la_banda': 
        precioTotal += precios.envio_la_banda; 
        break;
    }
  }

  // Costo de papas
  if (data.conPapas && data.cantidadPapas > 0) {
    precioTotal += data.cantidadPapas * precios.papas_precio;
  }

  return precioTotal;
}