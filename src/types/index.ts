// Tipos principales de la aplicación
export interface Hermano extends Record<string, unknown> {
    id?: number
    numero_hermano: string
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    dni?: string
    fecha_nacimiento?: string // ISO format YYYY-MM-DD
    localidad_nacimiento?: string
    provincia_nacimiento?: string
    fecha_alta: string // ISO format YYYY-MM-DD
    familia_id?: number
    telefono?: string
    email?: string
    direccion?: string
    localidad?: string
    provincia?: string
    codigo_postal?: string
    parroquia_bautismo?: string
    localidad_bautismo?: string
    provincia_bautismo?: string
    autorizacion_menores: boolean
    nombre_representante_legal?: string
    dni_representante_legal?: string
    hermano_aval_1?: string
    hermano_aval_2?: string
    activo: boolean
    fecha_baja?: string // ISO format YYYY-MM-DD
    observaciones?: string
    created_at?: string
    updated_at?: string
}

export interface Familia extends Record<string, unknown> {
    id: number
    nombre_familia: string
    hermano_direccion_id?: number // ID del hermano que proporciona la dirección familiar
    hermanos?: Hermano[] // Lista de hermanos asociados a la familia
    created_at?: string
    updated_at?: string
}

// Interface extendida que incluye información del hermano principal
export interface FamiliaWithAddress extends Familia {
    direccion_principal?: {
        direccion?: string
        telefono?: string
        email?: string
        codigo_postal?: string
        localidad?: string
    }
}

// Interface para datos del formulario de familia
export interface FamiliaFormData {
    nombre_familia: string
    hermano_direccion_id?: number
}

// Interface para crear hermano con opción de nueva familia
export interface HermanoConFamiliaData {
    hermano: HermanoFormData
    nueva_familia_nombre?: string
}

// Interface para familia con información de dirección principal (del backend)
export interface FamiliaWithAddressResponse {
    id: number
    nombre_familia: string
    hermano_direccion_id?: number
    created_at?: string
    updated_at?: string
    direccion_principal?: {
        hermano_nombre?: string
        hermano_apellidos?: string
        direccion?: string
        telefono?: string
        email?: string
    }
}

export interface Cuota extends Record<string, unknown> {
    id?: number
    hermano_id: number
    anio: number
    importe: number
    pagado: boolean
    fecha_pago?: string // ISO format YYYY-MM-DD
    metodo_pago?: 'efectivo' | 'transferencia' | 'domiciliacion' | 'bizum'
    observaciones?: string
    recibo: boolean
    created_at?: string
    updated_at?: string
}

export interface EstadisticasCuotas {
    total_recaudado: number
    cuotas_pendientes: number
    cuotas_pagadas: number
    hermanos_al_dia: number
    hermanos_morosos: number
}

// Tipos para formularios
export interface HermanoFormData {
    numero_hermano: string
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    dni?: string
    fecha_nacimiento?: string
    localidad_nacimiento?: string
    provincia_nacimiento?: string
    fecha_alta: string
    familia_id?: number
    telefono?: string
    email?: string
    direccion?: string
    localidad?: string
    provincia?: string
    codigo_postal?: string
    parroquia_bautismo?: string
    localidad_bautismo?: string
    provincia_bautismo?: string
    autorizacion_menores: boolean
    nombre_representante_legal?: string
    dni_representante_legal?: string
    hermano_aval_1?: string
    hermano_aval_2?: string
    activo: boolean
    fecha_baja?: string
    observaciones?: string
}

export interface CuotaFormData {
    hermano_id: number
    anio: number
    importe: number
    pagado: boolean
    fecha_pago?: string
    metodo_pago?: 'efectivo' | 'transferencia' | 'domiciliacion'
    observaciones?: string
    recibo?: boolean
}

// Tipos para filtros y búsquedas
export interface HermanoFilter {
    activos?: boolean
    familia_id?: number
    search?: string
}

export interface CuotaFilter {
    anio?: number
    pagado?: boolean
    hermano_id?: number
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
}

// Tipos para el dashboard
export interface DashboardStats {
    total_hermanos: number
    hermanos_activos: number
    hermanos_inactivos: number
    nuevas_altas_mes: number
    cuotas_pendientes_anio: number
    estadisticas_cuotas: EstadisticasCuotas
}

// Tipos para navegación
export type RouteKey = 'dashboard' | 'hermanos' | 'familias' | 'cuotas'

export interface NavigationItem {
    key: RouteKey
    label: string
    path: string
    icon: string
}

// Tipos para tablas
export interface TableColumn<T> {
    key: keyof T | string
    label: string
    sortable?: boolean
    render?: (value: unknown, item: T) => React.ReactNode
}

export interface TableProps<T> {
    data: T[]
    columns: TableColumn<T>[]
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    onView?: (item: T) => void
    loading?: boolean
    emptyMessage?: string
}

// Tipos para hooks
export interface UseApiState<T> {
    data: T | null
    loading: boolean
    error: string | null
}

export interface UseApiListState<T> {
    data: T[]
    loading: boolean
    error: string | null
}

// Tipos de utilidades
export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Tipos para formularios de React Hook Form
export type FormMode = 'create' | 'edit' | 'view'

export interface FormProps<T> {
    mode: FormMode
    initialData?: T
    onSubmit: (data: T) => void
    onCancel: () => void
    loading?: boolean
}

// Tipos para notificaciones
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message?: string
    duration?: number
}

// Constantes de tipos
export const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'domiciliacion', label: 'Domiciliación' }
] as const
export type MetodoPago = (typeof METODOS_PAGO)[number]['value']
