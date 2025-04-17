// app/api/precios/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Obtener todos los precios
export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM precio_config ORDER BY id');
    client.release();
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error en GET /api/precios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener precios' },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar un precio
export async function PATCH(request: Request) {
    let client;
    try {
      const { id, value } = await request.json();
  
      if (!id || value === undefined) {
        return NextResponse.json(
          { success: false, error: 'Se requieren ID y value' },
          { status: 400 }
        );
      }
  
      client = await pool.connect();
  
      // 1. Obtener el item_key antes de actualizar
      const fetchKey = await client.query('SELECT item_key FROM precio_config WHERE id = $1', [id]);
  
      if (fetchKey.rowCount === 0) {
        client.release();
        return NextResponse.json(
          { success: false, error: 'Ítem no encontrado' },
          { status: 404 }
        );
      }
  
      const itemKey = fetchKey.rows[0].item_key;
  
      // 2. Actualizar el precio_config
      const result = await client.query(
        'UPDATE precio_config SET item_value = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [value, id]
      );
  
      // 3. Si el item_key es 'pollo_precio', también actualizar el precio en stock
      if (itemKey === 'pollo_precio') {
        await client.query(
          `UPDATE stock SET precio = $1, fecha_actualizacion = NOW() WHERE LOWER(producto) = 'pollo'`,
          [value]
        );
      }
  
      client.release();
  
      return NextResponse.json({
        success: true,
        data: result.rows[0]
      });
  
    } catch (error) {
      if (client) client.release();
      console.error('Error en PATCH /api/precios:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar precio' },
        { status: 500 }
      );
    }
  }
  