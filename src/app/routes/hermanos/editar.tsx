import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNavigate, useParams } from 'react-router'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Hermano } from '@/types'
import { useToastContext } from '@/contexts/toast-context'
import { NuevaFamiliaModal } from '@/components/nueva-familia-modal'

interface Familia {
    id: number
    nombre_familia: string
}

export function Component() {
    const navigate = useNavigate()
    const { id } = useParams()
    const toast = useToastContext()
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [familias, setFamilias] = useState<Familia[]>([])
    const [showNuevaFamiliaModal, setShowNuevaFamiliaModal] = useState(false)
    const [formData, setFormData] = useState({
        numero_hermano: '',
        nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        dni: '',
        fecha_nacimiento: '',
        localidad_nacimiento: '',
        provincia_nacimiento: '',
        fecha_alta: '',
        familia_id: undefined as number | undefined,
        telefono: '',
        email: '',
        direccion: '',
        localidad: '',
        provincia: '',
        codigo_postal: '',
        parroquia_bautismo: '',
        localidad_bautismo: '',
        provincia_bautismo: '',
        autorizacion_menores: false,
        nombre_representante_legal: '',
        dni_representante_legal: '',
        hermano_aval_1: '',
        hermano_aval_2: '',
        activo: true,
        fecha_baja: '',
        observaciones: ''
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar familias
                const familiasData = await invoke<Familia[]>(
                    'get_all_familias_cmd'
                )
                setFamilias(familiasData)

                // Cargar datos del hermano actual
                const hermanoData = await invoke<Hermano>('get_hermano_cmd', {
                    id: parseInt(id!)
                })

                if (hermanoData) {
                    setFormData({
                        numero_hermano: hermanoData.numero_hermano || '',
                        nombre: hermanoData.nombre || '',
                        primer_apellido: hermanoData.primer_apellido || '',
                        segundo_apellido: hermanoData.segundo_apellido || '',
                        dni: hermanoData.dni || '',
                        fecha_nacimiento: hermanoData.fecha_nacimiento || '',
                        localidad_nacimiento:
                            hermanoData.localidad_nacimiento || '',
                        provincia_nacimiento:
                            hermanoData.provincia_nacimiento || '',
                        fecha_alta: hermanoData.fecha_alta || '',
                        familia_id: hermanoData.familia_id,
                        telefono: hermanoData.telefono || '',
                        email: hermanoData.email || '',
                        direccion: hermanoData.direccion || '',
                        localidad: hermanoData.localidad || '',
                        provincia: hermanoData.provincia || '',
                        codigo_postal: hermanoData.codigo_postal || '',
                        parroquia_bautismo:
                            hermanoData.parroquia_bautismo || '',
                        localidad_bautismo:
                            hermanoData.localidad_bautismo || '',
                        provincia_bautismo:
                            hermanoData.provincia_bautismo || '',
                        autorizacion_menores:
                            hermanoData.autorizacion_menores ?? false,
                        nombre_representante_legal:
                            hermanoData.nombre_representante_legal || '',
                        dni_representante_legal:
                            hermanoData.dni_representante_legal || '',
                        hermano_aval_1: hermanoData.hermano_aval_1 || '',
                        hermano_aval_2: hermanoData.hermano_aval_2 || '',
                        activo: hermanoData.activo ?? true,
                        fecha_baja: hermanoData.fecha_baja || '',
                        observaciones: hermanoData.observaciones || ''
                    })
                }
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
            // Validar que si el hermano está inactivo, tenga fecha de baja
            if (!formData.activo && !formData.fecha_baja) {
                toast.error(
                    'La fecha de baja es obligatoria para hermanos inactivos'
                )
                setLoading(false)
                return
            }

            // Preparar datos para enviar, convirtiendo cadenas vacías a undefined
            const dataToSend = {
                ...formData,
                familia_id: formData.familia_id || undefined,
                segundo_apellido: formData.segundo_apellido || undefined,
                dni: formData.dni || undefined,
                fecha_nacimiento: formData.fecha_nacimiento || undefined,
                localidad_nacimiento:
                    formData.localidad_nacimiento || undefined,
                provincia_nacimiento:
                    formData.provincia_nacimiento || undefined,
                telefono: formData.telefono || undefined,
                email: formData.email || undefined,
                direccion: formData.direccion || undefined,
                localidad: formData.localidad || undefined,
                provincia: formData.provincia || undefined,
                codigo_postal: formData.codigo_postal || undefined,
                parroquia_bautismo: formData.parroquia_bautismo || undefined,
                localidad_bautismo: formData.localidad_bautismo || undefined,
                provincia_bautismo: formData.provincia_bautismo || undefined,
                nombre_representante_legal: formData.autorizacion_menores
                    ? formData.nombre_representante_legal || undefined
                    : undefined,
                dni_representante_legal: formData.autorizacion_menores
                    ? formData.dni_representante_legal || undefined
                    : undefined,
                fecha_baja: formData.fecha_baja || undefined,
                observaciones: formData.observaciones || undefined
            }

            await invoke('update_hermano_cmd', {
                id: Number(id),
                hermano: dataToSend
            })
            toast.success('Hermano actualizado correctamente')
            navigate('/hermanos')
        } catch (error) {
            console.error('Error updating hermano:', error)
            toast.error('Error al actualizar el hermano')
        } finally {
            setLoading(false)
        }
    }

    if (loadingData) {
        return (
            <Card title="Editar Hermano" subtitle="Cargando datos...">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </Card>
        )
    }

    return (
        <>
            <Card title="Editar Hermano" subtitle="Modificar datos del hermano">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información básica */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Información Básica
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Número de Hermano"
                                value={formData.numero_hermano}
                                onChange={(e) => {
                                    const value = e.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 5)
                                    setFormData({
                                        ...formData,
                                        numero_hermano: value
                                    })
                                }}
                                helperText="5 dígitos numéricos"
                                maxLength={5}
                                placeholder="00001"
                                required
                            />
                            <Select
                                label="Estado"
                                value={formData.activo ? '1' : '0'}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        activo: e.target.value === '1'
                                    })
                                }
                                options={[
                                    { value: '1', label: 'Activo' },
                                    { value: '0', label: 'Inactivo' }
                                ]}
                            />
                            {!formData.activo && (
                                <Input
                                    label="Fecha de Baja"
                                    type="date"
                                    value={formData.fecha_baja}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            fecha_baja: e.target.value
                                        })
                                    }
                                    required
                                    helperText="Obligatorio cuando el hermano está inactivo"
                                />
                            )}
                        </div>

                        <Select
                            label="Familia"
                            value={formData.familia_id?.toString() || ''}
                            onChange={(e) => {
                                const value = e.target.value
                                if (value === 'nueva') {
                                    setShowNuevaFamiliaModal(true)
                                } else {
                                    setFormData({
                                        ...formData,
                                        familia_id: value
                                            ? Number(value)
                                            : undefined
                                    })
                                }
                            }}
                            options={[
                                { value: '', label: 'Sin familia' },
                                ...familias.map((f) => ({
                                    value: f.id.toString(),
                                    label: f.nombre_familia
                                })),
                                {
                                    value: 'nueva',
                                    label: '+ Añadir nueva familia'
                                }
                            ]}
                        />

                        <Input
                            label="Nombre"
                            value={formData.nombre}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    nombre: e.target.value
                                })
                            }
                            required
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Primer Apellido"
                                value={formData.primer_apellido}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        primer_apellido: e.target.value
                                    })
                                }
                                required
                            />
                            <Input
                                label="Segundo Apellido"
                                value={formData.segundo_apellido}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        segundo_apellido: e.target.value
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="DNI"
                                value={formData.dni}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        dni: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Fecha de Alta"
                                type="date"
                                value={formData.fecha_alta}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        fecha_alta: e.target.value
                                    })
                                }
                                required
                            />
                        </div>
                    </div>

                    {/* Datos de nacimiento */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Datos de Nacimiento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Fecha de Nacimiento"
                                type="date"
                                value={formData.fecha_nacimiento}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        fecha_nacimiento: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Localidad de Nacimiento"
                                value={formData.localidad_nacimiento}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        localidad_nacimiento: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Provincia de Nacimiento"
                                value={formData.provincia_nacimiento}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        provincia_nacimiento: e.target.value
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Datos de bautismo */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Datos de Bautismo
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Parroquia de Bautismo"
                                value={formData.parroquia_bautismo}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        parroquia_bautismo: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Localidad de Bautismo"
                                value={formData.localidad_bautismo}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        localidad_bautismo: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Provincia de Bautismo"
                                value={formData.provincia_bautismo}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        provincia_bautismo: e.target.value
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Datos de contacto */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Datos de Contacto y Domicilio
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Teléfono"
                                value={formData.telefono}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        telefono: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        email: e.target.value
                                    })
                                }
                            />
                        </div>

                        <Input
                            label="Dirección"
                            value={formData.direccion}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    direccion: e.target.value
                                })
                            }
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Localidad"
                                value={formData.localidad}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        localidad: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Provincia"
                                value={formData.provincia}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        provincia: e.target.value
                                    })
                                }
                            />
                            <Input
                                label="Código Postal"
                                value={formData.codigo_postal}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        codigo_postal: e.target.value
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Autorización menores */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Autorización para Menores de Edad
                        </h3>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autorizacion_menores"
                                checked={formData.autorizacion_menores}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        autorizacion_menores: e.target.checked
                                    })
                                }
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor="autorizacion_menores"
                                className="text-sm font-medium text-gray-900"
                            >
                                Es menor de edad (requiere autorización de
                                padre/madre/tutor)
                            </label>
                        </div>

                        {formData.autorizacion_menores && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                                <Input
                                    label="Nombre y Apellidos del padre/madre/tutor"
                                    value={formData.nombre_representante_legal}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            nombre_representante_legal:
                                                e.target.value
                                        })
                                    }
                                />
                                <Input
                                    label="DNI del representante legal"
                                    value={formData.dni_representante_legal}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            dni_representante_legal:
                                                e.target.value
                                        })
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Avales */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Avales
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Hermano 1"
                                value={formData.hermano_aval_1}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        hermano_aval_1: e.target.value
                                    })
                                }
                                placeholder="Nombre y apellidos del aval 1"
                            />
                            <Input
                                label="Hermano 2"
                                value={formData.hermano_aval_2}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        hermano_aval_2: e.target.value
                                    })
                                }
                                placeholder="Nombre y apellidos del aval 2"
                            />
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Observaciones
                        </h3>

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
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 justify-end border-t pt-4">
                        <Button
                            type="button"
                            onClick={() => navigate('/hermanos')}
                            className="bg-gray-500 hover:bg-gray-600"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </Card>

            <NuevaFamiliaModal
                isOpen={showNuevaFamiliaModal}
                onClose={() => {
                    console.log('Cerrando modal de nueva familia')
                    setShowNuevaFamiliaModal(false)
                }}
                onFamiliaCreated={async (familiaId, hermanoId) => {
                    console.log(
                        'Familia creada con ID:',
                        familiaId,
                        'Hermano dirección:',
                        hermanoId
                    )
                    // Recargar familias
                    const data = await invoke<Familia[]>('get_all_familias_cmd')
                    setFamilias(data)
                    // Seleccionar la familia recién creada
                    setFormData({
                        ...formData,
                        familia_id: familiaId
                    })
                }}
                hermanoId={id ? parseInt(id) : undefined}
            />
        </>
    )
}
