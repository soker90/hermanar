import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, type TableColumn } from '@/components/ui/table'
import {
    CreditCard,
    Users,
    Calculator,
    TrendingUp,
    Plus,
    Euro,
    User,
    Check,
    X,
    History
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { GenerarCuotas } from './generar'
import { useNavigate, useSearchParams } from 'react-router'
import type { Cuota } from '@/types'
import { useToastContext } from '@/contexts/toast-context'

interface Hermano {
    id: number
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    numero_hermano: string
}

type TabType = 'resumen' | 'generar' | 'historico'

export function Component() {
    const navigate = useNavigate()
    const toast = useToastContext()
    const [searchParams, setSearchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<TabType>(
        (searchParams.get('tab') as TabType) || 'resumen'
    )
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [cuotasPendientes, setCuotasPendientes] = useState<Cuota[]>([])
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

    useEffect(() => {
        const tab = searchParams.get('tab') as TabType
        if (
            tab &&
            (tab === 'resumen' || tab === 'generar' || tab === 'historico')
        ) {
            setActiveTab(tab)
        }
    }, [searchParams])

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab)
        setSearchParams({ tab })
    }

    const loadData = async () => {
        try {
            const [cuotasData, pendientesData, hermanosData] =
                await Promise.all([
                    invoke<Cuota[]>('get_all_cuotas_cmd'),
                    invoke<Cuota[]>('get_cuotas_pendientes_cmd'),
                    invoke<Hermano[]>('get_all_hermanos_cmd')
                ])
            setCuotas(cuotasData)
            setCuotasPendientes(pendientesData)
            setHermanos(hermanosData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCuotasGenerated = () => {
        loadData()
        handleTabChange('resumen')
    }

    const currentYear = new Date().getFullYear()
    const cuotasCurrentYear = cuotas.filter((c) => c.anio === currentYear)
    const cuotasPagadasCurrentYear = cuotasCurrentYear.filter((c) => c.pagado)
    const ingresosTotales = cuotasPagadasCurrentYear.reduce(
        (sum, c) => sum + c.importe,
        0
    )
    const importePendiente = cuotasPendientes.reduce(
        (sum, c) => sum + c.importe,
        0
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount)
    }

    const tabs = [
        {
            id: 'resumen' as TabType,
            label: 'Resumen',
            icon: TrendingUp
        },
        {
            id: 'generar' as TabType,
            label: 'Generar Cuotas',
            icon: Users
        },
        {
            id: 'historico' as TabType,
            label: 'Histórico',
            icon: History
        }
    ]

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

    const totalCuotasHistorico = cuotasFiltradas.length
    const cuotasPagadasHistorico = cuotasFiltradas.filter(
        (c) => c.pagado
    ).length
    const cuotasPendientesHistorico =
        totalCuotasHistorico - cuotasPagadasHistorico
    const totalImporteHistorico = cuotasFiltradas.reduce(
        (sum, c) => sum + c.importe,
        0
    )

    const columnsHistorico: TableColumn<Cuota>[] = [
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
        },
        {
            key: 'observaciones',
            label: 'Observaciones',
            render: (value) => {
                if (value) {
                    return (
                        <span className="text-xs text-blue-600">
                            {value as string}
                        </span>
                    )
                }
                return <span className="text-xs text-gray-400">-</span>
            }
        }
    ]

    const renderContent = () => {
        switch (activeTab) {
            case 'generar':
                return (
                    <GenerarCuotas onCuotasGenerated={handleCuotasGenerated} />
                )
            case 'historico':
                if (loading) {
                    return (
                        <Card
                            title="Histórico de Cuotas"
                            subtitle="Cargando..."
                        >
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
                            title="Histórico de Cuotas"
                            subtitle="Vista general de todas las cuotas"
                            action={
                                <Button
                                    onClick={() => navigate('/cuotas/nueva')}
                                >
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
                                                {totalCuotasHistorico}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Calculator className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-green-600 font-medium">
                                                Pagadas
                                            </p>
                                            <p className="text-2xl font-bold text-green-900">
                                                {cuotasPagadasHistorico}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <Check className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-red-600 font-medium">
                                                Pendientes
                                            </p>
                                            <p className="text-2xl font-bold text-red-900">
                                                {cuotasPendientesHistorico}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                            <X className="w-6 h-6 text-red-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-purple-600 font-medium">
                                                Total Importe
                                            </p>
                                            <p className="text-2xl font-bold text-purple-900">
                                                {formatCurrency(
                                                    totalImporteHistorico
                                                )}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Euro className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Filtros */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <Input
                                        label="Buscar hermano"
                                        type="text"
                                        placeholder="Nombre o número..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <Select
                                        label="Filtrar por año"
                                        value={filtroAnio}
                                        onChange={(e) =>
                                            setFiltroAnio(e.target.value)
                                        }
                                        options={[
                                            {
                                                value: 'todos',
                                                label: 'Todos los años'
                                            },
                                            ...aniosDisponibles.map((a) => ({
                                                value: a.toString(),
                                                label: a.toString()
                                            }))
                                        ]}
                                    />
                                </div>
                                <div>
                                    <Select
                                        label="Filtrar por estado"
                                        value={filtroPagado}
                                        onChange={(e) =>
                                            setFiltroPagado(e.target.value)
                                        }
                                        options={[
                                            { value: 'todos', label: 'Todos' },
                                            {
                                                value: 'pagado',
                                                label: 'Pagadas'
                                            },
                                            {
                                                value: 'pendiente',
                                                label: 'Pendientes'
                                            }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Tabla */}
                            <Table
                                data={cuotasFiltradas}
                                columns={columnsHistorico}
                                onEdit={(cuota) =>
                                    navigate(
                                        `/cuotas/${cuota.id}/editar?returnTab=${activeTab}`
                                    )
                                }
                                onDelete={handleDelete}
                            />
                        </Card>
                    </div>
                )
            case 'resumen':
            default:
                return (
                    <div className="space-y-6">
                        <Card
                            title={`Resumen del Año ${currentYear}`}
                            subtitle="Estadísticas de cuotas del año actual"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-blue-600">
                                                Total Cuotas
                                            </p>
                                            <p className="text-2xl font-bold text-blue-900">
                                                {cuotasCurrentYear.length}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Calculator className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-600">
                                                Cuotas Pagadas
                                            </p>
                                            <p className="text-2xl font-bold text-green-900">
                                                {
                                                    cuotasPagadasCurrentYear.length
                                                }
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-yellow-600">
                                                Cuotas Pendientes
                                            </p>
                                            <p className="text-2xl font-bold text-yellow-900">
                                                {cuotasPendientes.length}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <Users className="w-6 h-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-600">
                                                Ingresos Totales
                                            </p>
                                            <p className="text-2xl font-bold text-purple-900">
                                                {formatCurrency(
                                                    ingresosTotales
                                                )}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                                        Porcentaje de Cobro
                                    </h4>
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{
                                                    width: `${
                                                        cuotasCurrentYear.length >
                                                        0
                                                            ? (cuotasPagadasCurrentYear.length /
                                                                  cuotasCurrentYear.length) *
                                                              100
                                                            : 0
                                                    }%`
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {cuotasCurrentYear.length > 0
                                                ? Math.round(
                                                      (cuotasPagadasCurrentYear.length /
                                                          cuotasCurrentYear.length) *
                                                          100
                                                  )
                                                : 0}
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                                        Importe Pendiente
                                    </h4>
                                    <p className="text-lg font-semibold text-red-600">
                                        {formatCurrency(importePendiente)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card
                            title="Acciones Rápidas"
                            subtitle="Gestiona las cuotas de forma rápida y eficiente"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Button
                                    onClick={() => handleTabChange('generar')}
                                    className="h-20 bg-blue-600 hover:bg-blue-700 flex flex-col items-center justify-center space-y-2"
                                >
                                    <Users className="w-6 h-6" />
                                    <span>
                                        Generar Cuotas Anuales {currentYear}
                                    </span>
                                </Button>

                                <Button
                                    onClick={() => navigate('/cuotas/pagar')}
                                    className={`h-20 flex flex-col items-center justify-center space-y-2 ${
                                        cuotasPendientes.length > 0
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-gray-400'
                                    }`}
                                    disabled={cuotasPendientes.length === 0}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span>
                                        {cuotasPendientes.length > 0
                                            ? `Gestionar ${cuotasPendientes.length} Cuotas Pendientes`
                                            : 'No hay cuotas pendientes'}
                                    </span>
                                </Button>
                            </div>
                        </Card>

                        <Card
                            title="Información del Año Actual"
                            subtitle={`Gestión de cuotas anuales ${currentYear}`}
                        >
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Calculator className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-800 mb-1">
                                            Año {currentYear}
                                        </h4>
                                        <p className="text-sm text-blue-700">
                                            Gestión de cuotas anuales
                                        </p>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-blue-700">
                                                <strong>Cuotas del año:</strong>{' '}
                                                {cuotasCurrentYear.length}
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                <strong>Pagadas:</strong>{' '}
                                                {
                                                    cuotasPagadasCurrentYear.length
                                                }
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                <strong>Pendientes:</strong>{' '}
                                                {cuotasCurrentYear.length -
                                                    cuotasPagadasCurrentYear.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Gestión de Cuotas
                </h1>
                <p className="text-gray-600">
                    Genera cuotas automáticamente y gestiona los pagos de forma
                    eficiente
                </p>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div>{renderContent()}</div>
        </div>
    )
}
