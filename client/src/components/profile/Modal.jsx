import { X } from 'lucide-react'
import ModalPortal from '../ui/ModalPortal'

export default function Modal({ title, onClose, children, maxW = 'max-w-sm' }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className={`bg-white rounded-2xl shadow-xl w-full ${maxW} overflow-hidden max-h-[90vh] flex flex-col`}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-display font-bold text-slate-900 text-base">{title}</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
        </div>
      </div>
    </ModalPortal>
  )
}
