import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, type TableColumn } from '@/components/ui/table'
import {
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Users,
    ArrowLeft,
    Edit,
    Church,
    Shield,
    Euro
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useParams, useNavigate } from 'react-router'
import type { Hermano, Cuota } from '@/types'

export function Component() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [hermano, setHermano] = useState<Hermano | null>(null)
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHermano()
        loadCuotas()
    }, [id])

    const loadHermano = async () => {
        if (!id) return

        try {
            const hermanoData = await invoke<Hermano>('get_hermano_cmd', {
                id: parseInt(id)
            })
            setHermano(hermanoData)
        } catch (error) {
            console.error('Error al cargar hermano:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadCuotas = async () => {
        if (!id) return

        try {
            const cuotasData = await invoke<Cuota[]>(
                'get_cuotas_by_hermano_cmd',
                {
                    hermanoId: parseInt(id)
                }
            )
            setCuotas(cuotasData)
        } catch (error) {
            console.error('Error al cargar cuotas:', error)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No especificado'
        return new Date(dateString).toLocaleDateString('es-ES')
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        )
    }

    if (!hermano) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Hermano no encontrado
                </h2>
                <Button onClick={() => navigate('/hermanos')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Hermanos
                </Button>
            </div>
        )
    }

    const cuotasColumns: TableColumn<Cuota>[] = [
        {
            key: 'anio',
            label: 'Año',
            render: (value) => String(value)
        },
        {
            key: 'importe',
            label: 'Importe',
            render: (value) => `${Number(value).toFixed(2)} €`
        },
        {
            key: 'pagado',
            label: 'Estado',
            render: (_value, cuota) => (
                <span
                    className={`px-2 py-1 rounded text-xs ${
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
            label: 'Fecha de Pago',
            render: (value) => (value ? formatDate(value as string) : '-')
        },
        {
            key: 'metodo_pago',
            label: 'Método de Pago',
            render: (value) => (value as string) || '-'
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
                return '-'
            }
        }
    ]

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/hermanos')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                    <div className="flex items-center">
                        <User className="h-6 w-6 text-indigo-600 mr-3" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {hermano.nombre} {hermano.primer_apellido}{' '}
                                {hermano.segundo_apellido}
                            </h1>
                            <p className="text-sm text-gray-600">
                                Número de hermano: {hermano.numero_hermano}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            hermano.activo
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                    >
                        {hermano.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button onClick={() => navigate(`/hermanos/${id}/editar`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información Personal */}
                <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <User className="h-5 w-5 mr-2 text-indigo-600" />
                            Información Personal
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Nombre completo
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                                {hermano.nombre} {hermano.primer_apellido}{' '}
                                {hermano.segundo_apellido}
                            </p>
                        </div>

                        {hermano.dni && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    DNI
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.dni}
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Fecha de alta
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(hermano.fecha_alta)}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Datos de Nacimiento */}
                <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                            Datos de Nacimiento
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Fecha de nacimiento
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(hermano.fecha_nacimiento)}
                            </p>
                        </div>

                        {hermano.localidad_nacimiento && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Localidad de Nacimiento
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.localidad_nacimiento}
                                </p>
                            </div>
                        )}

                        {hermano.provincia_nacimiento && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Provincia de Nacimiento
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.provincia_nacimiento}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Datos de Bautismo */}
                <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Church className="h-5 w-5 mr-2 text-indigo-600" />
                            Datos de Bautismo
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {hermano.parroquia_bautismo && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Parroquia
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.parroquia_bautismo}
                                </p>
                            </div>
                        )}

                        {hermano.localidad_bautismo && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Localidad
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.localidad_bautismo}
                                </p>
                            </div>
                        )}

                        {hermano.provincia_bautismo && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Provincia
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.provincia_bautismo}
                                </p>
                            </div>
                        )}

                        {!hermano.parroquia_bautismo &&
                            !hermano.localidad_bautismo &&
                            !hermano.provincia_bautismo && (
                                <p className="text-sm text-gray-500">
                                    No hay datos de bautismo registrados
                                </p>
                            )}
                    </div>
                </Card>

                {/* Información de Contacto */}
                <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Phone className="h-5 w-5 mr-2 text-indigo-600" />
                            Información de Contacto
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                Teléfono
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                                {hermano.telefono || 'No especificado'}
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                                {hermano.email || 'No especificado'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Dirección y Domicilio */}
                <Card>
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
                            Dirección y Domicilio
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {hermano.direccion && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Dirección
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.direccion}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {hermano.localidad && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Localidad
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.localidad}
                                    </p>
                                </div>
                            )}

                            {hermano.provincia && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Provincia
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.provincia}
                                    </p>
                                </div>
                            )}
                        </div>

                        {hermano.codigo_postal && (
                            <div>
                                <label className="text-sm font-medium text-gray-700">
                                    Código Postal
                                </label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {hermano.codigo_postal}
                                </p>
                            </div>
                        )}

                        {!hermano.direccion &&
                            !hermano.localidad &&
                            !hermano.provincia &&
                            !hermano.codigo_postal && (
                                <p className="text-sm text-gray-500">
                                    No hay datos de domicilio registrados
                                </p>
                            )}
                    </div>
                </Card>

                {/* Autorización Menores */}
                {hermano.autorizacion_menores && (
                    <Card>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Shield className="h-5 w-5 mr-2 text-indigo-600" />
                                Representante Legal (Menor de Edad)
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {hermano.nombre_representante_legal && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Nombre y Apellidos
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.nombre_representante_legal}
                                    </p>
                                </div>
                            )}

                            {hermano.dni_representante_legal && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        DNI
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.dni_representante_legal}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Avales */}
                {(hermano.hermano_aval_1 || hermano.hermano_aval_2) && (
                    <Card>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                                Hermanos Avales
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {hermano.hermano_aval_1 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Hermano 1
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.hermano_aval_1}
                                    </p>
                                </div>
                            )}

                            {hermano.hermano_aval_2 && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">
                                        Hermano 2
                                    </label>
                                    <p className="mt-1 text-sm text-gray-900">
                                        {hermano.hermano_aval_2}
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Observaciones */}
                {hermano.observaciones && (
                    <Card className="lg:col-span-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Observaciones
                            </h2>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                {hermano.observaciones}
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Histórico de Cuotas */}
            <Card className="mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Euro className="h-5 w-5 mr-2 text-indigo-600" />
                        Histórico de Cuotas
                    </h2>
                </div>
                <div className="p-6">
                    {cuotas.length > 0 ? (
                        <Table
                            data={cuotas}
                            columns={cuotasColumns}
                            emptyMessage="No hay cuotas registradas para este hermano"
                        />
                    ) : (
                        <p className="text-center py-8 text-gray-500">
                            No hay cuotas registradas para este hermano
                        </p>
                    )}
                </div>
            </Card>
        </div>
    )
}
