import { Card } from '@/components/ui/card'
import { Users, Building2, Euro, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { DashboardStats } from '@/types'

export function HomePage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            const [hermanos, cuotasStats] = await Promise.all([
                invoke<Array<{ activo: boolean }>>('get_all_hermanos_cmd'),
                invoke<{
                    total_recaudado: number
                    cuotas_pendientes: number
                    cuotas_pagadas: number
                    hermanos_al_dia: number
                    hermanos_morosos: number
                }>('get_estadisticas_cuotas_cmd', {
                    anio: new Date().getFullYear()
                })
            ])

            const hermanos_activos = hermanos.filter((h) => h.activo).length

            setStats({
                total_hermanos: hermanos.length,
                hermanos_activos,
                hermanos_inactivos: hermanos.length - hermanos_activos,
                nuevas_altas_mes: 0,
                cuotas_pendientes_anio: cuotasStats.cuotas_pendientes || 0,
                estadisticas_cuotas: cuotasStats
            })
        } catch (error) {
            console.error('Error loading stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">Vista general del sistema</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-linear-to-br from-blue-50 to-blue-100">
                    <div className="flex items-center">
                        <div className="shrink-0">
                            <Users className="h-10 w-10 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                                Total Hermanos
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.total_hermanos || 0}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-linear-to-br from-green-50 to-green-100">
                    <div className="flex items-center">
                        <div className="shrink-0">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                                Hermanos Activos
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.hermanos_activos || 0}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-linear-to-br from-purple-50 to-purple-100">
                    <div className="flex items-center">
                        <div className="shrink-0">
                            <Building2 className="h-10 w-10 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                                Familias
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                0
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="bg-linear-to-br from-orange-50 to-orange-100">
                    <div className="flex items-center">
                        <div className="shrink-0">
                            <Euro className="h-10 w-10 text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                                Cuotas Pendientes
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.cuotas_pendientes_anio || 0}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card title="Estadísticas de Cuotas">
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-gray-600">
                                Total Recaudado:
                            </span>
                            <span className="font-semibold">
                                {stats?.estadisticas_cuotas.total_recaudado?.toFixed(
                                    2
                                ) || '0.00'}{' '}
                                €
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">
                                Cuotas Pagadas:
                            </span>
                            <span className="font-semibold text-green-600">
                                {stats?.estadisticas_cuotas.cuotas_pagadas || 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">
                                Cuotas Pendientes:
                            </span>
                            <span className="font-semibold text-red-600">
                                {stats?.estadisticas_cuotas.cuotas_pendientes ||
                                    0}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card title="Estado de Hermanos">
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Al día:</span>
                            <span className="font-semibold text-green-600">
                                {stats?.estadisticas_cuotas.hermanos_al_dia ||
                                    0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Morosos:</span>
                            <span className="font-semibold text-red-600">
                                {stats?.estadisticas_cuotas.hermanos_morosos ||
                                    0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Inactivos:</span>
                            <span className="font-semibold text-gray-600">
                                {stats?.hermanos_inactivos || 0}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

// Necessary for react router to lazy load.
export const Component = HomePage
