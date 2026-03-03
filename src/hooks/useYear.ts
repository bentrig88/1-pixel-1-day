import { useMemo } from 'react'
import { buildYearLayout, getDayOfYear } from '../data/yearLayout'

export type DayState = 'past' | 'today' | 'future'

export interface DayInfo {
  dayIndex: number   // 0-based day of year
  date: Date
  state: DayState
  hasReminder: boolean
  reminder: string
}

export function useYear(year: number, reminders: Record<number, string>) {
  const today = new Date()
  const todayDayIndex = today.getFullYear() === year
    ? getDayOfYear(today)
    : -1

  const layout = useMemo(() => buildYearLayout(year), [year])

  const days: DayInfo[] = useMemo(() => {
    return Array.from({ length: layout.totalDays }, (_, i) => {
      const date = dayIndexToDate(year, i)
      const state: DayState =
        i < todayDayIndex ? 'past' :
        i === todayDayIndex ? 'today' : 'future'
      const reminder = reminders[i] ?? ''
      return {
        dayIndex: i,
        date,
        state,
        hasReminder: reminder.trim().length > 0,
        reminder,
      }
    })
  }, [year, todayDayIndex, reminders])

  const daysLeft = layout.totalDays - 1 - todayDayIndex

  return { layout, days, todayDayIndex, daysLeft }
}

function dayIndexToDate(year: number, dayIndex: number): Date {
  const date = new Date(year, 0, 1)
  date.setDate(date.getDate() + dayIndex)
  return date
}
