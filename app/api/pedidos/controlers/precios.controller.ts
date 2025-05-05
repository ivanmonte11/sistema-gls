import { NextResponse } from 'next/server';
import { getPrecios } from '../services/precios.service';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  
  try {
    const precios = await getPrecios(client);
    
    return NextResponse.json({
      success: true,
      data: precios
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en GET /api/precios:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener precios',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}