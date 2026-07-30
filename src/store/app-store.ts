import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type TabType = 'beranda' | 'transaksi' | 'aset' | 'lainnya'
export type TxViewType = 'daily' | 'calendar' | 'summary' | 'bookmark'
export type LainnyaSubView = 'statistics' | 'budget' | 'memo' | 'settings' | null
export type FabFormType = 'manual' | 'scan' | 'transfer' | null

// Helper function untuk mendapatkan periode saat ini
export const getCurrentPeriode = (): string => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

interface AppState {
  // Navigation
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  txView: TxViewType
  setTxView: (v: TxViewType) => void
  lainnyaView: LainnyaSubView
  setLainnyaView: (v: LainnyaSubView) => void
  
  // Period
  periode: string
  setPeriode: (p: string) => void
  resetPeriode: () => void
  
  // FAB (Floating Action Button)
  fabMenuOpen: boolean
  setFabMenuOpen: (v: boolean) => void
  fabFormType: FabFormType
  setFabFormType: (v: FabFormType) => void
  closeFabForm: () => void
  
  // User
  currentUser: string
  setCurrentUser: (u: string) => void
  
  // Selection
  selectedAsetId: string | null
  setSelectedAsetId: (id: string | null) => void
  selectedTxId: string | null
  setSelectedTxId: (id: string | null) => void
  clearSelections: () => void
  
  // Refresh trigger
  refreshKey: number
  triggerRefresh: () => void
  
  // Filter
  filterOpen: boolean
  setFilterOpen: (v: boolean) => void
  
  // Utility
  resetAll: () => void
}

// Initial state factory untuk memastikan periode selalu fresh
const getInitialState = () => ({
  activeTab: 'beranda' as TabType,
  txView: 'daily' as TxViewType,
  lainnyaView: null as LainnyaSubView,
  periode: getCurrentPeriode(),
  fabMenuOpen: false,
  fabFormType: null as FabFormType,
  currentUser: 'suami@dompetkami.com',
  selectedAsetId: null as string | null,
  selectedTxId: null as string | null,
  refreshKey: 0,
  filterOpen: false,
})

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        ...getInitialState(),

        // Navigation
        setActiveTab: (tab) => set({ 
          activeTab: tab, 
          lainnyaView: null, 
          selectedAsetId: null, 
          selectedTxId: null 
        }, false, 'setActiveTab'),
        
        setTxView: (v) => set({ txView: v }, false, 'setTxView'),
        setLainnyaView: (v) => set({ lainnyaView: v }, false, 'setLainnyaView'),

        // Period
        setPeriode: (p) => set({ periode: p }, false, 'setPeriode'),
        resetPeriode: () => set({ periode: getCurrentPeriode() }, false, 'resetPeriode'),

        // FAB
        setFabMenuOpen: (v) => set({ fabMenuOpen: v }, false, 'setFabMenuOpen'),
        setFabFormType: (v) => set({ fabFormType: v }, false, 'setFabFormType'),
        closeFabForm: () => set({ 
          fabFormType: null, 
          fabMenuOpen: false 
        }, false, 'closeFabForm'),

        // User
        setCurrentUser: (u) => set({ currentUser: u }, false, 'setCurrentUser'),

        // Selection
        setSelectedAsetId: (id) => set({ selectedAsetId: id }, false, 'setSelectedAsetId'),
        setSelectedTxId: (id) => set({ selectedTxId: id }, false, 'setSelectedTxId'),
        clearSelections: () => set({ 
          selectedAsetId: null, 
          selectedTxId: null 
        }, false, 'clearSelections'),

        // Refresh
        triggerRefresh: () => set(
          (s) => ({ refreshKey: s.refreshKey + 1 }), 
          false, 
          'triggerRefresh'
        ),

        // Filter
        setFilterOpen: (v) => set({ filterOpen: v }, false, 'setFilterOpen'),

        // Reset all state
        resetAll: () => set({ 
          ...getInitialState(),
          currentUser: get().currentUser // Keep current user
        }, false, 'resetAll'),
      }),
      {
        name: 'dompetkami-storage',
        version: 1,
        // Hanya persist state yang diperlukan
        partialize: (state) => ({
          activeTab: state.activeTab,
          txView: state.txView,
          currentUser: state.currentUser,
          // Jangan persist periode agar selalu fresh saat reload
          // periode: state.periode,
        }),
        // Merge state yang di-persist dengan initial state
        merge: (persistedState: any, currentState) => {
          return {
            ...currentState,
            ...persistedState,
            // Selalu gunakan periode saat ini
            periode: getCurrentPeriode(),
            // Reset UI state
            lainnyaView: null,
            fabMenuOpen: false,
            fabFormType: null,
            filterOpen: false,
          }
        },
      }
    ),
    {
      name: 'DompetKami Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Selector hooks untuk performa optimal
export const useActiveTab = () => useAppStore((s) => s.activeTab)
export const useTxView = () => useAppStore((s) => s.txView)
export const usePeriode = () => useAppStore((s) => s.periode)
export const useCurrentUser = () => useAppStore((s) => s.currentUser)
export const useFabMenuOpen = () => useAppStore((s) => s.fabMenuOpen)
export const useFabFormType = () => useAppStore((s) => s.fabFormType)
export const useRefreshKey = () => useAppStore((s) => s.refreshKey)
export const useFilterOpen = () => useAppStore((s) => s.filterOpen)
