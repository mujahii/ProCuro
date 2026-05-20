import jsPDF from 'jspdf'

// ProCuro brand colors (matches the website palette in tailwind.config + index.css)
const MIDNIGHT = [8, 58, 79]          // #083A4F — primary
const MARIGOLD = [212, 160, 23]       // #D4A017 — accent
const LIONSMANE = [229, 225, 221]     // #E5E1DD — surface
const TEXT = [26, 26, 26]
const MUTED = [100, 100, 100]
const ACCENT_TINT = [220, 200, 130]   // soft marigold for header subtext

export function generateInvoice(order, splits, ownerProfile, taxRate = 0.07) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header — midnight blue brand bar
  doc.setFillColor(...MIDNIGHT)
  doc.rect(0, 0, pageWidth, 40, 'F')
  // Marigold accent stripe
  doc.setFillColor(...MARIGOLD)
  doc.rect(0, 40, pageWidth, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('ProCuro', 20, 22)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...ACCENT_TINT)
  doc.text('Halal-Lieferkette, vereinfacht', 20, 32)

  // Invoice details (white text on midnight header)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RECHNUNG', pageWidth - 20, 22, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...ACCENT_TINT)
  doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 32, { align: 'right' })

  // Bill To
  doc.setTextColor(...TEXT)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Rechnungsempfänger:', 20, 57)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let billY = 65
  if (ownerProfile?.restaurant_name) {
    doc.setFont('helvetica', 'bold')
    doc.text(ownerProfile.restaurant_name, 20, billY)
    billY += 7
    doc.setFont('helvetica', 'normal')
  }
  doc.text(ownerProfile?.full_name || 'Restaurantinhaber', 20, billY)
  billY += 7
  if (ownerProfile?.tax_id) {
    doc.setTextColor(...MUTED)
    doc.text(`Steuer-/USt-IdNr.: ${ownerProfile.tax_id}`, 20, billY)
    doc.setTextColor(...TEXT)
  }
  doc.text(`Datum: ${new Date(order.created_at).toLocaleDateString('de-DE')}`, pageWidth - 20, 57, { align: 'right' })

  let yPos = 90

  splits.forEach((split, splitIdx) => {
    const itemsSubtotal = Number(split.subtotal) || 0
    const tax = itemsSubtotal * taxRate
    const splitTotal = itemsSubtotal + tax

    // Supplier header — soft cream (lionsmane) band with midnight text
    doc.setFillColor(...LIONSMANE)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...MIDNIGHT)
    doc.text(`Lieferant: ${split.supplier?.business_name || 'Lieferant'}`, 20, yPos)
    yPos += 10

    // Items table header — midnight bar
    doc.setFillColor(...MIDNIGHT)
    doc.rect(15, yPos - 4, pageWidth - 30, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Produkt', 20, yPos)
    doc.text('Menge', pageWidth - 90, yPos, { align: 'right' })
    doc.text('Einzelpreis', pageWidth - 55, yPos, { align: 'right' })
    doc.text('Gesamt', pageWidth - 20, yPos, { align: 'right' })
    yPos += 10

    // Items
    doc.setTextColor(...TEXT)
    doc.setFont('helvetica', 'normal')
    split.order_items?.forEach((item) => {
      doc.text(item.product?.name || 'Produkt', 20, yPos)
      doc.text(`${item.quantity} ${item.unit_type}`, pageWidth - 90, yPos, { align: 'right' })
      doc.text(`€${Number(item.price_at_time).toFixed(2)}`, pageWidth - 55, yPos, { align: 'right' })
      doc.text(`€${(item.quantity * item.price_at_time).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
      yPos += 8
    })

    // Subtotal
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MIDNIGHT)
    doc.text('Zwischensumme:', pageWidth - 55, yPos, { align: 'right' })
    doc.text(`€${itemsSubtotal.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 7

    // 7% MwSt. line
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`${(taxRate * 100).toFixed(0)}% MwSt. (Lebensmittel):`, pageWidth - 55, yPos, { align: 'right' })
    doc.text(`€${tax.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 7

    // Split total
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MIDNIGHT)
    doc.text('Lieferantenbetrag:', pageWidth - 55, yPos, { align: 'right' })
    doc.text(`€${splitTotal.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })

    doc.setTextColor(...TEXT)
    doc.setFont('helvetica', 'normal')
    const payLabel = split.payment_method === 'cash_on_delivery' ? 'Barzahlung bei Lieferung' : 'Banküberweisung'
    doc.text(`Zahlung: ${payLabel}`, 20, yPos)
    yPos += 15

    if (splitIdx < splits.length - 1) {
      doc.setDrawColor(...LIONSMANE)
      doc.line(15, yPos - 5, pageWidth - 15, yPos - 5)
    }
  })

  // Grand Total — midnight box with marigold underline
  doc.setFillColor(...MIDNIGHT)
  doc.rect(pageWidth - 90, yPos - 4, 75, 10, 'F')
  doc.setFillColor(...MARIGOLD)
  doc.rect(pageWidth - 90, yPos + 6, 75, 1.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GESAMT:', pageWidth - 55, yPos + 2, { align: 'right' })
  doc.text(`€${Number(order.total_amount).toFixed(2)}`, pageWidth - 20, yPos + 2, { align: 'right' })

  // Footer
  yPos += 25
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text('Alle Lieferanten auf ProCuro sind Halal-zertifiziert und verifiziert.', pageWidth / 2, yPos, { align: 'center' })
  doc.setTextColor(...MIDNIGHT)
  doc.setFont('helvetica', 'bold')
  doc.text('procuro.de', pageWidth / 2, yPos + 6, { align: 'center' })

  doc.save(`ProCuro-Rechnung-${order.id.slice(0, 8).toUpperCase()}.pdf`)
}
