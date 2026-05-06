export default function HalalBadge({ status, size = 20 }) {
  if (!status || status === 'none') return null

  const approved = status === 'approved'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      title={approved ? 'Halal Certified' : 'Verification Pending'}
    >
      {/* Shield shape */}
      <path
        d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z"
        fill={approved ? '#059669' : '#D97706'}
      />
      {approved ? (
        /* Checkmark for approved */
        <path
          d="M8 12l3 3 5-6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        /* Clock hands for pending */
        <>
          <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M12 10v2l1.5 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
