import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import { ordenServicioService } from '@/services/orden-servicio.service';
import type { EquipoOrden, EstadoEquipoOrden, OrdenServicio } from '@/types';

// Helpers

function fmt(val: string | number | null | undefined): string {
  const n = parseFloat(String(val ?? '0'));
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ESTADO_EQUIPO_LABEL: Record<EstadoEquipoOrden, string> = {
  RECIBIDA: 'Recibida',
  EN_REPARACION: 'En Reparacion',
  LISTA: 'Lista',
  CANCELADA: 'Cancelada',
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
  greenBg: '#dcfce7',
  green700: '#166534',
  yellowBg: '#fef9c3',
  yellow800: '#854d0e',
  redBg: '#fee2e2',
  red800: '#991b1b',
  blueBg: '#dbeafe',
  blue700: '#1d4ed8',
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
  // Header
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
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  headerSubBrand: {
    color: C.slate400,
    fontSize: 7.5,
    letterSpacing: 0.3,
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
  // -- sections
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
  // -- grid helpers
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
  valueBold: {
    fontSize: 8.5,
    color: C.gray900,
    fontFamily: 'Helvetica-Bold',
  },
  valueMuted: {
    fontSize: 8.5,
    color: C.gray500,
    fontStyle: 'italic',
  },
  // -- table
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
  // -- totals
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
  // -- signature
  signatureArea: {
    flexDirection: 'row',
    marginTop: 12,
  },
  signatureBlock: {
    flex: 1,
    alignItems: 'center',
    marginRight: 20,
  },
  signatureLine: {
    height: 1,
    backgroundColor: C.gray700,
    width: '80%',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: C.gray700,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  signatureNote: {
    fontSize: 7,
    color: C.gray500,
    marginTop: 2,
  },
  // -- badge
  badge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  // -- footer
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
});

// Badge de estado

function badgeColors(estado: EstadoEquipoOrden): { bg: string; text: string } {
  switch (estado) {
    case 'RECIBIDA':
      return { bg: C.blueBg, text: C.blue700 };
    case 'EN_REPARACION':
      return { bg: C.yellowBg, text: C.yellow800 };
    case 'LISTA':
      return { bg: C.greenBg, text: C.green700 };
    case 'CANCELADA':
      return { bg: C.redBg, text: C.red800 };
  }
}

function EstadoBadgePDF({ estado }: { estado: EstadoEquipoOrden }) {
  const { bg, text } = badgeColors(estado);
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: text }]}>{ESTADO_EQUIPO_LABEL[estado]}</Text>
    </View>
  );
}

// PDF Global

export function GlobalPDFDoc({ orden }: { orden: OrdenServicio }) {
  const subtotal =
    orden.equipos?.reduce((acc, eq) => acc + Number.parseFloat(eq.subtotal ?? '0'), 0) ?? 0;
  const pago = Number.parseFloat(orden.pagoACuenta ?? '0');
  const saldo = Math.max(0, subtotal - pago);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerBrand}>SERVICIO TÉCNICO - JOSÉ GÁLVEZ</Text>
            <Text style={s.headerSubBrand}>Sistema Gestion de Taller</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.headerDocType}>ORDEN DE SERVICIO</Text>
            <Text style={s.headerCode}>{orden.codigoFormateado}</Text>
            <Text style={s.headerMeta}>Fecha: {formatDate(orden.fechaEmision)}</Text>
            {orden.usuarioTecnico && (
              <Text style={s.headerMeta}>Tec: {orden.usuarioTecnico.nombreCompleto}</Text>
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
              <Text style={s.label}>Nombre / Razon Social</Text>
              <Text style={s.value}>{orden.cliente?.nombre ?? '—'}</Text>
            </View>
            {orden.cliente?.dniRuc && (
              <View style={s.col}>
                <Text style={s.label}>DNI / RUC</Text>
                <Text style={s.value}>{orden.cliente.dniRuc}</Text>
              </View>
            )}
            {orden.cliente?.telefono && (
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Telefono</Text>
                <Text style={s.value}>{orden.cliente.telefono}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Equipos */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>EQUIPOS EN ESTA ORDEN</Text>
          </View>

          {/* Cabecera tabla */}
          <View style={s.tableHead}>
            <Text style={[s.tableHeadCell, { width: 22 }]}>#</Text>
            <Text style={[s.tableHeadCell, { flex: 2 }]}>Equipo</Text>
            <Text style={[s.tableHeadCell, { flex: 3 }]}>Problema Reportado</Text>
            <Text style={[s.tableHeadCell, { width: 72 }]}>Estado</Text>
            <Text style={[s.tableHeadCell, { width: 68, textAlign: 'right' }]}>Total</Text>
          </View>

          {/* Filas */}
          {orden.equipos?.map((eq, i) => (
            <View key={eq.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCell, { width: 22, color: C.gray500 }]}>{i + 1}</Text>
              <View style={{ flex: 2, marginRight: 8 }}>
                <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>
                  {eq.equipo?.tipoEquipo ?? '—'}
                </Text>
                {(eq.equipo?.marca || eq.equipo?.modelo) && (
                  <Text style={s.tableCellMuted}>
                    {[eq.equipo.marca, eq.equipo.modelo].filter(Boolean).join(' ')}
                  </Text>
                )}
              </View>
              <Text style={[s.tableCell, { flex: 3, color: C.gray700, marginRight: 8 }]}>
                {eq.problemaReportado || '—'}
              </Text>
              <View style={{ width: 72 }}>
                <EstadoBadgePDF estado={eq.estado} />
              </View>
              <Text
                style={[
                  s.tableCell,
                  { width: 68, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
                ]}
              >
                S/ {fmt(eq.subtotal)}
              </Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.totalsOuter}>
            <View style={s.totalRowNormal}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>S/ {fmt(subtotal)}</Text>
            </View>
            <View style={s.totalRowNormal}>
              <Text style={s.totalLabel}>Pago a cuenta</Text>
              <Text style={s.totalValue}>S/ {fmt(pago)}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalBigRow}>
              <Text style={s.totalBigLabel}>SALDO PENDIENTE</Text>
              <Text style={s.totalBigValue}>S/ {fmt(saldo)}</Text>
            </View>
          </View>
        </View>

        {/* Footer fijo */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {orden.codigoFormateado} — Generado el {formatDate(new Date().toISOString())}
          </Text>
          <Text style={s.footerText}>Sistema Taller · Documento interno</Text>
        </View>
      </Page>
    </Document>
  );
}

// PDF por equipo - TICKET DE EQUIPO

export function EquipoPDFDoc({
  orden,
  equipoOrden,
}: {
  orden: OrdenServicio;
  equipoOrden: EquipoOrden;
}) {
  const total = Number.parseFloat(equipoOrden.subtotal ?? '0');

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerBrand}>SERVICIO TÉCNICO - JOSÉ GALVÉZ</Text>
            <Text style={s.headerSubBrand}>Sistema Gestión de Taller</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.headerDocType}>TICKET DE EQUIPO</Text>
            <Text style={s.headerCode}>{orden.codigoFormateado}</Text>
            <Text style={s.headerMeta}>Fecha: {formatDate(orden.fechaEmision)}</Text>
            {orden.usuarioTecnico && (
              <Text style={s.headerMeta}>Tec: {orden.usuarioTecnico.nombreCompleto}</Text>
            )}
          </View>
        </View>

        {/* Cliente + Equipo en 2 columnas */}
        <View style={[s.row2, { marginBottom: 12 }]}>
          {/* Cliente */}
          <View style={[s.section, { flex: 1, marginBottom: 0, marginRight: 10 }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>CLIENTE</Text>
            </View>
            <View style={s.sectionBody}>
              <Text style={s.label}>Nombre</Text>
              <Text style={[s.value, { marginBottom: 8 }]}>{orden.cliente?.nombre ?? '—'}</Text>
              {orden.cliente?.dniRuc && (
                <>
                  <Text style={s.label}>DNI / RUC</Text>
                  <Text style={[s.value, { marginBottom: 8 }]}>{orden.cliente.dniRuc}</Text>
                </>
              )}
              {orden.cliente?.telefono && (
                <>
                  <Text style={s.label}>Telefono</Text>
                  <Text style={s.value}>{orden.cliente.telefono}</Text>
                </>
              )}
            </View>
          </View>

          {/* Equipo */}
          <View style={[s.section, { flex: 1.4, marginBottom: 0 }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>DATOS DEL EQUIPO</Text>
            </View>
            <View style={s.sectionBody}>
              <View style={[s.row2, { marginBottom: 8 }]}>
                <View style={s.col}>
                  <Text style={s.label}>Tipo</Text>
                  <Text style={s.value}>{equipoOrden.equipo?.tipoEquipo ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Estado</Text>
                  <EstadoBadgePDF estado={equipoOrden.estado} />
                </View>
              </View>
              <View style={[s.row2, { marginBottom: equipoOrden.equipo?.numeroSerie ? 8 : 0 }]}>
                <View style={s.col}>
                  <Text style={s.label}>Marca</Text>
                  <Text style={s.value}>{equipoOrden.equipo?.marca ?? '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Modelo</Text>
                  <Text style={s.value}>{equipoOrden.equipo?.modelo ?? '—'}</Text>
                </View>
              </View>
              {equipoOrden.equipo?.numeroSerie && (
                <View>
                  <Text style={s.label}>N de Serie</Text>
                  <Text style={s.valueBold}>{equipoOrden.equipo.numeroSerie}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Detalles del servicio */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>DETALLES DEL SERVICIO</Text>
          </View>
          <View style={[s.sectionBody, s.row2]}>
            <View style={s.col}>
              <Text style={s.label}>Problema Reportado</Text>
              <Text style={s.value}>{equipoOrden.problemaReportado || '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Diagnostico Tecnico</Text>
              {equipoOrden.diagnosticoTecnico ? (
                <Text style={s.value}>{equipoOrden.diagnosticoTecnico}</Text>
              ) : (
                <Text style={s.valueMuted}>Sin diagnostico registrado.</Text>
              )}
            </View>
          </View>
          {equipoOrden.costoEstimado && parseFloat(equipoOrden.costoEstimado) > 0 && (
            <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
              <Text style={s.label}>Costo Estimado</Text>
              <Text style={s.value}>S/ {fmt(equipoOrden.costoEstimado)}</Text>
            </View>
          )}
        </View>

        {/* Repuestos y Mano de Obra */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>REPUESTOS Y MANO DE OBRA</Text>
          </View>

          {!equipoOrden.items || equipoOrden.items.length === 0 ? (
            <View style={s.sectionBody}>
              <Text style={s.valueMuted}>Sin items registrados.</Text>
            </View>
          ) : (
            <>
              {/* Cabecera */}
              <View style={s.tableHead}>
                <Text style={[s.tableHeadCell, { flex: 3 }]}>Descripcion</Text>
                <Text style={[s.tableHeadCell, { width: 55 }]}>Tipo</Text>
                <Text style={[s.tableHeadCell, { width: 38, textAlign: 'right' }]}>
                  Cant.
                </Text>
                <Text style={[s.tableHeadCell, { width: 68, textAlign: 'right' }]}>
                  Unitario
                </Text>
                <Text style={[s.tableHeadCell, { width: 72, textAlign: 'right' }]}>
                  Subtotal
                </Text>
              </View>

              {/* Filas */}
              {equipoOrden.items.map((item, i) => (
                <View key={item.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                  <View style={{ flex: 3, marginRight: 8 }}>
                    <Text style={[s.tableCell, { fontFamily: 'Helvetica-Bold' }]}>
                      {item.producto?.nombre ?? '—'}
                    </Text>
                    {(item.producto?.marca || item.producto?.modelo) && (
                      <Text style={s.tableCellMuted}>
                        {[item.producto.marca, item.producto.modelo]
                          .filter(Boolean)
                          .join(' ')}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.tableCell, { width: 55, color: C.gray500 }]}>
                    {item.producto?.esServicio ? 'Servicio' : 'Repuesto'}
                  </Text>
                  <Text style={[s.tableCell, { width: 38, textAlign: 'right' }]}>
                    {item.cantidad}
                  </Text>
                  <Text style={[s.tableCell, { width: 68, textAlign: 'right' }]}>
                    S/ {fmt(item.precioUnitario)}
                  </Text>
                  <Text
                    style={[
                      s.tableCell,
                      {
                        width: 72,
                        textAlign: 'right',
                        fontFamily: 'Helvetica-Bold',
                      },
                    ]}
                  >
                    S/ {fmt(item.subtotal)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Total equipo */}
          <View style={s.totalsOuter}>
            <View style={s.totalBigRow}>
              <Text style={s.totalBigLabel}>TOTAL EQUIPO</Text>
              <Text style={s.totalBigValue}>S/ {fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer fijo */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {orden.codigoFormateado} —{' '}
            {[
              equipoOrden.equipo?.tipoEquipo,
              equipoOrden.equipo?.marca,
              equipoOrden.equipo?.modelo,
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
          <Text style={s.footerText}>
            Generado el {formatDate(new Date().toISOString())} · Sistema Taller
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Shell

type Estado = 'generando' | 'descargado' | 'error';

export function OrdenServicioPDF() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const equipoOrdenId = searchParams.get('equipo');

  const [estado, setEstado] = useState<Estado>('generando');
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    if (!id) return;
    ordenServicioService
      .getById(id)
      .then(async (orden) => {
        const equipoOrden = equipoOrdenId
          ? (orden.equipos?.find((e) => e.id === equipoOrdenId) ?? null)
          : null;

        const doc = equipoOrden ? (
          <EquipoPDFDoc orden={orden} equipoOrden={equipoOrden} />
        ) : (
          <GlobalPDFDoc orden={orden} />
        );

        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${orden.codigoFormateado}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCodigo(orden.codigoFormateado);
        setEstado('descargado');
      })
      .catch(() => setEstado('error'));
  }, [id, equipoOrdenId]);

  if (estado === 'generando') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground text-sm">
        <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
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
        ✓ <span className="font-semibold text-foreground">{codigo}.pdf</span> descargado correctamente.
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
