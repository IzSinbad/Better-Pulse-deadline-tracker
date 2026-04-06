'use client'

import { createContext, useContext, useState } from 'react'

type ViewType = 'timeline' | 'calendar' | 'course' | 'urgent' | 'announcements'

interface DashboardContextValue {
  activeView: ViewType
  setActiveView: (v: ViewType) => void
}

const DashboardContext = createContext<DashboardContextValue>({
  activeView: 'timeline',
  setActiveView: () => {},
})

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<ViewType>('timeline')
  return (
    <DashboardContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  return useContext(DashboardContext)
}
