import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Info } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLanguage } from '../../context/LanguageContext'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-lionsmane flex flex-col pt-16">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-grow w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 sm:mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('back')}
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-midnight" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t('privacyTitle')}</h1>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm mb-4">{t('privacySubtitle')}</p>
        {t('privacyLegalNote') && (
          <div className="flex items-start gap-3 bg-celeste/10 border border-celeste/30 rounded-xl p-4 mb-6 text-sm text-midnight">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-herb" />
            {t('privacyLegalNote')}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">1. Verantwortlicher</h2>
            <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG) ist:</p>
            <div className="mt-2 p-3 bg-lionsmane rounded-xl text-slate-600">
              <strong>ProCuro GmbH</strong><br />
              Paderborn, Nordrhein-Westfalen, Deutschland<br />
              E-Mail: <a href="mailto:support@procuro.com" className="text-midnight hover:underline">support@procuro.com</a><br />
              Telefon: <a href="tel:+4915560608671" className="text-midnight hover:underline">+49 155 6060 8671</a>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">2. Erhobene Daten und Zwecke</h2>
            <p className="mb-2">Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Kontodaten:</strong> Name, E-Mail-Adresse, Passwort (verschlüsselt) — zur Kontoerstellung und Authentifizierung</li>
              <li><strong>Unternehmensdaten:</strong> Firmenname, Adresse, Telefonnummer, Halal-Zertifikate — zur Profildarstellung und Verifikation</li>
              <li><strong>Bestelldaten:</strong> Bestellhistorie, Lieferadressen, Zahlungsinformationen — zur Auftragsabwicklung</li>
              <li><strong>Kommunikationsdaten:</strong> Nachrichten zwischen Nutzern über die Plattform-Chat-Funktion</li>
              <li><strong>Nutzungsdaten:</strong> IP-Adresse, Geräteinformationen, Zugriffszeiten — zur Sicherheit und Analyse</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">3. Rechtsgrundlagen der Verarbeitung</h2>
            <p className="mb-2">Die Verarbeitung Ihrer Daten erfolgt auf folgenden Rechtsgrundlagen gemäß Art. 6 DSGVO:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Vertragserfüllung — für die Bereitstellung unserer Plattform-Dienste</li>
              <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung — für Marketing und optionale Funktionen</li>
              <li><strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Rechtliche Verpflichtung — für steuerliche und handelsrechtliche Aufbewahrungspflichten</li>
              <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigte Interessen — für Sicherheit und Betrugsprävention</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">4. Speicherdauer</h2>
            <p>Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. Kontodaten werden nach Kontoschließung innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen. Rechnungs- und Vertragsdaten werden gemäß § 257 HGB und § 147 AO für 6 bzw. 10 Jahre aufbewahrt.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">5. Weitergabe an Dritte</h2>
            <p className="mb-2">Daten werden nur in folgenden Fällen an Dritte übermittelt:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase Inc. (USA):</strong> Datenbank- und Authentifizierungsinfrastruktur (Datenverarbeitungsvertrag nach Art. 28 DSGVO geschlossen; Übermittlung auf Basis von Standardvertragsklauseln)</li>
              <li><strong>Zahlungsdienstleister:</strong> Soweit für die Zahlungsabwicklung erforderlich</li>
              <li><strong>Behörden:</strong> Bei gesetzlicher Verpflichtung oder behördlicher Anforderung</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">6. Cookies und Tracking</h2>
            <p>Wir verwenden technisch notwendige Cookies zur Sitzungsverwaltung und Authentifizierung. Analyse- oder Marketing-Cookies werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt. Sie können Cookies in Ihren Browser-Einstellungen jederzeit deaktivieren.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">7. Ihre Rechte</h2>
            <p className="mb-2">Sie haben gemäß DSGVO folgende Rechte:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Recht auf Auskunft über Ihre gespeicherten Daten</li>
              <li><strong>Berichtigungsrecht (Art. 16 DSGVO):</strong> Recht auf Berichtigung unrichtiger Daten</li>
              <li><strong>Löschungsrecht (Art. 17 DSGVO):</strong> Recht auf Löschung Ihrer Daten ("Recht auf Vergessenwerden")</li>
              <li><strong>Einschränkungsrecht (Art. 18 DSGVO):</strong> Recht auf Einschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Recht auf Erhalt Ihrer Daten in maschinenlesbarem Format</li>
              <li><strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Recht auf Widerspruch gegen die Verarbeitung</li>
              <li><strong>Widerrufsrecht:</strong> Erteilte Einwilligungen können jederzeit widerrufen werden</li>
            </ul>
            <p className="mt-2">Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: <a href="mailto:support@procuro.com" className="text-midnight hover:underline">support@procuro.com</a></p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">8. Beschwerderecht</h2>
            <p>Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren. Die zuständige Aufsichtsbehörde für Nordrhein-Westfalen ist:</p>
            <div className="mt-2 p-3 bg-lionsmane rounded-xl text-slate-600">
              Landesbeauftragte für Datenschutz und Informationsfreiheit NRW<br />
              Postfach 20 04 44, 40102 Düsseldorf<br />
              <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer" className="text-midnight hover:underline">www.ldi.nrw.de</a>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">9. Datensicherheit</h2>
            <p>Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten gegen Manipulation, Verlust oder unberechtigten Zugriff zu schützen. Alle Datenübertragungen erfolgen verschlüsselt über HTTPS/TLS. Passwörter werden ausschließlich in gehashter Form gespeichert.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-base mb-2">10. Änderungen dieser Datenschutzerklärung</h2>
            <p>Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils aktuelle Version ist auf dieser Seite verfügbar. Bei wesentlichen Änderungen informieren wir Sie per E-Mail.</p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  )
}
