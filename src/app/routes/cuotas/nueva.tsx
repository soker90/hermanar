import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNavigate } from 'react-router'
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

export function Component() {
    const navigate = useNavigate()
    const toast = useToastContext()
    const [loading, setLoading] = useState(false)
    const [hermanos, setHermanos] = useState<Hermano[]>([])
    const [formData, setFormData] = useState({
        hermano_id: 0,
        anio: new Date().getFullYear(),
        importe: 50,
        pagado: false,
        fecha_pago: '',
        metodo_pago: 'efectivo',
        observaciones: '',
        recibo: false
    })

    useEffect(() => {
        const loadHermanos = async () => {
            try {
                const data = await invoke<Hermano[]>('get_all_hermanos_cmd')
                const activos = data.filter((h) => h.activo)
                setHermanos(activos)
            } catch (error) {
                console.error('Error loading hermanos:', error)
            }
        }

        loadHermanos()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.hermano_id === 0) {
            toast.warning('Debes seleccionar un hermano')
            return
        }

        setLoading(true)

        try {
            // Preparar datos para enviar, convirtiendo cadenas vacías a undefined
            const dataToSend = {
                ...formData,
                fecha_pago: formData.fecha_pago || undefined,
                metodo_pago: formData.metodo_pago || undefined,
                observaciones: formData.observaciones || undefined
            }

            await invoke('create_cuota_cmd', { cuota: dataToSend })
            toast.success('Cuota creada correctamente')
            navigate('/cuotas')
        } catch (error) {
            console.error('Error creating cuota:', error)
            toast.error('Error al crear la cuota')
        } finally {
            setLoading(false)
        }
    }

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

    return (
        <Card
            title="Nueva Cuota"
            subtitle="Registrar una nueva cuota en el sistema"
        >
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
                    options={[
                        { value: '0', label: 'Seleccione un hermano' },
                        ...hermanos.map((h) => ({
                            value: h.id.toString(),
                            label: `${h.numero_hermano} - ${h.nombre} ${h.apellidos}`
                        }))
                    ]}
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
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
