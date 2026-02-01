import { Outlet } from 'react-router'
import { Users, Building2, Euro, Home, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { invoke } from '@tauri-apps/api/core'

export function Component() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [version, setVersion] = useState('...')
    const location = useLocation()

    useEffect(() => {
        invoke<string>('get_app_version').then(setVersion).catch(console.error)
    }, [])

    const navigation = [
        {
            name: 'Dashboard',
            path: '/',
            icon: Home,
            description: 'Vista general'
        },
        {
            name: 'Hermanos',
            path: '/hermanos',
            icon: Users,
            description: 'Gestión de hermanos'
        },
        {
            name: 'Familias',
            path: '/familias',
            icon: Building2,
            description: 'Gestión de familias'
        },
        {
            name: 'Gestión Cuotas',
            path: '/cuotas/gestion',
            icon: Euro,
            description: 'Generar y gestionar'
        }
    ]

    const getCurrentSectionName = () => {
        const section = navigation.find((nav) => nav.path === location.pathname)
        return section?.name || 'Hermanar'
    }

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-auto ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo/Header */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                        <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="ml-3 text-xl font-semibold text-gray-900">
                                Hermanar
                            </h1>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.path

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        isActive
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 mr-3" />
                                    <div className="text-left">
                                        <div>{item.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {item.description}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500 text-center">
                            Sistema de Gestión de Hermandades
                        </div>
                        <div className="text-xs text-gray-400 text-center mt-1">
                            v{version}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-900"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex items-center">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {getCurrentSectionName()}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
