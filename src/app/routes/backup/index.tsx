import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import {
    Database,
    Download,
    Upload,
    FolderOpen,
    AlertCircle,
    Trash2,
    FolderCog,
    RotateCcw,
    CheckCircle2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { useToastContext } from '@/contexts/toast-context'

interface DataDirConfig {
    current_dir: string
    is_custom: boolean
    default_dir: string
}

interface CheckDataDirResult {
    db_exists_in_new_dir: boolean
}

// Estado del flujo de cambio de ruta
type ChangeStep =
    | 'idle'
    | 'conflict' // hay BD en el nuevo dir → preguntar cuál usar
    | 'confirm' // confirmación final antes de aplicar

interface PendingChange {
    new_dir: string
    // use_existing_db: undefined = sin conflicto, true = usar la existente, false = usar la actual
    use_existing_db?: boolean
}

export function Component() {
    const toast = useToastContext()
    const [exportLoading, setExportLoading] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Estado de la configuración de ruta de datos
    const [dataDirConfig, setDataDirConfig] = useState<DataDirConfig | null>(
        null
    )
    const [changeStep, setChangeStep] = useState<ChangeStep>('idle')
    const [pendingChange, setPendingChange] = useState<PendingChange | null>(
        null
    )
    const [applyingChange, setApplyingChange] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)

    useEffect(() => {
        loadDataDirConfig()
    }, [])

    const loadDataDirConfig = async () => {
        try {
            const cfg = await invoke<DataDirConfig>('get_data_dir_config_cmd')
            setDataDirConfig(cfg)
        } catch (error) {
            console.error('Error al cargar configuración de ruta:', error)
        }
    }

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
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Backup', extensions: ['zst'] }]
            })

            if (!selected) return

            setImportLoading(true)
            const result = await invoke<string>('importar_backup_cmd', {
                backupPath: selected
            })

            toast.success(result)

            if (import.meta.env.DEV) {
                setImportLoading(false)
                toast.info(
                    'Reinicia manualmente la aplicación (Ctrl+C y pnpm dev) para aplicar los cambios'
                )
            } else {
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

    const handleDeleteDatabase = async () => {
        setDeleteLoading(true)
        try {
            const result = await invoke<string>('borrar_base_datos_cmd')
            toast.success(result)
            setShowDeleteModal(false)

            if (import.meta.env.DEV) {
                toast.info(
                    'Reinicia manualmente la aplicación (Ctrl+C y pnpm dev) para crear una nueva base de datos'
                )
            } else {
                setTimeout(async () => {
                    await relaunch()
                }, 2000)
            }
        } catch (error) {
            console.error('Error al borrar base de datos:', error)
            toast.error(`Error al borrar: ${error}`)
        } finally {
            setDeleteLoading(false)
        }
    }

    // ─── Gestión de cambio de ruta de datos ──────────────────────────────────

    const handleSelectNewDataDir = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Seleccionar carpeta de datos'
            })

            if (!selected) return

            const newDir = selected as string

            // Comprobar si hay conflicto de BD
            const check = await invoke<CheckDataDirResult>(
                'check_new_data_dir_cmd',
                {
                    newDir
                }
            )

            if (check.db_exists_in_new_dir) {
                // Hay conflicto: preguntar al usuario qué BD usar
                setPendingChange({ new_dir: newDir })
                setChangeStep('conflict')
            } else {
                // Sin conflicto: ir directamente a confirmación
                setPendingChange({
                    new_dir: newDir,
                    use_existing_db: undefined
                })
                setChangeStep('confirm')
            }
        } catch (error) {
            console.error('Error al seleccionar carpeta:', error)
            toast.error('Error al seleccionar la carpeta')
        }
    }

    const handleConflictChoice = (useExisting: boolean) => {
        if (!pendingChange) return
        setPendingChange({ ...pendingChange, use_existing_db: useExisting })
        setChangeStep('confirm')
    }

    const handleApplyChange = async () => {
        if (!pendingChange) return
        setApplyingChange(true)
        try {
            const result = await invoke<string>('apply_data_dir_change_cmd', {
                newDir: pendingChange.new_dir,
                useExistingDb:
                    pendingChange.use_existing_db !== undefined
                        ? pendingChange.use_existing_db
                        : null
            })

            toast.success(result)
            setChangeStep('idle')
            setPendingChange(null)

            if (import.meta.env.DEV) {
                toast.info(
                    'Reinicia manualmente la aplicación (Ctrl+C y pnpm dev) para usar la nueva ruta'
                )
                setApplyingChange(false)
                await loadDataDirConfig()
            } else {
                setTimeout(async () => {
                    await relaunch()
                }, 2000)
            }
        } catch (error) {
            console.error('Error al aplicar cambio de ruta:', error)
            toast.error(`Error al cambiar la ruta: ${error}`)
            setApplyingChange(false)
        }
    }

    const handleCancelChange = () => {
        setChangeStep('idle')
        setPendingChange(null)
    }

    const handleResetDataDir = async () => {
        setResetLoading(true)
        try {
            const result = await invoke<string>('reset_data_dir_cmd')
            toast.success(result)

            if (import.meta.env.DEV) {
                toast.info(
                    'Reinicia manualmente la aplicación (Ctrl+C y pnpm dev) para volver a la ruta por defecto'
                )
                setResetLoading(false)
                await loadDataDirConfig()
            } else {
                setTimeout(async () => {
                    await relaunch()
                }, 2000)
            }
        } catch (error) {
            console.error('Error al restablecer ruta:', error)
            toast.error(`Error al restablecer la ruta: ${error}`)
            setResetLoading(false)
        }
    }

    // ─── Helpers de texto para el modal de confirmación ──────────────────────

    const getConfirmTitle = () => {
        if (!pendingChange) return ''
        if (pendingChange.use_existing_db === undefined) {
            return 'Confirmar cambio de ruta de datos'
        }
        return pendingChange.use_existing_db
            ? 'Usar base de datos existente'
            : 'Usar base de datos actual'
    }

    const getConfirmDescription = () => {
        if (!pendingChange) return null
        const { new_dir, use_existing_db } = pendingChange

        if (use_existing_db === undefined) {
            return (
                <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                    <li>
                        La base de datos actual se copiará a{' '}
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                            {new_dir}
                        </span>
                    </li>
                    <li>La ruta por defecto no se modificará</li>
                    <li>La aplicación se reiniciará automáticamente</li>
                </ul>
            )
        }

        if (use_existing_db) {
            return (
                <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                    <li>
                        Se usará la base de datos que ya existe en{' '}
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                            {new_dir}
                        </span>
                    </li>
                    <li>
                        Se creará una copia de seguridad (<code>.zst</code>) de
                        la base de datos actual en tu carpeta de Descargas
                    </li>
                    <li>La aplicación se reiniciará automáticamente</li>
                </ul>
            )
        }

        return (
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                <li>
                    Se usará tu base de datos actual, que se copiará a{' '}
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                        {new_dir}
                    </span>
                </li>
                <li>
                    La base de datos que ya existía en esa carpeta se renombrará
                    a <code>hermanar.db.backup</code>
                </li>
                <li>La aplicación se reiniciará automáticamente</li>
            </ul>
        )
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

            {/* Overlay de carga durante cambio de ruta */}
            {applyingChange && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <FolderCog className="w-16 h-16 mx-auto mb-4 text-indigo-600 animate-pulse" />
                            <h2 className="text-2xl font-bold mb-2">
                                Cambiando Ruta de Datos
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Copiando archivos y guardando configuración...
                            </p>
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

            {/* ─── Ruta de Datos ─────────────────────────────────────────────── */}
            <Card className="mt-6 p-6">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <FolderCog className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-semibold">Ruta de Datos</h2>
                    </div>
                    <p className="text-sm text-gray-600">
                        Directorio donde se almacenan la base de datos y los
                        archivos de configuración de la aplicación.
                    </p>
                </div>

                {dataDirConfig ? (
                    <div className="space-y-4">
                        {/* Ruta actual */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                {dataDirConfig.is_custom ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Personalizada
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                        Por defecto
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-mono text-gray-800 break-all">
                                {dataDirConfig.current_dir}
                            </p>
                            {dataDirConfig.is_custom && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Ruta por defecto:{' '}
                                    <span className="font-mono">
                                        {dataDirConfig.default_dir}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={handleSelectNewDataDir}
                                variant="outline"
                                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                            >
                                <FolderCog className="w-4 h-4 mr-2" />
                                Cambiar Ruta
                            </Button>

                            {dataDirConfig.is_custom && (
                                <Button
                                    onClick={handleResetDataDir}
                                    disabled={resetLoading}
                                    variant="outline"
                                    className="border-gray-500 text-gray-600 hover:bg-gray-100"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    {resetLoading
                                        ? 'Restableciendo...'
                                        : 'Restablecer por defecto'}
                                </Button>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                                <li>
                                    La configuración de la ruta siempre se
                                    guarda en el directorio por defecto del
                                    sistema
                                </li>
                                <li>
                                    Los backups exportados manualmente siempre
                                    van a tu carpeta de Descargas
                                </li>
                                <li>
                                    Cambiar la ruta requiere reiniciar la
                                    aplicación
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                    </div>
                )}
            </Card>

            {/* Borrar Base de Datos */}
            <Card className="mt-6 p-6 border-red-200 bg-red-50">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
                            <Trash2 className="w-5 h-5" />
                            Zona Peligrosa
                        </h3>
                        <p className="text-sm text-red-700 mb-4">
                            Borrar permanentemente todos los datos de la
                            aplicación. Se creará un backup automático antes de
                            borrar.
                        </p>
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-800 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    <strong>Precaución:</strong> Se eliminarán
                                    todos los hermanos, familias y cuotas. Se
                                    creará un backup automático en la carpeta de
                                    Descargas.
                                </span>
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowDeleteModal(true)}
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-100"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Borrar Base de Datos
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Modal de confirmación de borrado */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => !deleteLoading && setShowDeleteModal(false)}
                title="¿Borrar Base de Datos?"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                        <p className="text-blue-800 font-semibold mb-1">
                            Backup Automático
                        </p>
                        <p className="text-sm text-blue-700">
                            Antes de borrar, se creará automáticamente una copia
                            de seguridad en tu carpeta de Descargas.
                        </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 font-semibold mb-2">
                            Esta acción es irreversible
                        </p>
                        <p className="text-sm text-red-700">
                            Se eliminarán permanentemente:
                        </p>
                        <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                            <li>Todos los hermanos registrados</li>
                            <li>Todas las familias</li>
                            <li>Todas las cuotas y pagos</li>
                            <li>Todos los recibos generados</li>
                        </ul>
                    </div>

                    <p className="text-sm text-gray-600">
                        Después de borrar la base de datos, la aplicación se
                        reiniciará con una base de datos vacía.
                    </p>

                    <div className="flex gap-3 justify-end">
                        <Button
                            onClick={() => setShowDeleteModal(false)}
                            variant="outline"
                            disabled={deleteLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeleteDatabase}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleteLoading ? (
                                'Borrando...'
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Sí, Borrar Todo
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ─── Modal de conflicto de BD ─────────────────────────────────── */}
            <Modal
                isOpen={changeStep === 'conflict'}
                onClose={handleCancelChange}
                title="Ya existe una base de datos en esa carpeta"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Se ha encontrado una base de datos existente en la
                        carpeta seleccionada. ¿Cuál deseas usar?
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                            Se creará una copia de seguridad de la base de datos
                            que <strong>no</strong> vayas a usar antes de
                            continuar.
                        </p>
                    </div>

                    {pendingChange && (
                        <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded p-2 break-all">
                            Carpeta seleccionada: {pendingChange.new_dir}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Opción A: usar la BD actual */}
                        <button
                            onClick={() => handleConflictChoice(false)}
                            className="text-left border-2 border-indigo-200 hover:border-indigo-500 rounded-lg p-4 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-700">
                                    Base de datos actual
                                </span>
                            </div>
                            <p className="text-xs text-gray-600">
                                La base de datos que estás usando ahora. La
                                existente en la nueva carpeta se renombrará a{' '}
                                <code>hermanar.db.backup</code>.
                            </p>
                        </button>

                        {/* Opción B: usar la BD existente en el nuevo dir */}
                        <button
                            onClick={() => handleConflictChoice(true)}
                            className="text-left border-2 border-green-200 hover:border-green-500 rounded-lg p-4 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <FolderOpen className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-700">
                                    Base de datos existente
                                </span>
                            </div>
                            <p className="text-xs text-gray-600">
                                La que ya existe en la carpeta seleccionada. Se
                                guardará un backup <code>.zst</code> de la
                                actual en tu carpeta de Descargas.
                            </p>
                        </button>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button onClick={handleCancelChange} variant="outline">
                            Cancelar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ─── Modal de confirmación final ──────────────────────────────── */}
            <Modal
                isOpen={changeStep === 'confirm'}
                onClose={handleCancelChange}
                title={getConfirmTitle()}
            >
                <div className="space-y-4">
                    <p className="text-gray-700 font-medium">
                        Resumen de acciones:
                    </p>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        {getConfirmDescription()}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                            La aplicación se reiniciará al finalizar. No cierres
                            la ventana mientras se realiza el cambio.
                        </p>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <Button onClick={handleCancelChange} variant="outline">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApplyChange}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirmar y cambiar
                        </Button>
                    </div>
                </div>
            </Modal>

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
