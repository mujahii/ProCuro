import { Award, Package, Truck } from 'lucide-react'

const features = [
  {
    icon: Award,
    title: 'Halal Verified Suppliers',
    description: 'Every supplier is manually verified by our team. We check Halal certificates before granting access to the platform.',
  },
  {
    icon: Package,
    title: 'Centralized Ordering',
    description: 'Order from multiple Halal suppliers in a single checkout. Each supplier manages their own order split independently.',
  },
  {
    icon: Truck,
    title: 'Real-time Tracking',
    description: 'Track every order split from confirmation to delivery. Get instant notifications at every status change.',
  },
]

export default function TrustSection() {
  return (
    <section className="bg-white py-16 lg:py-20 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900">Why ProCuro?</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">Germany's only dedicated Halal food procurement platform, built for restaurant owners.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center px-4">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-3">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
