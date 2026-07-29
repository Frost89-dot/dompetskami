'use client'

import { useAppStore } from '@/store/app-store'
import { BottomNav } from '@/components/dompet/bottom-nav'
import { FabButton } from '@/components/dompet/fab-button'
import { FabForm } from '@/components/dompet/fab-form'
import { TabBeranda } from '@/components/dompet/tab-beranda'
import { TabTransaksi } from '@/components/dompet/tab-transaksi'
import { TabAset } from '@/components/dompet/tab-aset'
import { TabLainnya } from '@/components/dompet/tab-lainnya'

export default function Home() {
  const { activeTab } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      <main className="pb-20">
        {activeTab === 'beranda' && <TabBeranda />}
        {activeTab === 'transaksi' && <TabTransaksi />}
        {activeTab === 'aset' && <TabAset />}
        {activeTab === 'lainnya' && <TabLainnya />}
      </main>
      <BottomNav />
      <FabButton />
      <FabForm />
    </div>
  )
}