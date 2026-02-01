import { Card } from '@/components/ui/card'
import { Table, type TableColumn } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'

interface Familia extends Record<string, unknown> {
    id: number
    nombre_familia: string
    hermano_direccion_id?: number
    created_at?: string
    updated_at?: string
}

interface Hermano {
    id: number
    nombre: string
    primer_apellido: string
    segundo_apellido?: string
    direccion?: string
    localidad?: string
    provincia?: string
    codigo_postal?: string
    telefono?: string
    familia_id?: number
}

export function Component() {
    const navigate = useNavigate()
    const toast = useToastContext()
    const [familias, setFamilias] = useState<Familia[]>([])
    const [hermanos, setHermanos] = useState<Map<number, Hermano>>(new Map())
    const [todosHermanos, setTodosHermanos] = useState<Hermano[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [data, hermanosData] = await Promise.all([
                invoke<Familia[]>('get_all_familias_cmd'),
                invoke<Hermano[]>('get_all_hermanos_cmd')
            ])
            setFamilias(data)
            setTodosHermanos(hermanosData)

            // Cargar información de hermanos con dirección
            const hermanoMap = new Map<number, Hermano>()
            for (const familia of data) {
                if (familia.hermano_direccion_id) {
                    try {
                        const hermano = await invoke<Hermano>(
                            'get_hermano_cmd',
                            {
                                id: familia.hermano_direccion_id
                            }
                        )
                        hermanoMap.set(familia.hermano_direccion_id, hermano)
                    } catch (err) {
                        console.error('Error loading hermano:', err)
                    }
                }
            }
            setHermanos(hermanoMap)
        } catch (error) {
            console.error('Error loading familias:', error)
            toast.error('Error al cargar las familias')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (familia: Familia) => {
        if (!confirm(`¿Eliminar la familia "${familia.nombre_familia}"?`))
            return

        try {
            await invoke('delete_familia_cmd', { id: familia.id })
            loadData()
            toast.success('Familia eliminada correctamente')
        } catch (error) {
            console.error('Error deleting familia:', error)
            toast.error(
                'Error al eliminar la familia. Asegúrate de que no tenga hermanos asignados.'
            )
        }
    }

    const contarHermanosDeFamilia = (familiaId: number) => {
        return todosHermanos.filter((h) => h.familia_id === familiaId).length
    }

    const columns: TableColumn<Familia>[] = [
        { key: 'nombre_familia', label: 'Nombre de Familia' },
        {
            key: 'id',
            label: 'Nº Hermanos',
            render: (_v, familia) => {
                const numHermanos = contarHermanosDeFamilia(familia.id)
                return (
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                            numHermanos > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                        {numHermanos}
                    </span>
                )
            }
        },
        {
            key: 'hermano_direccion_id',
            label: 'Dirección Principal',
            render: (_v, familia) => {
                if (!familia.hermano_direccion_id) {
                    return <span className="text-gray-400">No configurada</span>
                }

                const hermano = hermanos.get(familia.hermano_direccion_id)
                if (!hermano) {
                    return <span className="text-gray-400">Cargando...</span>
                }

                // Construir la dirección completa
                const partesDireccion = []
                if (hermano.direccion) partesDireccion.push(hermano.direccion)
                if (hermano.codigo_postal)
                    partesDireccion.push(hermano.codigo_postal)
                if (hermano.localidad) partesDireccion.push(hermano.localidad)
                if (hermano.provincia) partesDireccion.push(hermano.provincia)

                if (partesDireccion.length === 0) {
                    return <span className="text-amber-600">Sin dirección</span>
                }

                return (
                    <div className="text-sm text-gray-600">
                        {partesDireccion.join(', ')}
                    </div>
                )
            }
        },
        {
            key: 'hermano_direccion_id',
            label: 'Teléfono',
            render: (_v, familia) => {
                if (!familia.hermano_direccion_id) {
                    return <span className="text-gray-400">-</span>
                }

                const hermano = hermanos.get(familia.hermano_direccion_id)
                if (!hermano) {
                    return <span className="text-gray-400">-</span>
                }

                if (!hermano.telefono) {
                    return <span className="text-gray-400">Sin teléfono</span>
                }

                return (
                    <div className="text-sm">
                        <span className="font-medium text-gray-700">
                            {hermano.nombre}
                        </span>
                        <span className="text-gray-500 ml-2">
                            {hermano.telefono}
                        </span>
                    </div>
                )
            }
        }
    ]

    return (
        <div>
            <Card
                title="Gestión de Familias"
                subtitle="Lista de todas las familias registradas"
                action={
                    <Button onClick={() => navigate('/familias/nueva')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Familia
                    </Button>
                }
            >
                <Table
                    data={familias}
                    columns={columns}
                    onEdit={(f) => navigate(`/familias/${f.id}/editar`)}
                    onDelete={handleDelete}
                    loading={loading}
                    emptyMessage="No hay familias registradas"
                />
            </Card>
        </div>
    )
}
