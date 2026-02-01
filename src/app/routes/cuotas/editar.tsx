import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNavigate, useParams } from 'react-router'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'

interface Hermano {
    id: number
    nombre: string
    apellidos: string
    numero_hermano: string
    activo: boolean
}

interface Cuota {
    id: number
    hermano_id: number
    anio: number
    importe: number
    pagado: boolean
    fecha_pago?: string
    metodo_pago?: string
    observaciones?: string
}

export function Component() {
    const navigate = useNavigate()
    const { id } = useParams()
    const toast = useToastContext()
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [formData, setFormData] = useState({
        hermano_id: 0,
        anio: new Date().getFullYear(),
        importe: 10,
        pagado: false,
        fecha_pago: '',
        metodo_pago: 'efectivo',
        observaciones: ''
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar datos de la cuota
                const cuotas = await invoke<Cuota[]>('get_all_cuotas_cmd')
                const cuota = cuotas.find((c) => c.id === Number(id))

                if (cuota) {
                    setFormData({
                        hermano_id: cuota.hermano_id,
                        anio: cuota.anio,
                        importe: cuota.importe,
                        pagado: cuota.pagado,
                        fecha_pago: cuota.fecha_pago || '',
                        metodo_pago: cuota.metodo_pago || 'efectivo',
                        observaciones: cuota.observaciones || ''
                    })
                }

                // Cargar hermanos
                const hermanosData = await invoke<Hermano[]>(
                    'get_all_hermanos_cmd'
                )
                setHermanos(hermanosData)
            } catch (error) {
                console.error('Error loading data:', error)
                toast.error('Error al cargar los datos')
            } finally {
                setLoadingData(false)
            }
        }

        loadData()
    }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Preparar datos para enviar, convirtiendo cadenas vacías a undefined
            const dataToSend = {
                ...formData,
                fecha_pago: formData.fecha_pago || undefined,
                metodo_pago: formData.metodo_pago || undefined,
                observaciones: formData.observaciones || undefined
            }

            await invoke('update_cuota_cmd', {
                id: Number(id),
                cuota: dataToSend
            })
            toast.success('Cuota actualizada correctamente')
            navigate('/cuotas')
        } catch (error) {
            console.error('Error updating cuota:', error)
            toast.error('Error al actualizar la cuota')
        } finally {
            setLoading(false)
        }
    }

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

    if (loadingData) {
        return (
            <Card title="Editar Cuota" subtitle="Cargando datos...">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </Card>
        )
    }

    return (
        <Card title="Editar Cuota" subtitle="Modificar datos de la cuota">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                    label="Hermano"
                    value={formData.hermano_id.toString()}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            hermano_id: Number(e.target.value)
                        })
                    }
                    options={hermanos.map((h) => ({
                        value: h.id.toString(),
                        label: `${h.numero_hermano} - ${h.nombre} ${h.apellidos}`
                    }))}
                    required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Año"
                        value={formData.anio.toString()}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                anio: Number(e.target.value)
                            })
                        }
                        options={years.map((y) => ({
                            value: y.toString(),
                            label: y.toString()
                        }))}
                    />

                    <Input
                        label="Importe (€)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.importe}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                importe: Number(e.target.value)
                            })
                        }
                        required
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="pagado"
                        checked={formData.pagado}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                pagado: e.target.checked
                            })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                        htmlFor="pagado"
                        className="text-sm font-medium text-gray-700"
                    >
                        Marcar como pagado
                    </label>
                </div>

                {formData.pagado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Fecha de Pago"
                            type="date"
                            value={formData.fecha_pago}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    fecha_pago: e.target.value
                                })
                            }
                        />

                        <Select
                            label="Método de Pago"
                            value={formData.metodo_pago}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    metodo_pago: e.target.value
                                })
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
                                }
                            ]}
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                    </label>
                    <textarea
                        value={formData.observaciones}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                observaciones: e.target.value
                            })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-2 focus:border-blue-500"
                        placeholder="Observaciones adicionales..."
                    />
                </div>

                <div className="flex gap-4 justify-end">
                    <Button
                        type="button"
                        onClick={() => navigate('/cuotas')}
                        className="bg-gray-500 hover:bg-gray-600"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Actualizar'}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
