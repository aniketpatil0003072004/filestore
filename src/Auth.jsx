import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth({ onLogin }) {
    const [token, setToken] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState('')

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (isSignUp) {
                // 1. Sign Up: Insert the token directly into our table
                const { error } = await supabase
                    .from('user_tokens')
                    .insert([{ token }])

                if (error) {
                    if (error.code === '23505') throw new Error('This token is already taken.')
                    throw error
                }

                setMessage('Token created! You can now enter.')
                setIsSignUp(false)
            } else {
                // 2. Sign In: Check if token exists
                const { data, error } = await supabase
                    .from('user_tokens')
                    .select('token')
                    .eq('token', token)
                    .single()

                if (error || !data) {
                    throw new Error('Invalid Token. Please create one first.')
                }

                // Success! Pass token up to App
                onLogin(token)
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
                <h1 className="title">Video Vault</h1>
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
