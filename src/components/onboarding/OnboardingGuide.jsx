import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  X,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandMark from '../ui/BrandMark.jsx'
import { supabase } from '../../lib/supabase.js'

const TOUR_STEPS = [
  {
    path: '/',
    selector: '[data-tour="dashboard-overview"]',
    title: 'Your money at a glance',
    description: 'See account balances, monthly cash flow, recent activity, and your budget progress together.',
  },
  {
    path: '/accounts',
    selector: '[data-tour="accounts-overview"]',
    title: 'Bring your accounts together',
    description: 'Add your cash, bank, and e-wallet accounts. Balances update from opening amounts and posted activity.',
  },
  {
    path: '/transactions',
    selector: '[data-tour="transaction-create"]',
    title: 'Record income and expenses',
    description: 'Choose a category, account, amount, and date to keep a clear record of money in and money out.',
  },
  {
    path: '/transactions',
    selector: '[data-tour="transaction-history"]',
    title: 'Review activity and transfers',
    description: 'Search and filter your history. Transfers move money between your own accounts without counting as income or expense.',
  },
  {
    path: '/budgets',
    selector: '[data-tour="budget-month"]',
    title: 'Plan and understand spending',
    description: 'Set an overall or category budget, then compare it with actual expenses. Reports show monthly trends and category spending.',
  },
  {
    path: '/settings',
    selector: '[data-tour="settings-help"]',
    title: 'Make Pondo yours',
    description: 'Manage your profile in Settings and return here whenever you want a refresher or the setup checklist.',
  },
]

const FEATURE_TASKS = [
  {
    key: 'accounts',
    title: 'Create your first account',
    description: 'Add a cash wallet, bank account, or e-wallet.',
    to: '/accounts',
  },
  {
    key: 'transactions',
    title: 'Record an initial transaction',
    description: 'Add real income, an expense, or a transfer.',
    to: '/transactions',
  },
  {
    key: 'budgets',
    title: 'Create a monthly budget',
    description: 'Set an overall limit or plan by expense category.',
    to: '/budgets',
  },
]

const PROGRESS_COLUMNS =
  'user_id, version, status, tutorial_step, checklist_dismissed'

function isMissingProgressTable(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return error?.code === '42P01' || message.includes('onboarding_progress')
}

function migrationMessage(error) {
  if (isMissingProgressTable(error)) {
    return 'Onboarding needs its database migration. Apply 20261027090000_onboarding_progress.sql in Supabase, then retry.'
  }
  return 'Unable to save onboarding progress. Check your connection and retry.'
}

function FocusDialog({ children, labelledBy, className = '', style, onEscape }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const firstFocusable = dialog?.querySelector(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)',
    )
    firstFocusable?.focus()
  }, [])

  function trapFocus(event) {
    if (event.key === 'Escape') {
      onEscape?.()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = [...dialogRef.current.querySelectorAll(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)',
    )]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className={className}
      style={style}
      onKeyDown={trapFocus}
    >
      {children}
    </section>
  )
}

function WelcomeDialog({ busy, error, onStart, onSkip, onRetry }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-ink/60 p-4">
      <FocusDialog
        labelledBy="onboarding-welcome-title"
        className="my-auto w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl sm:p-8"
        onEscape={onSkip}
      >
        <div className="mb-6 flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-semibold tracking-tight text-ink">Pondo</p>
            <p className="text-xs text-muted">Your Money, in Balance.</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Welcome to Pondo</p>
        <h1 id="onboarding-welcome-title" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          A calmer way to understand your money.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Keep your accounts, everyday activity, and monthly plans in one private workspace. Take a quick tour, then set things up when you’re ready.
        </p>
        {error && (
          <div className="mt-5 rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">
            <p className="flex items-start gap-2"><CircleAlert aria-hidden="true" size={17} className="mt-0.5 shrink-0" />{error}</p>
            <button type="button" onClick={onRetry} disabled={busy} className="mt-2 font-semibold underline disabled:opacity-50">
              Retry
            </button>
          </div>
        )}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Get Started'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-muted transition hover:bg-canvas disabled:opacity-60"
          >
            Skip Tutorial
          </button>
        </div>
      </FocusDialog>
    </div>
  )
}

function ChecklistDialog({ checks, loading, error, busy, onRetry, onDismiss }) {
  const completed = FEATURE_TASKS.filter((task) => checks[task.key]).length
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
      <FocusDialog
        labelledBy="onboarding-checklist-title"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-7"
        onEscape={onDismiss}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Your next steps</p>
            <h2 id="onboarding-checklist-title" className="mt-1 text-xl font-semibold text-ink">
              Make Pondo your own
            </h2>
            <p className="mt-1 text-sm leading-5 text-muted">
              No rush. Use your own information, and come back to this checklist whenever you like.
            </p>
          </div>
          <button type="button" onClick={onDismiss} disabled={busy} aria-label="Dismiss setup checklist" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas disabled:opacity-50">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs font-medium text-muted" role="status" aria-live="polite">
          {loading ? 'Checking your setup…' : `${completed} of ${FEATURE_TASKS.length} steps complete`}
        </p>
        {error && (
          <div className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry} disabled={loading} className="mt-2 font-semibold underline disabled:opacity-50">
              Retry check
            </button>
          </div>
        )}
        <ul className="space-y-2">
          {FEATURE_TASKS.map((task) => {
            const done = Boolean(checks[task.key])
            return (
              <li key={task.key}>
                <Link
                  to={task.to}
                  className="flex min-h-[68px] items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand/40 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${done ? 'bg-brand-soft text-brand-dark' : 'bg-canvas text-muted'}`}>
                    {done ? <Check aria-hidden="true" size={17} /> : <ArrowRight aria-hidden="true" size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{task.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">{task.description}</span>
                  </span>
                  {done && <span className="text-xs font-semibold text-brand-dark">Done</span>}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Done for now'}
          </button>
        </div>
      </FocusDialog>
    </div>
  )
}

function TourDialog({ step, stepIndex, error, busy, onBack, onNext, onSkip, onRetry }) {
  return (
    <FocusDialog
      labelledBy="onboarding-tour-title"
      className="w-full rounded-2xl border border-line bg-white p-4 shadow-2xl sm:p-5"
      onEscape={onSkip}
      style={{}}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <button type="button" onClick={onSkip} disabled={busy} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-canvas disabled:opacity-50">
          Skip tour
        </button>
      </div>
      <div
        className="mb-3 h-1.5 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-label="Guided tour progress"
        aria-valuemin={1}
        aria-valuemax={TOUR_STEPS.length}
        aria-valuenow={stepIndex + 1}
        aria-valuetext={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}
      >
        <div className="h-full rounded-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }} />
      </div>
      <h2 id="onboarding-tour-title" className="text-base font-semibold text-ink">{step.title}</h2>
      <p className="mt-1.5 text-sm leading-5 text-muted">{step.description}</p>
      {error && (
        <div className="mt-3 rounded-lg bg-danger-soft p-3 text-xs leading-5 text-danger" role="alert">
          {error}
          <button type="button" onClick={onRetry} disabled={busy} className="ml-2 font-semibold underline disabled:opacity-50">Retry</button>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={stepIndex === 0 || busy}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-muted hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Saving…' : stepIndex === TOUR_STEPS.length - 1 ? 'Finish tour' : 'Next'}
          {!busy && <ArrowRight aria-hidden="true" size={16} />}
        </button>
      </div>
    </FocusDialog>
  )
}

function TourOverlay({ step, stepIndex, error, busy, onBack, onNext, onSkip, onRetry }) {
  const [targetRect, setTargetRect] = useState(null)
  const [targetMissing, setTargetMissing] = useState(false)
  const cardRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname !== step.path) navigate(step.path)
  }, [location.pathname, navigate, step.path])

  useEffect(() => {
    let active = true
    let attempts = 0
    let frameId
    const resetId = window.setTimeout(() => {
      setTargetRect(null)
      setTargetMissing(false)
    }, 0)

    const findTarget = () => {
      if (!active) return
      const target = document.querySelector(step.selector)
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
        const rect = target.getBoundingClientRect()
        const top = Math.max(4, rect.top - 5)
        const left = Math.max(4, rect.left - 5)
        setTargetRect({
          top,
          left,
          width: Math.min(rect.width + 10, window.innerWidth - left - 4),
          height: Math.min(rect.height + 10, window.innerHeight - top - 4),
        })
        setTargetMissing(false)
        return
      }
      attempts += 1
      if (attempts < 90) {
        frameId = window.requestAnimationFrame(findTarget)
      } else {
        setTargetMissing(true)
      }
    }

    frameId = window.requestAnimationFrame(findTarget)
    return () => {
      active = false
      window.clearTimeout(resetId)
      window.cancelAnimationFrame(frameId)
    }
  }, [location.pathname, step.selector])

  const positionCard = useCallback(() => {
    const target = document.querySelector(step.selector)
    const card = cardRef.current
    if (!target || !card) return
    const rect = target.getBoundingClientRect()
    const mobile = window.innerWidth < 640
    const cardHeight = card.offsetHeight
    if (mobile) {
      const top = rect.top > window.innerHeight * 0.55
        ? Math.max(12, Math.min(rect.top - cardHeight - 14, window.innerHeight - cardHeight - 12))
        : Math.min(rect.bottom + 14, window.innerHeight - cardHeight - 12)
      card.style.top = `${top}px`
      card.style.bottom = 'auto'
      card.style.left = '12px'
      card.style.right = '12px'
    } else {
      card.style.top = 'auto'
      card.style.bottom = '24px'
      card.style.left = 'auto'
      card.style.right = '24px'
    }
  }, [step.selector])

  useEffect(() => {
    positionCard()
    window.addEventListener('resize', positionCard)
    window.addEventListener('scroll', positionCard, true)
    return () => {
      window.removeEventListener('resize', positionCard)
      window.removeEventListener('scroll', positionCard, true)
    }
  }, [positionCard, targetRect])

  return (
    <>
      {targetRect ? (
        <>
          <div
            className="fixed inset-x-0 top-0 z-[81] bg-ink/65"
            style={{ height: targetRect.top }}
            aria-hidden="true"
          />
          <div
            className="fixed z-[81] bg-ink/65"
            style={{
              top: targetRect.top,
              left: 0,
              width: targetRect.left,
              height: targetRect.height,
            }}
            aria-hidden="true"
          />
          <div
            className="fixed right-0 z-[81] bg-ink/65"
            style={{
              top: targetRect.top,
              left: targetRect.left + targetRect.width,
              height: targetRect.height,
            }}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[81] bg-ink/65"
            style={{ top: targetRect.top + targetRect.height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[81] bg-ink/65" aria-hidden="true" />
      )}
      {targetRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[82] rounded-xl border-2 border-brand"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}
      <div ref={cardRef} className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[83] mx-auto w-auto max-w-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[min(390px,calc(100vw-3rem))] sm:mx-0">
        {targetMissing && (
          <p className="mb-2 rounded-lg bg-white/95 px-3 py-2 text-xs text-muted shadow" role="status">
            This area is not available on this screen yet. You can continue the tour.
          </p>
        )}
        <TourDialog
          step={step}
          stepIndex={stepIndex}
          error={error}
          busy={busy}
          onBack={onBack}
          onNext={onNext}
          onSkip={onSkip}
          onRetry={onRetry}
        />
      </div>
    </>
  )
}

export default function OnboardingGuide({ userId }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [stage, setStage] = useState('loading')
  const [stepIndex, setStepIndex] = useState(0)
  const [loadingError, setLoadingError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checks, setChecks] = useState({ accounts: false, transactions: false, budgets: false })
  const [checksLoading, setChecksLoading] = useState(false)
  const [checksError, setChecksError] = useState('')
  const busyRef = useRef(false)
  const handledQuery = useRef('')

  const loadProgress = useCallback(async () => {
    setStage('loading')
    setLoadingError('')
    try {
      let { data, error } = await supabase
        .from('onboarding_progress')
        .select(PROGRESS_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        const inserted = await supabase
          .from('onboarding_progress')
          .insert({ user_id: userId })

        if (inserted.error && inserted.error.code !== '23505') {
          throw inserted.error
        }

        const selected = await supabase
          .from('onboarding_progress')
          .select(PROGRESS_COLUMNS)
          .eq('user_id', userId)
          .maybeSingle()
        data = selected.data
        error = selected.error
      }

      if (error || !data) {
        throw error || new Error('Onboarding progress could not be initialized.')
      }

      setProgress(data)
      setStepIndex(Math.min(data.tutorial_step, TOUR_STEPS.length - 1))
      if (data.status === 'NOT_STARTED') {
        setStage('welcome')
      } else if (data.status === 'IN_PROGRESS') {
        setStage('tour')
      } else if (!data.checklist_dismissed) {
        setStage('checklist')
      } else {
        setStage('hidden')
      }
    } catch (error) {
      setLoadingError(migrationMessage(error))
      setStage('unavailable')
    }
  }, [userId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadProgress(), 0)
    return () => window.clearTimeout(timer)
  }, [loadProgress])

  const saveProgress = useCallback(async (changes) => {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setActionError('')
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update(changes)
        .eq('user_id', userId)
        .select(PROGRESS_COLUMNS)
        .maybeSingle()

      if (error || !data) {
        setActionError(migrationMessage(error))
        return false
      }

      setProgress(data)
      return true
    } catch (error) {
      setActionError(migrationMessage(error))
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [userId])

  const loadChecklist = useCallback(async () => {
    setChecksLoading(true)
    setChecksError('')
    try {
      const results = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])
      const failed = results.find((result) => result.error)
      if (failed) {
        setChecksError('Could not verify setup progress. Retry to check your saved accounts, transactions, and budgets.')
      } else {
        setChecks({
          accounts: (results[0].count || 0) > 0,
          transactions: (results[1].count || 0) > 0,
          budgets: (results[2].count || 0) > 0,
        })
      }
    } catch {
      setChecksError('Could not verify setup progress. Retry to check your saved accounts, transactions, and budgets.')
    } finally {
      setChecksLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (stage !== 'checklist' || location.pathname !== '/') return undefined
    const timer = window.setTimeout(() => loadChecklist(), 0)
    return () => window.clearTimeout(timer)
  }, [loadChecklist, location.pathname, stage])

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('onboarding')
    if (!requested) {
      handledQuery.current = ''
      return
    }
    if (!progress || handledQuery.current === location.search) return
    handledQuery.current = location.search
    const timer = window.setTimeout(() => {
      navigate(location.pathname, { replace: true })
      if (requested === 'tour') {
        saveProgress({ status: 'IN_PROGRESS', tutorial_step: 0 })
          .then((saved) => {
            if (saved) {
              setStepIndex(0)
              setStage('tour')
              navigate('/')
            }
          })
      } else if (requested === 'checklist') {
        saveProgress({ checklist_dismissed: false })
          .then((saved) => {
            if (saved) {
              setStage('checklist')
              navigate('/')
            }
          })
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, navigate, progress, saveProgress])

  useEffect(() => {
    if (stage === 'tour' && location.pathname !== TOUR_STEPS[stepIndex].path) {
      navigate(TOUR_STEPS[stepIndex].path)
    }
  }, [location.pathname, navigate, stage, stepIndex])

  async function beginTour() {
    const saved = await saveProgress({ status: 'IN_PROGRESS', tutorial_step: 0 })
    if (!saved) return
    setStepIndex(0)
    setStage('tour')
    navigate('/')
  }

  async function skipTour() {
    const saved = await saveProgress({
      status: 'SKIPPED',
      tutorial_step: stepIndex,
    })
    if (!saved) return
    setStage('checklist')
    navigate('/')
  }

  async function nextStep() {
    if (stepIndex < TOUR_STEPS.length - 1) {
      const next = stepIndex + 1
      const saved = await saveProgress({
        status: 'IN_PROGRESS',
        tutorial_step: next,
      })
      if (!saved) return
      setStepIndex(next)
      navigate(TOUR_STEPS[next].path)
      return
    }

    const saved = await saveProgress({
      status: 'COMPLETED',
      tutorial_step: TOUR_STEPS.length,
    })
    if (!saved) return
    setStage('checklist')
    navigate('/')
  }

  async function previousStep() {
    if (stepIndex <= 0) return
    const previous = stepIndex - 1
    const saved = await saveProgress({
      status: 'IN_PROGRESS',
      tutorial_step: previous,
    })
    if (!saved) return
    setStepIndex(previous)
    navigate(TOUR_STEPS[previous].path)
  }

  async function dismissChecklist() {
    const saved = await saveProgress({ checklist_dismissed: true })
    if (saved) setStage('hidden')
  }

  const visibleStage =
    stage === 'checklist' && location.pathname !== '/' ? 'hidden' : stage

  if (visibleStage === 'loading' || visibleStage === 'hidden') return null

  if (visibleStage === 'unavailable') {
    return (
      <div className="fixed bottom-20 right-4 z-[70] max-w-sm rounded-xl border border-line bg-white p-4 shadow-xl sm:bottom-5 sm:right-5">
        <p className="text-sm font-semibold text-ink">Onboarding progress unavailable</p>
        <p className="mt-1 text-xs leading-5 text-muted" role="alert">{loadingError}</p>
        <button type="button" onClick={loadProgress} className="mt-3 min-h-9 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark">
          Retry
        </button>
      </div>
    )
  }

  if (visibleStage === 'welcome') {
    return (
      <WelcomeDialog
        busy={busy}
        error={actionError}
        onStart={beginTour}
        onSkip={skipTour}
        onRetry={loadProgress}
      />
    )
  }

  if (visibleStage === 'tour') {
    return (
      <TourOverlay
        step={TOUR_STEPS[stepIndex]}
        stepIndex={stepIndex}
        error={actionError}
        busy={busy}
        onBack={previousStep}
        onNext={nextStep}
        onSkip={skipTour}
        onRetry={loadProgress}
      />
    )
  }

  if (visibleStage === 'checklist') {
    return (
      <ChecklistDialog
        checks={checks}
        loading={checksLoading}
        error={checksError}
        busy={busy}
        onRetry={loadChecklist}
        onDismiss={dismissChecklist}
      />
    )
  }

  return null
}
