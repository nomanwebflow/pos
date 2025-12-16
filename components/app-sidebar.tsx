"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  Receipt,
  Wallet,
  LogOut,
  User as UserIcon,
  UserCog,
  ChevronRight,
  Tag,
  RotateCcw,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useUser } from "@/components/rbac"
import { hasPermission } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    permission: "viewDashboard" as const,
  },
  {
    title: "Checkout",
    url: "/checkout",
    icon: ShoppingCart,
    permission: "viewCheckout" as const,
  },
  {
    title: "Products",
    url: "/products",
    icon: Package,
    permission: "viewProducts" as const,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: Tag,
    permission: "viewProducts" as const,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
    permission: "viewCustomers" as const,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
    permission: "viewReports" as const,
  },
  {
    title: "Sales History",
    url: "/transactions",
    icon: Receipt,
    permission: "viewTransactions" as const,
  },
  {
    title: "Refunds",
    url: "/refunds",
    icon: RotateCcw,
    permission: "viewRefunds" as const,
  },
  {
    title: "Payment Analytics",
    url: "/payments",
    icon: Wallet,
    permission: "viewPayments" as const,
  },
  {
    title: "Users",
    url: "/users",
    icon: UserCog,
    permission: "viewUsers" as const,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useUser()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Hide sidebar for cashiers
  if (user?.role === 'CASHIER') {
    return null
  }

  return (
    <Sidebar>
      <SidebarHeader className="h-16 border-b px-6 flex items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">POS System</span>
            <span className="text-xs text-muted-foreground">Point of Sale</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : user ? navItems.map((item) => {
                const isActive = pathname === item.url
                const hasSubItems = 'subItems' in item && Array.isArray((item as any).subItems) && (item as any).subItems.length > 0
                const isSubItemActive = hasSubItems && (item as any).subItems.some((sub: any) => pathname === sub.url)

                // Check permission - all items now have permissions
                const hasAccess = hasPermission(user.role, item.permission)

                if (!hasAccess) return null

                if (hasSubItems) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={isActive || isSubItemActive}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            className={isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                          >
                            <a href={item.url} className="flex items-center flex-1">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </a>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {((item as any).subItems as any[]).map((subItem: any) => {
                              const subItemActive = pathname === subItem.url
                              const hasSubAccess = hasPermission(user.role, subItem.permission)

                              if (!hasSubAccess) return null

                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={subItemActive}
                                    className={subItemActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                                  >
                                    <a href={subItem.url}>
                                      <subItem.icon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={isActive ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
                    >
                      <a href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }) : (
                // User not found state, maybe redirect or empty
                null
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {user && (
          <div className="mb-3 px-3 py-2 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <div className="text-xs text-muted-foreground ml-6">
              {user.role.replace(/_/g, ' ')}
            </div>
          </div>
        )}
        <SidebarMenu>
          {user && hasPermission(user.role, "viewSettings") && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/settings"}
                className={pathname === "/settings" ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""}
              >
                <a href="/settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
