export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
