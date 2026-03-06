import { ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/contexts/toast-context'

function AppErrorPage({ error }: { error: unknown }) {
    const message = error instanceof Error ? error.message : String(error)
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-red-600">Error</h1>
                <p className="text-gray-600">Ha ocurrido un error inesperado</p>
                <p className="text-sm text-gray-500">{message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Recargar aplicación
                </button>
            </div>
        </div>
    )
}

export default function AppProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<>Loading...</>}>
            <ErrorBoundary FallbackComponent={AppErrorPage}>
                <TooltipProvider>
                    <ToastProvider>{children}</ToastProvider>
                </TooltipProvider>
            </ErrorBoundary>
        </Suspense>
    )
}
