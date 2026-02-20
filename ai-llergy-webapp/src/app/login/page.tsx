import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={
        <div className="auth-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
