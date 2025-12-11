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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Plus, Search, Tag, Edit, Trash2 } from "lucide-react"
import { useUser, usePermission } from "@/components/rbac"
import { createClient } from "@/lib/supabase/client"

interface ProductCategory {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  const user = useUser()
  const canManageCategories = usePermission("manageProducts")
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories-supabase?full=true")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      } else if (res.status === 401) {
        alert("Session expired. Please login again.")
        window.location.href = "/login"
      } else {
        console.error("Error loading categories:", await res.text())
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const handleOpenDialog = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || "",
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: "",
        description: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({
      name: "",
      description: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        alert("Category updated successfully!")
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            description: formData.description || null,
          })

        if (error) throw error
        alert("Category created successfully!")
      }

      handleCloseDialog()
      await loadCategories()
    } catch (error: any) {
      console.error("Error saving category:", error)
      alert(`Error: ${error.message || "Failed to save category"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      alert("Category deleted successfully!")
      await loadCategories()
    } catch (error: any) {
      console.error("Error deleting category:", error)
      alert(`Error: ${error.message || "Failed to delete category"}`)
    }
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/products">Products</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Categories</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
              <p className="text-muted-foreground">
                Manage your product categories and organize your inventory
              </p>
            </div>
            {canManageCategories && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? "Try adjusting your search" : "Get started by creating your first category"}
                  </p>
                  {canManageCategories && !searchQuery && (
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      {canManageCategories && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.description || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(category.created_at).toLocaleDateString()}
                        </TableCell>
                        {canManageCategories && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(category.id, category.name)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Category Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Update the category details below"
                    : "Create a new product category for better organization"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Category Name *</FieldLabel>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Electronics, Clothing, Food"
                      required
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this category"
                    />
                  </Field>
                </FieldGroup>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
