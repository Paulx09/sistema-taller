import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import { obtenerVenta } from '@/services/venta.service';
import type { Venta, DetalleVenta } from '@/types';

// Helpers

function fmtNum(val: string | number | null | undefined): string {
  const n = Number.parseFloat(String(val ?? '0'));
  return Number.isNaN(n) ? '0.00' : n.toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCodigoVenta(n: number): string {
  return `VTA-${String(n).padStart(5, '0')}`;
}

const METODOS_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta (Visa/Mastercard)',
  YAPE_PLIN: 'Yape / Plin',
};

// Color palette

const C = {
  navy: '#1e3a5f',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray500: '#64748b',
  gray700: '#374151',
  gray900: '#111827',
  sky300: '#7dd3fc',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
};

// Styles

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.gray900,
    backgroundColor: C.white,
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 56,
  },
  header: {
    backgroundColor: C.navy,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerBrand: {
    color: C.white,
    fontSize: 18,
    fontFamily: 'Times-Roman',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  headerBrandAccent: {
    color: C.white,
    fontSize: 22,
    fontFamily: 'Times-BoldItalic',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  headerServices: {
    color: C.sky300,
    fontSize: 7,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  headerSubBrand: {
    color: C.slate400,
    fontSize: 7,
    letterSpacing: 0.2,
  },
  headerContact: {
    color: C.slate300,
    fontSize: 7,
    marginTop: 2,
  },
  headerDocType: {
    color: C.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerCode: {
    color: C.sky300,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  headerMeta: {
    color: C.slate300,
    fontSize: 7.5,
    marginTop: 1,
  },
  section: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 5,
  },
  sectionHeader: {
    backgroundColor: C.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.gray700,
    letterSpacing: 0.8,
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row2: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 7,
    color: C.gray500,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 8.5,
    color: C.gray900,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tableHeadCell: {
    color: C.white,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tableRowAlt: {
    backgroundColor: C.gray50,
  },
  tableCell: {
    fontSize: 8.5,
    color: C.gray900,
  },
  tableCellMuted: {
    fontSize: 7.5,
    color: C.gray500,
  },
  totalsOuter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  totalRowNormal: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 8.5,
    color: C.gray700,
  },
  totalValue: {
    fontSize: 8.5,
    color: C.gray900,
    fontFamily: 'Helvetica-Bold',
  },
  totalDivider: {
    height: 1,
    backgroundColor: C.gray200,
    width: 200,
    marginVertical: 4,
  },
  totalBigRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    backgroundColor: C.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 2,
  },
  totalBigLabel: {
    fontSize: 9,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
  },
  totalBigValue: {
    fontSize: 9,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: C.gray500,
  },
  noticeBox: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 5,
    backgroundColor: C.gray50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.gray700,
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  noticeItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  noticeBullet: {
    fontSize: 8,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    marginRight: 5,
    marginTop: 0.5,
  },
  noticeText: {
    flex: 1,
    fontSize: 7.5,
    color: C.gray700,
    lineHeight: 1.5,
  },
});

// PDF Document

export function VentaPDFDoc({ venta }: Readonly<{ venta: Venta }>) {
  const total = Number.parseFloat(venta.total);
  const codigo = formatCodigoVenta(venta.codigoCorrelativo);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerBrand}>SERVICIO TÉCNICO</Text>
            <Text style={s.headerBrandAccent}>José Gálvez</Text>
            <Text style={s.headerServices}>Impresoras  •  Suministros  •  Soporte Técnico  •  Redes</Text>
            <Text style={s.headerContact}>Av. Lima 961 - José Gálvez - V.M.T</Text>
            <Text style={s.headerContact}>Cel: 960140558 - 960140542</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.headerDocType}>NOTA DE VENTA</Text>
            <Text style={s.headerCode}>{codigo}</Text>
            <Text style={s.headerMeta}>Fecha: {formatDate(venta.fecha)}</Text>
            {venta.usuario && (
              <Text style={s.headerMeta}>Cajero: {venta.usuario.nombreCompleto}</Text>
            )}
          </View>
        </View>

        {/* Cliente */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>DATOS DEL CLIENTE</Text>
          </View>
          <View style={[s.sectionBody, s.row2]}>
            <View style={s.col}>
              <Text style={s.label}>Nombre</Text>
              <Text style={s.value}>{venta.clienteNombre || 'Cliente Público'}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.label}>Método de Pago</Text>
              <Text style={s.value}>
                {METODOS_PAGO_LABEL[venta.metodoPago ?? ''] || venta.metodoPago || '—'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Estado</Text>
              <Text style={s.value}>{venta.estado}</Text>
            </View>
          </View>
        </View>

        {/* Productos */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>DETALLE DEL PRODUCTO O SERVICIO</Text>
          </View>

          {/* Cabecera tabla */}
          <View style={s.tableHead}>
            <Text style={[s.tableHeadCell, { width: 22 }]}>#</Text>
            <Text style={[s.tableHeadCell, { flex: 3 }]}>Producto / Servicio</Text>
            <Text style={[s.tableHeadCell, { width: 40, textAlign: 'right' }]}>Cant.</Text>
            <Text style={[s.tableHeadCell, { width: 72, textAlign: 'right' }]}>P. Unit.</Text>
            <Text style={[s.tableHeadCell, { width: 72, textAlign: 'right' }]}>Subtotal</Text>
          </View>

          {/* Filas */}
          {venta.detalles?.map((d: DetalleVenta, i) => (
            <View key={d.id} style={[s.tableRow, i % 2 === 0 ? {} : s.tableRowAlt]}>
              <Text style={[s.tableCell, { width: 22, color: C.gray500 }]}>{i + 1}</Text>
              <View style={{ flex: 3, marginRight: 8 }}>
                <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>
                  {d.producto?.nombre ?? '—'}
                </Text>
                {(d.producto?.marca || d.producto?.modelo) && (
                  <Text style={s.tableCellMuted}>
                    {[d.producto.marca, d.producto.modelo].filter(Boolean).join(' ')}
                  </Text>
                )}
              </View>
              <Text style={[s.tableCell, { width: 40, textAlign: 'right' }]}>{d.cantidad}</Text>
              <Text style={[s.tableCell, { width: 72, textAlign: 'right' }]}>
                S/ {fmtNum(d.precioUnitario)}
              </Text>
              <Text
                style={[
                  s.tableCell,
                  { width: 72, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
                ]}
              >
                S/ {fmtNum(d.subtotal)}
              </Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.totalsOuter}>
            <View style={s.totalBigRow}>
              <Text style={s.totalBigLabel}>TOTAL</Text>
              <Text style={s.totalBigValue}>S/ {fmtNum(total)}</Text>
            </View>
          </View>
        </View>

        {/* Términos y Condiciones */}
        <View style={s.noticeBox}>
          <Text style={s.noticeTitle}>TÉRMINOS Y CONDICIONES DE VENTA</Text>
          <View style={s.noticeItem}>
            <Text style={s.noticeBullet}>•</Text>
            <Text style={s.noticeText}>No se aceptan cambios de mercadería ni devoluciones de dinero una vez retirado el producto.</Text>
          </View>
          <View style={s.noticeItem}>
            <Text style={s.noticeBullet}>•</Text>
            <Text style={s.noticeText}>Los suministros y repuestos electrónicos no cuentan con garantía si presentan sellos de seguridad rotos o daños por manipulación externa.</Text>
          </View>
          <View style={s.noticeItem}>
            <Text style={s.noticeBullet}>•</Text>
            <Text style={s.noticeText}>Favor de verificar su comprobante y estado de la mercadería al momento de la entrega.</Text>
          </View>
        </View>

        {/* Footer fijo */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {codigo} — Generado el {formatDate(new Date().toISOString())}
          </Text>
          <Text style={s.footerText}>Servicio Técnico José Gálvez · Documento interno</Text>
        </View>
      </Page>
    </Document>
  );
}

// Shell

type Estado = 'generando' | 'descargado' | 'error';

export function VentaPDF() {
  const { id } = useParams<{ id: string }>();
  const [estado, setEstado] = useState<Estado>('generando');
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    if (!id) return;
    obtenerVenta(id)
      .then(async (r) => {
        const venta = r.data as Venta;
        const doc = <VentaPDFDoc venta={venta} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formatCodigoVenta(venta.codigoCorrelativo)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setCodigo(formatCodigoVenta(venta.codigoCorrelativo));
        setEstado('descargado');
      })
      .catch(() => setEstado('error'));
  }, [id]);

  if (estado === 'generando') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground text-sm">
        <svg
          className="animate-spin h-6 w-6 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        Generando PDF...
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-destructive text-sm">
        No se pudo generar el PDF.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <p className="text-sm text-muted-foreground">
        ✓{' '}
        <span className="font-semibold text-foreground">{codigo}.pdf</span>{' '}
        descargado correctamente.
      </p>
      <button
        onClick={() => window.close()}
        className="text-xs underline text-muted-foreground hover:text-foreground transition-colors"
      >
        Cerrar esta pestaña
      </button>
    </div>
  );
}
