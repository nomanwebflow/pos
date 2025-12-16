"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/components/rbac"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Receipt,
  Search,
  DollarSign,
  ShoppingCart,
  Calendar,
  User,
  CreditCard,
  Eye,
  Tag,
  RotateCcw,
  Barcode,
  LogOut,
} from "lucide-react"
import { RefundDialog } from "@/components/refund-dialog"

interface Sale {
  id: string
  saleNumber: string
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  paymentMethod: string
  cashReceived: number | null
  cashChange: number | null
  cardAmount: number | null
  notes: string | null
  customerId: string | null
  userId: string
  createdAt: string
}

interface SaleItem {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
  taxAmount: number
  total: number
}

interface SaleDetail extends Sale {
  userName: string
  customerName: string | null
  items: SaleItem[]
}

export default function TransactionsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [refundSale, setRefundSale] = useState<any>(null)
  const { user, loading: userLoading } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }


  useEffect(() => {
    loadSales()
  }, [])

  useEffect(() => {
    filterSales()
  }, [searchQuery, sales])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/sales-supabase?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data.sales || [])
        setFilteredSales(data.sales || [])
      }
    } catch (error) {
      console.error("Error loading sales:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterSales = () => {
    if (!searchQuery.trim()) {
      setFilteredSales(sales)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = sales.filter(sale =>
      sale.saleNumber.toLowerCase().includes(query) ||
      sale.paymentMethod.toLowerCase().includes(query)
    )
    setFilteredSales(filtered)
  }

  const handleDateFilter = () => {
    loadSales()
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    setSearchQuery(barcodeInput.trim())
    setBarcodeInput("")
    // Optional: trigger immediately if needed, but useEffect handles searchQuery change
  }

  const viewSaleDetail = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales-supabase?id=${saleId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedSale(data)
        setIsDetailOpen(true)
      }
    } catch (error) {
      console.error("Error loading sale details:", error)
    }
  }

  const handleRefund = async (saleId: string) => {
    try {
      const res = await fetch(`/api/sales-supabase?id=${saleId}`)
      if (res.ok) {
        const data = await res.json()

        // Map Supabase response to RefundDialog expected format
        const formattedSale = {
          ...data,
          items: data.SaleItem.map((item: any) => ({
            id: item.id,
            productName: item.Product?.name || 'Unknown Product',
            sku: item.Product?.sku || '',
            quantity: item.quantity,
            quantityRefunded: item.quantityRefunded || 0,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        }

        setRefundSale(formattedSale)
        setIsRefundDialogOpen(true)
      }
    } catch (error) {
      console.error("Error loading sale for refund:", error)
    }
  }

  const handleRefundSuccess = () => {
    loadSales()
  }


  // Calculate totals
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const totalTransactions = filteredSales.length
  const totalDiscount = filteredSales.reduce((sum, sale) => sum + sale.discount, 0)

  if (userLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const isCashier = user?.role === 'CASHIER'

  if (isCashier) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-muted/40 px-4">
          <h1 className="text-lg font-semibold">Sales History</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => window.location.href = '/checkout'}>Back to POS</Button>
            <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
          {/* Barcode Scanner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Barcode className="h-4 w-4" />
                Quick Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <Input
                  placeholder="Scan receipt barcode (Sale #)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1"
                  autoFocus={true}
                />
                <Button type="submit">Search</Button>
              </form>
            </CardContent>
          </Card>

          {/* Transactions Table (Simplified for Cashier) */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by sale number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale #</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No transactions found</TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                        <TableCell>{new Date(sale.createdAt).toLocaleTimeString()}</TableCell>
                        <TableCell className="text-right font-bold">MUR {sale.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleRefund(sale.id)} title="Refund">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <RefundDialog
          sale={refundSale}
          open={isRefundDialogOpen}
          onOpenChange={setIsRefundDialogOpen}
          onSuccess={handleRefundSuccess}
        />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Sales History</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Barcode Scanner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Barcode className="h-4 w-4" />
                Quick Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <Input
                  placeholder="Scan receipt barcode (Sale #)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit">Search</Button>
              </form>
            </CardContent>
          </Card>

          {/* Date Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Filter Sales</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleDateFilter}>
                  Apply Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">MUR {totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">MUR {totalDiscount.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales History</CardTitle>
                  <CardDescription>View and manage all sales transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by sale number or payment method..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Number</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            {sale.saleNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            sale.paymentMethod === 'CASH' ? 'default' :
                              sale.paymentMethod === 'CARD' ? 'secondary' : 'outline'
                          }>
                            {sale.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          MUR {sale.subtotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          MUR {sale.taxAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.discount > 0 ? (
                            <span className="text-green-600 font-medium">
                              -MUR {sale.discount.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          MUR {sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewSaleDetail(sale.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefund(sale.id)}
                              title="Process Refund"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Transaction Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Sale Number: {selectedSale?.saleNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {new Date(selectedSale.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <Badge>{selectedSale.paymentMethod}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller</p>
                  <p className="font-medium">{selectedSale.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedSale.customerName || "Walk-in"}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Items Purchased</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          MUR {item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          MUR {item.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>MUR {selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%):</span>
                  <span>MUR {selectedSale.taxAmount.toFixed(2)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount:</span>
                    <span>-MUR {selectedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>MUR {selectedSale.total.toFixed(2)}</span>
                </div>

                {/* Payment Details */}
                {selectedSale.paymentMethod === 'CASH' && selectedSale.cashReceived && (
                  <div className="mt-4 p-3 bg-muted rounded">
                    <div className="flex justify-between text-sm">
                      <span>Cash Received:</span>
                      <span>MUR {selectedSale.cashReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span>MUR {selectedSale.cashChange?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                )}

                {selectedSale.paymentMethod === 'MIXED' && (
                  <div className="mt-4 p-3 bg-muted rounded space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Cash:</span>
                      <span>MUR {selectedSale.cashReceived?.toFixed(2) || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Card:</span>
                      <span>MUR {selectedSale.cardAmount?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedSale.notes && (
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">Notes:</p>
                  <p>{selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <RefundDialog
        sale={refundSale}
        open={isRefundDialogOpen}
        onOpenChange={setIsRefundDialogOpen}
        onSuccess={handleRefundSuccess}
      />
    </SidebarProvider>
  )
}
