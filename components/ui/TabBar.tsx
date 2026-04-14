'use client'

export type Tab = 'details' | 'availability' | 'polls' | 'expenses' | 'itinerary' | 'chat'

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  badges?: Partial<Record<Tab, number>>
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'details', label: 'Details', icon: '🗺️' },
  { id: 'availability', label: 'When', icon: '📅' },
  { id: 'polls', label: 'Polls', icon: '🗳️' },
  { id: 'itinerary', label: 'Plan', icon: '🗓️' },
  { id: 'expenses', label: 'Expenses', icon: '💰' },
  { id: 'chat', label: 'Chat', icon: '💬' },
]

export function TabBar({ activeTab, onTabChange, badges }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium min-h-[56px] justify-center transition-colors relative ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className="text-lg mb-0.5 relative">
              {tab.icon}
              {(badges?.[tab.id] ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
