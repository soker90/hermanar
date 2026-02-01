import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useToastContext } from '@/contexts/toast-context'

export function Component() {
    const navigate = useNavigate()
    const toast = useToastContext()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre_familia: '',
        hermano_direccion_id: undefined as number | undefined
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const dataToSend = {
                nombre_familia: formData.nombre_familia,
                hermano_direccion_id: null
            }

            await invoke('create_familia_cmd', { familia: dataToSend })
            toast.success('Familia creada correctamente')
            navigate('/familias')
        } catch (error) {
            console.error('Error creating familia:', error)
            toast.error('Error al crear la familia')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card
            title="Nueva Familia"
            subtitle="Registrar una nueva familia en el sistema"
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

                <p className="text-sm text-gray-600">
                    Después de crear la familia, podrás añadirle hermanos y
                    configurar la dirección principal.
                </p>

                <div className="flex gap-4 justify-end">
                    <Button
                        type="button"
                        onClick={() => navigate('/familias')}
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
