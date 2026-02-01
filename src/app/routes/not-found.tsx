import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router'

export default function NotFoundErrorPage() {
    const navigate = useNavigate()
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
                <h1 className="text-6xl font-bold text-gray-900">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700">
                    Página no encontrada
                </h2>
                <p className="text-gray-600">
                    Lo sentimos, no pudimos encontrar la página que buscas.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                    <Button size="lg" onClick={() => navigate(-1)}>
                        Volver atrás
                    </Button>
                    <Button
                        size="lg"
                        variant="ghost"
                        onClick={() => navigate('/')}
                    >
                        Ir al inicio
                    </Button>
                </div>
            </div>
        </div>
    )
}

// Necessary for react router to lazy load.
export const Component = NotFoundErrorPage
