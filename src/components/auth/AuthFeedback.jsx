export default function AuthFeedback({ error, success }) {
  if (!error && !success) return null

  return (
    <p
      className={`rounded-lg px-3 py-2.5 text-sm leading-5 ${
        error ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand-dark'
      }`}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      {error || success}
    </p>
  )
}
