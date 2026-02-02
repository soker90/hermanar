import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Users, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface GenerarCuotasProps {
    onCuotasGenerated: () => void
}

export function GenerarCuotas({ onCuotasGenerated }: GenerarCuotasProps) {
    const [anio, setAnio] = useState(new Date().getFullYear())
    const [importe, setImporte] = useState(5)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [resultado, setResultado] = useState<{
        tipo: 'success' | 'error'
        mensaje: string
        cuotasCreadas?: number
    } | null>(null)

    const handleGenerar = async () => {
        if (!anio || !importe) {
            setResultado({
                tipo: 'error',
                mensaje: 'Por favor, completa todos los campos'
            })
            return
        }

        if (importe <= 0) {
            setResultado({
                tipo: 'error',
                mensaje: 'El importe debe ser mayor que 0'
            })
            return
        }

        setShowConfirmModal(true)
    }

    const handleConfirmarGeneracion = async () => {
        setShowConfirmModal(false)
        setIsGenerating(true)
        setResultado(null)

        try {
            const cuotasCreadas = await invoke<number>(
                'generar_cuotas_anio_cmd',
                {
                    anio,
                    importe
                }
            )

            if (cuotasCreadas > 0) {
                setResultado({
                    tipo: 'success',
                    mensaje: `Se han generado ${cuotasCreadas} cuotas correctamente`,
                    cuotasCreadas
                })
                onCuotasGenerated()
            } else {
                setResultado({
                    tipo: 'error',
                    mensaje:
                        'No se generaron cuotas. Es posible que ya existan para este período.'
                })
            }
        } catch (error) {
            setResultado({
                tipo: 'error',
                mensaje: `Error al generar las cuotas: ${error}`
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <>
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirmar Generación de Cuotas"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-amber-800 mb-2">
                                    Esta acción no se puede deshacer
                                </h4>
                                <p className="text-sm text-amber-700">
                                    Se generarán cuotas anuales para todos los
                                    hermanos activos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">
                                Año:
                            </span>
                            <span className="text-lg font-semibold text-gray-900">
                                {anio}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">
                                Importe anual:
                            </span>
                            <span className="text-lg font-semibold text-gray-900">
                                €{importe.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <Button
                            onClick={() => setShowConfirmModal(false)}
                            className="bg-gray-500 hover:bg-gray-600"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmarGeneracion}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar y Generar
                        </Button>
                    </div>
                </div>
            </Modal>

            <Card
                title="Generar Cuotas Automáticamente"
                subtitle="Crear cuotas anuales para todos los hermanos activos"
            >
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-800 mb-1">
                                    Información importante
                                </h4>
                                <p className="text-sm text-blue-700">
                                    Esta función genera automáticamente cuotas
                                    anuales para todos los hermanos activos del
                                    año seleccionado. Si ya existen cuotas para
                                    algunos hermanos en ese año, no se crearán
                                    duplicados.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Año"
                            type="number"
                            value={anio}
                            onChange={(e) => setAnio(parseInt(e.target.value))}
                            min={2020}
                            max={2050}
                        />

                        <Input
                            label="Importe Anual (€)"
                            type="number"
                            value={importe}
                            onChange={(e) =>
                                setImporte(parseFloat(e.target.value))
                            }
                            min={0}
                            step={0.01}
                        />
                    </div>

                    {resultado && (
                        <div
                            className={`border rounded-lg p-4 ${
                                resultado.tipo === 'success'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                {resultado.tipo === 'success' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                )}
                                <div>
                                    <p
                                        className={`text-sm font-medium ${
                                            resultado.tipo === 'success'
                                                ? 'text-green-800'
                                                : 'text-red-800'
                                        }`}
                                    >
                                        {resultado.mensaje}
                                    </p>
                                    {resultado.cuotasCreadas !== undefined && (
                                        <p className="text-sm text-green-700 mt-1">
                                            Total de cuotas generadas:{' '}
                                            {resultado.cuotasCreadas}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3">
                        <Button onClick={handleGenerar} disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Users className="h-4 w-4 mr-2" />
                                    Generar Cuotas
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </>
    )
}
