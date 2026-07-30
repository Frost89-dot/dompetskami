'use client'

import { Home, List, Wallet, Menu, Sparkles } from 'lucide-react'
import { useAppStore, type TabType } from '@/store/app-store'

const tabs: { id: TabType; icon: typeof Home; label: string; desc: string }[] = [
  { id: 'beranda', icon: Home, label: 'Beranda', desc: 'Ringkasan keuangan' },
  { id: 'transaksi', icon: List, label: 'Transaksi', desc: 'Riwayat transaksi' },
  { id: 'aset', icon: Wallet, label: 'Aset', desc: 'Aset & rekening' },
  { id: 'lainnya', icon: Menu, label: 'Lainnya', desc: 'Statistik & pengaturan' },
]

export function SidebarNav() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <aside 
      className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-gray-100 h-screen sticky top-0"
      role="navigation"
      aria-label="Navigasi utama"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">DompetKami</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Keuangan Keluarga</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${tab.label} - ${tab.desc}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                isActive 
                  ? 'bg-blue-100' 
                  : 'bg-gray-50 group-hover:bg-gray-100'
              }`}>
                <tab.icon 
                  className={`w-[18px] h-[18px] transition-colors duration-200 ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] mt-0.5 truncate ${
                  isActive ? 'text-blue-600/70' : 'text-gray-400'
                }`}>
                  {tab.desc}
                </p>
              </div>
              {isActive && (
                <div className="w-1 h-8 rounded-full bg-blue-600 ml-auto" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />
          <p className="text-[10px] text-gray-400 font-medium">DompetKami v1.0</p>
        </div>
        <p className="text-[10px] text-gray-300 ml-3.5">AI-Powered Family Finance</p>
      </div>
    </aside>
  )
}
