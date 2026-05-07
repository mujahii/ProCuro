import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RegisterSupplierPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/register', { replace: true }) }, [])
  return null
}
