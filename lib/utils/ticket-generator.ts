import { Venta } from '../types/pos';
import { formatCLPCurrency } from '../utils';

export class TicketGenerator {
  private static readonly ANCHO_TICKET = 40;

  private static centrar(texto: string): string {
    const spaces = Math.max(0, Math.floor((this.ANCHO_TICKET - texto.length) / 2));
    return ' '.repeat(spaces) + texto;
  }

  private static linea(char: string = '-'): string {
    return char.repeat(this.ANCHO_TICKET);
  }

  private static formatearLinea(izq: string, der: string): string {
    const espacios = this.ANCHO_TICKET - izq.length - der.length;
    return izq + ' '.repeat(Math.max(1, espacios)) + der;
  }

  static generar(venta: Venta, nombreNegocio: string = 'POS MARKET'): string {
    const fecha = venta.fecha.toDate();
    const fechaStr = fecha.toLocaleDateString('es-CL');
    const horaStr = fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    let ticket = '';
    
    // Header
    ticket += this.centrar('*** ' + nombreNegocio.toUpperCase() + ' ***') + '\n';
    ticket += this.centrar('SOLUCIONES DE VENTA') + '\n';
    ticket += this.linea('.') + '\n';
    
    // Meta Info
    ticket += this.formatearLinea('FECHA:', fechaStr) + '\n';
    ticket += this.formatearLinea('HORA:', horaStr) + '\n';
    ticket += this.formatearLinea('ORDEN:', `#${venta.numero_venta || venta.id.slice(-6).toUpperCase()}`) + '\n';
    
    if (venta.cliente_nombre) {
      ticket += this.formatearLinea('CLIENTE:', venta.cliente_nombre.toUpperCase()) + '\n';
    }
    
    ticket += this.linea('-') + '\n';
    ticket += this.centrar('DETALLE DE VENTA') + '\n';
    ticket += this.linea('-') + '\n';
    
    // Items
    venta.items.forEach((item) => {
      const nombreLimpio = item.nombre.length > 25 ? item.nombre.substring(0, 22) + '...' : item.nombre;
      ticket += nombreLimpio.toUpperCase() + '\n';
      
      const netoStr = item.unidad === 'kg' ? item.neto.toFixed(2) : item.neto.toString();
      const detalleCant = `${netoStr} ${item.unidad} x ${formatCLPCurrency(item.precio_unitario)}`;
      const subtotal = formatCLPCurrency(item.total);
      
      ticket += this.formatearLinea('  ' + detalleCant, subtotal) + '\n';
    });
    
    ticket += this.linea('-') + '\n';
    
    // Totals
    ticket += this.formatearLinea('TOTAL A PAGAR:', formatCLPCurrency(venta.total)) + '\n';
    ticket += this.linea('=') + '\n';
    
    // Payment Method
    const metodoPagoTexto = {
      efectivo: 'EFECTIVO',
      transferencia: 'TRANSFERENCIA',
      tarjeta: 'TARJETA DEBITO/CREDITO',
      fiado: 'CREDITO LOCAL'
    }[venta.metodo_pago] || venta.metodo_pago.toUpperCase();
    
    ticket += this.centrar(`MÉTODO DE PAGO: ${metodoPagoTexto}`) + '\n';
    ticket += '\n';
    ticket += this.centrar('¡GRACIAS POR PREFERIRNOS!') + '\n';
    ticket += this.centrar('Vuelva Pronto') + '\n';
    ticket += this.linea('.') + '\n';

    return ticket;
  }

  static imprimir(ticket: string): void {
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comprobante de Venta</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.2;
              margin: 0;
              padding: 4mm;
              width: 80mm;
              background: white;
            }
            pre {
              margin: 0;
              white-space: pre;
              word-wrap: normal;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <pre>${ticket}</pre>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      ventanaImpresion.document.close();
    }
  }

  static descargar(ticket: string, nombreArchivo: string = 'ticket.txt'): void {
    const blob = new Blob([ticket], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
