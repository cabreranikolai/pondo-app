import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleAlert, Goal, Minus, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import { useAuth } from '../contexts/authContext.js'
import { centsToDecimal, formatCents, toCents } from '../lib/money.js'
import { supabase } from '../lib/supabase.js'

function isGoalsMigrationError(error) {
  const details = [error?.code, error?.message, error?.details, error?.hint]
    .join(' ')
    .toLowerCase()
  return (
    details.includes('savings_goals') ||
    details.includes('adjust_savings_goal') ||
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST205'
  )
}

function dateLabel(date) {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? null
    : new Intl.DateTimeFormat('en-PH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parsed)
}

function GoalForm({ goal, busy, error, onCancel, onSubmit }) {
  const [name, setName] = useState(goal?.name || '')
  const [targetAmount, setTargetAmount] = useState(String(goal?.target_amount || ''))
  const [targetDate, setTargetDate] = useState(goal?.target_date || '')
  const [validationError, setValidationError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    const targetCents = toCents(targetAmount)
    if (!trimmedName || trimmedName.length > 80) {
      setValidationError('Enter a goal name up to 80 characters long.')
      return
    }
    if (targetCents === null || targetCents <= 0n) {
      setValidationError('Enter a target greater than zero with up to 2 decimal places.')
      return
    }
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setValidationError('Choose a valid target date.')
      return
    }

    onSubmit({
      name: trimmedName,
      target_amount: centsToDecimal(targetCents),
      target_date: targetDate || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-form-title"
        className="max-h-[88dvh] w-full overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-xl sm:max-h-[92vh] sm:max-w-lg sm:p-7"
      >
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Plan ahead</p>
            <h2 id="goal-form-title" className="mt-1 text-xl font-semibold text-ink">
              {goal ? 'Edit savings goal' : 'Create savings goal'}
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              Set a target and track your progress over time.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close goal form"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="goal-name" className="mb-1.5 block text-sm font-medium text-ink">
              Goal name
            </label>
            <input
              id="goal-name"
              autoFocus
              autoComplete="off"
              maxLength={80}
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setValidationError('')
              }}
              placeholder="e.g. Emergency fund"
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          <div>
            <label htmlFor="goal-target" className="mb-1.5 block text-sm font-medium text-ink">
              Savings target
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <span className="pl-3 text-sm text-muted">₱</span>
              <input
                id="goal-target"
                inputMode="decimal"
                autoComplete="off"
                required
                value={targetAmount}
                onChange={(event) => {
                  setTargetAmount(event.target.value)
                  setValidationError('')
                }}
                aria-describedby="goal-target-help"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none"
              />
              <span className="pr-3 text-xs text-muted">PHP</span>
            </div>
            <p id="goal-target-help" className="mt-1.5 text-xs text-muted">
              Enter a positive amount with up to 2 decimal places.
            </p>
          </div>

          <div>
            <label htmlFor="goal-date" className="mb-1.5 block text-sm font-medium text-ink">
              Target date <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(event) => {
                setTargetDate(event.target.value)
                setValidationError('')
              }}
              className="min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {validationError || error}
            </p>
          )}

          <div className="flex gap-2 pt-1 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-50 sm:flex-none sm:px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-4"
            >
              {busy ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function GoalProgressForm({ goal, busy, error, onCancel, onSubmit }) {
  const [action, setAction] = useState('ADD')
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState('')
  const savedCents = toCents(goal.amount_saved) ?? 0n

  function handleSubmit(event) {
    event.preventDefault()
    const amountCents = toCents(amount)
    if (amountCents === null || amountCents <= 0n) {
      setValidationError('Enter an amount greater than zero with up to 2 decimal places.')
      return
    }
    if (action === 'WITHDRAW' && amountCents > savedCents) {
      setValidationError('You cannot withdraw more than the amount saved for this goal.')
      return
    }

    onSubmit({
      p_goal_id: goal.id,
      p_amount: centsToDecimal(amountCents),
      p_action: action,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-progress-title"
        className="w-full rounded-2xl bg-white p-4 shadow-xl sm:max-w-md sm:p-7"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Update progress</p>
            <h2 id="goal-progress-title" className="mt-1 text-xl font-semibold text-ink">
              {goal.name}
            </h2>
            <p className="mt-1 text-sm text-muted">Currently saved: {formatCents(savedCents)}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close progress form"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Progress update</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ADD', label: 'Add money', icon: Plus },
                { value: 'WITHDRAW', label: 'Withdraw', icon: Minus },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={action === item.value}
                    onClick={() => {
                      setAction(item.value)
                      setValidationError('')
                    }}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                      action === item.value
                        ? 'border-brand bg-brand-soft text-brand-dark'
                        : 'border-line text-muted hover:bg-canvas'
                    }`}
                  >
                    <Icon aria-hidden="true" size={16} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="goal-progress-amount" className="mb-1.5 block text-sm font-medium text-ink">
              Amount
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
              <span className="pl-3 text-sm text-muted">₱</span>
              <input
                id="goal-progress-amount"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                required
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setValidationError('')
                }}
                className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none"
              />
              <span className="pr-3 text-xs text-muted">PHP</span>
            </div>
          </div>

          {(validationError || error) && (
            <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              {validationError || error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm font-medium text-muted hover:bg-canvas disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 flex-1 rounded-lg bg-brand px-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? 'Saving…' : action === 'ADD' ? 'Add money' : 'Withdraw'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function GoalCard({ goal, busy, onEdit, onDelete, onProgress }) {
  const targetCents = toCents(goal.target_amount) ?? 0n
  const savedCents = toCents(goal.amount_saved) ?? 0n
  const remainingCents = targetCents > savedCents ? targetCents - savedCents : 0n
  const percent = targetCents > 0n
    ? Math.min(Number((savedCents * 10000n) / targetCents) / 100, 100)
    : 0
  const targetDateText = dateLabel(goal.target_date)
  const isComplete = savedCents >= targetCents

  return (
    <article className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Goal aria-hidden="true" size={21} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-ink">{goal.name}</h2>
          {targetDateText ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <CalendarDays aria-hidden="true" size={13} />
              Target {targetDateText}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">No target date</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            disabled={busy}
            aria-label={`Edit ${goal.name}`}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            <Pencil aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            disabled={busy}
            aria-label={`Delete ${goal.name}`}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Saved so far</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {formatCents(savedCents)}
          </p>
        </div>
        <p className="shrink-0 text-right text-xs text-muted">
          of <span className="font-semibold text-ink">{formatCents(targetCents)}</span>
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-label={`${goal.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${isComplete ? 'bg-brand-dark' : 'bg-brand'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={isComplete ? 'font-semibold text-brand-dark' : 'text-muted'}>
          {isComplete ? 'Goal reached' : `${percent.toFixed(0)}% complete`}
        </span>
        {!isComplete && <span className="text-muted">{formatCents(remainingCents)} to go</span>}
      </div>

      <button
        type="button"
        onClick={() => onProgress(goal)}
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        {isComplete ? <Target aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
        {isComplete ? 'Adjust saved amount' : 'Update progress'}
      </button>
    </article>
  )
}

export default function Goals() {
  const { user } = useAuth()
  const userId = user?.id
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [dialogGoal, setDialogGoal] = useState(null)
  const [progressGoal, setProgressGoal] = useState(null)

  const loadGoals = useCallback(async () => {
    if (!userId) {
      setGoals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, name, target_amount, amount_saved, target_date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setGoals([])
      setPageError(
        isGoalsMigrationError(error)
          ? 'Apply the savings goals migration in Supabase before using this feature.'
          : 'Unable to load savings goals. Check your connection and try again.',
      )
    } else {
      setGoals(data || [])
      setPageError('')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadGoals(), 0)
    return () => window.clearTimeout(timer)
  }, [loadGoals])

  const totals = useMemo(
    () =>
      goals.reduce(
        (total, goal) => ({
          saved: total.saved + (toCents(goal.amount_saved) ?? 0n),
          target: total.target + (toCents(goal.target_amount) ?? 0n),
        }),
        { saved: 0n, target: 0n },
      ),
    [goals],
  )

  async function saveGoal(payload) {
    if (!userId || busy) return
    setBusy(true)
    setFormError('')
    setPageError('')
    setSuccess('')
    try {
      if (dialogGoal) {
        const { data, error } = await supabase
          .from('savings_goals')
          .update(payload)
          .eq('id', dialogGoal.id)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('No savings goal was updated.')
        setSuccess('Savings goal updated.')
      } else {
        const { error } = await supabase.from('savings_goals').insert({
          ...payload,
          user_id: userId,
        })
        if (error) throw error
        setSuccess('Savings goal created.')
      }
      setDialogGoal(null)
      await loadGoals()
    } catch (error) {
      setFormError(
        isGoalsMigrationError(error)
          ? 'Apply the savings goals migration in Supabase before using this feature.'
          : error?.code === '23514'
            ? 'The goal details did not meet the database requirements.'
            : 'Unable to save this goal. Check the details and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function updateProgress(payload) {
    if (!userId || busy) return
    setBusy(true)
    setFormError('')
    setPageError('')
    setSuccess('')
    try {
      const { error } = await supabase.rpc('adjust_savings_goal', payload)
      if (error) throw error
      setSuccess(payload.p_action === 'ADD' ? 'Goal contribution added.' : 'Goal amount withdrawn.')
      setProgressGoal(null)
      await loadGoals()
    } catch (error) {
      setFormError(
        isGoalsMigrationError(error)
          ? 'Apply the savings goals migration in Supabase before using this feature.'
          : error?.code === '23514'
            ? 'You cannot withdraw more than the amount saved for this goal.'
            : 'Unable to update goal progress. Check the amount and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteGoal(goal) {
    if (!userId || busy) return
    if (!window.confirm(`Delete “${goal.name}” and its saved progress? This cannot be undone.`)) return

    setBusy(true)
    setPageError('')
    setSuccess('')
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goal.id)
        .eq('user_id', userId)
      if (error) throw error
      setSuccess('Savings goal deleted.')
      await loadGoals()
    } catch (error) {
      setPageError(
        isGoalsMigrationError(error)
          ? 'Apply the savings goals migration in Supabase before using this feature.'
          : 'Unable to delete this goal. Check your connection and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Plan ahead"
        title="Savings goals"
        description="Set a target, track what you save, and celebrate your progress. Goal updates are separate from account balances and transactions."
        action={
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setDialogGoal(false)
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <Plus aria-hidden="true" size={17} />
            Add goal
          </button>
        }
      />

      {pageError && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>{pageError}</span>
          <button type="button" onClick={loadGoals} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}
      {success && !pageError && (
        <p className="mb-5 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-dark" role="status">
          {success}
        </p>
      )}

      {!loading && goals.length > 0 && (
        <section
          aria-label="Savings goal totals"
          className="mb-5 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 sm:p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <Target aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">Saved across goals</p>
              <p className="mt-0.5 text-lg font-semibold text-ink">{formatCents(totals.saved)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-muted">
              <Goal aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted">Combined target</p>
              <p className="mt-0.5 text-lg font-semibold text-ink">{formatCents(totals.target)}</p>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div
          className="grid min-h-48 place-items-center rounded-xl border border-line bg-white text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          Loading savings goals…
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Goal}
          title="Start with a savings goal"
          description="Create a goal for something you’re saving toward, then update its progress as you set money aside."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard
                goal={goal}
                busy={busy}
                onEdit={(item) => {
                  setFormError('')
                  setDialogGoal(item)
                }}
                onDelete={deleteGoal}
                onProgress={(item) => {
                  setFormError('')
                  setProgressGoal(item)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {dialogGoal !== null && (
        <GoalForm
          goal={dialogGoal || null}
          busy={busy}
          error={formError}
          onCancel={() => {
            if (!busy) setDialogGoal(null)
          }}
          onSubmit={saveGoal}
        />
      )}

      {progressGoal !== null && (
        <GoalProgressForm
          goal={progressGoal}
          busy={busy}
          error={formError}
          onCancel={() => {
            if (!busy) setProgressGoal(null)
          }}
          onSubmit={updateProgress}
        />
      )}
    </>
  )
}
