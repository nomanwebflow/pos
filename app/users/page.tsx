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
import { UserPlus, Shield, UserCog, Edit, Trash2 } from "lucide-react"
import { usePermission } from "@/components/rbac"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [verificationPassword, setVerificationPassword] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    newPassword: "",
    role: "CASHIER",
  })

  const canManage = usePermission("manageUsers")

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditMode) {
      // Show password verification dialog for updates
      setIsPasswordDialogOpen(true)
    } else {
      // Create new user without password verification
      await createUser()
    }
  }

  const createUser = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setIsDialogOpen(false)
        setFormData({ email: "", name: "", password: "", newPassword: "", role: "CASHIER" })
        loadUsers()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to create user")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      alert("Failed to create user")
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      newPassword: "",
      role: user.role,
    })
    setIsEditMode(true)
    setIsDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!verificationPassword) {
      alert("Please enter your password to verify")
      return
    }

    try {
      // Password verified, proceed with update
      const updateData: any = {
        id: selectedUser?.id,
        name: formData.name,
        role: formData.role,
        verificationPassword: verificationPassword, // Send password for verification on server
      }

      // Include email if changed
      if (formData.email !== selectedUser?.email) {
        updateData.email = formData.email
      }

      // Include new password if provided
      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      const responseData = await res.json()

      if (res.ok) {
        setIsDialogOpen(false)
        setIsPasswordDialogOpen(false)
        setVerificationPassword("")
        setFormData({ email: "", name: "", password: "", newPassword: "", role: "CASHIER" })
        setIsEditMode(false)
        setSelectedUser(null)
        loadUsers()
      } else {
        console.error("Update failed:", { status: res.status, error: responseData })
        if (responseData.error === "Invalid password") {
          alert("Invalid password. Please try again.")
          setVerificationPassword("")
        } else {
          alert(responseData.error || "Failed to update user")
        }
      }
    } catch (error) {
      console.error("Error updating user:", error)
      alert("Failed to update user: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      return
    }

    setSelectedUser(user)
    setIsPasswordDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!verificationPassword) {
      alert("Please enter your password to verify")
      return
    }

    try {
      // Password verified, proceed with delete
      const res = await fetch(`/api/users?id=${selectedUser?.id}&verificationPassword=${encodeURIComponent(verificationPassword)}`, {
        method: "DELETE",
      })

      const responseData = await res.json()

      if (res.ok) {
        setIsPasswordDialogOpen(false)
        setVerificationPassword("")
        setSelectedUser(null)
        loadUsers()
      } else {
        console.error("Delete failed:", { status: res.status, error: responseData })
        if (responseData.error === "Invalid password") {
          alert("Invalid password. Please try again.")
          setVerificationPassword("")
        } else {
          alert(responseData.error || "Failed to deactivate user")
        }
      }
    } catch (error) {
      console.error("Error deactivating user:", error)
      alert("Failed to deactivate user: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const openAddDialog = () => {
    setFormData({ email: "", name: "", password: "", newPassword: "", role: "CASHIER" })
    setIsEditMode(false)
    setSelectedUser(null)
    setIsDialogOpen(true)
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: "bg-red-100 text-red-800",
      STOCK_MANAGER: "bg-green-100 text-green-800",
      CASHIER: "bg-blue-100 text-blue-800",
    }
    return colors[role] || colors.CASHIER
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
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Users</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage users and their roles
              </p>
            </div>
            {canManage && (
              <button
                onClick={openAddDialog}
                className="flex items-center gap-2 h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </button>
            )}
          </div>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? "s" : ""} in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <UserCog className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                      {canManage && user.isActive === 1 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.role !== "SUPER_ADMIN" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Descriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Role Descriptions</CardTitle>
              <CardDescription>
                Understanding different user roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Super Admin</p>
                    <p className="text-sm text-muted-foreground">
                      Full system access: manage users, view all data, access reports, transactions, payments, and settings
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Cashier</p>
                    <p className="text-sm text-muted-foreground">
                      Process sales at checkout - limited access to checkout page only
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Stock Manager</p>
                    <p className="text-sm text-muted-foreground">
                      Manage products, inventory, categories, and stock levels
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Add/Edit User Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{isEditMode ? "Edit User" : "Add New User"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                {isEditMode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Changing email will require the user to verify their new email address
                  </p>
                )}
              </div>
              {!isEditMode ? (
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">New Password (optional)</label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    minLength={6}
                    placeholder="Leave blank to keep current password"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a new password only if you want to change it
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="STOCK_MANAGER">Stock Manager</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {isEditMode ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Verification Dialog */}
      {isPasswordDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Verify Your Password</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {isEditMode
                ? "Please enter your password to confirm the user update."
                : "Please enter your password to confirm the user deletion."}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Password</label>
                <input
                  type="password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordDialogOpen(false)
                    setVerificationPassword("")
                    if (!isEditMode) {
                      setSelectedUser(null)
                    }
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditMode ? handleUpdate : confirmDelete}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
