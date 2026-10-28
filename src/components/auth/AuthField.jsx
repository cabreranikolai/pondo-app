import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthField({
  label,
  type = 'text',
  autoComplete,
  value,
  onChange,
  required = true,
  minLength,
  inputMode,
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const id = `auth-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={isPassword && passwordVisible ? 'text' : type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          inputMode={inputMode}
          className={`min-h-11 w-full rounded-lg border border-line bg-white py-2 pl-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15 ${isPassword ? 'pr-12' : 'pr-3'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-r-lg text-muted transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
