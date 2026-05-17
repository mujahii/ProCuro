import { ChevronRight } from 'lucide-react'

export default function SettingRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-4 hover:bg-lionsmane transition-colors text-left"
    >
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </button>
  )
}
