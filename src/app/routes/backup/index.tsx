import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Database,
    Download,
    Upload,
    FolderOpen,
    AlertCircle
} from 'lucide-react'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { useToastContext } from '@/contexts/toast-context'

export function Component() {
    const toast = useToastContext()
    const [exportLoading, setExportLoading] = useState(false)
    const [importLoading, setImportLoading] = useState(false)

    const handleExportBackup = async () => {
        setExportLoading(true)
        try {
            const backupPath = await invoke<string>('exportar_backup_cmd')
            toast.success(`Copia de seguridad exportada: ${backupPath}`)
        } catch (error) {
            console.error('Error al exportar backup:', error)
            toast.error(`Error al exportar: ${error}`)
        } finally {
            setExportLoading(false)
        }
    }

    const handleImportBackup = async () => {
        try {
            // Abrir diálogo para seleccionar archivo
            const selected = await open({
                multiple: false,
                filters: [
                    {
                        name: 'Backup',
                        extensions: ['zst']
                    }
                ]
            })

            if (!selected) {
                return
            }

            setImportLoading(true)
            const result = await invoke<string>('importar_backup_cmd', {
                backupPath: selected
            })

            toast.success(result)

            // Comportamiento diferente según el entorno
            if (import.meta.env.DEV) {
                // En desarrollo, no reiniciar automáticamente
                setImportLoading(false)
                toast.info(
                    'Reinicia manualmente la aplicación (Ctrl+C y pnpm dev) para aplicar los cambios'
                )
            } else {
                // En producción, reiniciar automáticamente después de 2 segundos
                setTimeout(async () => {
                    await relaunch()
                }, 2000)
            }
        } catch (error) {
            console.error('Error al importar backup:', error)
            toast.error(`Error al importar: ${error}`)
            setImportLoading(false)
        }
    }

    const handleOpenDownloads = async () => {
        try {
            await invoke('abrir_carpeta_descargas_cmd')
        } catch (error) {
            console.error('Error al abrir carpeta:', error)
            toast.error('Error al abrir la carpeta de descargas')
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            {/* Overlay de carga durante importación */}
            {importLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <Database className="w-16 h-16 mx-auto mb-4 text-indigo-600 animate-pulse" />
                            <h2 className="text-2xl font-bold mb-2">
                                Importando Base de Datos
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Por favor espera mientras se restauran los
                                datos...
                            </p>

                            {/* Barra de progreso indeterminada */}
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                                <div
                                    className="h-full bg-linear-to-r from-indigo-400 via-indigo-600 to-indigo-400 rounded-full"
                                    style={{
                                        width: '50%',
                                        animation:
                                            'slideProgress 1.5s ease-in-out infinite'
                                    }}
                                />
                            </div>

                            <style>{`
                                @keyframes slideProgress {
                                    0% { transform: translateX(-100%); }
                                    100% { transform: translateX(300%); }
                                }
                            `}</style>

                            <p className="text-sm text-gray-500">
                                No cierres ni refresques la aplicación
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Database className="w-8 h-8" />
                    Copia de Seguridad
                </h1>
                <p className="text-gray-600">
                    Exporta o importa una copia de seguridad de la base de datos
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Exportar Backup */}
                <Card className="p-6">
                    <div className="flex flex-col h-full">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Download className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-semibold">
                                    Exportar Copia de Seguridad
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600">
                                Genera un archivo comprimido con todos los datos
                                de la base de datos actual.
                            </p>
                        </div>

                        <div className="grow" />

                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Información:</strong>
                                </p>
                                <ul className="text-sm text-blue-700 mt-1 ml-4 list-disc">
                                    <li>
                                        El archivo se guardará en tu carpeta de
                                        Descargas
                                    </li>
                                    <li>
                                        Nombre: hermanar-AAAA-MM-DD-HH-MM-SS.zst
                                    </li>
                                    <li>
                                        Incluye todos los hermanos, familias y
                                        cuotas
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleExportBackup}
                                    disabled={exportLoading}
                                    className="flex-1"
                                >
                                    {exportLoading ? (
                                        'Exportando...'
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Exportar
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleOpenDownloads}
                                    variant="outline"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Importar Backup */}
                <Card className="p-6">
                    <div className="flex flex-col h-full">
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Upload className="w-6 h-6 text-green-600" />
                                <h2 className="text-xl font-semibold">
                                    Importar Copia de Seguridad
                                </h2>
                            </div>
                            <p className="text-sm text-gray-600">
                                Restaura los datos desde un archivo de copia de
                                seguridad.
                            </p>
                        </div>

                        <div className="grow" />

                        <div className="space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm text-amber-800 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>
                                        <strong>Advertencia:</strong>
                                    </span>
                                </p>
                                <ul className="text-sm text-amber-700 mt-1 ml-4 list-disc">
                                    <li>
                                        Todos los datos actuales serán
                                        reemplazados
                                    </li>
                                    <li>
                                        Se creará un backup automático antes de
                                        reemplazar
                                    </li>
                                    <li>
                                        La aplicación se reiniciará
                                        automáticamente
                                    </li>
                                </ul>
                            </div>

                            <Button
                                onClick={handleImportBackup}
                                disabled={importLoading}
                                variant="outline"
                                className="w-full border-green-600 text-green-600 hover:bg-green-50"
                            >
                                {importLoading ? (
                                    'Importando...'
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Seleccionar Archivo
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Información adicional */}
            <Card className="mt-6 p-6 bg-gray-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Recomendaciones
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 ml-6 list-disc">
                    <li>Realiza copias de seguridad periódicas de tus datos</li>
                    <li>
                        Guarda las copias en un lugar seguro (disco externo,
                        nube, etc.)
                    </li>
                    <li>
                        Verifica que puedes restaurar tus copias de seguridad
                        antes de necesitarlas
                    </li>
                    <li>
                        Mantén múltiples versiones de copias de seguridad
                        (semanal, mensual, etc.)
                    </li>
                </ul>
            </Card>
        </div>
    )
}
