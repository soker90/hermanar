import { createContext, useContext, ReactNode } from 'react'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface ToastContextType {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const { toasts, closeToast, success, error, warning, info } = useToast()

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onClose={closeToast} />
        </ToastContext.Provider>
    )
}

export const useToastContext = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToastContext debe usarse dentro de ToastProvider')
    }
    return context
}
