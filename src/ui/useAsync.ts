import { useCallback, useEffect, useRef, useState } from 'react'

/** Roda `run` quando `key` muda e guarda o resultado; `retry` tenta de novo depois de uma falha. */
export function useAsync<T>(key: string, run: () => Promise<T>) {
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  })
  const [attempt, setAttempt] = useState(0)
  const id = `${key}#${attempt}`
  const [result, setResult] = useState<{ id: string; data?: T; failed?: boolean }>({ id: '' })
  useEffect(() => {
    let live = true
    runRef.current().then(
      (data) => live && setResult({ id, data }),
      () => live && setResult({ id, failed: true }),
    )
    return () => {
      live = false
    }
  }, [id])
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  const done = result.id === id
  return { data: done ? result.data : undefined, failed: done && !!result.failed, retry }
}
