"use client"

import { useState, useEffect } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Wallet,
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface PaymentData {
  overview: {
    totalRevenue: number
    totalTransactions: number
    cashRevenue: number
    cardRevenue: number
    mixedRevenue: number
    cashTransactions: number
    cardTransactions: number
    mixedTransactions: number
  }
  dailyBreakdown: Array<{
    date: string
    totalRevenue: number
    cashRevenue: number
    cardRevenue: number
    mixedRevenue: number
    totalTransactions: number
    cashTransactions: number
    cardTransactions: number
    mixedTransactions: number
  }>
  cashDetails: Array<{
    saleNumber: string
    total: number
    cashReceived: number
    cashChange: number
    createdAt: string
  }>
  cardDetails: Array<{
    saleNumber: string
    total: number
    cardAmount: number
    createdAt: string
  }>
  mixedDetails: Array<{
    saleNumber: string
    total: number
    cashReceived: number
    cardAmount: number
    createdAt: string
  }>
}

export default function PaymentsPage() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/payments?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setPaymentData(data)
      } else if (res.status === 403) {
        alert("You don't have permission to view payment data")
      }
    } catch (error) {
      console.error("Error loading payments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateFilter = () => {
    loadPayments()
  }

  const exportToCSV = () => {
    if (!paymentData) return

    let csv = "Payment Reconciliation Report\n\n"
    csv += `Date Range:,${startDate},to,${endDate}\n\n`

    // Overview
    csv += "Payment Overview\n"
    csv += `Total Revenue,MUR ${paymentData.overview.totalRevenue.toFixed(2)}\n`
    csv += `Total Transactions,${paymentData.overview.totalTransactions}\n\n`

    csv += "Payment Method Breakdown\n"
    csv += "Method,Revenue,Transactions\n"
    csv += `Cash,MUR ${paymentData.overview.cashRevenue.toFixed(2)},${paymentData.overview.cashTransactions}\n`
    csv += `Card,MUR ${paymentData.overview.cardRevenue.toFixed(2)},${paymentData.overview.cardTransactions}\n`
    csv += `Internet Banking,MUR ${paymentData.overview.mixedRevenue.toFixed(2)},${paymentData.overview.mixedTransactions}\n\n`

    // Daily breakdown
    csv += "Daily Breakdown\n"
    csv += "Date,Total Revenue,Cash,Card,Internet Banking,Transactions\n"
    paymentData.dailyBreakdown.forEach(day => {
      csv += `${day.date},MUR ${day.totalRevenue.toFixed(2)},MUR ${day.cashRevenue.toFixed(2)},MUR ${day.cardRevenue.toFixed(2)},MUR ${day.mixedRevenue.toFixed(2)},${day.totalTransactions}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-reconciliation-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Check permissions
  const canViewPayments = true // Auth removed

  if (!canViewPayments) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to view payment data</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const overview = paymentData?.overview

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
                  <BreadcrumbPage>Payment Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Date Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle>Payment Analytics Overview</CardTitle>
                </div>
                <Button onClick={exportToCSV} variant="outline" disabled={!paymentData}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
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

          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {overview?.totalRevenue?.toFixed(2) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.totalTransactions || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {overview?.totalTransactions ? (overview.totalRevenue / overview.totalTransactions).toFixed(2) : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per sale average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {overview?.cashRevenue?.toFixed(2) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.cashTransactions || 0} transactions
                </p>
                <div className="mt-2 flex items-center text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {overview?.totalRevenue ? ((overview.cashRevenue / overview.totalRevenue) * 100).toFixed(1) : 0}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Card Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {overview?.cardRevenue?.toFixed(2) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.cardTransactions || 0} transactions
                </p>
                <div className="mt-2 flex items-center text-xs text-blue-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {overview?.totalRevenue ? ((overview.cardRevenue / overview.totalRevenue) * 100).toFixed(1) : 0}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Internet Banking</CardTitle>
                <Wallet className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {overview?.mixedRevenue?.toFixed(2) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.mixedTransactions || 0} transactions
                </p>
                <div className="mt-2 flex items-center text-xs text-purple-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {overview?.totalRevenue ? ((overview.mixedRevenue / overview.totalRevenue) * 100).toFixed(1) : 0}% of total
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Payment Breakdown</CardTitle>
              <CardDescription>Revenue by payment method per day</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Card</TableHead>
                    <TableHead className="text-right">Internet Banking</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentData?.dailyBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No payment data available for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentData?.dailyBreakdown.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {new Date(day.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>MUR {day.cashRevenue.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {day.cashTransactions} sales
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>MUR {day.cardRevenue.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {day.cardTransactions} sales
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>MUR {day.mixedRevenue.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">
                              {day.mixedTransactions} sales
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          MUR {day.totalRevenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {day.totalTransactions}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cash Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Transaction Details</CardTitle>
              <CardDescription>Cash received and change given</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Number</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cash Received</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentData?.cashDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No cash transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentData?.cashDetails.map((sale) => (
                      <TableRow key={sale.saleNumber}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            {sale.saleNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          MUR {sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          MUR {sale.cashReceived ? sale.cashReceived.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="text-right">
                          MUR {sale.cashChange ? sale.cashChange.toFixed(2) : '0.00'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Internet Banking Payment Details */}
          {paymentData?.mixedDetails && paymentData.mixedDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Internet Banking Payment Details</CardTitle>
                <CardDescription>Split payments between cash and card</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale Number</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentData.mixedDetails.map((sale) => (
                      <TableRow key={sale.saleNumber}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            {sale.saleNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          MUR {sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          MUR {sale.cashReceived.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          MUR {sale.cardAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
