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
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  Calendar,
  Package,
  Users,
  CreditCard,
  Wallet,
} from "lucide-react"

interface ReportData {
  overview: {
    totalTransactions: number
    totalSubtotal: number
    totalTax: number
    totalDiscount: number
    totalRevenue: number
    averageTransactionValue: number
    cashRevenue: number
    cardRevenue: number
    mixedRevenue: number
  }
  salesByDate: Array<{
    date: string
    totalSales: number
    subtotal: number
    taxAmount: number
    discount: number
    total: number
    cashSales: number
    cardSales: number
    mixedSales: number
  }>
  salesByCategory: Array<{
    category: string
    totalSales: number
    totalQuantity: number
    revenue: number
  }>
  topProducts: Array<{
    id: string
    name: string
    sku: string
    category: string
    totalQuantity: number
    revenue: number
    salesCount: number
  }>
  salesByUser: Array<{
    id: string
    name: string
    role: string
    totalSales: number
    totalRevenue: number
  }>
  detailedSales: Array<{
    id: string
    saleNumber: string
    total: number
    discount: number
    paymentMethod: string
    createdAt: string
    userName: string
    customerName: string | null
  }>
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else if (res.status === 403) {
        alert("You don't have permission to view reports")
      }
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = () => {
    loadReports()
  }

  const exportToCSV = () => {
    if (!reportData) return

    // Create CSV content
    let csv = "Sales Report\n\n"
    csv += `Date Range:,${startDate},to,${endDate}\n\n`

    // Overview
    csv += "Overview\n"
    csv += `Total Transactions,${reportData.overview.totalTransactions}\n`
    csv += `Total Revenue,MUR ${reportData.overview.totalRevenue?.toFixed(2) || 0}\n`
    csv += `Average Transaction,MUR ${reportData.overview.averageTransactionValue?.toFixed(2) || 0}\n`
    csv += `Total Discount,MUR ${reportData.overview.totalDiscount?.toFixed(2) || 0}\n\n`

    // Top Products
    csv += "Top Products\n"
    csv += "Product Name,SKU,Category,Quantity Sold,Revenue,Sales Count\n"
    reportData.topProducts.forEach(product => {
      csv += `${product.name},${product.sku},${product.category || 'N/A'},${product.totalQuantity},MUR ${product.revenue.toFixed(2)},${product.salesCount}\n`
    })
    csv += "\n"

    // Sales by Category
    csv += "Sales by Category\n"
    csv += "Category,Total Sales,Total Quantity,Revenue\n"
    reportData.salesByCategory.forEach(cat => {
      csv += `${cat.category},${cat.totalSales},${cat.totalQuantity},MUR ${cat.revenue.toFixed(2)}\n`
    })

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-report-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Check permissions
  const canViewReports = true // Auth removed

  if (!canViewReports) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to view reports</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const overview = reportData?.overview

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
                  <BreadcrumbPage>Reports</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <CardTitle>Date Range</CardTitle>
                </div>
                <Button onClick={exportToCSV} variant="outline" disabled={!reportData}>
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
                <Button onClick={handleDateChange}>
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
                  MUR {overview?.averageTransactionValue?.toFixed(2) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per sale average
                </p>
              </CardContent>
            </Card>



          </div>

          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Revenue by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Cash</p>
                    <p className="text-2xl font-bold">
                      MUR {overview?.cashRevenue?.toFixed(2) || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Card</p>
                    <p className="text-2xl font-bold">
                      MUR {overview?.cardRevenue?.toFixed(2) || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Internet Banking</p>
                    <p className="text-2xl font-bold">
                      MUR {overview?.mixedRevenue?.toFixed(2) || 0}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No sales data available for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData?.topProducts.map((product, index) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell className="text-right">{product.totalQuantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          MUR {product.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{product.salesCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sales by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue breakdown by product category</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.salesByCategory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No category data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData?.salesByCategory.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right">{cat.totalSales}</TableCell>
                        <TableCell className="text-right">{cat.totalQuantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          MUR {cat.revenue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sales by User */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Employee</CardTitle>
              <CardDescription>Performance by sales staff</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData?.salesByUser.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No sales data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData?.salesByUser.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{user.totalSales}</TableCell>
                        <TableCell className="text-right font-medium">
                          MUR {user.totalRevenue.toFixed(2)}
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
    </SidebarProvider >
  )
}
