import { useEffect } from 'react'
import './SuccessToast.css'

export default function SuccessToast({ message, emoji, onClose, duration = 3000 }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    return (
        <div className="success-toast">
            <div className="toast-content">
                <span className="toast-emoji">{emoji}</span>
                <span className="toast-message">{message}</span>
                <button className="toast-close" onClick={onClose}>×</button>
            </div>
        </div>
    )
}
