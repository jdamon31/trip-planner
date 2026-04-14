'use client'

export type Tab = 'details' | 'availability' | 'polls' | 'expenses' | 'itinerary' | 'chat'

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'details',      label: 'Details',   icon: '🗺️' },
  { id: 'availability', label: 'When',      icon: '📅' },
  { id: 'polls',        label: 'Polls',     icon: '🗳️' },
  { id: 'itinerary',    label: 'Plan',      icon: '🗓️' },
  { id: 'expenses',     label: 'Expenses',  icon: '💰' },
  { id: 'chat',         label: 'Chat',      icon: '💬' },
]

export function TabBar({ activeTab, onTabChange, badges }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t" style={{ background: '#FAF8EF', borderColor: 'rgba(62,44,35,0.1)' }}>
      <div className="flex">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center py-2 text-xs font-medium min-h-[56px] justify-center transition-colors relative"
              style={{ color: active ? '#6B8E23' : 'rgba(62,44,35,0.4)' }}
            >
              <span className="text-lg mb-0.5 relative">
                {tab.icon}
                {(badges?.[tab.id] ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full" style={{ background: '#D2691E' }} />
                )}
              </span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
