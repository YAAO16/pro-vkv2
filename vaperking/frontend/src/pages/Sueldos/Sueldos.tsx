import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axiosClient';
import { usePermisos } from '../../hooks/usePermisos';

interface Sueldo {
    id: number;
    usuario_id: number;
    usuario_nombre: string;
    sede_id: number;
    sede_nombre: string;
    mes: number;
    ano: number;
    sueldo_base: number;
    comisiones: number;
    bonificaciones: number;
    deducciones: number;
    total: number;
    estado: string;
    fecha_pago: string | null;
    observaciones: string | null;
    created_at: string;
}

interface Vendedor {
    id: number;
    nombre: string;
    sede_id: number | null;
}

interface Sede {
    id: number;
    nombre: string;
}

const Sueldos: React.FC = () => {
    const { isAdmin } = usePermisos();
    const [sueldos, setSueldos] = useState<Sueldo[]>([]);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSueldo, setEditingSueldo] = useState<Sueldo | null>(null);
    const [filtros, setFiltros] = useState({ mes: '', ano: '', sede_id: '' });
    const [formData, setFormData] = useState({
        usuario_id: '',
        sede_id: '',
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        sueldo_base: '',
        comisiones: '0',
        bonificaciones: '0',
        deducciones: '0',
        observaciones: ''
    });

    const meses = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' }
    ];

    const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        try {
            await Promise.all([
                cargarSueldos(),
                cargarVendedores(),
                cargarSedes()
            ]);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        } finally {
            setLoading(false);
        }
    };

    const cargarSueldos = async () => {
        try {
            const params = new URLSearchParams();
            if (filtros.mes) params.append('mes', filtros.mes);
            if (filtros.ano) params.append('ano', filtros.ano);
            if (filtros.sede_id) params.append('sede_id', filtros.sede_id);

            const response = await apiClient.get(`/sueldos/?${params.toString()}`);
            setSueldos(response.data);
        } catch (error) {
            console.error('Error cargando sueldos:', error);
        }
    };

    const cargarVendedores = async () => {
        try {
            const response = await apiClient.get('/sueldos/vendedores');
            setVendedores(response.data);
        } catch (error) {
            console.error('Error cargando vendedores:', error);
        }
    };

    const cargarSedes = async () => {
        try {
            const response = await apiClient.get('/sedes/');
            setSedes(response.data.sedes || []);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                usuario_id: parseInt(formData.usuario_id),
                sede_id: parseInt(formData.sede_id),
                mes: parseInt(formData.mes.toString()),
                ano: parseInt(formData.ano.toString()),
                sueldo_base: parseFloat(formData.sueldo_base),
                comisiones: parseFloat(formData.comisiones || '0'),
                bonificaciones: parseFloat(formData.bonificaciones || '0'),
                deducciones: parseFloat(formData.deducciones || '0'),
                observaciones: formData.observaciones || undefined
            };

            if (editingSueldo) {
                await apiClient.put(`/sueldos/${editingSueldo.id}`, data);
                alert('✅ Sueldo actualizado correctamente');
            } else {
                await apiClient.post('/sueldos/', data);
                alert('✅ Sueldo creado correctamente');
            }

            setShowModal(false);
            setEditingSueldo(null);
            resetForm();
            cargarSueldos();
        } catch (error: any) {
            console.error('Error guardando sueldo:', error);
            alert(error.response?.data?.detail || 'Error al guardar el sueldo');
        }
    };

    const handleAnular = async (sueldo: Sueldo) => {
        if (sueldo.estado === 'anulado') {
            alert('Este sueldo ya está anulado');
            return;
        }
        if (window.confirm(`¿Estás seguro de que deseas anular el sueldo de ${sueldo.usuario_nombre} para ${meses[sueldo.mes - 1]?.label} ${sueldo.ano}?`)) {
            try {
                await apiClient.delete(`/sueldos/${sueldo.id}`);
                alert('✅ Sueldo anulado correctamente');
                cargarSueldos();
            } catch (error: any) {
                console.error('Error anulando sueldo:', error);
                alert(error.response?.data?.detail || 'Error al anular el sueldo');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            usuario_id: '',
            sede_id: '',
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear(),
            sueldo_base: '',
            comisiones: '0',
            bonificaciones: '0',
            deducciones: '0',
            observaciones: ''
        });
    };

    const openEditModal = (sueldo: Sueldo) => {
        setEditingSueldo(sueldo);
        setFormData({
            usuario_id: sueldo.usuario_id.toString(),
            sede_id: sueldo.sede_id.toString(),
            mes: sueldo.mes,
            ano: sueldo.ano,
            sueldo_base: sueldo.sueldo_base.toString(),
            comisiones: sueldo.comisiones.toString(),
            bonificaciones: sueldo.bonificaciones.toString(),
            deducciones: sueldo.deducciones.toString(),
            observaciones: sueldo.observaciones || ''
        });
        setShowModal(true);
    };

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'pagado': return '#00ff88';
            case 'pendiente': return '#ffaa00';
            case 'anulado': return '#ff4444';
            default: return '#64748b';
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <div style={styles.loadingText}>CARGANDO SUELDOS...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={styles.accesoDenegado}>
                <h3>⛔ Acceso Denegado</h3>
                <p>Solo los administradores pueden gestionar sueldos.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>💰 SUELDOS DE VENDEDORES</h3>
                    <p style={styles.subtitle}>Gestión de sueldos y comisiones</p>
                </div>
                <button
                    onClick={() => {
                        setEditingSueldo(null);
                        resetForm();
                        setShowModal(true);
                    }}
                    style={styles.btnPrimary}
                >
                    + NUEVO SUELDO
                </button>
            </div>

            {/* Filtros */}
            <div style={styles.filtersContainer}>
                <select
                    value={filtros.mes}
                    onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
                    style={styles.filterSelect}
                >
                    <option value="">Todos los meses</option>
                    {meses.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <select
                    value={filtros.ano}
                    onChange={(e) => setFiltros({ ...filtros, ano: e.target.value })}
                    style={styles.filterSelect}
                >
                    <option value="">Todos los años</option>
                    {anos.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <select
                    value={filtros.sede_id}
                    onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })}
                    style={styles.filterSelect}
                >
                    <option value="">Todas las sedes</option>
                    {sedes.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                </select>
                <button onClick={cargarSueldos} style={styles.filterButton}>
                    🔍 Filtrar
                </button>
                <span style={styles.resultCount}>{sueldos.length} registros</span>
            </div>

            {/* Tabla */}
            <div style={styles.tableContainer}>
                {sueldos.length === 0 ? (
                    <div style={styles.emptyState}>No hay sueldos registrados</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Vendedor</th>
                                <th style={styles.th}>Sede</th>
                                <th style={styles.th}>Mes/Año</th>
                                <th style={styles.th}>Base</th>
                                <th style={styles.th}>Comisiones</th>
                                <th style={styles.th}>Bonif.</th>
                                <th style={styles.th}>Deducc.</th>
                                <th style={styles.th}>Total</th>
                                <th style={styles.th}>Estado</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sueldos.map((s) => (
                                <tr key={s.id} style={styles.tableRow}>
                                    <td style={styles.td}>{s.usuario_nombre}</td>
                                    <td style={styles.td}>{s.sede_nombre}</td>
                                    <td style={styles.td}>
                                        {meses.find(m => m.value === s.mes)?.label} {s.ano}
                                    </td>
                                    <td style={styles.td}>${formatearMoneda(s.sueldo_base)}</td>
                                    <td style={styles.td}>${formatearMoneda(s.comisiones)}</td>
                                    <td style={styles.td}>${formatearMoneda(s.bonificaciones)}</td>
                                    <td style={styles.td}>${formatearMoneda(s.deducciones)}</td>
                                    <td style={{ ...styles.td, color: '#00ff88', fontWeight: 'bold' }}>
                                        ${formatearMoneda(s.total)}
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.estadoBadge,
                                            color: getEstadoColor(s.estado),
                                            background: `${getEstadoColor(s.estado)}22`
                                        }}>
                                            {s.estado.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => openEditModal(s)}
                                            style={styles.actionBtn}
                                            title="Editar sueldo"
                                        >
                                            ✏️
                                        </button>
                                        {s.estado !== 'anulado' && (
                                            <button
                                                onClick={() => handleAnular(s)}
                                                style={{ ...styles.actionBtn, ...styles.actionDelete }}
                                                title="Anular sueldo"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Sueldo */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {editingSueldo ? '✏️ EDITAR SUELDO' : '➕ NUEVO SUELDO'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingSueldo(null);
                                }}
                                style={styles.modalClose}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>VENDEDOR *</label>
                                    <select
                                        value={formData.usuario_id}
                                        onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                                        style={styles.formSelect}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {vendedores.map(v => (
                                            <option key={v.id} value={v.id}>{v.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>SEDE *</label>
                                    <select
                                        value={formData.sede_id}
                                        onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                                        style={styles.formSelect}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {sedes.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>MES *</label>
                                    <select
                                        value={formData.mes}
                                        onChange={(e) => setFormData({ ...formData, mes: parseInt(e.target.value) })}
                                        style={styles.formSelect}
                                    >
                                        {meses.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>AÑO *</label>
                                    <select
                                        value={formData.ano}
                                        onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                                        style={styles.formSelect}
                                    >
                                        {anos.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>SUELDO BASE *</label>
                                    <input
                                        type="number"
                                        value={formData.sueldo_base}
                                        onChange={(e) => setFormData({ ...formData, sueldo_base: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="10000"
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>COMISIONES</label>
                                    <input
                                        type="number"
                                        value={formData.comisiones}
                                        onChange={(e) => setFormData({ ...formData, comisiones: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="1000"
                                    />
                                </div>
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>BONIFICACIONES</label>
                                    <input
                                        type="number"
                                        value={formData.bonificaciones}
                                        onChange={(e) => setFormData({ ...formData, bonificaciones: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="1000"
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>DEDUCCIONES</label>
                                    <input
                                        type="number"
                                        value={formData.deducciones}
                                        onChange={(e) => setFormData({ ...formData, deducciones: e.target.value })}
                                        style={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        step="1000"
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>OBSERVACIONES</label>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    style={styles.formTextarea}
                                    placeholder="Observaciones adicionales..."
                                    rows={2}
                                />
                            </div>

                            <div style={styles.totalPreview}>
                                <span>Total calculado:</span>
                                <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                                    ${formatearMoneda(
                                        (parseFloat(formData.sueldo_base) || 0) +
                                        (parseFloat(formData.comisiones) || 0) +
                                        (parseFloat(formData.bonificaciones) || 0) -
                                        (parseFloat(formData.deducciones) || 0)
                                    )}
                                </span>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingSueldo(null);
                                }}
                                style={styles.btnCancel}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSubmit}
                                style={styles.btnSave}
                            >
                                {editingSueldo ? 'ACTUALIZAR' : 'CREAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============= ESTILOS =============
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '0.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        gap: '1rem',
    },
    loadingSpinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #1a1a1a',
        borderTop: '3px solid #00ff88',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        color: '#00ff88',
        fontSize: '1.2rem',
        letterSpacing: '2px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
    },
    title: {
        color: '#00ff88',
        fontSize: '1.3rem',
        margin: 0,
    },
    subtitle: {
        color: '#64748b',
        fontSize: '0.8rem',
        margin: '0.25rem 0 0 0',
    },
    btnPrimary: {
        background: '#00ff88',
        color: '#0a0a0a',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.8rem',
    },
    filtersContainer: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    filterSelect: {
        padding: '0.5rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.8rem',
        minWidth: '140px',
    },
    filterButton: {
        padding: '0.5rem 1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '0.47rem',
        color: '#00ff88',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
    resultCount: {
        color: '#64748b',
        fontSize: '0.75rem',
        marginLeft: 'auto',
    },
    tableContainer: {
        overflow: 'auto',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        background: '#0f0f0f',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8rem',
    },
    tableHeader: {
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a',
    },
    th: {
        padding: '0.7rem 0.5rem',
        textAlign: 'left',
        color: '#64748b',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '600',
        position: 'sticky',
        top: 0,
        background: '#0a0a0a',
        zIndex: 1,
    },
    td: {
        padding: '0.5rem 0.5rem',
        borderBottom: '1px solid #1a1a1a',
        fontSize: '0.75rem',
        verticalAlign: 'middle',
    },
    tableRow: {
        transition: 'background 0.2s ease',
    },
    emptyState: {
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem',
    },
    estadoBadge: {
        padding: '0.15rem 0.5rem',
        borderRadius: '0.23rem',
        fontSize: '0.6rem',
        fontWeight: '600',
        display: 'inline-block',
    },
    actionBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.25rem',
        transition: 'transform 0.2s ease',
        margin: '0 0.15rem',
    },
    actionDelete: {
        color: '#ff4444',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
    },
    modalContent: {
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: '0.95rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        animation: 'fadeIn 0.3s ease',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 1.5rem',
        borderBottom: '1px solid #1a1a1a',
        position: 'sticky',
        top: 0,
        background: '#0f0f0f',
        zIndex: 1,
    },
    modalTitle: {
        color: '#00ff88',
        fontSize: '1.1rem',
        margin: 0,
    },
    modalClose: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: '1.2rem',
        cursor: 'pointer',
        padding: '0.25rem',
    },
    modalBody: {
        padding: '1.5rem',
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #1a1a1a',
        position: 'sticky',
        bottom: 0,
        background: '#0f0f0f',
    },
    formGroup: {
        marginBottom: '1rem',
        flex: 1,
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
    },
    formLabel: {
        display: 'block',
        color: '#94a3b8',
        fontSize: '0.7rem',
        marginBottom: '0.25rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    formInput: {
        width: '100%',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
    },
    formSelect: {
        width: '100%',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
    },
    formTextarea: {
        width: '100%',
        padding: '0.5rem 0.7rem',
        background: '#1a1a1a',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        minHeight: '60px',
    },
    btnCancel: {
        padding: '0.5rem 1.5rem',
        background: 'transparent',
        border: '1px solid #1e293b',
        borderRadius: '0.47rem',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'all 0.2s ease',
    },
    btnSave: {
        padding: '0.5rem 1.5rem',
        background: '#00ff88',
        color: '#0a0a0a',
        border: 'none',
        borderRadius: '0.47rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
    },
    totalPreview: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: '#1a1a1a',
        borderRadius: '0.47rem',
        marginTop: '0.5rem',
        color: '#94a3b8',
        fontSize: '0.85rem',
    },
    accesoDenegado: {
        padding: '2rem',
        textAlign: 'center',
        color: '#ff4444',
    },
};

export default Sueldos;