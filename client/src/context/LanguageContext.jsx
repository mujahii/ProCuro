import { createContext, useContext, useState } from 'react'

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

    // Profile pages
    profilePicture: 'Profile Picture',
    editProfile: 'Edit Profile',
    businessDetails: 'Business Details',
    accountSettings: 'Account Settings',
    languageSprache: 'Language / Sprache',
    changeEmailPassword: 'Change Email & Password',
    updatePhoneNumber: 'Update Phone Number',
    manageMyAddresses: 'Manage My Addresses',
    deleteAccount: 'Delete Account',
    viewMyOrders: 'View My Orders',
    viewAnalysis: 'View Analysis',
    mySales: 'My Sales',
    restaurant: 'Restaurant',
    supplier: 'Supplier',
    restaurantOwner: 'Restaurant Owner',
    taxIdVat: 'Tax ID / VAT',
    city: 'City',
    cuisineType: 'Cuisine / Type',
    categories: 'Categories',
    businessLocations: 'Business Locations',
    bankDetails: 'Bank Details',
    add: 'Add',
    addAddress: 'Add address',
    addTaxId: 'Add Tax ID',
    addBankDetails: 'Add bank details',
    notSet: 'Not set',
    saveChanges: 'Save Changes',
    selected: 'selected',
    locationsHelp: 'Tap each location you want shown on your profile',
    manageAddresses: 'Manage Addresses',
    cityLocation: 'City / Location',
    useGps: 'Use GPS',
    useMyLocation: 'Use My Location',
    detecting: 'Detecting…',
    halal: 'Halal',
    aboutOptional: 'A short description about your restaurant...',
    yourName: 'Your Name',
    restaurantName: 'Restaurant Name',
    businessName: 'Business Name',
    description: 'Description',
    bio: 'About',
    website: 'Website (optional)',
    requiredField: '* Required',

    // AI
    aiInsights: 'AI Insights',
    poweredByGemini: 'Powered by Gemini',
    refreshInsights: 'Refresh insights',
    tryAgain: 'Try again',
    generateInsights: 'Generate Insights',
    analyseYourSales: 'Analyse your sales data',
    aiHelpText: 'Get AI-powered insights on revenue, top products, and growth opportunities.',

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

    // Profile pages
    profilePicture: 'Profilbild',
    editProfile: 'Profil bearbeiten',
    businessDetails: 'Geschäftsdaten',
    accountSettings: 'Kontoeinstellungen',
    languageSprache: 'Sprache / Language',
    changeEmailPassword: 'E-Mail & Passwort ändern',
    updatePhoneNumber: 'Telefonnummer aktualisieren',
    manageMyAddresses: 'Meine Adressen verwalten',
    deleteAccount: 'Konto löschen',
    viewMyOrders: 'Meine Bestellungen',
    viewAnalysis: 'Analyse ansehen',
    mySales: 'Meine Verkäufe',
    restaurant: 'Restaurant',
    supplier: 'Lieferant',
    restaurantOwner: 'Restaurantbesitzer',
    taxIdVat: 'Steuernummer / USt-IdNr.',
    city: 'Stadt',
    cuisineType: 'Küche / Typ',
    categories: 'Kategorien',
    businessLocations: 'Geschäftsstandorte',
    bankDetails: 'Bankdaten',
    add: 'Hinzufügen',
    addAddress: 'Adresse hinzufügen',
    addTaxId: 'Steuernummer hinzufügen',
    addBankDetails: 'Bankdaten hinzufügen',
    notSet: 'Nicht festgelegt',
    saveChanges: 'Änderungen speichern',
    selected: 'ausgewählt',
    locationsHelp: 'Tippen Sie auf jeden Standort, den Sie in Ihrem Profil anzeigen möchten',
    manageAddresses: 'Adressen verwalten',
    cityLocation: 'Stadt / Standort',
    useGps: 'GPS verwenden',
    useMyLocation: 'Meinen Standort verwenden',
    detecting: 'Suche…',
    halal: 'Halal',
    aboutOptional: 'Eine kurze Beschreibung Ihres Restaurants...',
    yourName: 'Ihr Name',
    restaurantName: 'Restaurantname',
    businessName: 'Firmenname',
    description: 'Beschreibung',
    bio: 'Über',
    website: 'Webseite (optional)',
    requiredField: '* Pflichtfeld',

    // AI
    aiInsights: 'KI-Einblicke',
    poweredByGemini: 'Powered by Gemini',
    refreshInsights: 'Einblicke aktualisieren',
    tryAgain: 'Erneut versuchen',
    generateInsights: 'Einblicke generieren',
    analyseYourSales: 'Verkaufsdaten analysieren',
    aiHelpText: 'KI-gestützte Einblicke in Umsatz, Top-Produkte und Wachstumschancen.',

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
    try { document.documentElement.lang = l } catch {}
  }

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
