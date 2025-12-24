import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth({ onLogin }) {
    const [token, setToken] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState('')

    const getDeviceId = () => {
        let deviceId = localStorage.getItem('vaultify_device_id')
        if (!deviceId) {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                deviceId = crypto.randomUUID()
            } else {
                deviceId = 'dev-' + Math.random().toString(36).substring(2) + Date.now().toString(36)
            }
            localStorage.setItem('vaultify_device_id', deviceId)
        }
        return deviceId
    }

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const deviceId = getDeviceId()

        try {
            if (isSignUp) {
                // 1. Sign Up: Insert the token directly into our table with this device locked
                const { error } = await supabase
                    .from('user_tokens')
                    .insert([{ token, active_device_id: deviceId }])

                if (error) {
                    if (error.code === '23505') throw new Error('This token is already taken.')
                    throw error
                }

                setMessage('Token created! You can now enter.')
                setIsSignUp(false)
                // Optional: Auto-login after signup could be added, but user flow expects manual toggle or entry
            } else {
                // 2. Sign In: Secure Login via RPC
                // We use an RPC function to check atomicity and enforce single session
                const { data: status, error } = await supabase
                    .rpc('login_active_session', {
                        p_token: token,
                        p_device_id: deviceId
                    })

                if (error) {
                    // Fallback if RPC doesn't exist yet (user needs to run migration)
                    // We can try standard login check but warn user, or just throw error
                    console.error("RPC Error (did you run migration?):", error)
                    throw new Error('System update required. Please keep your token and contact support.')
                }

                if (status === 'INVALID_TOKEN') {
                    throw new Error('Invalid Token. Please create one first.')
                }

                if (status === 'LOCKED_BY_OTHER_DEVICE') {
                    throw new Error('⚠️ Access Denied: This token is currently logged in on another device. Please log out from that device first.')
                }

                if (status === 'SUCCESS') {
                    // Success! Pass token up to App
                    onLogin(token)
                } else {
                    throw new Error('Unexpected login status: ' + status)
                }
            }
        } catch (error) {
            console.error('Auth Error:', error)
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="title">Vaultify</h1>
                <p className="auth-subtitle">
                    {isSignUp ? 'Create a new Access Token' : 'Enter your Access Token'}
                </p>

                <form onSubmit={handleAuth} className="auth-form">
                    <div className="form-group">
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. mysecret123"
                            value={token}
                            onChange={(e) => {
                                setToken(e.target.value)
                                setMessage('')
                            }}
                            required
                            minLength={4}
                        />
                    </div>

                    {message && <div className="auth-message">{message}</div>}

                    <button className="add-btn auth-btn" disabled={loading}>
                        {loading ? 'Loading...' : isSignUp ? 'Create Token' : 'Enter Vault'}
                    </button>
                </form>

                <button
                    className="text-btn"
                    onClick={() => setIsSignUp(!isSignUp)}
                >
                    {isSignUp ? 'Already have a token? Enter Vault' : "New here? Create Token"}
                </button>
            </div>
        </div>
    )
}
