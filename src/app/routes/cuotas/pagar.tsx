import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
    CreditCard,
    User,
    Users,
    Check,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Cuota, Familia } from '@/types'

interface Hermano {
    id: number
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    numero_hermano: string
    familia_id?: number
    activo: boolean
    telefono?: string
    direccion?: string
    localidad?: string
    provincia?: string
    codigo_postal?: string
}

interface CuotaFamiliar {
    familia_id: number
    familia_nombre: string
    anio: number
    total_importe: number
    num_hermanos: number
    cuotas: Cuota[]
    hermanos: Hermano[]
    hermano_direccion_id?: number
    direccion?: string
    telefono?: string
    localidad?: string
}

export function Component() {
    const [cuotasPendientes, setCuotasPendientes] = useState<Cuota[]>([])
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [familias, setFamilias] = useState<Familia[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [expandedFamilias, setExpandedFamilias] = useState<Set<string>>(
        new Set()
    )
    const [metodoPago, setMetodoPago] = useState<
        'efectivo' | 'transferencia' | 'domiciliacion' | 'bizum'
    >('efectivo')
    const [isProcessing, setIsProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [yearFilter, setYearFilter] = useState<string>('')
    const [resultado, setResultado] = useState<{
        tipo: 'success' | 'error'
        mensaje: string
    } | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [cuotas, hermanosData, familiasData] = await Promise.all([
                invoke<Cuota[]>('get_cuotas_pendientes_cmd'),
                invoke<Hermano[]>('get_all_hermanos_cmd'),
                invoke<Familia[]>('get_all_familias_cmd')
            ])
            setCuotasPendientes(cuotas)
            setHermanos(hermanosData)
            setFamilias(familiasData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getHermanoName = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano
            ? `${hermano.nombre} ${hermano.primer_apellido} ${hermano.segundo_apellido || ''}`
            : 'Hermano no encontrado'
    }

    const getHermanoNumber = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano?.numero_hermano || '-'
    }

    // Agrupar cuotas por familias y hermanos sin familia
    const { cuotasFamiliares, cuotasIndividuales } = useMemo(() => {
        const cuotasFiltradas = cuotasPendientes.filter((cuota) => {
            const hermanoName = getHermanoName(cuota.hermano_id).toLowerCase()
            const hermanoNumber = getHermanoNumber(cuota.hermano_id).toString()

            const matchesSearch =
                searchTerm === '' ||
                hermanoName.includes(searchTerm.toLowerCase()) ||
                hermanoNumber.includes(searchTerm)

            const matchesYear =
                yearFilter === '' || cuota.anio.toString() === yearFilter

            return matchesSearch && matchesYear
        })

        const gruposFamiliares = new Map<string, CuotaFamiliar>()
        const individuales: Cuota[] = []

        cuotasFiltradas.forEach((cuota) => {
            const hermano = hermanos.find((h) => h.id === cuota.hermano_id)

            if (hermano && hermano.familia_id) {
                const key = `${hermano.familia_id}-${cuota.anio}`

                if (!gruposFamiliares.has(key)) {
                    const familia = familias.find(
                        (f) => f.id === hermano.familia_id
                    )

                    // Obtener datos del hermano con dirección principal
                    let hermano_direccion_principal = null
                    if (familia?.hermano_direccion_id) {
                        hermano_direccion_principal = hermanos.find(
                            (h) => h.id === familia.hermano_direccion_id
                        )
                    }

                    gruposFamiliares.set(key, {
                        familia_id: hermano.familia_id,
                        familia_nombre:
                            familia?.nombre_familia || 'Familia sin nombre',
                        anio: cuota.anio,
                        total_importe: 0,
                        num_hermanos: 0,
                        cuotas: [],
                        hermanos: [],
                        hermano_direccion_id: familia?.hermano_direccion_id,
                        direccion: hermano_direccion_principal?.direccion,
                        telefono: hermano_direccion_principal?.telefono,
                        localidad: hermano_direccion_principal?.localidad
                    })
                }

                const grupo = gruposFamiliares.get(key)!
                grupo.total_importe += cuota.importe
                grupo.cuotas.push(cuota)

                // Agregar hermano si no está en la lista
                if (!grupo.hermanos.find((h) => h.id === hermano.id)) {
                    grupo.hermanos.push(hermano)
                }
            } else {
                individuales.push(cuota)
            }
        })

        // Actualizar num_hermanos
        gruposFamiliares.forEach((grupo) => {
            grupo.num_hermanos = grupo.hermanos.length
        })

        return {
            cuotasFamiliares: Array.from(gruposFamiliares.values()),
            cuotasIndividuales: individuales
        }
    }, [cuotasPendientes, hermanos, familias, searchTerm, yearFilter])

    const totalSeleccionado = useMemo(() => {
        let total = 0

        selectedItems.forEach((id) => {
            if (id.startsWith('familia-')) {
                const [, familiaId, anio] = id.split('-')
                const cuotaFamiliar = cuotasFamiliares.find(
                    (cf) =>
                        cf.familia_id === parseInt(familiaId) &&
                        cf.anio === parseInt(anio)
                )
                if (cuotaFamiliar) {
                    total += cuotaFamiliar.total_importe
                }
            } else if (id.startsWith('cuota-')) {
                const cuotaId = parseInt(id.split('-')[1])
                const cuota = cuotasIndividuales.find((c) => c.id === cuotaId)
                if (cuota) {
                    total += cuota.importe
                }
            }
        })

        return total
    }, [selectedItems, cuotasFamiliares, cuotasIndividuales])

    const handleSelectItem = (id: string) => {
        setSelectedItems((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const handleSelectAll = () => {
        const allIds = [
            ...cuotasFamiliares.map(
                (cf) => `familia-${cf.familia_id}-${cf.anio}`
            ),
            ...cuotasIndividuales.map((c) => `cuota-${c.id}`)
        ]

        if (selectedItems.size === allIds.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(allIds))
        }
    }

    const toggleFamiliaExpanded = (id: string) => {
        setExpandedFamilias((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const handleProcesarPagos = async () => {
        if (selectedItems.size === 0) {
            setResultado({
                tipo: 'error',
                mensaje: 'Selecciona al menos una cuota para procesar'
            })
            return
        }

        setIsProcessing(true)
        setResultado(null)

        try {
            const today = new Date().toISOString().split('T')[0]
            let totalProcesadas = 0

            // Procesar pagos familiares
            for (const id of Array.from(selectedItems)) {
                if (id.startsWith('familia-')) {
                    const [, familiaId, anio] = id.split('-')
                    const cuotaFamiliar = cuotasFamiliares.find(
                        (cf) =>
                            cf.familia_id === parseInt(familiaId) &&
                            cf.anio === parseInt(anio)
                    )

                    if (cuotaFamiliar) {
                        const resultado = await invoke<number>(
                            'pagar_cuotas_familia_cmd',
                            {
                                familiaId: parseInt(familiaId),
                                anio: parseInt(anio),
                                fechaPago: today,
                                metodoPago
                            }
                        )
                        totalProcesadas += resultado
                    }
                }
            }

            // Procesar pagos individuales
            for (const id of Array.from(selectedItems)) {
                if (id.startsWith('cuota-')) {
                    const cuotaId = parseInt(id.split('-')[1])
                    await invoke('marcar_cuota_pagada_cmd', {
                        id: cuotaId,
                        fechaPago: today,
                        metodoPago
                    })
                    totalProcesadas++
                }
            }

            setResultado({
                tipo: 'success',
                mensaje: `${totalProcesadas} cuota${totalProcesadas !== 1 ? 's' : ''} procesada${totalProcesadas !== 1 ? 's' : ''} correctamente`
            })

            setSelectedItems(new Set())
            await loadData()
        } catch (error) {
            console.error('Error procesando pagos:', error)
            setResultado({
                tipo: 'error',
                mensaje: `Error al procesar los pagos: ${error}`
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const years = useMemo(() => {
        const yearsSet = new Set<number>()
        cuotasPendientes.forEach((c) => yearsSet.add(c.anio))
        return Array.from(yearsSet).sort((a, b) => b - a)
    }, [cuotasPendientes])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="text-lg">Cargando cuotas pendientes...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Pagar Cuotas</h1>
                    <p className="text-gray-600 mt-1">
                        Gestión de pagos de cuotas pendientes
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Buscar hermano
                        </label>
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Año
                        </label>
                        <Select
                            options={[
                                { value: '', label: 'Todos los años' },
                                ...years.map((year) => ({
                                    value: year.toString(),
                                    label: year.toString()
                                }))
                            ]}
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Método de pago
                        </label>
                        <Select
                            options={[
                                { value: 'efectivo', label: 'Efectivo' },
                                {
                                    value: 'transferencia',
                                    label: 'Transferencia'
                                },
                                {
                                    value: 'domiciliacion',
                                    label: 'Domiciliación'
                                },
                                { value: 'bizum', label: 'Bizum' }
                            ]}
                            value={metodoPago}
                            onChange={(e) =>
                                setMetodoPago(
                                    e.target.value as
                                        | 'efectivo'
                                        | 'transferencia'
                                        | 'domiciliacion'
                                        | 'bizum'
                                )
                            }
                        />
                    </div>
                </div>
            </Card>

            {/* Resumen de selección */}
            <Card className="p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div>
                            <div className="text-sm text-gray-600">
                                Total seleccionado
                            </div>
                            <div className="text-2xl font-bold">
                                {totalSeleccionado.toFixed(2)} €
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">
                                Cuotas seleccionadas
                            </div>
                            <div className="text-lg font-semibold">
                                {selectedItems.size}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSelectAll} variant="outline">
                            {selectedItems.size ===
                            cuotasFamiliares.length + cuotasIndividuales.length
                                ? 'Deseleccionar todo'
                                : 'Seleccionar todo'}
                        </Button>
                        <Button
                            onClick={handleProcesarPagos}
                            disabled={selectedItems.size === 0 || isProcessing}
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            {isProcessing ? 'Procesando...' : 'Procesar Pagos'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Mensajes de resultado */}
            {resultado && (
                <Card
                    className={`p-4 ${resultado.tipo === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                    <div className="flex items-center gap-2">
                        {resultado.tipo === 'success' ? (
                            <Check className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p
                            className={
                                resultado.tipo === 'success'
                                    ? 'text-green-800'
                                    : 'text-red-800'
                            }
                        >
                            {resultado.mensaje}
                        </p>
                    </div>
                </Card>
            )}

            {/* Cuotas Familiares */}
            {cuotasFamiliares.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Cuotas Familiares ({cuotasFamiliares.length})
                    </h2>
                    <div className="grid gap-3">
                        {cuotasFamiliares.map((cf) => {
                            const id = `familia-${cf.familia_id}-${cf.anio}`
                            const isSelected = selectedItems.has(id)
                            const isExpanded = expandedFamilias.has(id)

                            return (
                                <Card
                                    key={id}
                                    className={`p-4 cursor-pointer transition-all ${isSelected ? 'border-2 border-blue-500 bg-blue-50' : 'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <div
                                        className="flex items-center gap-4"
                                        onClick={() => handleSelectItem(id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="h-5 w-5 flex-shrink-0"
                                        />
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="min-w-[200px]">
                                                <div className="font-semibold text-lg">
                                                    {cf.familia_nombre}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Año {cf.anio} •{' '}
                                                    {cf.num_hermanos} hermano
                                                    {cf.num_hermanos !== 1
                                                        ? 's'
                                                        : ''}
                                                </div>
                                            </div>
                                            {cf.direccion && (
                                                <div className="text-sm text-gray-600 flex items-center gap-1 min-w-[200px]">
                                                    <span>📍</span>
                                                    <span className="truncate">
                                                        {cf.direccion}
                                                        {cf.localidad
                                                            ? `, ${cf.localidad}`
                                                            : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {cf.telefono && (
                                                <div className="text-sm text-gray-600 flex items-center gap-1 min-w-[120px]">
                                                    <span>📞</span>
                                                    <span>{cf.telefono}</span>
                                                </div>
                                            )}
                                            <div className="ml-auto text-right flex-shrink-0">
                                                <div className="text-2xl font-bold">
                                                    {cf.total_importe.toFixed(
                                                        2
                                                    )}{' '}
                                                    €
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleFamiliaExpanded(id)
                                            }}
                                            className="flex-shrink-0"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-5 w-5" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Lista de hermanos */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t">
                                            <h4 className="text-sm font-medium mb-3 text-gray-700">
                                                Hermanos incluidos:
                                            </h4>
                                            <div className="space-y-2">
                                                {cf.hermanos.map((hermano) => {
                                                    const cuotaHermano =
                                                        cf.cuotas.find(
                                                            (c) =>
                                                                c.hermano_id ===
                                                                hermano.id
                                                        )
                                                    return (
                                                        <div
                                                            key={hermano.id}
                                                            className="flex items-center justify-between bg-white p-2 rounded border"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <User className="h-4 w-4 text-gray-400" />
                                                                <div>
                                                                    <div className="font-medium text-sm">
                                                                        {
                                                                            hermano.nombre
                                                                        }{' '}
                                                                        {
                                                                            hermano.primer_apellido
                                                                        }{' '}
                                                                        {hermano.segundo_apellido ||
                                                                            ''}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Nº{' '}
                                                                        {
                                                                            hermano.numero_hermano
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-semibold">
                                                                {cuotaHermano?.importe.toFixed(
                                                                    2
                                                                )}{' '}
                                                                €
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Cuotas Individuales */}
            {cuotasIndividuales.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Cuotas Individuales ({cuotasIndividuales.length})
                    </h2>
                    <div className="grid gap-3">
                        {cuotasIndividuales.map((cuota) => {
                            const id = `cuota-${cuota.id}`
                            const isSelected = selectedItems.has(id)

                            return (
                                <Card
                                    key={id}
                                    className={`p-4 transition-all cursor-pointer ${isSelected ? 'border-2 border-blue-500 bg-blue-50' : 'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <div
                                        className="flex items-center gap-4"
                                        onClick={() => handleSelectItem(id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="h-5 w-5 flex-shrink-0"
                                        />
                                        {(() => {
                                            const hermano = hermanos.find(
                                                (h) => h.id === cuota.hermano_id
                                            )
                                            return (
                                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                                    <div className="min-w-[200px]">
                                                        <div className="font-semibold">
                                                            {getHermanoName(
                                                                cuota.hermano_id
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            Nº{' '}
                                                            {getHermanoNumber(
                                                                cuota.hermano_id
                                                            )}{' '}
                                                            • Año {cuota.anio}
                                                        </div>
                                                    </div>
                                                    {hermano?.direccion && (
                                                        <div className="text-sm text-gray-600 flex items-center gap-1 min-w-[200px]">
                                                            <span>📍</span>
                                                            <span className="truncate">
                                                                {
                                                                    hermano.direccion
                                                                }
                                                                {hermano.localidad
                                                                    ? `, ${hermano.localidad}`
                                                                    : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {hermano?.telefono && (
                                                        <div className="text-sm text-gray-600 flex items-center gap-1 min-w-[120px]">
                                                            <span>📞</span>
                                                            <span>
                                                                {
                                                                    hermano.telefono
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="ml-auto text-right flex-shrink-0">
                                                        <div className="text-xl font-bold">
                                                            {cuota.importe.toFixed(
                                                                2
                                                            )}{' '}
                                                            €
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {cuotasPendientes.length === 0 && (
                <Card className="p-8 text-center">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-semibold mb-2">
                        ¡No hay cuotas pendientes!
                    </h3>
                    <p className="text-gray-600">
                        Todas las cuotas están al día
                    </p>
                </Card>
            )}
        </div>
    )
}
