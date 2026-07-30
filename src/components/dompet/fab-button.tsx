'use client'

import { Plus, Pencil, Camera, ArrowLeftRight } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { AnimatePresence, motion } from 'framer-motion'

const MENU_OPTIONS = [
  { id: 'manual' as const, icon: Pencil, label: 'Input Manual', desc: 'Catat transaksi secara manual' },
  { id: 'scan' as const, icon: Camera, label: 'Scan Struk AI', desc: 'Foto struk, AI ekstrak datanya' },
  { id: 'transfer' as const, icon: ArrowLeftRight, label: 'Transfer Antar Aset', desc: 'Pindah saldo antar rekening' },
]

export function FabButton() {
  const { fabMenuOpen, setFabMenuOpen, setFabFormType } = useAppStore()

  const handleSelect = (id: 'manual' | 'scan' | 'transfer') => {
    setFabMenuOpen(false)
    // Small delay so menu closes before dialog opens
    setTimeout(() => setFabFormType(id), 150)
  }

  return (
    <>
      <AnimatePresence>
        {fabMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setFabMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile: centered above bottom nav */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {fabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-2">
                {MENU_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <opt.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 fab-pulse ${
            fabMenuOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus className={`w-7 h-7 text-white transition-transform duration-200 ${fabMenuOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      {/* Desktop: bottom-right floating button */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {fabMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="absolute bottom-16 right-0 w-[260px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-2">
                {MENU_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <opt.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setFabMenuOpen(!fabMenuOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-200 ${
            fabMenuOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus className={`w-6 h-6 text-white transition-transform duration-200 ${fabMenuOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </>
  )
}
