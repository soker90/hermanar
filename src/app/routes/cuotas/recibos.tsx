import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, type TableColumn } from '@/components/ui/table'
import {
    FileText,
    Printer,
    CheckSquare,
    Square,
    FolderOpen
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'
import type { Cuota } from '@/types'

interface Hermano {
    id: number
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    numero_hermano: string
}

export function Component() {
    const toast = useToastContext()
    const [cuotas, setCuotas] = useState<Cuota[]>([])
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [selectedCuotas, setSelectedCuotas] = useState<Set<number>>(new Set())
    const [filtroAnio, setFiltroAnio] = useState<string>(
        new Date().getFullYear().toString()
    )
    const [filtroRecibo, setFiltroRecibo] = useState<string>('sin_recibo')

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
            toast.error('Error al cargar los datos')
        } finally {
            setLoading(false)
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
        const matchAnio =
            filtroAnio === 'todos' || c.anio.toString() === filtroAnio
        const matchRecibo =
            filtroRecibo === 'todos' ||
            (filtroRecibo === 'con_recibo' && c.recibo) ||
            (filtroRecibo === 'sin_recibo' && !c.recibo)

        return matchAnio && matchRecibo
    })

    const toggleCuota = (id: number) => {
        const newSelected = new Set(selectedCuotas)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedCuotas(newSelected)
    }

    const handleGenerarRecibos = async () => {
        if (selectedCuotas.size === 0) {
            toast.error('Selecciona al menos una cuota')
            return
        }

        setGenerating(true)
        try {
            const cuotasIds = Array.from(selectedCuotas)

            // Generar PDF
            const pdfPath = await invoke<string>('generar_recibos_pdf_cmd', {
                cuotasIds
            })

            toast.success(`Recibos generados: ${pdfPath}`)

            // Marcar cuotas como con recibo generado
            await invoke('marcar_recibos_generados_cmd', {
                cuotasIds
            })

            // Recargar datos y limpiar selección
            await loadData()
            setSelectedCuotas(new Set())
        } catch (error) {
            console.error('Error generating recibos:', error)
            toast.error('Error al generar los recibos')
        } finally {
            setGenerating(false)
        }
    }

    const handleAbrirCarpeta = async () => {
        try {
            await invoke('abrir_carpeta_recibos_cmd')
        } catch (error) {
            console.error('Error opening folder:', error)
            toast.error('Error al abrir la carpeta')
        }
    }

    // Obtener años únicos de las cuotas existentes
    const years = Array.from(new Set(cuotas.map((c) => c.anio))).sort(
        (a, b) => b - a
    ) // Ordenar descendente

    const columns: TableColumn<Cuota>[] = [
        {
            key: 'select',
            label: '',
            render: (_value, cuota) => (
                <button
                    onClick={() => cuota.id && toggleCuota(cuota.id)}
                    className="flex items-center justify-center w-full"
                >
                    {cuota.id && selectedCuotas.has(cuota.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                        <Square className="h-5 w-5" />
                    )}
                </button>
            )
        },
        {
            key: 'numero',
            label: 'Nº Hermano',
            render: (_value, cuota) => getHermanoNumero(cuota.hermano_id)
        },
        {
            key: 'hermano',
            label: 'Hermano',
            render: (_value, cuota) => getHermanoNombre(cuota.hermano_id)
        },
        {
            key: 'anio',
            label: 'Año',
            render: (_value, cuota) => cuota.anio
        },
        {
            key: 'importe',
            label: 'Importe',
            render: (_value, cuota) =>
                new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                }).format(cuota.importe)
        },
        {
            key: 'fecha_pago',
            label: 'Fecha Pago',
            render: (_value, cuota) =>
                cuota.fecha_pago
                    ? new Date(cuota.fecha_pago).toLocaleDateString('es-ES')
                    : '-'
        },
        {
            key: 'recibo',
            label: 'Recibo',
            render: (_value, cuota) => (
                <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        cuota.recibo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                >
                    {cuota.recibo ? 'Generado' : 'Pendiente'}
                </span>
            )
        }
    ]

    if (loading) {
        return (
            <Card title="Generar Recibos" subtitle="Cargando...">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </Card>
        )
    }

    return (
        <Card
            title="Generar Recibos"
            subtitle="Selecciona las cuotas para generar recibos en PDF"
        >
            <div className="space-y-6">
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Año"
                        value={filtroAnio}
                        onChange={(e) => {
                            setFiltroAnio(e.target.value)
                            setSelectedCuotas(new Set())
                        }}
                        options={[
                            { value: 'todos', label: 'Todos los años' },
                            ...years.map((year) => ({
                                value: year.toString(),
                                label: year.toString()
                            }))
                        ]}
                    />

                    <Select
                        label="Estado Recibo"
                        value={filtroRecibo}
                        onChange={(e) => {
                            setFiltroRecibo(e.target.value)
                            setSelectedCuotas(new Set())
                        }}
                        options={[
                            { value: 'todos', label: 'Todos' },
                            { value: 'sin_recibo', label: 'Sin recibo' },
                            { value: 'con_recibo', label: 'Con recibo' }
                        ]}
                    />

                    <div className="flex items-end">
                        <div className="text-sm text-gray-600">
                            <p>
                                <strong>Cuotas mostradas:</strong>{' '}
                                {cuotasFiltradas.length}
                            </p>
                            <p>
                                <strong>Seleccionadas:</strong>{' '}
                                {selectedCuotas.size}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Información */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                        <FileText className="h-5 w-5 text-blue-600 mr-2 shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">
                                Información sobre recibos
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>
                                    Puedes seleccionar múltiples cuotas para
                                    generar todos los recibos en un solo PDF
                                </li>
                                <li>
                                    Una vez generado, el recibo se marcará como
                                    &quot;Generado&quot;
                                </li>
                                <li>
                                    El PDF se guardará automáticamente en tu
                                    carpeta de Documentos
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                if (
                                    selectedCuotas.size ===
                                    cuotasFiltradas.length
                                ) {
                                    setSelectedCuotas(new Set())
                                } else {
                                    setSelectedCuotas(
                                        new Set(
                                            cuotasFiltradas
                                                .map((c) => c.id)
                                                .filter(
                                                    (id): id is number =>
                                                        id !== undefined
                                                )
                                        )
                                    )
                                }
                            }}
                            disabled={cuotasFiltradas.length === 0}
                            className="bg-gray-600 hover:bg-gray-700"
                        >
                            {selectedCuotas.size === cuotasFiltradas.length &&
                            cuotasFiltradas.length > 0
                                ? 'Deseleccionar Todas'
                                : 'Seleccionar Todas'}
                        </Button>

                        <Button
                            onClick={handleAbrirCarpeta}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Abrir Carpeta
                        </Button>
                    </div>

                    <Button
                        onClick={handleGenerarRecibos}
                        disabled={selectedCuotas.size === 0 || generating}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {generating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generando...
                            </>
                        ) : (
                            <>
                                <Printer className="h-4 w-4 mr-2" />
                                Generar {selectedCuotas.size} Recibo
                                {selectedCuotas.size !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </div>

                {/* Tabla */}
                <Table data={cuotasFiltradas} columns={columns} />

                {cuotasFiltradas.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay cuotas pagadas que cumplan los criterios</p>
                    </div>
                )}
            </div>
        </Card>
    )
}
