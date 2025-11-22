// app/api/stock/[id]/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { producto, cantidad, precio, tipo_medida, categoria, activo } = await request.json();
    const client = await pool.connect();

    await client.query(
      `UPDATE stock
       SET producto = $1, cantidad = $2, precio = $3, tipo_medida = $4, categoria = $5, activo = $6, fecha_actualizacion = NOW()
       WHERE id = $7`,
      [producto, cantidad, precio, tipo_medida, categoria, activo, params.id]
    );

    client.release();
    return NextResponse.json({ message: 'Producto actualizado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al actualizar el producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect();

    // En lugar de eliminar, marcamos como inactivo
    await client.query(
      'UPDATE stock SET activo = false, fecha_actualizacion = NOW() WHERE id = $1',
      [params.id]
    );

    client.release();
    return NextResponse.json({ message: 'Producto desactivado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al desactivar el producto' },
      { status: 500 }
    );
  }
}