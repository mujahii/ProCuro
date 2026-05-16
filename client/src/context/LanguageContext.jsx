import { createContext, useContext, useEffect, useState } from 'react'
import { setActiveLanguage } from '../lib/autoTranslate'

const LanguageContext = createContext()

export const LANGS = ['en', 'de']

const T = {
  en: {
    // Navbar
    logIn: 'Log In',
    signUp: 'Sign Up',
    signOut: 'Sign out',
    profile: 'Profile',
    deliveredTo: 'Delivered to',
    selectAddress: 'Select Address',
    savedAddresses: 'Saved Addresses',
    addNewAddress: 'Add New Address',

    // Landing page
    heroTagline: 'Halal Certified Suppliers Only',
    heroTitle: 'The Smarter Way to Stock Your Halal Kitchen',
    heroSubtitle: 'Connect with verified Halal suppliers. Order everything your restaurant needs in one place. Track, manage, and optimize — all from ProCuro.',
    getStarted: 'Get Started Free',
    browseSuppliers: 'Browse Suppliers',
    trustedBy: 'Trusted by Halal restaurants across Germany',
    featuredSuppliers: 'Featured Suppliers',
    viewAll: 'View All',
    viewAllSuppliers: 'View All Suppliers',
    featuredProducts: 'Featured Products',
    whyProcuro: 'Why ProCuro?',
    whySubtitle: 'Everything you need to run a modern Halal kitchen',
    verifiedHalal: 'Verified Halal Suppliers',
    verifiedHalalDesc: 'Every supplier is manually reviewed and Halal-certified before joining the platform.',
    oneClickOrdering: 'One-Click Ordering',
    oneClickDesc: 'Browse, compare, and order from multiple suppliers in a single cart.',
    realTimeTracking: 'Real-Time Tracking',
    realTimeDesc: 'Track every order from confirmation to delivery — no more chasing suppliers.',
    ctaTitle: 'Ready to simplify your Halal supply chain?',
    ctaSubtitle: 'Join hundreds of restaurants already saving time and money with ProCuro.',
    startFree: 'Start for Free',
    learnMore: 'Learn More',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    loading: 'Loading…',
    submit: 'Submit',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    addToCart: 'Add to Cart',
    order: 'Order',
    orders: 'Orders',
    products: 'Products',
    analytics: 'Analytics',
    settings: 'Settings',
    language: 'Language',
    halalCertified: 'Halal Certified',
    rating: 'Rating',
    location: 'Location',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
  },
  de: {
    // Navbar
    logIn: 'Anmelden',
    signUp: 'Registrieren',
    signOut: 'Abmelden',
    profile: 'Profil',
    deliveredTo: 'Lieferung an',
    selectAddress: 'Adresse wählen',
    savedAddresses: 'Gespeicherte Adressen',
    addNewAddress: 'Neue Adresse hinzufügen',

    // Landing page
    heroTagline: 'Nur Halal-zertifizierte Lieferanten',
    heroTitle: 'Der clevere Weg, Ihre Halal-Küche zu versorgen',
    heroSubtitle: 'Verbinden Sie sich mit geprüften Halal-Lieferanten. Bestellen Sie alles, was Ihr Restaurant braucht, an einem Ort. Verfolgen, verwalten und optimieren — alles mit ProCuro.',
    getStarted: 'Kostenlos starten',
    browseSuppliers: 'Lieferanten entdecken',
    trustedBy: 'Vertraut von Halal-Restaurants in ganz Deutschland',
    featuredSuppliers: 'Empfohlene Lieferanten',
    viewAll: 'Alle anzeigen',
    viewAllSuppliers: 'Alle Lieferanten anzeigen',
    featuredProducts: 'Empfohlene Produkte',
    whyProcuro: 'Warum ProCuro?',
    whySubtitle: 'Alles, was Sie für eine moderne Halal-Küche brauchen',
    verifiedHalal: 'Geprüfte Halal-Lieferanten',
    verifiedHalalDesc: 'Jeder Lieferant wird manuell geprüft und Halal-zertifiziert, bevor er der Plattform beitritt.',
    oneClickOrdering: 'Bestellen mit einem Klick',
    oneClickDesc: 'Stöbern, vergleichen und bei mehreren Lieferanten in einem Warenkorb bestellen.',
    realTimeTracking: 'Echtzeit-Tracking',
    realTimeDesc: 'Verfolgen Sie jede Bestellung von der Bestätigung bis zur Lieferung.',
    ctaTitle: 'Bereit, Ihre Halal-Lieferkette zu vereinfachen?',
    ctaSubtitle: 'Schließen Sie sich Hunderten von Restaurants an, die mit ProCuro Zeit und Geld sparen.',
    startFree: 'Kostenlos starten',
    learnMore: 'Mehr erfahren',

    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    back: 'Zurück',
    loading: 'Laden…',
    submit: 'Absenden',
    confirm: 'Bestätigen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    search: 'Suchen',
    filter: 'Filter',
    addToCart: 'In den Warenkorb',
    order: 'Bestellung',
    orders: 'Bestellungen',
    products: 'Produkte',
    analytics: 'Analysen',
    settings: 'Einstellungen',
    language: 'Sprache',
    halalCertified: 'Halal-zertifiziert',
    rating: 'Bewertung',
    location: 'Standort',
    phone: 'Telefon',
    email: 'E-Mail',
    address: 'Adresse',
  },
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('procuro_lang') || 'en' } catch { return 'en' }
  })

  function setLanguage(l) {
    if (!LANGS.includes(l)) return
    setLang(l)
    try { localStorage.setItem('procuro_lang', l) } catch {}
    setActiveLanguage(l)
  }

  useEffect(() => {
    // Apply the persisted language to the DOM on first mount (after children render)
    const id = requestAnimationFrame(() => setActiveLanguage(lang))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function t(key) {
    return T[lang]?.[key] ?? T.en?.[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
