'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
          },
        })
        if (error) throw error
        setMessage('Check your email for a confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push(redirect)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <header className="auth-card__header">
        <h1 className="auth-card__title">
          {isSignUp ? 'Join VenuePro' : 'Welcome Back'}
        </h1>
        <p className="auth-card__subtitle">
          {isSignUp ? 'Create your premium venue account' : 'Sign in to access your dashboard'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form__group">
          <label className="auth-form__label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="auth-form__input"
            placeholder="name@venue.com"
          />
        </div>

        <div className="auth-form__group">
          <div className="auth-form__label-row">
            <label className="auth-form__label">Password</label>
            {!isSignUp && (
              <Link href="/forgot-password" className="auth-form__forgot">
                Forgot?
              </Link>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
            className="auth-form__input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="auth-form__error">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-form__success">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? (
            <span>Loading...</span>
          ) : (
            isSignUp ? 'Create Account' : 'Sign In'
          )}
        </button>

        <div className="auth-form__toggle">
          <button
            type="button"
            className="auth-form__toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </form>
    </div>
  )
}
