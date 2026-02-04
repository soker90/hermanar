import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useToastContext } from '@/contexts/toast-context'
import { Settings, Upload, X } from 'lucide-react'

interface ConfiguracionRecibo {
    logo_path?: string
    nombre_hermandad: string
    ubicacion: string
    direccion: string
}

interface ConfiguracionReciboModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ConfiguracionReciboModal({
    isOpen,
    onClose
}: ConfiguracionReciboModalProps) {
    const toast = useToastContext()
    const [config, setConfig] = useState<ConfiguracionRecibo>({
        nombre_hermandad: 'Nombre de la hermandad',
        ubicacion: 'POBLACIÓN',
        direccion: 'Dirección completa'
    })
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadConfig()
        }
    }, [isOpen])

    const loadConfig = async () => {
        setLoading(true)
        try {
            const data = await invoke<ConfiguracionRecibo | null>(
                'get_configuracion_recibo_cmd'
            )
            if (data) {
                setConfig(data)
            }
        } catch (error) {
            console.error('Error loading config:', error)
            // No mostramos error porque puede ser que no haya configuración guardada
        } finally {
            setLoading(false)
        }
    }

    const handleSelectLogo = async () => {
        try {
            const file = await open({
                filters: [
                    {
                        name: 'Imágenes',
                        extensions: ['png', 'jpg', 'jpeg']
                    }
                ],
                multiple: false,
                directory: false
            })

            if (file) {
                setConfig({ ...config, logo_path: file as string })
            }
        } catch (error) {
            console.error('Error selecting logo:', error)
            toast.error('Error al seleccionar el logo')
        }
    }

    const handleRemoveLogo = () => {
        setConfig({ ...config, logo_path: undefined })
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await invoke('guardar_configuracion_recibo_cmd', {
                config
            })
            toast.success('Configuración guardada correctamente')
            onClose()
        } catch (error) {
            console.error('Error saving config:', error)
            toast.error('Error al guardar la configuración')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configuración de Recibos"
        >
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Logo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo de la Hermandad
                            </label>
                            <div className="space-y-2">
                                {config.logo_path ? (
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex-1 text-sm text-gray-600 truncate">
                                            {config.logo_path}
                                        </div>
                                        <Button
                                            onClick={handleRemoveLogo}
                                            className="bg-red-600 hover:bg-red-700 px-3"
                                            type="button"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleSelectLogo}
                                        className="w-full bg-gray-600 hover:bg-gray-700"
                                        type="button"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Seleccionar Logo
                                    </Button>
                                )}
                                <p className="text-xs text-gray-500">
                                    Formatos: PNG, JPG. Opcional
                                </p>
                            </div>
                        </div>

                        {/* Nombre de la hermandad */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de la Hermandad
                            </label>
                            <Input
                                value={config.nombre_hermandad}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        nombre_hermandad: e.target.value
                                    })
                                }
                                placeholder="Nombre de la Hermandad"
                            />
                        </div>

                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ubicación
                            </label>
                            <Input
                                value={config.ubicacion}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        ubicacion: e.target.value
                                    })
                                }
                                placeholder="Localidad"
                            />
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dirección Completa
                            </label>
                            <textarea
                                value={config.direccion}
                                onChange={(e) =>
                                    setConfig({
                                        ...config,
                                        direccion: e.target.value
                                    })
                                }
                                placeholder="Dirección Completa"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-15"
                                rows={2}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                onClick={onClose}
                                className="bg-gray-600 hover:bg-gray-700"
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Guardar
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
