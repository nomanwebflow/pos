interface ReceiptProps {
  saleNumber: string
  date: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paymentMethod: "CASH" | "CARD" | "MIXED"
  cashReceived?: number
  cashChange?: number
  cardAmount?: number
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessTaxNumber?: string
}

export function Receipt({
  saleNumber,
  date,
  items,
  subtotal,
  taxAmount,
  discountAmount,
  total,
  paymentMethod,
  cashReceived,
  cashChange,
  cardAmount,
  businessName = "Demo Store",
  businessAddress = "Port Louis, Mauritius",
  businessPhone = "+230 1234 5678",
  businessTaxNumber = "TIN12345678",
}: ReceiptProps) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 5mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            width: 80mm;
            margin: 0;
            padding: 0;
          }

          body * {
            visibility: hidden;
          }

          .receipt-print, .receipt-print * {
            visibility: visible;
          }

          .receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white;
          }
        }

        @media screen {
          .receipt-print {
            max-width: 80mm;
            margin: 0 auto;
          }
        }
      `}</style>
      <div className="receipt-print" style={{
        width: "80mm",
        fontFamily: "monospace",
        fontSize: "12px",
        padding: "5mm",
        background: "white",
        color: "black"
      }}>

      <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "8px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 8px 0" }}>{businessName}</h1>
        <p style={{ margin: "4px 0", fontSize: "11px" }}>{businessAddress}</p>
        <p style={{ margin: "4px 0", fontSize: "11px" }}>Tel: {businessPhone}</p>
        <p style={{ margin: "4px 0", fontSize: "11px" }}>TIN: {businessTaxNumber}</p>
      </div>

      <div style={{ marginBottom: "16px", fontSize: "11px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Sale #:</span>
          <span style={{ fontWeight: "bold" }}>{saleNumber}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Date:</span>
          <span>{new Date(date).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "8px 0", marginBottom: "8px" }}>
        <table style={{ width: "100%", fontSize: "11px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000" }}>
              <th style={{ textAlign: "left", paddingBottom: "4px" }}>Item</th>
              <th style={{ textAlign: "center", paddingBottom: "4px" }}>Qty</th>
              <th style={{ textAlign: "right", paddingBottom: "4px" }}>Price</th>
              <th style={{ textAlign: "right", paddingBottom: "4px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ paddingTop: "4px", paddingBottom: "4px" }}>{item.name}</td>
                <td style={{ textAlign: "center", paddingTop: "4px", paddingBottom: "4px" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", paddingTop: "4px", paddingBottom: "4px" }}>
                  {item.unitPrice.toFixed(2)}
                </td>
                <td style={{ textAlign: "right", paddingTop: "4px", paddingBottom: "4px" }}>
                  {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Subtotal:</span>
          <span>MUR {subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>VAT (15%):</span>
          <span>MUR {taxAmount.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#22c55e" }}>
            <span>Discount:</span>
            <span>-MUR {discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold", borderTop: "2px solid #000", paddingTop: "8px", marginTop: "8px" }}>
          <span>TOTAL:</span>
          <span>MUR {total.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ fontSize: "12px", marginBottom: "16px", borderTop: "1px dashed #000", paddingTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>Payment Method:</span>
          <span style={{ fontWeight: "bold" }}>{paymentMethod}</span>
        </div>
        {paymentMethod === "CASH" && cashReceived && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>Cash Received:</span>
              <span>MUR {cashReceived.toFixed(2)}</span>
            </div>
            {cashChange !== undefined && cashChange > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontWeight: "bold" }}>
                <span>Change:</span>
                <span>MUR {cashChange.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        {paymentMethod === "CARD" && cardAmount && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>Card Payment:</span>
            <span>MUR {cardAmount.toFixed(2)}</span>
          </div>
        )}
        {paymentMethod === "MIXED" && (
          <>
            {cashReceived && cashReceived > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Cash:</span>
                <span>MUR {cashReceived.toFixed(2)}</span>
              </div>
            )}
            {cardAmount && cardAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Card:</span>
                <span>MUR {cardAmount.toFixed(2)}</span>
              </div>
            )}
            {cashChange !== undefined && cashChange > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontWeight: "bold" }}>
                <span>Change:</span>
                <span>MUR {cashChange.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", borderTop: "2px solid #000", paddingTop: "8px", fontSize: "11px" }}>
        <p style={{ margin: "4px 0" }}>Thank you for your purchase!</p>
        <p style={{ margin: "4px 0" }}>Please come again</p>
      </div>
      </div>
    </>
  )
}
