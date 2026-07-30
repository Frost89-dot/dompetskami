'use client'

import { Plus, Camera, Pencil } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { AnimatePresence, motion } from 'framer-motion'

export function FabButton() {
  const { fabOpen, setFabOpen, fabMode, setFabMode } = useAppStore()

  return (
    <>
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile: centered above bottom nav */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100"
            >
              <button
                onClick={() => { setFabMode('manual') }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  fabMode === 'manual'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Pencil className="w-4 h-4" />
                Manual
              </button>
              <button
                onClick={() => { setFabMode('scan') }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  fabMode === 'scan'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                Scan AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (fabOpen) {
              setFabOpen(false)
            } else {
              setFabOpen(true)
            }
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 fab-pulse ${
            fabOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus className={`w-7 h-7 text-white transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      {/* Desktop: bottom-right floating button */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 bg-white rounded-2xl shadow-xl p-3 border border-gray-100 w-48"
            >
              <button
                onClick={() => { setFabMode('manual') }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                  fabMode === 'manual'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Pencil className="w-4 h-4" />
                Input Manual
              </button>
              <button
                onClick={() => { setFabMode('scan') }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                  fabMode === 'scan'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Camera className="w-4 h-4" />
                Scan Struk AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => {
            if (fabOpen) {
              setFabOpen(false)
            } else {
              setFabOpen(true)
            }
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-200 ${
            fabOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus className={`w-6 h-6 text-white transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </>
  )
}
