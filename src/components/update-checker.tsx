import { useEffect, useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { Button } from './ui/button'
import { Download, X, Loader2 } from 'lucide-react'

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [updateVersion, setUpdateVersion] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [showNotification, setShowNotification] = useState(false)

    useEffect(() => {
        checkForUpdates()
    }, [])

    const checkForUpdates = async () => {
        try {
            const update = await check()
            if (update?.available) {
                setUpdateAvailable(true)
                setUpdateVersion(update.version)
                setShowNotification(true)
            }
        } catch (error) {
            console.error('Error checking for updates:', error)
        }
    }

    const downloadAndInstall = async () => {
        try {
            setIsDownloading(true)
            const update = await check()

            if (!update?.available) {
                return
            }

            await update.downloadAndInstall((progress) => {
                if (progress.event === 'Started') {
                    setDownloadProgress(0)
                } else if (progress.event === 'Progress') {
                    const total = progress.data.chunkLength
                    // Estimación simple del progreso basada en chunks
                    setDownloadProgress(Math.min(total, 100))
                } else if (progress.event === 'Finished') {
                    setDownloadProgress(100)
                }
            })

            // Reiniciar la aplicación
            await relaunch()
        } catch (error) {
            console.error('Error downloading update:', error)
            setIsDownloading(false)
        }
    }

    if (!showNotification || !updateAvailable) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Download className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">
                                Nueva versión disponible
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            Versión {updateVersion} está lista para descargar
                        </p>

                        {isDownloading && (
                            <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                    <span>Descargando...</span>
                                    <span>{downloadProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${downloadProgress}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={downloadAndInstall}
                                disabled={isDownloading}
                                className="flex items-center gap-2"
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Descargando...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Actualizar ahora
                                    </>
                                )}
                            </Button>
                            {!isDownloading && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowNotification(false)}
                                >
                                    Más tarde
                                </Button>
                            )}
                        </div>
                    </div>

                    {!isDownloading && (
                        <button
                            onClick={() => setShowNotification(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
