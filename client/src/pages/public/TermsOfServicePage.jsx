import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

export default function TermsOfServicePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-emerald-600" />
          <h1 className="text-2xl font-black text-slate-900">Allgemeine Geschäftsbedingungen</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">Terms of Service — Stand: Mai 2025</p>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-8 text-sm text-slate-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 1 Geltungsbereich und Vertragspartner</h2>
            <p>Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der B2B-Plattform ProCuro, betrieben von der ProCuro GmbH, Paderborn, Deutschland. Die AGB gelten für alle Nutzer der Plattform, insbesondere für registrierte Lieferanten (Supplier) und Restaurantbetreiber (Restaurant Owner). Entgegenstehende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, ProCuro stimmt ihrer Geltung ausdrücklich schriftlich zu.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 2 Vertragsschluss und Registrierung</h2>
            <p className="mb-2">Die Registrierung auf der Plattform erfolgt durch Ausfüllen des Registrierungsformulars und Bestätigung der E-Mail-Adresse. Mit der Registrierung kommt ein Nutzungsvertrag zwischen dem Nutzer und ProCuro zustande. Voraussetzungen für die Registrierung:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Volljährigkeit (mindestens 18 Jahre)</li>
              <li>Gewerbliche Tätigkeit (die Plattform richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB)</li>
              <li>Vollständige und wahrheitsgemäße Angaben bei der Registrierung</li>
            </ul>
            <p className="mt-2">ProCuro behält sich das Recht vor, Registrierungen ohne Angabe von Gründen abzulehnen.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 3 Leistungen von ProCuro</h2>
            <p className="mb-2">ProCuro stellt eine Online-Plattform zur Verfügung, die folgende Dienste umfasst:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vermittlung zwischen Halal-Lieferanten und Restaurantbetreibern</li>
              <li>Verwaltung von Bestellungen, Produkten und Lieferadressen</li>
              <li>Verifizierung und Anzeige von Halal-Zertifikaten</li>
              <li>Kommunikationstools zwischen Nutzern</li>
              <li>Analyse- und Berichtsfunktionen</li>
            </ul>
            <p className="mt-2">ProCuro tritt lediglich als Vermittler auf und ist kein Vertragspartner der zwischen Lieferanten und Restaurantbetreibern geschlossenen Kaufverträge.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 4 Pflichten der Nutzer</h2>
            <p className="mb-2">Nutzer sind verpflichtet:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten</li>
              <li>Zugangsdaten vertraulich zu behandeln und vor unberechtigtem Zugriff zu schützen</li>
              <li>Die Plattform nur für legale, gewerbliche Zwecke zu nutzen</li>
              <li>Gültige Halal-Zertifikate nachzuweisen (für Lieferanten)</li>
              <li>Keine irreführenden, falschen oder betrügerischen Inhalte einzustellen</li>
              <li>Geltendes deutsches und europäisches Recht einzuhalten, insbesondere Lebensmittelrecht (LFGB), Handelsrecht (HGB) und Steuerrecht</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 5 Halal-Zertifizierung</h2>
            <p>Lieferanten sind verpflichtet, gültige und aktuelle Halal-Zertifikate von anerkannten Zertifizierungsstellen nachzuweisen. ProCuro überprüft die eingereichten Zertifikate, übernimmt jedoch keine Gewährleistung für deren inhaltliche Richtigkeit oder die tatsächliche Einhaltung von Halal-Standards durch den Lieferanten. Bei Ablauf oder Entzug der Zertifizierung ist der Lieferant verpflichtet, ProCuro unverzüglich zu informieren.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 6 Preise und Zahlungsbedingungen</h2>
            <p>Die Nutzung der Basisplattform ist kostenfrei. Preise für Produkte werden von den Lieferanten festgelegt und sind in Euro (€) zzgl. gesetzlicher Mehrwertsteuer (MwSt.) ausgewiesen. Zahlungen erfolgen gemäß den im Bestellprozess angegebenen Zahlungsbedingungen. Rechnungen werden gemäß § 14 UStG ausgestellt.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 7 Haftung</h2>
            <p className="mb-2">ProCuro haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Bei leichter Fahrlässigkeit haftet ProCuro nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Eine weitergehende Haftung ist ausgeschlossen, soweit gesetzlich zulässig.</p>
            <p>ProCuro übernimmt keine Haftung für:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Die Qualität, Sicherheit oder Konformität der von Lieferanten angebotenen Produkte</li>
              <li>Streitigkeiten zwischen Nutzern</li>
              <li>Datenverluste durch höhere Gewalt oder Drittanbieter</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 8 Sperrung und Kündigung</h2>
            <p>ProCuro ist berechtigt, Nutzerkonten bei Verstößen gegen diese AGB, bei Angabe falscher Informationen oder bei missbräuchlicher Nutzung der Plattform vorübergehend oder dauerhaft zu sperren. Nutzer können ihr Konto jederzeit durch Kontaktaufnahme mit dem Support kündigen. Nach Kündigung werden Daten gemäß der Datenschutzerklärung behandelt.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 9 Geistiges Eigentum</h2>
            <p>Alle Inhalte der Plattform (Design, Software, Texte, Logos) sind Eigentum der ProCuro GmbH oder ihrer Lizenzgeber und urheberrechtlich geschützt. Nutzer erhalten eine beschränkte, nicht übertragbare Lizenz zur Nutzung der Plattform gemäß diesen AGB. Jede darüber hinausgehende Nutzung bedarf der ausdrücklichen schriftlichen Zustimmung von ProCuro.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 10 Anwendbares Recht und Gerichtsstand</h2>
            <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist, sofern der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist, Paderborn, Deutschland. Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">https://ec.europa.eu/consumers/odr</a></p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 11 Salvatorische Klausel</h2>
            <p>Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt. Die unwirksame Bestimmung wird durch eine wirksame ersetzt, die dem wirtschaftlichen Zweck am nächsten kommt.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">§ 12 Kontakt</h2>
            <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
              <strong>ProCuro GmbH</strong><br />
              Paderborn, Nordrhein-Westfalen, Deutschland<br />
              E-Mail: <a href="mailto:support@procuro.com" className="text-emerald-600 hover:underline">support@procuro.com</a><br />
              Telefon: <a href="tel:+4915560608671" className="text-emerald-600 hover:underline">+49 155 6060 8671</a>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}
