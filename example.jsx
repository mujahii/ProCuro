import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, ShoppingCart, Bell, Menu, X, 
  ChefHat, Truck, TrendingUp, Package, Plus, 
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  FileText, LogOut, Filter, MapPin, Calendar, DollarSign,
  Check, Eye, EyeOff, Lock, ArrowLeft, CreditCard, Banknote,
  Edit, Image as ImageIcon, Utensils, Apple, Coffee, Leaf, Beef, Drumstick,
  Tag, Activity, Trash2, Home, MessageCircle, Send, Pen, Info, Phone, Mail, Globe, Star, Euro
} from 'lucide-react';

// --- Icons ---

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.24-.9 3.73-.82a4.42 4.42 0 0 1 3.51 1.83 4.3 4.3 0 0 0 .15 7.1c-.65 1.76-1.6 3.05-2.47 4.12zm-3.8-17.15c.67-.84 1.15-2 1.01-3.13-.97.05-2.16.65-2.82 1.48-.59.7-1.12 1.96-.94 3.12 1.08.08 2.12-.62 2.75-1.47z" />
  </svg>
);

// --- Mock Data ---

const MOCK_SUPPLIERS = [
  { 
    id: 1, 
    name: "Berlin Halal Meats", 
    rating: 4.8, 
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=1000", // Fixed Image
    verified: true,
    location: "Berlin, Mitte",
    description: "Premium Halal meat supplier serving Germany for over 20 years. Certified organic and ethically sourced."
  },
  { 
    id: 2, 
    name: "Al-Baraka Dairy", 
    rating: 4.5, 
    image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&q=80&w=1000", 
    verified: true,
    location: "Hamburg",
    description: "Fresh dairy products delivered daily. Farm to table guarantee."
  },
  { 
    id: 3, 
    name: "Istanbul Spices", 
    rating: 4.9, 
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1000", 
    verified: true,
    location: "Munich",
    description: "Authentic spices imported directly from Istanbul."
  },
  { 
    id: 4, 
    name: "Fresh Green Logistics", 
    rating: 4.6, 
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000", 
    verified: true,
    location: "Frankfurt",
    description: "Your partner for fresh vegetables and fruits."
  },
];

const MOCK_PRODUCTS = [
  { 
    id: 101, 
    name: "Premium Lamb Chops", 
    supplier: "Berlin Halal Meats", 
    price: 18.50, 
    unit: "KG", 
    category: "Meat", 
    image: "https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?auto=format&fit=crop&q=80&w=1000", // Lamb Meat
    description: "Premium chops, freshly cut, grass-fed and Halal certified. Tender and perfect for grilling. Sourced from organic farms.",
    deliveryPrice: 5.00,
    inStock: true
  },
  { 
    id: 102, 
    name: "Chicken Breast Fillet", 
    supplier: "Berlin Halal Meats", 
    price: 9.20, 
    unit: "KG", 
    category: "Chicken", 
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=1000",
    description: "Boneless, skinless chicken breast. High protein, low fat.",
    deliveryPrice: 5.00,
    inStock: true
  },
  { 
    id: 103, 
    name: "Cola Cans (330ml)", 
    supplier: "Al-Baraka Dairy", 
    price: 14.00, 
    unit: "Box (24)", 
    category: "Beverage", 
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1000",
    description: "Classic refreshing cola taste. Bulk pack for restaurants.",
    deliveryPrice: 3.00,
    inStock: true
  },
  { 
    id: 104, 
    name: "Tomatoes (Vine)", 
    supplier: "Fresh Green Logistics", 
    price: 3.50, 
    unit: "KG", 
    category: "Vegetables", 
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=1000",
    description: "Fresh vine-ripened tomatoes. Perfect for salads and sauces.",
    deliveryPrice: 4.50,
    inStock: true
  },
  { 
    id: 105, 
    name: "Burger Buns (Sesame)", 
    supplier: "Istanbul Spices", 
    price: 0.40, 
    unit: "Piece", 
    category: "Bakery", 
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=1000", // Burger
    description: "Soft sesame burger buns, baked fresh daily.",
    deliveryPrice: 2.00,
    inStock: true
  },
  { 
    id: 106, 
    name: "Ayran Yogurt Drink", 
    supplier: "Al-Baraka Dairy", 
    price: 0.80, 
    unit: "Piece", 
    category: "Beverage", 
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=1000", // Milk/Dairy
    description: "Traditional Turkish yogurt drink. Refreshing and salty.",
    deliveryPrice: 3.00,
    inStock: false
  },
];

const INITIAL_ORDERS = [
  { id: "ORD-7782", date: "2025-01-18", supplier: "Berlin Halal Meats", items: "20kg Lamb, 10kg Chicken", total: 462.00, status: "Pending", address: "Müllerstraße 42, 13353 Berlin" },
  { id: "ORD-7781", date: "2025-01-17", supplier: "Al-Baraka Dairy", items: "5 Boxes Cola, 50 Ayran", total: 110.00, status: "Out for Delivery", address: "Müllerstraße 42, 13353 Berlin" },
  { id: "ORD-7780", date: "2025-01-15", supplier: "Istanbul Spices", items: "500 Burger Buns", total: 200.00, status: "Delivered", address: "Müllerstraße 42, 13353 Berlin" },
  { id: "ORD-7779", date: "2025-01-10", supplier: "Fresh Green Logistics", items: "50kg Tomatoes", total: 175.00, status: "Delivered", address: "Müllerstraße 42, 13353 Berlin" },
];

const MOCK_ADDRESSES = [
  { id: 1, name: "Main Branch", street: "Müllerstraße", houseNumber: "42", zip: "13353", city: "Berlin", isFavorite: true },
  { id: 2, name: "Warehouse B", street: "Sonnenallee", houseNumber: "154", zip: "12059", city: "Berlin", isFavorite: false }
];

const MOCK_NOTIFICATIONS = {
  owner: [
    { id: 1, title: "Order Update", message: "ORD-7781 is now Out for Delivery.", time: "10 min ago", unread: true, link: "orders" },
    { id: 2, title: "Price Alert", message: "Lamb Chops price dropped by 5%.", time: "2 hours ago", unread: false, link: "home" }
  ],
  supplier: [
    { id: 1, title: "New Order", message: "New order received from Star Doner Kebab.", time: "5 min ago", unread: true, link: "orders" },
    { id: 2, title: "Stock Alert", message: "Ayran is marked as Out of Stock.", time: "1 day ago", unread: false, link: "dashboard" }
  ]
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-md",
    secondary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    outline: "border-2 border-slate-200 text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    "Pending": "bg-amber-100 text-amber-700",
    "Preparing": "bg-blue-100 text-blue-700",
    "Out for Delivery": "bg-indigo-100 text-indigo-700",
    "Delivered": "bg-emerald-100 text-emerald-700",
    "Verified": "bg-emerald-50 text-emerald-600 border border-emerald-200",
    "Cancelled": "bg-red-100 text-red-700"
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const Footer = () => (
  <footer className="bg-slate-900 text-slate-300 py-12 mt-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" /> ProCuro
        </h3>
        <p className="text-sm opacity-70">Empowering Halal businesses with seamless procurement and inventory solutions.</p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4">Company</h4>
        <ul className="space-y-2 text-sm">
          <li>About Us</li>
          <li>Careers</li>
          <li>Press</li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4">Resources</h4>
        <ul className="space-y-2 text-sm">
          <li>Help Center</li>
          <li>Privacy Policy</li>
          <li>Terms of Service</li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4">Contact</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2"><Mail className="w-4 h-4"/> support@procuro.com</li>
          <li className="flex items-center gap-2"><Phone className="w-4 h-4"/> +49 30 12345678</li>
          <li className="flex items-center gap-2"><Globe className="w-4 h-4"/> Berlin, Germany</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs opacity-50">
      © 2025 ProCuro GmbH. All rights reserved.
    </div>
  </footer>
);

// --- Main Application ---

export default function ProCuroApp() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('auth'); 
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [cart, setCart] = useState([]);
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState(MOCK_ADDRESSES[0]);
  const [paymentMethods, setPaymentMethods] = useState([{id: 1, type: 'Visa', last4: '4242'}]);
  
  // Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [authRole, setAuthRole] = useState('owner'); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New States
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] = useState(false);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isCancelOrderModalOpen, setIsCancelOrderModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isDeleteOrderConfirmModalOpen, setIsDeleteOrderConfirmModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);

  const [checkoutStep, setCheckoutStep] = useState('cart'); 
  const [searchFilter, setSearchFilter] = useState('Everything'); 
  const [productQuantity, setProductQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeOrderTab, setActiveOrderTab] = useState('ongoing'); // ongoing | completed

  // Chatbot State
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: 'Hello! I am the ProCuro Assistant. How can I help you today?' }
  ]);

  // Password Logic
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[@#$%^&+=]/.test(pass)) score++;
    return score;
  };
  const passStrength = getPasswordStrength(password);
  const strengthInfo = {
     0: { label: '', color: 'bg-slate-200' },
     1: { label: 'Weak', color: 'bg-red-500' },
     2: { label: 'Good', color: 'bg-yellow-500' },
     3: { label: 'Strong', color: 'bg-emerald-500' }
  }[passStrength] || { label: '', color: 'bg-slate-200' };

  // --- Handlers ---
  const handleAddToCart = (product, qty) => {
    setCart([...cart, { ...product, qty, discountApplied: appliedDiscount > 0 }]);
    setIsProductModalOpen(false);
    setProductQuantity(1);
    setDiscountCode('');
    setAppliedDiscount(0);
    setDiscountMessage('');
  };

  const handleApplyDiscount = () => {
    if (discountCode === "SAVE10") {
      setAppliedDiscount(0.10);
      setDiscountMessage("10% Discount Applied!");
    } else {
      setAppliedDiscount(0);
      setDiscountMessage("Code is not correct");
    }
  };

  const handlePlaceOrder = () => {
    setCheckoutStep('success');
    const newOrder = {
      id: `ORD-${Math.floor(Math.random()*9000)+1000}`,
      date: new Date().toISOString().split('T')[0],
      supplier: cart[0]?.supplier || "Multiple",
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: cart.reduce((acc, item) => acc + (item.price * item.qty), 0) + 5,
      status: "Pending",
      address: `${selectedAddress.street} ${selectedAddress.houseNumber}, ${selectedAddress.zip} ${selectedAddress.city}`
    };
    setOrders([newOrder, ...orders]);
    
    setTimeout(() => {
      setCart([]);
      setCheckoutStep('cart');
      setPaymentMethod(null);
      setView('home');
    }, 2000);
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    setIsConfirmDeliveryModalOpen(false);
    setIsCancelOrderModalOpen(false);
  };

  const handleDeleteProduct = () => {
    setProducts(products.filter(p => p.id !== selectedProduct.id));
    setIsDeleteConfirmModalOpen(false);
    setIsEditProductModalOpen(false);
  };

  const handleDeleteOrder = () => {
    setOrders(orders.filter(o => o.id !== selectedOrder.id));
    setIsDeleteOrderConfirmModalOpen(false);
    setSelectedOrder(null);
    setView('orders');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setUser({ ...user, name: formData.get('name'), about: formData.get('about') });
    setIsEditProfileModalOpen(false);
  };

  const handleSetFavoriteAddress = (id) => {
    const updated = addresses.map(a => ({ ...a, isFavorite: a.id === id }));
    setAddresses(updated);
    setSelectedAddress(updated.find(a => a.id === id));
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    setPaymentMethods([...paymentMethods, { id: Date.now(), type: 'Mastercard', last4: '8888' }]);
    setIsAddCardModalOpen(false);
  };

  const handleChatSend = () => {
    if(!chatMessage.trim()) return;
    setChatHistory([...chatHistory, { sender: 'user', text: chatMessage }]);
    setChatMessage('');
    setTimeout(() => {
      setChatHistory(prev => [...prev, { sender: 'bot', text: "I'm just a demo bot, but I can help you navigate the app!" }]);
    }, 1000);
  };

  const goBack = () => {
    if (view === 'supplier-profile' || view === 'checkout' || view === 'orders' || view === 'analytics' || view === 'profile' || view === 'supplier-list') {
      setView(user.role === 'owner' ? 'home' : 'dashboard');
    } else if (view === 'supplier-order-detail') {
      setView('orders');
    } else if (view === 'owner-order-detail') {
      setView('orders');
    }
  };

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const getFilteredOrders = () => {
    if (activeOrderTab === 'completed') {
      return orders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');
    }
    return orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  };

  // --- Auth View ---
  if (!user) {
    const bgClass = authRole === 'owner' ? 'bg-slate-900' : 'bg-emerald-900'; // Dynamic background color
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${bgClass}`}>
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-300">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ProCuro</h1>
              <p className="text-slate-500 mt-2">The Halal Procurement Platform</p>
            </div>
            <div className="bg-slate-100 p-1.5 rounded-xl flex mb-8">
              <button onClick={() => setAuthRole('owner')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${authRole === 'owner' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Restaurant Owner</button>
              <button onClick={() => setAuthRole('supplier')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${authRole === 'supplier' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Supplier</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setUser({ name: authRole === 'owner' ? "Star Doner Kebab" : "Berlin Halal Meats", role: authRole, email: "demo@procuro.com", about: "Best Kebab in Berlin since 1990.", avatar: null });
              setView(authRole === 'owner' ? 'home' : 'dashboard');
            }} className="space-y-4">
              {!isLogin && (<div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Business Name</label><input type="text" className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none" placeholder="Business Name" /></div>)}
              <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label><input type="email" className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none" placeholder="you@company.com" required /></div>
              <div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Password</label><div className="relative"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none pr-10" placeholder="••••••••" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
              {!isLogin && (<div className="space-y-4 animate-in slide-in-from-top-2 duration-300"><div><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Strength</span><span className={`font-bold ${passStrength === 1 ? 'text-red-500' : passStrength === 2 ? 'text-yellow-500' : 'text-emerald-500'}`}>{strengthInfo.label}</span></div><div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-300 ${strengthInfo.color}`} style={{ width: `${(passStrength / 3) * 100}%` }}></div></div></div><div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100"><div className={`flex items-center gap-2 text-xs ${password.length > 8 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}><Check className="w-2.5 h-2.5" /> Over 8 characters</div><div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}><Check className="w-2.5 h-2.5" /> One uppercase letter</div><div className={`flex items-center gap-2 text-xs ${/[@#$%^&+=]/.test(password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}><Check className="w-2.5 h-2.5" /> Special character</div></div><div><label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Confirm Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none" placeholder="••••••••" required /></div></div>)}
              <Button type="submit" variant="primary" className="w-full py-3 text-lg">{isLogin ? 'Log In' : 'Create Account'}</Button>
            </form>
            <div className="my-6 flex items-center"><div className="flex-1 border-t border-slate-200"></div><span className="px-4 text-xs text-slate-400 font-medium">OR CONTINUE WITH</span><div className="flex-1 border-t border-slate-200"></div></div>
            <div className="grid grid-cols-2 gap-4"><Button variant="outline" className="w-full text-sm gap-2"><GoogleLogo /> Google</Button><Button variant="outline" className="w-full text-sm gap-2"><AppleLogo /> Apple</Button></div>
            <p className="text-center mt-8 text-sm text-slate-500">{isLogin ? "Don't have an account?" : "Already have an account?"} <button onClick={() => { setIsLogin(!isLogin); setPassword(''); setConfirmPassword(''); }} className="ml-1 text-emerald-600 font-semibold hover:underline">{isLogin ? "Sign Up" : "Log In"}</button></p>
          </div>
        </div>
      </div>
    );
  }

  // --- Layout ---
  const Layout = ({ children }) => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Back Arrow */}
              {view !== 'home' && view !== 'dashboard' && (
                <button onClick={goBack} className="p-2 hover:bg-slate-100 rounded-full mr-1">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setView(user.role === 'owner' ? 'home' : 'dashboard')}>
                <ShoppingCart className="w-8 h-8 text-slate-900 mr-2" />
                <span className={`font-bold text-xl text-slate-900 hidden sm:block`}>ProCuro</span>
              </div>

              {/* Address Selector in Header (Only for Owners) */}
              {user.role === 'owner' && (
                <div className="relative ml-4 hidden md:block">
                   <button onClick={() => setIsAddressSelectorOpen(!isAddressSelectorOpen)} className="flex flex-col items-start text-xs text-slate-500 hover:text-emerald-600">
                     <span>Delivered to</span>
                     <span className="font-bold text-slate-900 flex items-center gap-1">
                       <MapPin className="w-3 h-3" /> 
                       {selectedAddress ? `${selectedAddress.street} ${selectedAddress.houseNumber}` : 'Select Address'}
                     </span>
                   </button>
                   {isAddressSelectorOpen && (
                     <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 z-50 p-2">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Saved Addresses</p>
                        {addresses.map(addr => (
                          <button key={addr.id} onClick={() => { setSelectedAddress(addr); setIsAddressSelectorOpen(false); }} className="w-full text-left p-2 hover:bg-slate-50 rounded-md text-sm flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{addr.name}</p>
                              <p className="text-xs text-slate-500">{addr.street} {addr.houseNumber}</p>
                            </div>
                            {addr.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                          </button>
                        ))}
                        <button onClick={() => { setIsAddressModalOpen(true); setIsAddressSelectorOpen(false); }} className="w-full text-left p-2 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 rounded-md mt-1">+ Add New Address</button>
                     </div>
                   )}
                </div>
              )}

              {user.role === 'owner' && view === 'home' && (
                 <div className="hidden lg:flex ml-8 items-center bg-slate-100 rounded-full px-4 py-2 w-64 border border-slate-200 focus-within:border-emerald-500 transition-colors">
                   <Search className="w-4 h-4 text-slate-400 mr-2" />
                   <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none text-sm w-full" />
                   <div className="h-4 w-px bg-slate-300 mx-2"></div>
                   <div className="relative group">
                     <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-600">
                       {searchFilter} <Filter className="w-3 h-3" />
                     </button>
                     <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-100 hidden group-hover:block p-1">
                       <button onClick={() => setSearchFilter('Everything')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded-md">Everything</button>
                       <button onClick={() => setSearchFilter('Cities')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 rounded-md">Cities</button>
                     </div>
                   </div>
                 </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 font-bold text-slate-900">Notifications</div>
                  <div className="max-h-64 overflow-y-auto">
                    {MOCK_NOTIFICATIONS[user.role].map(notif => (
                      <div key={notif.id} onClick={() => { setView(notif.link); setShowNotifications(false); }} className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${notif.unread ? 'bg-emerald-50/50' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-slate-800">{notif.title}</span>
                          <span className="text-[10px] text-slate-400">{notif.time}</span>
                        </div>
                        <p className="text-xs text-slate-600">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {user.role === 'owner' && (
                <button onClick={() => setView('checkout')} className="p-2 text-slate-400 hover:text-slate-600 relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && <span className="absolute top-1 right-0 w-4 h-4 bg-emerald-500 text-white text-[10px] flex items-center justify-center rounded-full">{cart.length}</span>}
                </button>
              )}

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer" onClick={() => setView('profile')}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-emerald-600" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />

      {/* Chatbot */}
      <div className="fixed bottom-6 right-6 z-40">
        {!showChat && (
          <button onClick={() => setShowChat(true)} className="w-14 h-14 bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-emerald-700 transition-transform hover:scale-110">
            <MessageCircle className="w-8 h-8" />
          </button>
        )}
        {showChat && (
          <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
            <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5" /> ProCuro AI</h3>
              <button onClick={() => setShowChat(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={chatMessage} 
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask something..." 
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={handleChatSend} className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-50 pb-safe">
        <button onClick={() => setView(user.role === 'owner' ? 'home' : 'dashboard')} className={`p-2 rounded-lg flex flex-col items-center ${['home','dashboard'].includes(view) ? 'text-emerald-600' : 'text-slate-400'}`}><Home className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">Home</span></button>
        <button onClick={() => setView('orders')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'orders' ? 'text-emerald-600' : 'text-slate-400'}`}><Package className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">Orders</span></button>
        <button onClick={() => setView('analytics')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'analytics' ? 'text-emerald-600' : 'text-slate-400'}`}><TrendingUp className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">Analysis</span></button>
        <button onClick={() => setView('profile')} className={`p-2 rounded-lg flex flex-col items-center ${view === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}><User className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">Profile</span></button>
      </div>
    </div>
  );

  // --- Sub-Views ---

  const RestaurantHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="md:hidden">
        <div className="flex items-center bg-white rounded-lg px-4 py-3 shadow-sm border border-slate-100">
           <Search className="w-5 h-5 text-slate-400 mr-3" />
           <input type="text" placeholder="Search..." className="bg-transparent border-none focus:outline-none w-full text-base" />
           <Filter className="w-5 h-5 text-slate-400 ml-2" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Categories</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { name: 'Chicken', icon: <Drumstick className={`w-8 h-8 ${selectedCategory === 'Chicken' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> },
            { name: 'Meat', icon: <Beef className={`w-8 h-8 ${selectedCategory === 'Meat' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> },
            { name: 'Vegetables', icon: <Leaf className={`w-8 h-8 ${selectedCategory === 'Vegetables' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> }, 
            { name: 'Bakery', icon: <Coffee className={`w-8 h-8 ${selectedCategory === 'Bakery' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> }, 
            { name: 'Fruits', icon: <Apple className={`w-8 h-8 ${selectedCategory === 'Fruits' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> },
            { name: 'Others', icon: <Package className={`w-8 h-8 ${selectedCategory === 'Others' ? 'text-emerald-600' : 'text-slate-400'} group-hover:text-emerald-500`} /> },
          ].map((cat) => (
            <div key={cat.name} onClick={() => setSelectedCategory(selectedCategory === cat.name ? 'All' : cat.name)} className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-sm border flex items-center justify-center transition-all ${selectedCategory === cat.name ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-100 group-hover:border-emerald-500 group-hover:shadow-md'}`}>
                {cat.icon}
              </div>
              <span className={`text-xs font-medium group-hover:text-slate-900 ${selectedCategory === cat.name ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-lg font-bold text-slate-900">Recommended Suppliers</h2>
          <button onClick={() => setView('supplier-list')} className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">See All</button>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {MOCK_SUPPLIERS.map((supplier) => (
            <div key={supplier.id} onClick={() => { setSelectedSupplier(supplier); setView('supplier-profile'); }} className="min-w-[200px] cursor-pointer bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden">
                <img src={supplier.image} alt={supplier.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{supplier.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-500">
                <span>★</span> {supplier.rating}
              </div>
              {supplier.verified && (
                <div className="mt-2 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-100">
                  <CheckCircle className="w-3 h-3" /> Halal Certified
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-lg font-bold text-slate-900">
            {selectedCategory !== 'All' ? 'Products' : 'Recommended Orders'}
          </h2>
          <button className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">See All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} onClick={() => { setSelectedProduct(product); setIsProductModalOpen(true); }} className="group hover:shadow-md transition-shadow cursor-pointer">
              <div className="relative h-40 bg-slate-100">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                {!product.inStock && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-slate-500">Out of Stock</div>}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                  {product.category}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-1">{product.description.substring(0, 40)}...</p>
                <p className="text-xs font-bold text-emerald-700 mb-3">{product.supplier}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-900">€{product.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 ml-1">/ {product.unit}</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const SupplierListView = () => (
    <div className="space-y-6">
       <div className="flex items-center gap-4 mb-6">
         <h2 className="text-2xl font-bold">All Suppliers</h2>
       </div>
       <div className="flex gap-4 mb-6">
         <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-4 py-2">
           <Search className="w-4 h-4 text-slate-400 mr-2" />
           <input type="text" placeholder="Search suppliers..." className="w-full outline-none text-sm" />
         </div>
         <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium flex items-center gap-2"><Filter className="w-4 h-4" /> Filter</button>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {MOCK_SUPPLIERS.map(supplier => (
           <Card key={supplier.id} onClick={() => { setSelectedSupplier(supplier); setView('supplier-profile'); }} className="p-4 flex gap-4 cursor-pointer hover:border-emerald-500 transition-colors">
             <img src={supplier.image} className="w-20 h-20 rounded-lg object-cover bg-slate-100" />
             <div>
               <h3 className="font-bold text-lg">{supplier.name}</h3>
               <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {supplier.location}</p>
               <div className="flex items-center gap-2 mt-2">
                 <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">★ {supplier.rating}</span>
                 {supplier.verified && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Halal</span>}
               </div>
             </div>
           </Card>
         ))}
       </div>
    </div>
  );

  const SupplierProfileView = () => (
    <div className="space-y-6">
      <div className="relative h-48 bg-slate-900 rounded-xl overflow-hidden">
        <img src={selectedSupplier.image} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <h1 className="text-3xl font-bold">{selectedSupplier.name}</h1>
          <p className="flex items-center gap-2 text-sm opacity-90"><MapPin className="w-4 h-4" /> {selectedSupplier.location} • <CheckCircle className="w-4 h-4 text-emerald-400" /> Halal Certified</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
           <h3 className="font-bold text-xl">Products</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {products.filter(p => p.supplier === selectedSupplier.name).map(product => (
               <Card key={product.id} onClick={() => { setSelectedProduct(product); setIsProductModalOpen(true); }} className="p-4 flex gap-4 cursor-pointer hover:border-emerald-500">
                  <img src={product.image} className="w-20 h-20 rounded-lg object-cover" />
                  <div>
                    <h4 className="font-bold">{product.name}</h4>
                    <p className="text-sm font-semibold text-emerald-600">€{product.price.toFixed(2)} / {product.unit}</p>
                    <button className="mt-2 text-xs bg-slate-900 text-white px-3 py-1 rounded-full">Add</button>
                  </div>
               </Card>
             ))}
           </div>
        </div>
        <div className="space-y-4">
           <Card className="p-4">
             <h4 className="font-bold mb-2">About</h4>
             <p className="text-sm text-slate-500">{selectedSupplier.description}</p>
           </Card>
           <Card className="p-4">
             <h4 className="font-bold mb-2">Certifications</h4>
             <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
               <FileText className="w-5 h-5 text-emerald-600" />
               <div>
                 <p className="text-sm font-semibold text-emerald-900">Halal Certificate.pdf</p>
                 <p className="text-xs text-emerald-700">Verified 2025</p>
               </div>
               <Eye className="w-4 h-4 text-emerald-600 ml-auto cursor-pointer" />
             </div>
           </Card>
        </div>
      </div>
    </div>
  );

  const CheckoutView = () => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const delivery = 5.00;
    const discountAmount = subtotal * appliedDiscount;
    const total = subtotal + delivery - discountAmount;

    if (checkoutStep === 'success') return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Order Placed!</h2>
        <p className="text-slate-500">Your order #{Math.floor(Math.random()*9000)+1000} has been sent to suppliers.</p>
      </div>
    );

    if (checkoutStep === 'payment') return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={() => setCheckoutStep('cart')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Back to Summary</button>
        <h2 className="text-2xl font-bold">Payment Method</h2>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setPaymentMethod('card')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 font-bold transition-all ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
            <CreditCard className="w-6 h-6" /> Card Payment
          </button>
          <button onClick={() => setPaymentMethod('cash')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 font-bold transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
            <Banknote className="w-6 h-6" /> Cash on Delivery
          </button>
        </div>
        
        {paymentMethod === 'card' && (
          <Card className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-900">Select Card</h3>
               <button onClick={() => setIsAddCardModalOpen(true)} className="text-xs font-bold text-emerald-600 hover:underline">+ Add New Card</button>
             </div>
             <div className="space-y-2">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-slate-50 cursor-pointer border-emerald-500 bg-emerald-50">
                    <div className="w-4 h-4 bg-emerald-600 rounded-full"></div>
                    <CreditCard className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-700">{pm.type} •••• {pm.last4}</span>
                  </div>
                ))}
             </div>
          </Card>
        )}
        
        {paymentMethod === 'cash' && (
           <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
             <AlertCircle className="w-5 h-5" /> Please ensure you have the exact amount ready upon delivery.
           </div>
        )}

        <Button disabled={!paymentMethod} onClick={handlePlaceOrder} className="w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed">Place Order (€{total.toFixed(2)})</Button>
      </div>
    );

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
         <h2 className="text-2xl font-bold">My Cart</h2>
       </div>
       {cart.length === 0 ? (
         <div className="text-center py-20 text-slate-400">Your cart is empty</div>
       ) : (
         <div className="space-y-4">
           {cart.map((item, idx) => (
             <Card key={idx} className="p-4 flex gap-4 items-center">
               <img src={item.image} className="w-16 h-16 rounded-lg object-cover" />
               <div className="flex-1">
                 <h4 className="font-bold">{item.name}</h4>
                 <p className="text-xs text-slate-500">{item.supplier}</p>
                 <p className="text-sm font-medium">€{item.price} x {item.qty} {item.unit}</p>
               </div>
               <div className="text-right font-bold">€{(item.price * item.qty).toFixed(2)}</div>
             </Card>
           ))}
           <div className="border-t border-slate-200 pt-4 space-y-2">
             <div className="flex justify-between items-center text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
               <div>
                 <span className="text-xs font-bold uppercase text-slate-400">Delivering To</span>
                 <p className="text-sm font-semibold text-slate-800">{selectedAddress.name} ({selectedAddress.street})</p>
               </div>
               <button onClick={() => setIsAddressModalOpen(true)} className="text-xs font-bold text-emerald-600 hover:underline">Change</button>
             </div>
             <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
             <div className="flex justify-between text-slate-600"><span>Delivery Fee</span><span>€{delivery.toFixed(2)}</span></div>
             {appliedDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount (10%)</span><span>-€{discountAmount.toFixed(2)}</span></div>}
             <div className="flex justify-between text-xl font-bold text-slate-900 pt-2"><span>Total</span><span>€{total.toFixed(2)}</span></div>
           </div>
           <Button onClick={() => setCheckoutStep('payment')} className="w-full py-3">Continue to Payment</Button>
         </div>
       )}
      </div>
    );
  };

  const SupplierDashboard = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const displayedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white"><p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Revenue</p><h3 className="text-2xl font-bold">€12,450.00</h3><div className="mt-4 flex items-center text-xs text-emerald-400"><TrendingUp className="w-3 h-3 mr-1" /> +12% from last month</div></Card>
          <Card className="p-6 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setView('orders')}>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Active Orders</p>
            <h3 className="text-2xl font-bold text-slate-900">24</h3>
            <div className="mt-4 flex items-center text-xs text-slate-400">8 Pending Preparation</div>
          </Card>
          <Card className="p-6 flex flex-col justify-center items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setView('analytics')}><div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-2"><TrendingUp className="w-5 h-5 text-emerald-600" /></div><span className="text-sm font-semibold text-emerald-600">See Full Analysis</span></Card>
        </div>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">My Products</h2>
            <Button variant="secondary" className="text-sm py-2 px-3" onClick={() => { setSelectedProduct(null); setIsAddProductModalOpen(true); }}><Plus className="w-4 h-4" /> Add Product</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedProducts.map(product => (
              <Card key={product.id} className="flex flex-row p-3 gap-4 items-center">
                 <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">
                   <img src={product.image} alt={product.name} className={`w-full h-full object-cover ${!product.inStock && 'grayscale opacity-50'}`} />
                   {!product.inStock && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold bg-white/70">OUT OF STOCK</div>}
                 </div>
                 <div className="flex-1"><h4 className="font-bold text-slate-900">{product.name}</h4><p className={`text-xs mb-2 ${product.inStock ? 'text-emerald-600' : 'text-red-500'}`}>{product.inStock ? 'In Stock' : 'Out of Stock'}</p><p className="text-sm font-semibold text-emerald-600">€{product.price.toFixed(2)} / {product.unit}</p></div>
                 <button onClick={() => { setSelectedProduct(product); setIsEditProductModalOpen(true); }} className="text-slate-400 hover:text-slate-600 p-2"><Edit className="w-4 h-4" /></button>
              </Card>
            ))}
          </div>
          <div className="flex justify-center items-center gap-4 mt-8"><button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600"><ChevronLeft className="w-5 h-5" /></button><span className="text-sm font-medium text-slate-900">Page {currentPage} of {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-slate-600"><ChevronRight className="w-5 h-5" /></button></div>
        </div>
      </div>
    );
  };

  const AnalysisPage = () => {
    const [animate, setAnimate] = useState(false);
    useEffect(() => setAnimate(true), []);

    return (
      <div className="animate-in fade-in zoom-in duration-500">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Euro className="w-4 h-4" /> {user.role === 'owner' ? 'Monthly Spending (€)' : 'Sales Revenue (€)'}
            </h3>
            {/* Functional animated bar chart */}
            <div className="h-48 flex items-end justify-between gap-4 px-2">
              {[35, 55, 40, 70, 50, 85].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 rounded-t-md relative h-full flex items-end">
                    <div 
                      className={`w-full bg-emerald-500 rounded-t-md transition-all duration-1000 ease-out hover:bg-emerald-600 ${animate ? 'opacity-100' : 'h-0 opacity-0'}`} 
                      style={{ height: animate ? `${h}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'][i]}</span>
                </div>
              ))}
            </div>
          </Card>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-bold text-slate-700 mb-6">{user.role === 'owner' ? 'Spend by Category' : 'Sales by Category'}</h3>
              <div className="space-y-4">{[{ label: 'Meat & Poultry', val: '45%', color: 'bg-red-500' }, { label: 'Vegetables', val: '25%', color: 'bg-green-500' }, { label: 'Beverages', val: '20%', color: 'bg-blue-500' }, { label: 'Others', val: '10%', color: 'bg-amber-500' }].map((item) => (<div key={item.label}><div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-600">{item.label}</span><span className="font-bold text-slate-900">{item.val}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: animate ? item.val : '0%' }}></div></div></div>))}</div>
            </Card>

            {/* Top Orders / Sales Card */}
            <Card className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
               <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                   <Package className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <p className="text-xs font-bold uppercase tracking-wider opacity-80">{user.role === 'owner' ? 'Top Orders' : 'Top Sales'}</p>
                   <h4 className="text-lg font-bold">Most Popular Items</h4>
                 </div>
               </div>
               <div className="space-y-3">
                 {[
                   { name: user.role === 'owner' ? "Lamb Chops (20kg)" : "Lamb Chops", metric: user.role === 'owner' ? "5 Orders" : "142 Sold", amount: "€1,200" },
                   { name: user.role === 'owner' ? "Cola Cans (10 Boxes)" : "Cola Cans", metric: user.role === 'owner' ? "3 Orders" : "89 Sold", amount: "€450" }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-lg">
                     <span className="text-sm font-medium">{item.name}</span>
                     <div className="text-right">
                       <p className="text-xs opacity-80">{item.metric}</p>
                       <p className="font-bold text-sm">{item.amount}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const OrdersPage = () => (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold mb-4">{user.role === 'supplier' ? 'My Sales' : 'My Orders'}</h2>
       
       {/* Tabs for Order Status */}
       <div className="flex gap-4 border-b border-slate-200 mb-6">
         <button onClick={() => setActiveOrderTab('ongoing')} className={`pb-2 px-1 text-sm font-bold transition-all ${activeOrderTab === 'ongoing' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400'}`}>Ongoing Orders</button>
         <button onClick={() => setActiveOrderTab('completed')} className={`pb-2 px-1 text-sm font-bold transition-all ${activeOrderTab === 'completed' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-400'}`}>Completed Orders</button>
       </div>

       {getFilteredOrders().map(o => (
         <Card key={o.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <span className="font-bold text-lg">{o.id}</span>
                     <Badge status={o.status} />
                  </div>
                  <p className="text-sm text-slate-500 mb-1">From: <span className="font-semibold text-slate-700">{o.supplier}</span></p>
                  <p className="text-sm text-slate-500">Date: {o.date}</p>
               </div>
               <div className="flex flex-col items-end gap-3">
                  <span className="text-xl font-bold">€{o.total.toFixed(2)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-xs py-1 h-8" onClick={() => { setSelectedOrder(o); setView(user.role === 'owner' ? 'owner-order-detail' : 'supplier-order-detail'); }}>View Details</Button>
                    
                    {/* Owner Actions */}
                    {user.role === 'owner' && o.status === 'Out for Delivery' && (
                       <Button variant="primary" className="text-xs py-1 h-8" onClick={() => { setSelectedOrder(o); setIsConfirmDeliveryModalOpen(true); }}>Mark Delivered</Button>
                    )}
                    {user.role === 'owner' && o.status === 'Pending' && (
                       <Button variant="danger" className="text-xs py-1 h-8" onClick={() => { setSelectedOrder(o); setIsCancelOrderModalOpen(true); }}>Cancel Order</Button>
                    )}

                    {/* Supplier Actions */}
                    {user.role === 'supplier' && o.status === 'Pending' && (
                       <Button variant="primary" className="text-xs py-1 h-8" onClick={() => handleStatusChange(o.id, 'Out for Delivery')}>Ship Order</Button>
                    )}
                  </div>
               </div>
            </div>
         </Card>
       ))}
       {getFilteredOrders().length === 0 && <p className="text-center text-slate-400 py-12">No orders found in this category.</p>}
    </div>
  );

  const OrderDetailView = () => {
    if (!selectedOrder) return null;
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Order Details</h2>
          <Badge status={selectedOrder.status} />
        </div>
        <Card className="p-6 mb-6">
           <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                 <p className="text-xs text-slate-400 uppercase font-bold mb-1">Order ID</p>
                 <p className="font-mono font-bold">{selectedOrder.id}</p>
              </div>
              <div>
                 <p className="text-xs text-slate-400 uppercase font-bold mb-1">Date</p>
                 <p className="font-medium">{selectedOrder.date}</p>
              </div>
              <div>
                 <p className="text-xs text-slate-400 uppercase font-bold mb-1">{user.role === 'supplier' ? 'Customer' : 'Supplier'}</p>
                 <p className="font-medium">{user.role === 'supplier' ? "Star Doner Kebab" : selectedOrder.supplier}</p>
              </div>
              <div>
                 <p className="text-xs text-slate-400 uppercase font-bold mb-1">Delivery Address</p>
                 <p className="font-medium">{selectedOrder.address || "No address provided"}</p>
              </div>
           </div>
           
           <div className="border-t border-slate-100 pt-6">
              <p className="font-bold mb-4">Items</p>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-700">{selectedOrder.items}</p>
              </div>
           </div>

           <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="font-bold text-2xl text-emerald-600">€{selectedOrder.total.toFixed(2)}</span>
           </div>
        </Card>

        <div className="flex gap-4 flex-wrap">
           {user.role === 'supplier' && selectedOrder.status === 'Pending' && (
             <Button className="w-full sm:w-auto flex-1" onClick={() => handleStatusChange(selectedOrder.id, 'Out for Delivery')}>Mark as Out for Delivery</Button>
           )}
           {user.role === 'supplier' && selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
             <Button variant="danger" className="w-full sm:w-auto flex-1" onClick={() => setIsCancelOrderModalOpen(true)}>Cancel Order</Button>
           )}
           {user.role === 'supplier' && selectedOrder.status === 'Delivered' && (
             <Button variant="danger" className="w-full" onClick={() => setIsDeleteOrderConfirmModalOpen(true)}>Delete Record</Button>
           )}

           {user.role === 'owner' && selectedOrder.status === 'Out for Delivery' && (
             <Button className="w-full" onClick={() => setIsConfirmDeliveryModalOpen(true)}>Confirm Delivery</Button>
           )}
           {user.role === 'owner' && selectedOrder.status === 'Pending' && (
             <Button variant="danger" className="w-full" onClick={() => setIsCancelOrderModalOpen(true)}>Cancel Order</Button>
           )}
        </div>
      </div>
    );
  };

  const ProfilePage = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-slate-900 to-slate-800"></div>
         <div className="relative z-10">
           <div className="relative inline-block">
             <div className="w-24 h-24 bg-white rounded-full mx-auto p-1 shadow-lg mb-4 overflow-hidden">
               {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-full"/> : <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><User className="w-10 h-10" /></div>}
             </div>
             <button onClick={() => setIsProfilePicModalOpen(true)} className="absolute bottom-4 right-0 bg-slate-900 text-white p-1.5 rounded-full hover:bg-emerald-600 border-2 border-white">
               <Pen className="w-3 h-3" />
             </button>
           </div>
           <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
           <p className="text-slate-500 capitalize">{user.role === 'owner' ? 'Restaurant' : 'Supplier'}</p>
           <p className="text-sm text-slate-400 mt-2 italic">"{user.about || "No bio added"}"</p>
           <button onClick={() => setIsEditProfileModalOpen(true)} className="text-xs text-emerald-600 font-bold mt-2 hover:underline">Edit Profile</button>
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => setView('orders')} className="h-20 flex flex-col gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          {user.role === 'supplier' ? 'My Sales' : 'View My Orders'}
        </Button>
        <Button variant="outline" onClick={() => setView('analytics')} className="h-20 flex flex-col gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          View Analysis
        </Button>
      </div>

      {/* Account Settings */}
      <Card className="p-6">
         <h3 className="font-bold text-lg mb-4">Account Settings</h3>
         <div className="space-y-3">
            <button onClick={() => setIsChangePasswordModalOpen(true)} className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
               <span className="font-medium text-slate-700">Change Email & Password</span>
               <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => setIsAddressModalOpen(true)} className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
               <span className="font-medium text-slate-700">Manage My Addresses</span>
               <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => setIsPaymentMethodModalOpen(true)} className="w-full text-left p-3 hover:bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
               <span className="font-medium text-slate-700">Payment Methods</span>
               <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
         </div>
      </Card>

      <Card className="p-6 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div><h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Halal Certification</h3><p className="text-sm text-slate-500 mt-1">Required for compliance validation.</p></div>
            <Badge status="Verified" />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500"><FileText className="w-6 h-6" /></div><div><p className="text-sm font-semibold text-slate-900">Certificate_2025.pdf</p><p className="text-xs text-slate-400">Uploaded on Jan 10, 2025</p></div></div>
            <button onClick={() => setIsCertificateModalOpen(true)} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">Update</button>
          </div>
      </Card>

      <Button variant="danger" className="w-full justify-center" onClick={() => setUser(null)}><LogOut className="w-4 h-4" /> Sign Out</Button>
    </div>
  );

  // --- Modals ---

  return (
    <Layout>
      {view === 'home' && <RestaurantHome />}
      {view === 'supplier-list' && <SupplierListView />}
      {view === 'supplier-profile' && <SupplierProfileView />}
      {view === 'checkout' && <CheckoutView />}
      {view === 'dashboard' && <SupplierDashboard />}
      {view === 'orders' && <OrdersPage />}
      {view === 'owner-order-detail' && <OrderDetailView />}
      {view === 'supplier-order-detail' && <OrderDetailView />}
      {view === 'analytics' && <AnalysisPage />}
      {view === 'profile' && <ProfilePage />}

      {/* Confirmation Modal for Delivery */}
      {isConfirmDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center animate-in zoom-in">
             <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600"><CheckCircle className="w-6 h-6" /></div>
             <h3 className="text-lg font-bold mb-2">Confirm Delivery?</h3>
             <p className="text-slate-500 text-sm mb-6">Are you sure you want to mark this order as received?</p>
             <div className="flex gap-3">
               <Button variant="ghost" className="flex-1" onClick={() => setIsConfirmDeliveryModalOpen(false)}>No, Cancel</Button>
               <Button className="flex-1" onClick={() => handleStatusChange(selectedOrder.id, 'Delivered')}>Yes, Confirm</Button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation (Supplier) */}
      {isDeleteOrderConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center animate-in zoom-in">
             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><Trash2 className="w-6 h-6" /></div>
             <h3 className="text-lg font-bold mb-2">Delete Order Record?</h3>
             <p className="text-slate-500 text-sm mb-6">This action cannot be undone. Ensure the transaction is complete.</p>
             <div className="flex gap-3">
               <Button variant="ghost" className="flex-1" onClick={() => setIsDeleteOrderConfirmModalOpen(false)}>Cancel</Button>
               <Button variant="danger" className="flex-1" onClick={handleDeleteOrder}>Delete</Button>
             </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal with Reason */}
      {isCancelOrderModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
             <h3 className="text-xl font-bold mb-4">Cancel Order</h3>
             <p className="text-sm text-slate-500 mb-4">Please confirm you want to cancel this order. This action cannot be undone.</p>
             <div className="space-y-4">
               <label className="text-sm font-bold text-slate-700">Reason for Cancellation</label>
               <textarea 
                 value={cancellationReason}
                 onChange={(e) => setCancellationReason(e.target.value)}
                 className="w-full p-3 border border-slate-200 rounded-lg h-32 focus:ring-2 focus:ring-emerald-500 outline-none"
                 placeholder="e.g. Item out of stock, delivery issue..."
               ></textarea>
               <div className="flex gap-3">
                 <Button variant="outline" className="flex-1" onClick={() => setIsCancelOrderModalOpen(false)}>Back</Button>
                 <Button variant="danger" className="flex-1" onClick={() => handleStatusChange(selectedOrder.id, 'Cancelled')}>Confirm Cancel</Button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Payment Card Modal */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
             <h3 className="text-xl font-bold mb-4">Add New Card</h3>
             <form onSubmit={handleAddCard} className="space-y-4">
                <div><label className="text-xs font-bold text-slate-500">Card Number</label><input required type="text" placeholder="0000 0000 0000 0000" className="w-full p-2 border rounded-lg"/></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-bold text-slate-500">Expiry</label><input required type="text" placeholder="MM/YY" className="w-full p-2 border rounded-lg"/></div>
                   <div><label className="text-xs font-bold text-slate-500">CVC</label><input required type="text" placeholder="123" className="w-full p-2 border rounded-lg"/></div>
                </div>
                <div className="flex gap-3 mt-4">
                   <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsAddCardModalOpen(false)}>Cancel</Button>
                   <Button type="submit" className="flex-1">Add Card</Button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Payment Methods List Modal */}
      {isPaymentMethodModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
             <button onClick={() => setIsPaymentMethodModalOpen(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
             <h3 className="text-xl font-bold mb-4">Payment Methods</h3>
             <div className="space-y-3 mb-6">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="flex justify-between items-center p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium text-slate-700">{pm.type} ending in {pm.last4}</span>
                    </div>
                    <button className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
             </div>
             <Button onClick={() => setIsAddCardModalOpen(true)} className="w-full">+ Add New Card</Button>
          </div>
        </div>
      )}

      {/* Product Details Modal (Add to Cart) */}
      {isProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in duration-200">
             <div className="relative h-64">
               <img src={selectedProduct.image} className="w-full h-full object-cover" />
               <button onClick={() => setIsProductModalOpen(false)} className="absolute top-4 right-4 bg-white/50 backdrop-blur-md p-2 rounded-full hover:bg-white"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>
                     <p className="text-emerald-600 font-bold text-lg">{selectedProduct.supplier}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-2xl font-bold">€{selectedProduct.price.toFixed(2)}</p>
                     <p className="text-xs text-slate-400">per {selectedProduct.unit}</p>
                   </div>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">{selectedProduct.description}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                   <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Delivery: €{selectedProduct.deliveryPrice.toFixed(2)}</span>
                </div>
                
                {selectedProduct.inStock ? (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-700">Quantity</span>
                      <div className="flex items-center gap-4 ml-auto">
                        <button onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">-</button>
                        <span className="font-bold w-8 text-center">{productQuantity}</span>
                        <button onClick={() => setProductQuantity(productQuantity + 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">+</button>
                      </div>
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={discountCode} 
                          onChange={(e) => setDiscountCode(e.target.value)} 
                          placeholder="Discount Code" 
                          className="flex-1 p-3 border border-slate-200 rounded-lg outline-none text-sm"
                        />
                        <Button onClick={handleApplyDiscount} variant="outline" className="h-[46px]">Apply</Button>
                      </div>
                      {discountMessage && <p className={`text-xs mt-1 ${discountMessage.includes('Applied') ? 'text-emerald-600' : 'text-red-500'}`}>{discountMessage}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 text-red-600 font-bold text-center rounded-xl mb-6">Currently Out of Stock</div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsProductModalOpen(false)}>Close</Button>
                  <Button disabled={!selectedProduct.inStock} variant="primary" className="flex-[2] disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleAddToCart(selectedProduct, productQuantity)}>
                    {selectedProduct.inStock ? `Add to Cart - €${((selectedProduct.price * productQuantity) * (1 - appliedDiscount)).toFixed(2)}` : 'Unavailable'}
                  </Button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal (Supplier) - RESIZED */}
      {(isAddProductModalOpen || isEditProductModalOpen) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl p-6 relative flex flex-col">
            <button onClick={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold mb-6 flex-shrink-0">{isEditProductModalOpen ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-emerald-500 hover:text-emerald-500 bg-slate-50">
                 {selectedProduct?.image ? <img src={selectedProduct.image} className="w-full h-full object-cover rounded-xl" /> : <><ImageIcon className="w-8 h-8 mb-2" /><span className="text-xs font-bold">+ Upload Image</span></>}
              </div>
              <div><label className="text-xs font-bold uppercase text-slate-500">Product Name</label><input type="text" defaultValue={selectedProduct?.name} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="text-xs font-bold uppercase text-slate-500">Description</label><textarea defaultValue={selectedProduct?.description} className="w-full p-2 border rounded-lg h-20"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold uppercase text-slate-500">Price (€)</label><input type="number" defaultValue={selectedProduct?.price} className="w-full p-2 border rounded-lg" /></div>
                 <div><label className="text-xs font-bold uppercase text-slate-500">Delivery Fee (€)</label><input type="number" defaultValue={selectedProduct?.deliveryPrice} className="w-full p-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold uppercase text-slate-500">Unit</label><input type="text" defaultValue={selectedProduct?.unit} className="w-full p-2 border rounded-lg" /></div>
                 <div><label className="text-xs font-bold uppercase text-slate-500">Discount Code</label><input type="text" defaultValue={selectedProduct?.discountCode} className="w-full p-2 border rounded-lg" placeholder="Optional" /></div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input type="checkbox" defaultChecked={selectedProduct ? selectedProduct.inStock : true} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                <label className="text-sm font-bold text-slate-700">Product In Stock</label>
              </div>

              <Button onClick={() => { setIsAddProductModalOpen(false); setIsEditProductModalOpen(false); }} className="w-full">Save Product</Button>
              {isEditProductModalOpen && (
                <Button variant="danger" onClick={() => setIsDeleteConfirmModalOpen(true)} className="w-full mt-2">Delete Product</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
             <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
             <h3 className="text-lg font-bold mb-2">Delete Product?</h3>
             <p className="text-slate-600 text-sm mb-6">If you have to make it out of stock, then delete it</p> 
             <div className="flex gap-3">
               <Button variant="outline" className="flex-1" onClick={() => setIsDeleteConfirmModalOpen(false)}>Cancel</Button>
               <Button variant="danger" className="flex-1" onClick={handleDeleteProduct}>Yes, Delete</Button>
             </div>
          </div>
        </div>
      )}

      {/* Certificate Update Modal */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative text-center">
             <h3 className="text-lg font-bold mb-4">Update Certificate</h3>
             <div className="w-full h-40 border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl flex flex-col items-center justify-center cursor-pointer mb-6 hover:bg-emerald-100">
               <Plus className="w-10 h-10 text-emerald-500 mb-2" />
               <span className="text-xs font-bold text-emerald-700">Upload Picture/PDF</span>
             </div>
             <div className="flex gap-3">
               <Button variant="ghost" className="flex-1" onClick={() => setIsCertificateModalOpen(false)}>Cancel</Button>
               <Button className="flex-1" onClick={() => setIsCertificateModalOpen(false)}>Save</Button>
             </div>
          </div>
        </div>
      )}

      {/* Profile Picture Upload Modal */}
      {isProfilePicModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative text-center">
             <h3 className="text-lg font-bold mb-4">Update Profile Picture</h3>
             <div className="w-full h-40 border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-xl flex flex-col items-center justify-center cursor-pointer mb-6 hover:bg-emerald-100">
               <Plus className="w-10 h-10 text-emerald-500" />
             </div>
             <div className="flex gap-3">
               <Button variant="ghost" className="flex-1" onClick={() => setIsProfilePicModalOpen(false)}>Cancel</Button>
               <Button className="flex-1" onClick={() => setIsProfilePicModalOpen(false)}>Save</Button>
             </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (Working) */}
      {isEditProfileModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
               <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
               <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div><label className="text-xs font-bold uppercase text-slate-500">Business Name</label><input name="name" type="text" defaultValue={user.name} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="text-xs font-bold uppercase text-slate-500">About / Bio</label><textarea name="about" defaultValue={user.about} className="w-full p-2 border rounded-lg h-24"></textarea></div>
                  <Button type="submit" className="w-full">Save Changes</Button>
               </form>
               <button onClick={() => setIsEditProfileModalOpen(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
         </div>
      )}

      {/* Change Password/Email Modal */}
      {isChangePasswordModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 relative">
               <h3 className="text-xl font-bold mb-4">Security Settings</h3>
               <div className="space-y-4">
                  <div><label className="text-xs font-bold uppercase text-slate-500">New Email</label><input type="email" placeholder="new@email.com" className="w-full p-2 border rounded-lg" /></div>
                  <hr/>
                  <div><label className="text-xs font-bold uppercase text-slate-500">New Password</label><input type="password" placeholder="••••••••" className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="text-xs font-bold uppercase text-slate-500">Confirm Password</label><input type="password" placeholder="••••••••" className="w-full p-2 border rounded-lg" /></div>
                  <Button onClick={() => setIsChangePasswordModalOpen(false)} className="w-full">Update Credentials</Button>
               </div>
               <button onClick={() => setIsChangePasswordModalOpen(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
         </div>
      )}

      {/* Address Management Modal (With Favorites) */}
      {isAddressModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 relative max-h-[80vh] overflow-y-auto">
               <h3 className="text-xl font-bold mb-4">Manage Addresses</h3>
               <div className="space-y-3 mb-6">
                  {addresses.map((addr) => (
                     <div key={addr.id} className={`p-3 border rounded-lg flex justify-between items-center ${addr.isFavorite ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex-1">
                           <div className="flex items-center gap-2">
                             <p className="font-bold text-sm">{addr.name}</p>
                             {addr.isFavorite && <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
                           </div>
                           <p className="text-xs text-slate-500">{addr.street} {addr.houseNumber}, {addr.zip} {addr.city}</p>
                        </div>
                        <div className="flex gap-2">
                           {!addr.isFavorite && <button onClick={() => handleSetFavoriteAddress(addr.id)} className="text-xs text-emerald-600 font-bold hover:underline">Set Favorite</button>}
                           <button className="text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                        </div>
                     </div>
                  ))}
               </div>
               <h4 className="font-bold text-sm mb-3">Add New Address (Germany)</h4>
               <div className="space-y-3">
                  <div><input type="text" placeholder="Location Name (e.g. Warehouse A)" className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="col-span-2"><input type="text" placeholder="Street" className="w-full p-2 border rounded-lg text-sm" /></div>
                     <div><input type="text" placeholder="Nr." className="w-full p-2 border rounded-lg text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div><input type="text" placeholder="PLZ (Zip)" className="w-full p-2 border rounded-lg text-sm" /></div>
                     <div><input type="text" placeholder="City" className="w-full p-2 border rounded-lg text-sm" /></div>
                  </div>
                  <Button onClick={() => setIsAddressModalOpen(false)} className="w-full">Save Address</Button>
               </div>
               <button onClick={() => setIsAddressModalOpen(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-5 h-5"/></button>
            </div>
         </div>
      )}
    </Layout>
  );
}