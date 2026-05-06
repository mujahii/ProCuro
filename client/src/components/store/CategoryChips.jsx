const categories = [
  { label: 'All',       emoji: '🏪' },
  { label: 'Meat',      emoji: '🥩' },
  { label: 'Poultry',   emoji: '🍗' },
  { label: 'Seafood',   emoji: '🐟' },
  { label: 'Dairy',     emoji: '🧀' },
  { label: 'Beverages', emoji: '🥤' },
  { label: 'Vegetables',emoji: '🥦' },
  { label: 'Fruits',    emoji: '🍎' },
  { label: 'Spices',    emoji: '🌶️' },
  { label: 'Bakery',    emoji: '🥖' },
  { label: 'Other',     emoji: '📦' },
]

export default function CategoryChips({ selected, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      {categories.map(({ label, emoji }) => {
        const isActive = selected === label
        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${
              isActive
                ? 'bg-primary shadow-lg shadow-primary/25 scale-105'
                : 'bg-white border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md'
            }`}>
              {emoji}
            </div>
            <span className={`text-xs font-semibold text-center leading-tight transition-colors ${
              isActive ? 'text-primary' : 'text-gray-500'
            }`}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
