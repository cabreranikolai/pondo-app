import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { supabase } from '../lib/supabase.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [profileSnapshot, setProfileSnapshot] = useState({
    userId: null,
    profile: null,
    status: 'idle',
  })
  const userId = session?.user?.id
  const profile =
    profileSnapshot.userId === userId ? profileSnapshot.profile : null
  const profileStatus = !userId
    ? 'idle'
    : profileSnapshot.userId === userId
      ? profileSnapshot.status
      : 'loading'

  useEffect(() => {
    let active = true
    let authEventReceived = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true
      setSession(nextSession)
      setSessionError('')
      setSessionLoading(false)
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return
        if (error) {
          setSessionError('Unable to restore your session. Please sign in again.')
          setSession(null)
        } else {
          setSession(data.session)
        }
        setSessionLoading(false)
      })
      .catch(() => {
        if (!active || authEventReceived) return
        setSessionError('Unable to restore your session. Please sign in again.')
        setSession(null)
        setSessionLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return undefined

    let active = true

    supabase
      .from('profiles')
      .select('id, display_name, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setProfileSnapshot({ userId, profile: null, status: 'error' })
          return
        }
        setProfileSnapshot({
          userId,
          profile: data,
          status: data ? 'ready' : 'missing',
        })
      })
      .catch(() => {
        if (active) setProfileSnapshot({ userId, profile: null, status: 'error' })
      })

    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      setProfileSnapshot({ userId, profile: null, status: 'error' })
      throw error
    }

    setProfileSnapshot({
      userId,
      profile: data,
      status: data ? 'ready' : 'missing',
    })
    return data
  }, [userId])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileStatus,
      sessionLoading,
      sessionError,
      refreshProfile,
      signOut,
    }),
    [
      session,
      profile,
      profileStatus,
      sessionLoading,
      sessionError,
      refreshProfile,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
