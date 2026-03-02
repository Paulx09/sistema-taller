import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { OrdenServicio } from '@/types';

// Estilos
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: '#1e293b',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  headerLeft: { flexDirection: 'column', gap: 2 },
  shopName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  shopSub: { fontSize: 9, color: '#64748b' },
  headerRight: { alignItems: 'flex-end' },
  codeBox: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  dateText: { fontSize: 9, color: '#64748b' },
  // Estado badge
  estadoBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  // Section
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  // Two-column grid
  row2: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  col: { flex: 1 },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 4,
  },
  infoLabel: { fontSize: 8, color: '#94a3b8', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 1 },
  infoValue: { fontSize: 10, color: '#1e293b' },
  infoValueBold: { fontSize: 10, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  // Table
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  tdText: { fontSize: 9, color: '#334155' },
  col60: { flex: 6 },
  col10: { flex: 1, textAlign: 'right' },
  col15: { flex: 1.5, textAlign: 'right' },
  // Totals
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalsBox: { width: 200, gap: 4 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabelSm: { fontSize: 9, color: '#64748b' },
  totalValueSm: { fontSize: 9, color: '#334155' },
  totalLineFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1.5,
    borderTopColor: '#1d4ed8',
    marginTop: 2,
  },
  totalLabelFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  totalValueFinal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  // Signatures
  signatures: { flexDirection: 'row', gap: 40, marginTop: 36 },
  signatureBox: { flex: 1, alignItems: 'center' },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#94a3b8', width: '100%', marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: '#64748b', textAlign: 'center' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  // Notas
  notaBox: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    borderRadius: 2,
  },
  notaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  notaAutor: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e' },
  notaFecha: { fontSize: 8, color: '#b45309' },
  notaContenido: { fontSize: 9, color: '#451a03' },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (val: string | null | undefined) =>
  val ? `S/ ${parseFloat(val).toFixed(2)}` : 'S/ 0.00';

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const ESTADO_COLORS: Record<string, string> = {
  RECIBIDA: '#dbeafe',
  EN_REPARACION: '#fef9c3',
  LISTA: '#dcfce7',
  ENTREGADA: '#f1f5f9',
  CANCELADA: '#fee2e2',
};
const ESTADO_TEXT_COLORS: Record<string, string> = {
  RECIBIDA: '#1d4ed8',
  EN_REPARACION: '#854d0e',
  LISTA: '#15803d',
  ENTREGADA: '#475569',
  CANCELADA: '#b91c1c',
};
const ESTADO_LABELS: Record<string, string> = {
  RECIBIDA: 'RECIBIDA',
  EN_REPARACION: 'EN REPARACIÓN',
  LISTA: 'LISTA PARA ENTREGAR',
  ENTREGADA: 'ENTREGADA',
  CANCELADA: 'CANCELADA',
};

// Componente
interface Props {
  orden: OrdenServicio;
  nombreTaller?: string;
}

export function OrdenServicioPDF({ orden, nombreTaller = 'Servicio Técnico' }: Props) {
  const saldo = parseFloat(orden.total) - parseFloat(orden.pagoACuenta);

  return (
    <Document
      title={`Orden ${orden.codigoFormateado}`}
      author={nombreTaller}
      subject="Orden de Servicio Técnico"
    >
      <Page size="A4" style={S.page}>
        {/* Encabezado */}
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={S.shopName}>{nombreTaller}</Text>
            <Text style={S.shopSub}>Reparación y mantenimiento de equipos electrónicos</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.codeBox}>{orden.codigoFormateado}</Text>
            <Text style={S.dateText}>Emitido: {fmtFechaCorta(orden.fechaEmision)}</Text>
            <View
              style={[
                S.estadoBadge,
                {
                  backgroundColor: ESTADO_COLORS[orden.estado] || '#f1f5f9',
                  color: ESTADO_TEXT_COLORS[orden.estado] || '#475569',
                },
              ]}
            >
              <Text>{ESTADO_LABELS[orden.estado] || orden.estado}</Text>
            </View>
          </View>
        </View>

        {/* Cliente + Equipo */}
        <View style={S.row2}>
          {/* Cliente */}
          <View style={S.col}>
            <Text style={S.sectionTitle}>Cliente</Text>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Nombre</Text>
              <Text style={S.infoValueBold}>{orden.cliente?.nombre || '—'}</Text>
              {orden.cliente?.dniRuc && (
                <>
                  <Text style={[S.infoLabel, { marginTop: 4 }]}>DNI / RUC</Text>
                  <Text style={S.infoValue}>{orden.cliente.dniRuc}</Text>
                </>
              )}
              {orden.cliente?.telefono && (
                <>
                  <Text style={[S.infoLabel, { marginTop: 4 }]}>Teléfono</Text>
                  <Text style={S.infoValue}>{orden.cliente.telefono}</Text>
                </>
              )}
            </View>
          </View>

          {/* Equipo */}
          <View style={S.col}>
            <Text style={S.sectionTitle}>Equipo</Text>
            <View style={S.infoBox}>
              <Text style={S.infoLabel}>Tipo</Text>
              <Text style={S.infoValueBold}>{orden.equipo?.tipoEquipo || '—'}</Text>
              {(orden.equipo?.marca || orden.equipo?.modelo) && (
                <>
                  <Text style={[S.infoLabel, { marginTop: 4 }]}>Marca / Modelo</Text>
                  <Text style={S.infoValue}>
                    {[orden.equipo.marca, orden.equipo.modelo].filter(Boolean).join(' ')}
                  </Text>
                </>
              )}
              {orden.equipo?.numeroSerie && (
                <>
                  <Text style={[S.infoLabel, { marginTop: 4 }]}>N° Serie</Text>
                  <Text style={S.infoValue}>{orden.equipo.numeroSerie}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Problema + Diagnóstico  */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Detalle del servicio</Text>
          <View style={S.row2}>
            <View style={S.col}>
              <Text style={S.infoLabel}>Problema reportado</Text>
              <Text style={{ fontSize: 10, color: '#1e293b', marginTop: 3 }}>
                {orden.problemaReportado}
              </Text>
            </View>
            {orden.diagnosticoInicial && (
              <View style={S.col}>
                <Text style={S.infoLabel}>Diagnóstico</Text>
                <Text style={{ fontSize: 10, color: '#1e293b', marginTop: 3 }}>
                  {orden.diagnosticoInicial}
                </Text>
              </View>
            )}
          </View>

          {/* Técnico asignado */}
          {orden.usuarioTecnico && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Text style={S.infoLabel}>Técnico:</Text>
              <Text style={{ fontSize: 9, color: '#334155' }}>
                {orden.usuarioTecnico.nombreCompleto}
              </Text>
            </View>
          )}
        </View>

        {/* Items / Repuestos */}
        {orden.items && orden.items.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Repuestos y servicios</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                <Text style={[S.thText, S.col60]}>Descripción</Text>
                <Text style={[S.thText, S.col10]}>Cant.</Text>
                <Text style={[S.thText, S.col15]}>P. Unit.</Text>
                <Text style={[S.thText, S.col15]}>Subtotal</Text>
              </View>
              {orden.items.map((item, i) => (
                <View
                  key={item.id}
                  style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
                >
                  <View style={S.col60}>
                    <Text style={S.tdText}>
                      {item.producto?.nombre || 'Producto'}
                      {item.producto?.esServicio ? ' (Servicio)' : ''}
                    </Text>
                    {item.producto?.sku && (
                      <Text style={{ fontSize: 7, color: '#94a3b8' }}>SKU: {item.producto.sku}</Text>
                    )}
                  </View>
                  <Text style={[S.tdText, S.col10]}>{item.cantidad}</Text>
                  <Text style={[S.tdText, S.col15]}>{fmt(item.precioUnitario)}</Text>
                  <Text style={[S.tdText, S.col15]}>{fmt(item.subtotal)}</Text>
                </View>
              ))}
            </View>

            {/* Totales */}
            <View style={S.totalsRow}>
              <View style={S.totalsBox}>
                {orden.costoEstimado && (
                  <View style={S.totalLine}>
                    <Text style={S.totalLabelSm}>Costo estimado</Text>
                    <Text style={S.totalValueSm}>{fmt(orden.costoEstimado)}</Text>
                  </View>
                )}
                <View style={S.totalLine}>
                  <Text style={S.totalLabelSm}>Subtotal</Text>
                  <Text style={S.totalValueSm}>{fmt(orden.total)}</Text>
                </View>
                <View style={S.totalLine}>
                  <Text style={S.totalLabelSm}>Pago a cuenta</Text>
                  <Text style={S.totalValueSm}>- {fmt(orden.pagoACuenta)}</Text>
                </View>
                <View style={S.totalLineFinal}>
                  <Text style={S.totalLabelFinal}>SALDO PENDIENTE</Text>
                  <Text style={S.totalValueFinal}>{fmt(String(saldo))}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Sin items: mostrar solo totales básicos */}
        {(!orden.items || orden.items.length === 0) && (
          <View style={{ marginBottom: 16 }}>
            <View style={S.row2}>
              {orden.costoEstimado && (
                <View style={S.col}>
                  <Text style={S.infoLabel}>Costo estimado</Text>
                  <Text style={S.infoValueBold}>{fmt(orden.costoEstimado)}</Text>
                </View>
              )}
              <View style={S.col}>
                <Text style={S.infoLabel}>Pago a cuenta</Text>
                <Text style={S.infoValueBold}>{fmt(orden.pagoACuenta)}</Text>
              </View>
              <View style={S.col}>
                <Text style={S.infoLabel}>Total cobrado</Text>
                <Text style={[S.infoValueBold, { color: '#1d4ed8' }]}>{fmt(orden.total)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notas técnicas (últimas 3) */}
        {orden.notas && orden.notas.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Notas técnicas</Text>
            {orden.notas.slice(0, 5).map((nota) => (
              <View key={nota.id} style={S.notaBox}>
                <View style={S.notaHeader}>
                  <Text style={S.notaAutor}>{nota.usuario?.nombreCompleto || 'Técnico'}</Text>
                  <Text style={S.notaFecha}>{fmtFecha(nota.createdAt)}</Text>
                </View>
                <Text style={S.notaContenido}>{nota.contenido}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Firmas */}
        <View style={S.signatures}>
          <View style={S.signatureBox}>
            <View style={S.signatureLine} />
            <Text style={S.signatureLabel}>Técnico Responsable</Text>
            {orden.usuarioTecnico && (
              <Text style={[S.signatureLabel, { marginTop: 2, color: '#334155' }]}>
                {orden.usuarioTecnico.nombreCompleto}
              </Text>
            )}
          </View>
          <View style={S.signatureBox}>
            <View style={S.signatureLine} />
            <Text style={S.signatureLabel}>Firma del Cliente</Text>
            <Text style={[S.signatureLabel, { marginTop: 2, color: '#334155' }]}>
              {orden.cliente?.nombre || ''}
            </Text>
          </View>
        </View>

        {/* Pie de página */}
        <Text style={S.footer}>
          {ordenHasItems(orden)
            ? `${nombreTaller} · ${orden.codigoFormateado} · Emitido: ${fmtFechaCorta(orden.fechaEmision)} · Documento generado automáticamente`
            : `${nombreTaller} · ${orden.codigoFormateado} · Documento generado automáticamente`}
        </Text>
      </Page>
    </Document>
  );
}

function ordenHasItems(orden: OrdenServicio): boolean {
  return !!(orden.items && orden.items.length > 0);
}
