"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, CreditCard } from "lucide-react"

interface DashboardStats {
  totalRevenue: number
  totalSales: number
  activeProducts: number
  totalCustomers: number
  todaySales: number
  recentSales: Array<{
    saleNumber: string
    customerName: string | null
    total: number
    createdAt: string
  }>
  topProducts: Array<{
    productName: string
    category: string | null
    totalQuantity: number
  }>
}

export default function Page() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
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
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Stats Cards */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">MUR {stats?.totalRevenue.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  Total revenue from all sales
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.todaySales || 0} sales today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Products
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Products in inventory
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered customers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Sales
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.todaySales || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Sales completed today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Sale
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {stats && stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average transaction value
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  {stats?.recentSales.length || 0} recent transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {stats?.recentSales && stats.recentSales.length > 0 ? (
                  <div className="space-y-8">
                    {stats.recentSales.map((sale) => (
                      <div key={sale.saleNumber} className="flex items-center">
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{sale.saleNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.customerName || 'Walk-in Customer'} • {new Date(sale.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">MUR {sale.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sales yet</p>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>
                  Best selling products
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topProducts && stats.topProducts.length > 0 ? (
                  <div className="space-y-8">
                    {stats.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center">
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.category || 'Uncategorized'}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">{product.totalQuantity} sold</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sales data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
