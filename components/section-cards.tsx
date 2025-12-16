import { useState } from "react"
import { IconTrendingDown, IconTrendingUp, IconCurrencyDollar, IconShoppingCart, IconPackage, IconUsers, IconCalendar } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface SectionCardsProps {
  stats: {
    totalRevenue: number
    todayRevenue: number
    monthRevenue: number
    yearRevenue: number
    totalSales: number
    activeProducts: number
    totalCustomers: number
    todaySales: number
  } | null
}

export function SectionCards({ stats }: SectionCardsProps) {
  const [revenueFilter, setRevenueFilter] = useState<'today' | 'month' | 'year' | 'all'>('today')

  const getRevenueDisplay = () => {
    if (!stats) return '0.00'
    switch (revenueFilter) {
      case 'today': return (stats.todayRevenue || 0).toFixed(2)
      case 'month': return (stats.monthRevenue || 0).toFixed(2)
      case 'year': return (stats.yearRevenue || 0).toFixed(2)
      case 'all': return (stats.totalRevenue || 0).toFixed(2)
      default: return (stats.totalRevenue || 0).toFixed(2)
    }
  }

  const getRevenueLabel = () => {
    switch (revenueFilter) {
      case 'today': return "Today's Revenue"
      case 'month': return "This Month's Revenue"
      case 'year': return "This Year's Revenue"
      case 'all': return "Lifetime Revenue"
    }
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card cursor-pointer hover:bg-muted/50 transition-colors h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl mt-2">
                MUR {getRevenueDisplay()}
              </CardTitle>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <IconCalendar className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      {revenueFilter === 'today' ? 'Today' :
                        revenueFilter === 'month' ? 'Month' :
                          revenueFilter === 'year' ? 'Year' : 'All Time'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRevenueFilter('today')}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRevenueFilter('month')}>
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRevenueFilter('year')}>
                    This Year
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRevenueFilter('all')}>
                    All Time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <Link href="/transactions" className="flex-1">
          <CardFooter className="flex-col items-start gap-1.5 text-sm pt-0">
            <CardAction>
              <Badge variant="outline">
                <IconCurrencyDollar className="mr-1 size-3" />
                Revenue
              </Badge>
            </CardAction>
            <div className="line-clamp-1 flex gap-2 font-medium">
              {getRevenueLabel()}
            </div>
          </CardFooter>
        </Link>
      </Card>

      <Link href="/transactions" className="block">
        <Card className="@container/card cursor-pointer hover:bg-muted/50 transition-colors h-full">
          <CardHeader>
            <CardDescription>Total Sales</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.totalSales || 0}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconShoppingCart className="mr-1 size-3" />
                Sales
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {stats?.todaySales || 0} sales today
            </div>
          </CardFooter>
        </Card>
      </Link>

      <Link href="/products" className="block">
        <Card className="@container/card cursor-pointer hover:bg-muted/50 transition-colors h-full">
          <CardHeader>
            <CardDescription>Active Products</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.activeProducts || 0}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconPackage className="mr-1 size-3" />
                Inventory
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Products In Stock
            </div>
          </CardFooter>
        </Card>
      </Link>

      <Link href="/customers" className="block">
        <Card className="@container/card cursor-pointer hover:bg-muted/50 transition-colors h-full">
          <CardHeader>
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats?.totalCustomers || 0}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconUsers className="mr-1 size-3" />
                Customers
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Registered Customers
            </div>
          </CardFooter>
        </Card>
      </Link>
    </div>
  )
}
