import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'

const createAppRouter = () =>
    createBrowserRouter([
        {
            path: '/',
            lazy: () => import('@/app/routes/layout'),
            children: [
                {
                    index: true,
                    lazy: () => import('@/app/routes/home')
                },
                {
                    path: 'hermanos',
                    lazy: () => import('@/app/routes/hermanos/index')
                },
                {
                    path: 'hermanos/nuevo',
                    lazy: () => import('@/app/routes/hermanos/nuevo')
                },
                {
                    path: 'hermanos/:id',
                    lazy: () => import('@/app/routes/hermanos/detalle')
                },
                {
                    path: 'hermanos/:id/editar',
                    lazy: () => import('@/app/routes/hermanos/editar')
                },
                {
                    path: 'familias',
                    lazy: () => import('@/app/routes/familias/index')
                },
                {
                    path: 'familias/nueva',
                    lazy: () => import('@/app/routes/familias/nueva')
                },
                {
                    path: 'familias/:id/editar',
                    lazy: () => import('@/app/routes/familias/editar')
                },
                {
                    path: 'cuotas',
                    element: <Navigate to="/cuotas/gestion" replace />
                },
                {
                    path: 'cuotas/gestion',
                    lazy: () => import('@/app/routes/cuotas/gestion')
                },
                {
                    path: 'cuotas/pagar',
                    lazy: () => import('@/app/routes/cuotas/pagar')
                },
                {
                    path: 'cuotas/recibos',
                    lazy: () => import('@/app/routes/cuotas/recibos')
                },
                {
                    path: 'cuotas/nueva',
                    lazy: () => import('@/app/routes/cuotas/nueva')
                },
                {
                    path: 'cuotas/:id/editar',
                    lazy: () => import('@/app/routes/cuotas/editar')
                }
            ]
        },
        {
            path: '*',
            lazy: () => import('@/app/routes/not-found')
        }
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
