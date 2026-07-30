'use client'

import { useAppStore } from '@/store/app-store'
import { BottomNav } from '@/components/dompet/bottom-nav'
import { SidebarNav } from '@/components/dompet/sidebar-nav'
import { FabButton } from '@/components/dompet/fab-button'
import { FabForm } from '@/components/dompet/fab-form'
import { TabBeranda } from '@/components/dompet/tab-beranda'
import { TabTransaksi } from '@/components/dompet/tab-transaksi'
import { TabAset } from '@/components/dompet/tab-aset'
import { TabLainnya } from '@/components/dompet/tab-lainnya'

export default function Home() {
  const { activeTab } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Desktop Sidebar */}
        <SidebarNav />

        {/* Main Content */}
        <main className="flex-1 max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto w-full min-h-screen relative">
          <div className="pb-20 md:pb-6">
            {activeTab === 'beranda' && <TabBeranda />}
            {activeTab === 'transaksi' && <TabTransaksi />}
            {activeTab === 'aset' && <TabAset />}
            {activeTab === 'lainnya' && <TabLainnya />}
          </div>

          {/* Mobile only: Bottom Nav */}
          <div className="md:hidden">
            <BottomNav />
          </div>
          {/* FAB: shown on both mobile and desktop */}
          <FabButton />
          <FabForm />
        </main>
      </div>
    </div>
  )
}
