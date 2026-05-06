import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-xl font-bold mb-3">ProCuro</h3>
            <p className="text-sm leading-relaxed max-w-xs">
              Germany's first Halal food procurement platform. Connecting verified Halal suppliers with restaurant owners across Germany.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Browse Products</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">For Restaurants</Link></li>
              <li><Link to="/register/supplier" className="hover:text-white transition-colors">Become a Supplier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-white cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-white cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-white cursor-pointer">GDPR</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs">© 2026 ProCuro. All rights reserved.</p>
          <p className="text-xs">🇩🇪 Made for Halal restaurant owners in Germany</p>
        </div>
      </div>
    </footer>
  )
}
