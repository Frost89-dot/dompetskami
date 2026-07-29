import { create } from 'zustand'

export type TabType = 'beranda' | 'transaksi' | 'aset' | 'lainnya'
export type TxViewType = 'daily' | 'calendar' | 'monthly' | 'summary' | 'bookmark'
export type LainnyaSubView = 'statistics' | 'budget' | 'memo' | 'settings' | null

interface AppState {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  txView: TxViewType
  setTxView: (v: TxViewType) => void
  lainnyaView: LainnyaSubView
  setLainnyaView: (v: LainnyaSubView) => void
  periode: string
  setPeriode: (p: string) => void
  fabOpen: boolean
  setFabOpen: (v: boolean) => void
  fabMode: 'manual' | 'scan'
  setFabMode: (v: 'manual' | 'scan') => void
  currentUser: string
  setCurrentUser: (u: string) => void
  selectedAsetId: string | null
  setSelectedAsetId: (id: string | null) => void
  selectedTxId: string | null
  setSelectedTxId: (id: string | null) => void
  refreshKey: number
  triggerRefresh: () => void
  filterOpen: boolean
  setFilterOpen: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'beranda',
  setActiveTab: (tab) => set({ activeTab: tab, lainnyaView: null, selectedAsetId: null, selectedTxId: null }),
  txView: 'daily',
  setTxView: (v) => set({ txView: v }),
  lainnyaView: null,
  setLainnyaView: (v) => set({ lainnyaView: v }),
  periode: (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })(),
  setPeriode: (p) => set({ periode: p }),
  fabOpen: false,
  setFabOpen: (v) => set({ fabOpen: v }),
  fabMode: 'manual',
  setFabMode: (v) => set({ fabMode: v }),
  currentUser: 'suami@dompetkami.com',
  setCurrentUser: (u) => set({ currentUser: u }),
  selectedAsetId: null,
  setSelectedAsetId: (id) => set({ selectedAsetId: id }),
  selectedTxId: null,
  setSelectedTxId: (id) => set({ selectedTxId: id }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  filterOpen: false,
  setFilterOpen: (v) => set({ filterOpen: v }),
}))
