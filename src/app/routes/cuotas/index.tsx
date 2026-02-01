import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, type TableColumn } from '@/components/ui/table'
import { Plus, Euro, User, Check, X, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'

interface Cuota extends Record<string, unknown> {
    id: number
    hermano_id: number
    anio: number
    importe: number
    pagado: boolean
    fecha_pago?: string
    metodo_pago?: string
    observaciones?: string
}

interface Hermano {
    id: number
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    numero_hermano: string
}

export function Component() {
    const navigate = useNavigate()
    const toast = useToastContext()
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroAnio, setFiltroAnio] = useState<string>(
        new Date().getFullYear().toString()
    )
    const [filtroPagado, setFiltroPagado] = useState<string>('todos')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [cuotasData, hermanosData] = await Promise.all([
                invoke<Cuota[]>('get_all_cuotas_cmd'),
                invoke<Hermano[]>('get_all_hermanos_cmd')
            ])
            setCuotas(cuotasData)
            setHermanos(hermanosData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (cuota: Cuota) => {
        if (!confirm('¿Eliminar esta cuota?')) return

        try {
            await invoke('delete_cuota_cmd', { id: cuota.id })
            loadData()
        } catch (error) {
            console.error('Error deleting cuota:', error)
            toast.error('Error al eliminar la cuota')
        }
    }

    const getHermanoNombre = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano
            ? `${hermano.nombre} ${hermano.primer_apellido} ${hermano.segundo_apellido || ''}`
            : 'Desconocido'
    }

    const getHermanoNumero = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano?.numero_hermano || '-'
    }

    const cuotasFiltradas = cuotas.filter((c) => {
        const hermanoNombre = getHermanoNombre(c.hermano_id).toLowerCase()
        const hermanoNumero = getHermanoNumero(c.hermano_id)

        const matchAnio =
            filtroAnio === 'todos' || c.anio.toString() === filtroAnio
        const matchPagado =
            filtroPagado === 'todos' ||
            (filtroPagado === 'pagado' && c.pagado) ||
            (filtroPagado === 'pendiente' && !c.pagado)
        const matchSearch =
            searchTerm === '' ||
            hermanoNombre.includes(searchTerm.toLowerCase()) ||
            hermanoNumero.includes(searchTerm)

        return matchAnio && matchPagado && matchSearch
    })

    const aniosDisponibles = Array.from(
        new Set(cuotas.map((c) => c.anio))
    ).sort((a, b) => b - a)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount)
    }

    const totalCuotas = cuotasFiltradas.length
    const cuotasPagadas = cuotasFiltradas.filter((c) => c.pagado).length
    const cuotasPendientes = totalCuotas - cuotasPagadas
    const totalImporte = cuotasFiltradas.reduce((sum, c) => sum + c.importe, 0)
    const totalPagado = cuotasFiltradas
        .filter((c) => c.pagado)
        .reduce((sum, c) => sum + c.importe, 0)
    const totalPendiente = totalImporte - totalPagado

    const columns: TableColumn<Cuota>[] = [
        {
            key: 'hermano_id',
            label: 'Hermano',
            render: (_v, cuota) => {
                const hermanoNombre = getHermanoNombre(cuota.hermano_id)
                const hermanoNumero = getHermanoNumero(cuota.hermano_id)
                return (
                    <div className="flex items-center">
                        <div className="shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-500" />
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                                {hermanoNombre}
                            </div>
                            <div className="text-sm text-gray-500">
                                Nº {hermanoNumero}
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            key: 'anio',
            label: 'Año',
            render: (value) => (
                <div className="text-sm font-medium text-gray-900">
                    {String(value)}
                </div>
            )
        },
        {
            key: 'importe',
            label: 'Importe',
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(value as number)}
                </span>
            )
        },
        {
            key: 'pagado',
            label: 'Estado',
            render: (_value, cuota) => (
                <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cuota.pagado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                >
                    {cuota.pagado ? 'Pagado' : 'Pendiente'}
                </span>
            )
        },
        {
            key: 'fecha_pago',
            label: 'Fecha Pago',
            render: (value) => (
                <span className="text-sm text-gray-500">
                    {value
                        ? new Date(value as string).toLocaleDateString('es-ES')
                        : '-'}
                </span>
            )
        },
        {
            key: 'metodo_pago',
            label: 'Método',
            render: (value) => (
                <span className="text-sm text-gray-500">
                    {(value as string) || '-'}
                </span>
            )
        }
    ]

    if (loading) {
        return (
            <Card title="Gestión de Cuotas" subtitle="Cargando...">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                        Cargando cuotas...
                    </span>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card
                title="Gestión de Cuotas"
                subtitle="Vista general de todas las cuotas"
                action={
                    <Button onClick={() => navigate('/cuotas/nueva')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Cuota
                    </Button>
                }
            >
                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">
                                    Total Cuotas
                                </p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {totalCuotas}
                                </p>
                            </div>
                            <Euro className="h-8 w-8 text-blue-400" />
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">
                                    Pagadas
                                </p>
                                <p className="text-2xl font-bold text-green-900">
                                    {cuotasPagadas}
                                </p>
                                <p className="text-xs text-green-600">
                                    {formatCurrency(totalPagado)}
                                </p>
                            </div>
                            <Check className="h-8 w-8 text-green-400" />
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 font-medium">
                                    Pendientes
                                </p>
                                <p className="text-2xl font-bold text-red-900">
                                    {cuotasPendientes}
                                </p>
                                <p className="text-xs text-red-600">
                                    {formatCurrency(totalPendiente)}
                                </p>
                            </div>
                            <X className="h-8 w-8 text-red-400" />
                        </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">
                                    Total Importe
                                </p>
                                <p className="text-2xl font-bold text-purple-900">
                                    {formatCurrency(totalImporte)}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Buscar hermano"
                        type="text"
                        placeholder="Nombre o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select
                        label="Filtrar por año"
                        value={filtroAnio}
                        onChange={(e) => setFiltroAnio(e.target.value)}
                        options={[
                            { value: 'todos', label: 'Todos los años' },
                            ...aniosDisponibles.map((a) => ({
                                value: a.toString(),
                                label: a.toString()
                            }))
                        ]}
                    />
                    <Select
                        label="Filtrar por estado"
                        value={filtroPagado}
                        onChange={(e) => setFiltroPagado(e.target.value)}
                        options={[
                            { value: 'todos', label: 'Todos' },
                            { value: 'pagado', label: 'Pagadas' },
                            { value: 'pendiente', label: 'Pendientes' }
                        ]}
                    />
                </div>
            </Card>

            <Card title="Lista de Cuotas">
                <Table
                    data={cuotasFiltradas}
                    columns={columns}
                    onEdit={(c) => navigate(`/cuotas/${c.id}/editar`)}
                    onDelete={handleDelete}
                    emptyMessage="No hay cuotas que coincidan con los filtros"
                />
            </Card>
        </div>
    )
}
