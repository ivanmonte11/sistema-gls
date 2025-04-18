#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/api/imprimir', async (req, res) => {
  try {
    const pedido = req.body;

    const html = `
<html>
<head>
  <style>
    body {
      width: 80mm;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
    .header { text-align: center; font-weight: bold; margin-bottom: 5mm; }
    .divider { border-top: 1px dashed #000; margin: 3mm 0; }
    .footer { margin-top: 5mm; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">GRANJA LA COLONIA</div>
  <div class="header">Francisco Viano 130 - Tel: 3856146824</div>
  <div class="divider"></div>
  <div class="header">PEDIDO #${pedido.numero_pedido}</div>
  <p>${new Date(pedido.fecha_pedido).toLocaleString('es-AR')}</p>
  <div class="divider"></div>
  <p><strong>Cliente:</strong> ${pedido.nombre_cliente}</p>
  ${pedido.telefono_cliente ? `<p><strong>Teléfono:</strong> ${pedido.telefono_cliente}</p>` : ''}
  <p><strong>Entrega:</strong> ${pedido.tipo_entrega === 'envio'
      ? `Envío (${formatTipoEnvio(pedido.tipo_envio)})`
      : 'Retira en local'}</p>
  ${pedido.tipo_entrega === 'envio' && pedido.direccion
      ? `<p><strong>Dirección:</strong> ${pedido.direccion}</p>`
      : ''}
  <div class="divider"></div>
  <p><strong>DETALLE:</strong></p>
  <p>• ${pedido.cantidad_pollo} Pollo(s) - $${pedido.precio_unitario}</p>
  ${pedido.con_papas ? `<p>• ${pedido.cantidad_papas} Papas fritas</p>` : ''}
  ${pedido.con_chimichurri ? '<p>• Chimichurri incluido</p>' : ''}
  <div class="divider"></div>
  <p><strong>TOTAL:</strong> $${pedido.precio_total}</p>
  <p><strong>Método pago:</strong> ${pedido.metodo_pago}</p>
  <div class="divider"></div>
  <div class="footer">
    ${pedido.estado === 'entregado'
      ? `Entregado: ${pedido.hora_entrega_real || '--:--'}`
      : 'Pendiente de entrega'}<br>
    ¡Gracias por su compra!
  </div>
</body>
</html>`;

    const tempFilePath = path.join(os.tmpdir(), `ticket_${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, html);

    exec(`start chrome --kiosk-printing --headless --disable-gpu --print-to-pdf-no-header --print-to-pdf="${tempFilePath}.pdf" "file://${tempFilePath}"`, (error) => {
      if (error) {
        console.error('Error al imprimir:', error);
        return res.status(500).json({ success: false, message: 'Error al imprimir' });
      }

      return res.json({ success: true });
    });

  } catch (err) {
    console.error('Error general:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de impresión corriendo en http://localhost:${PORT}`);
});

function formatTipoEnvio(tipo) {
  const tipos = {
    cercano: 'Cercano',
    lejano: 'Lejano (+$500)',
    la_banda: 'La Banda (+$800)',
    gratis: 'Gratis'
  };
  return tipos[tipo] || tipo;
}
