const variants = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md',
  secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  outline: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
}

export default function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled, ...props }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
