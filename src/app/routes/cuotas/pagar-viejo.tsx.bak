import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CreditCard, User, Check, AlertCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Cuota } from '@/types'

interface Hermano {
    id: number
    nombre: string
    apellidos: string
    numero_hermano: string
}

export function Component() {
    const [cuotasPendientes, setCuotasPendientes] = useState<Cuota[]>([])
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCuotas, setSelectedCuotas] = useState<Set<number>>(new Set())
    const [metodoPago, setMetodoPago] = useState<
        'efectivo' | 'transferencia' | 'domiciliacion' | 'bizum'
    >('efectivo')
    const [isProcessing, setIsProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [yearFilter, setYearFilter] = useState<string>('')
    const [resultado, setResultado] = useState<{
        tipo: 'success' | 'error'
        mensaje: string
        cuotasPagadas?: number
    } | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [cuotas, hermanosData] = await Promise.all([
                invoke<Cuota[]>('get_cuotas_pendientes_cmd'),
                invoke<Hermano[]>('get_all_hermanos_cmd')
            ])
            setCuotasPendientes(cuotas)
            setHermanos(hermanosData)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getHermanoName = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano
            ? `${hermano.nombre} ${hermano.apellidos}`
            : 'Hermano no encontrado'
    }

    const getHermanoNumber = (hermanoId: number) => {
        const hermano = hermanos.find((h) => h.id === hermanoId)
        return hermano?.numero_hermano || '-'
    }

    const filteredCuotas = useMemo(() => {
        return cuotasPendientes.filter((cuota) => {
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
    }, [cuotasPendientes, hermanos, searchTerm, yearFilter])

    const availableYears = useMemo(() => {
        const years = [...new Set(cuotasPendientes.map((c) => c.anio))]
        return years.sort((a, b) => b - a)
    }, [cuotasPendientes])

    const handleSelectCuota = (cuotaId: number) => {
        const newSelected = new Set(selectedCuotas)
        if (newSelected.has(cuotaId)) {
            newSelected.delete(cuotaId)
        } else {
            newSelected.add(cuotaId)
        }
        setSelectedCuotas(newSelected)
    }

    const handleSelectAll = () => {
        if (selectedCuotas.size === filteredCuotas.length) {
            setSelectedCuotas(new Set())
        } else {
            setSelectedCuotas(new Set(filteredCuotas.map((c) => c.id!)))
        }
    }

    const handlePagarSeleccionadas = async () => {
        if (selectedCuotas.size === 0) {
            setResultado({
                tipo: 'error',
                mensaje: 'Selecciona al menos una cuota para pagar'
            })
            return
        }

        const cuotasSeleccionadas = filteredCuotas.filter((c) =>
            selectedCuotas.has(c.id!)
        )
        const totalImporte = cuotasSeleccionadas.reduce(
            (sum, c) => sum + c.importe,
            0
        )

        const metodoPagoLabel =
            metodoPago === 'efectivo'
                ? 'Efectivo'
                : metodoPago === 'transferencia'
                  ? 'Transferencia'
                  : metodoPago === 'bizum'
                    ? 'Bizum'
                    : 'Domiciliación'
        const confirmMessage = `¿Confirma el pago de ${selectedCuotas.size} cuotas?\n\nTotal a pagar: €${totalImporte.toFixed(2)}\nMétodo de pago: ${metodoPagoLabel}\n\nEsta acción marcará las cuotas como pagadas.`

        if (!window.confirm(confirmMessage)) {
            return
        }

        setIsProcessing(true)
        setResultado(null)

        const fechaPago = new Date().toISOString().split('T')[0]
        let cuotasPagadas = 0
        let errores = 0

        for (const cuotaId of selectedCuotas) {
            try {
                await invoke('marcar_cuota_pagada_cmd', {
                    id: cuotaId,
                    fechaPago,
                    metodoPago
                })
                cuotasPagadas++
            } catch (error) {
                console.error('Error al marcar cuota como pagada:', error)
                errores++
            }
        }

        if (errores === 0) {
            setResultado({
                tipo: 'success',
                mensaje: `Se han marcado ${cuotasPagadas} cuotas como pagadas correctamente`,
                cuotasPagadas
            })
        } else {
            setResultado({
                tipo: 'error',
                mensaje: `Se procesaron ${cuotasPagadas} cuotas correctamente, pero hubo ${errores} errores`
            })
        }

        setSelectedCuotas(new Set())
        setIsProcessing(false)

        setTimeout(() => {
            loadData()
        }, 100)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount)
    }

    if (loading) {
        return (
            <Card title="Pago de Cuotas" subtitle="Cargando...">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                        Cargando cuotas pendientes...
                    </span>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card
                title="Pago de Cuotas"
                subtitle="Gestionar el pago de cuotas pendientes"
            >
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                    Cuotas Pendientes
                                </h4>
                                <p className="text-sm text-yellow-700">
                                    Total de cuotas pendientes:{' '}
                                    <strong>{cuotasPendientes.length}</strong>{' '}
                                    por un importe de{' '}
                                    <strong>
                                        {formatCurrency(
                                            cuotasPendientes.reduce(
                                                (sum, c) => sum + c.importe,
                                                0
                                            )
                                        )}
                                    </strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Buscar hermano"
                            type="text"
                            placeholder="Nombre o número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <Select
                            label="Año"
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            options={[
                                { value: '', label: 'Todos los años' },
                                ...availableYears.map((year) => ({
                                    value: year.toString(),
                                    label: year.toString()
                                }))
                            ]}
                        />

                        <Select
                            label="Método de pago"
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
                                {
                                    value: 'bizum',
                                    label: 'Bizum'
                                }
                            ]}
                        />
                    </div>

                    {resultado && (
                        <div
                            className={`border rounded-lg p-4 ${
                                resultado.tipo === 'success'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                {resultado.tipo === 'success' ? (
                                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div>
                                    <p
                                        className={`text-sm font-medium ${
                                            resultado.tipo === 'success'
                                                ? 'text-green-800'
                                                : 'text-red-800'
                                        }`}
                                    >
                                        {resultado.mensaje}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Card
                title="Lista de Cuotas Pendientes"
                action={
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                            {selectedCuotas.size} seleccionadas
                        </span>
                        <Button
                            onClick={handleSelectAll}
                            disabled={filteredCuotas.length === 0}
                            className="bg-gray-700 text-white hover:bg-gray-800"
                        >
                            {selectedCuotas.size === filteredCuotas.length
                                ? 'Deseleccionar todas'
                                : 'Seleccionar todas'}
                        </Button>
                        <Button
                            onClick={handlePagarSeleccionadas}
                            disabled={selectedCuotas.size === 0 || isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pagar Seleccionadas ({selectedCuotas.size})
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                {filteredCuotas.length === 0 ? (
                    <div className="text-center py-8">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-500">
                            No hay cuotas pendientes que coincidan con los
                            filtros
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedCuotas.size ===
                                                    filteredCuotas.length &&
                                                filteredCuotas.length > 0
                                            }
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hermano
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Año
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Importe
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCuotas.map((cuota) => (
                                    <tr
                                        key={cuota.id}
                                        className={`hover:bg-gray-50 ${
                                            selectedCuotas.has(cuota.id!)
                                                ? 'bg-blue-50'
                                                : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedCuotas.has(
                                                    cuota.id!
                                                )}
                                                onChange={() =>
                                                    handleSelectCuota(cuota.id!)
                                                }
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="shrink-0 h-8 w-8">
                                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-gray-500" />
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {getHermanoName(
                                                            cuota.hermano_id
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Nº{' '}
                                                        {getHermanoNumber(
                                                            cuota.hermano_id
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {cuota.anio}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatCurrency(cuota.importe)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
