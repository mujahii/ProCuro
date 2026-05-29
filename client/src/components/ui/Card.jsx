export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card overflow-hidden ${onClick ? 'card-lift cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
