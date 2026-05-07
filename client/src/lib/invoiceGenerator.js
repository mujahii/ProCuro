import jsPDF from 'jspdf'

export function generateInvoice(order, splits, ownerProfile) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(27, 67, 50)
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('ProCuro', 20, 22)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Halal Supply Chain, Simplified', 20, 32)

  // Invoice details
  doc.setTextColor(26, 26, 26)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - 20, 22, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 32, { align: 'right' })

  // Bill To
  doc.setTextColor(26, 26, 26)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, 55)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let billY = 63
  if (ownerProfile?.restaurant_name) {
    doc.setFont('helvetica', 'bold')
    doc.text(ownerProfile.restaurant_name, 20, billY)
    billY += 7
    doc.setFont('helvetica', 'normal')
  }
  doc.text(ownerProfile?.full_name || 'Restaurant Owner', 20, billY)
  billY += 7
  if (ownerProfile?.tax_id) {
    doc.setTextColor(100, 100, 100)
    doc.text(`Tax / VAT No: ${ownerProfile.tax_id}`, 20, billY)
    doc.setTextColor(26, 26, 26)
  }
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('de-DE')}`, pageWidth - 20, 55, { align: 'right' })

  let yPos = 88

  splits.forEach((split, splitIdx) => {
    // Supplier header
    doc.setFillColor(249, 249, 247)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(27, 67, 50)
    doc.text(`Supplier: ${split.supplier?.business_name || 'Supplier'}`, 20, yPos)
    yPos += 10

    // Items table header
    doc.setFillColor(27, 67, 50)
    doc.rect(15, yPos - 4, pageWidth - 30, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Product', 20, yPos)
    doc.text('Qty', pageWidth - 90, yPos, { align: 'right' })
    doc.text('Unit Price', pageWidth - 55, yPos, { align: 'right' })
    doc.text('Total', pageWidth - 20, yPos, { align: 'right' })
    yPos += 10

    // Items
    doc.setTextColor(26, 26, 26)
    doc.setFont('helvetica', 'normal')
    split.order_items?.forEach((item) => {
      doc.text(item.product?.name || 'Product', 20, yPos)
      doc.text(`${item.quantity} ${item.unit_type}`, pageWidth - 90, yPos, { align: 'right' })
      doc.text(`€${Number(item.price_at_time).toFixed(2)}`, pageWidth - 55, yPos, { align: 'right' })
      doc.text(`€${(item.quantity * item.price_at_time).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
      yPos += 8
    })

    // Subtotal
    doc.setFont('helvetica', 'bold')
    doc.text(`Subtotal:`, pageWidth - 55, yPos, { align: 'right' })
    doc.text(`€${Number(split.subtotal).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
    doc.text(`Payment: ${split.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Transfer'}`, 20, yPos)
    yPos += 15

    if (splitIdx < splits.length - 1) {
      doc.setDrawColor(220, 220, 220)
      doc.line(15, yPos - 5, pageWidth - 15, yPos - 5)
    }
  })

  // Grand Total
  doc.setFillColor(27, 67, 50)
  doc.rect(pageWidth - 90, yPos - 4, 75, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TOTAL:', pageWidth - 55, yPos + 2, { align: 'right' })
  doc.text(`€${Number(order.total_amount).toFixed(2)}`, pageWidth - 20, yPos + 2, { align: 'right' })

  // Footer
  yPos += 25
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text('All suppliers on ProCuro are Halal certified and verified.', pageWidth / 2, yPos, { align: 'center' })
  doc.text('procuro.de', pageWidth / 2, yPos + 6, { align: 'center' })

  doc.save(`ProCuro-Invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`)
}
