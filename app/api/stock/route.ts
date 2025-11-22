import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Función para resetear el stock (ahora solo se ejecutará manualmente)
async function resetStock() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE stock SET cantidad = 0 WHERE producto = 'pollo'");
    console.log('✅ Stock reseteado manualmente a 0');
    return true;
  } catch (error) {
    console.error('❌ Error al resetear stock:', error);
    return false;
  } finally {
    client.release();
  }
}

// Handler GET (sin verificación automática)
export async function GET() {
  try {
    const client = await pool.connect();
    const res = await client.query(`
      SELECT id, producto, cantidad, precio, tipo_medida, categoria, activo, fecha_actualizacion
      FROM stock
      WHERE activo = true
      ORDER BY categoria, producto
    `);
    client.release();

    const stock = res.rows.map(row => ({
      id: row.id,
      producto: row.producto,
      cantidad: parseFloat(row.cantidad),
      precio: row.precio ? parseFloat(row.precio) : null,
      tipo_medida: row.tipo_medida,
      categoria: row.categoria,
      activo: row.activo
    }));

    return NextResponse.json(stock);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener el stock' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { producto, cantidad, precio, tipo_medida, categoria } = await request.json();
    const client = await pool.connect();

    // Verificar si el producto ya existe
    const existingProduct = await client.query(
      'SELECT id FROM stock WHERE producto = $1',
      [producto]
    );

    if (existingProduct.rows.length > 0) {
      // Actualizar producto existente
      await client.query(
        `UPDATE stock
         SET cantidad = cantidad + $1, precio = $2, tipo_medida = $3, categoria = $4, fecha_actualizacion = NOW()
         WHERE producto = $5`,
        [cantidad, precio, tipo_medida, categoria, producto]
      );
    } else {
      // Crear nuevo producto
      await client.query(
        `INSERT INTO stock (producto, cantidad, precio, tipo_medida, categoria)
         VALUES ($1, $2, $3, $4, $5)`,
        [producto, cantidad, precio, tipo_medida, categoria]
      );
    }

    client.release();
    return NextResponse.json({ message: 'Stock actualizado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el stock' },
      { status: 500 }
    );
  }
}

// Nuevo endpoint para reset manual
export async function DELETE() {
  try {
    const success = await resetStock();
    if (success) {
      return NextResponse.json({ message: 'Stock reseteado exitosamente' });
    } else {
      return NextResponse.json(
        { error: 'Error al resetear el stock' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}