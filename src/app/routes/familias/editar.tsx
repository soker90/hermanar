import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, type TableColumn } from '@/components/ui/table'
import { useNavigate, useParams } from 'react-router'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'

interface Hermano extends Record<string, unknown> {
    id?: number
    numero_hermano?: string
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    direccion?: string
    telefono?: string
    familia_id?: number
    activo?: boolean
}

interface Familia {
    id: number
    nombre_familia: string
    hermano_direccion_id?: number
}

export function Component() {
    const navigate = useNavigate()
    const { id } = useParams()
    const toast = useToastContext()
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [hermanosDeFamilia, setHermanosDeFamilia] = useState<Hermano[]>([])
    const [formData, setFormData] = useState({
        nombre_familia: '',
        hermano_direccion_id: undefined as number | undefined
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar datos de la familia
                const familias = await invoke<Familia[]>('get_all_familias_cmd')
                const familia = familias.find((f) => f.id === Number(id))

                if (familia) {
                    setFormData({
                        nombre_familia: familia.nombre_familia || '',
                        hermano_direccion_id: familia.hermano_direccion_id
                    })
                }

                // Cargar hermanos de esta familia para mostrar en la tabla
                const hermanosFamiliaData = await invoke<Hermano[]>(
                    'get_hermanos_by_familia_cmd',
                    { familiaId: Number(id) }
                )
                setHermanosDeFamilia(hermanosFamiliaData)
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
            const dataToSend = {
                nombre_familia: formData.nombre_familia,
                hermano_direccion_id: formData.hermano_direccion_id || null
            }

            await invoke('update_familia_cmd', {
                id: Number(id),
                familia: dataToSend
            })
            toast.success('Familia actualizada correctamente')
            navigate('/familias')
        } catch (error) {
            console.error('Error updating familia:', error)
            toast.error('Error al actualizar la familia')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoverHermano = async (hermano: Hermano) => {
        if (
            !confirm(
                `¿Estás seguro de quitar a ${hermano.nombre} ${hermano.primer_apellido} de esta familia?`
            )
        ) {
            return
        }

        try {
            await invoke('update_hermano_familia_cmd', {
                hermanoId: hermano.id,
                familiaId: null
            })

            // Recargar hermanos de la familia
            const hermanosFamiliaData = await invoke<Hermano[]>(
                'get_hermanos_by_familia_cmd',
                { familiaId: Number(id) }
            )
            setHermanosDeFamilia(hermanosFamiliaData)

            toast.success('Hermano removido de la familia correctamente')
        } catch (error) {
            console.error('Error removing hermano:', error)
            toast.error('Error al remover hermano de la familia')
        }
    }

    if (loadingData) {
        return (
            <Card title="Editar Familia" subtitle="Cargando datos...">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </Card>
        )
    }

    const columns: TableColumn<Hermano>[] = [
        { key: 'numero_hermano', label: 'Número' },
        {
            key: 'nombre',
            label: 'Nombre Completo',
            render: (_value, hermano) =>
                `${hermano.nombre} ${hermano.primer_apellido} ${hermano.segundo_apellido || ''}`
        },
        { key: 'direccion', label: 'Dirección' },
        { key: 'telefono', label: 'Teléfono' },
        {
            key: 'activo',
            label: 'Estado',
            render: (_value, hermano) => (
                <span
                    className={`px-2 py-1 rounded text-xs ${
                        hermano.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                >
                    {hermano.activo ? 'Activo' : 'Inactivo'}
                </span>
            )
        }
    ]

    return (
        <div className="space-y-6">
            <Card
                title="Editar Familia"
                subtitle="Modificar datos de la familia"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre de Familia"
                        value={formData.nombre_familia}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                nombre_familia: e.target.value
                            })
                        }
                        placeholder="Ej: Familia García"
                        required
                        helperText="Nombre identificativo de la familia"
                    />

                    <Select
                        label="Hermano con Dirección Principal"
                        value={formData.hermano_direccion_id?.toString() || ''}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                hermano_direccion_id: e.target.value
                                    ? Number(e.target.value)
                                    : undefined
                            })
                        }
                        options={[
                            {
                                value: '',
                                label:
                                    hermanosDeFamilia.length === 0
                                        ? 'Sin hermanos en la familia'
                                        : 'No configurada'
                            },
                            ...hermanosDeFamilia.map((h) => ({
                                value: h.id!.toString(),
                                label: `${h.nombre} ${h.primer_apellido} ${h.segundo_apellido || ''}${h.direccion ? ` - ${h.direccion}` : ''}`
                            }))
                        ]}
                        disabled={hermanosDeFamilia.length === 0}
                        helperText={
                            hermanosDeFamilia.length === 0
                                ? 'Añade hermanos a la familia para poder seleccionar una dirección principal'
                                : 'Selecciona el hermano cuya dirección será la principal de la familia'
                        }
                    />

                    <div className="flex gap-4 justify-end">
                        <Button
                            type="button"
                            onClick={() => navigate('/familias')}
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

            <Card
                title="Hermanos de la Familia"
                subtitle={`${hermanosDeFamilia.length} hermano${hermanosDeFamilia.length !== 1 ? 's' : ''}`}
            >
                {hermanosDeFamilia.length > 0 ? (
                    <div className="space-y-4">
                        <Table
                            data={hermanosDeFamilia}
                            columns={columns}
                            onView={(hermano) =>
                                navigate(`/hermanos/${hermano.id}`)
                            }
                            onDelete={handleRemoverHermano}
                            deleteTitle="Sacar de la familia"
                        />
                        <div className="text-sm text-gray-500 italic">
                            Usa el botón de eliminar para quitar un hermano de
                            esta familia (no lo elimina, solo lo desvincula).
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No hay hermanos asignados a esta familia
                    </div>
                )}
            </Card>
        </div>
    )
}
