const categories = [
  { label: 'All', emoji: '🏪' },
  { label: 'Meat', emoji: '🥩' },
  { label: 'Poultry', emoji: '🍗' },
  { label: 'Seafood', emoji: '🐟' },
  { label: 'Dairy', emoji: '🧀' },
  { label: 'Beverages', emoji: '🥤' },
  { label: 'Vegetables', emoji: '🥦' },
  { label: 'Fruits', emoji: '🍎' },
  { label: 'Spices', emoji: '🌶️' },
  { label: 'Bakery', emoji: '🥖' },
  { label: 'Other', emoji: '📦' },
]

export default function CategoryChips({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
      {categories.map(({ label, emoji }) => (
        <button
          key={label}
          onClick={() => onSelect(label)}
          className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
            selected === label
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>{emoji}</span>
          {label}
        </button>
      ))}
    </div>
  )
}
