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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Package, AlertTriangle, Edit, Tag, Scan, Trash2, X } from "lucide-react"
import { useUser, usePermission } from "@/components/rbac"

interface ProductCategory {
  id: string
  name: string
  description: string | null
}

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  description: string | null
  category: string | null
  costPrice: number | null
  sellingPrice: number
  stockLevel: number
  lowStockThreshold: number
  taxable: number
  isActive: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  })
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    category: "",
    costPrice: "",
    sellingPrice: "",
    stockLevel: "",
    lowStockThreshold: "10",
    taxable: true,
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products-supabase")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error loading categories:", error)
    }
  }

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return

    try {
      // Check if product with this barcode exists
      const res = await fetch(`/api/products-supabase?barcode=${encodeURIComponent(barcode)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length === 0) {
          // Product not found, open dialog with barcode pre-filled
          setFormData({
            name: "",
            sku: `SKU-${Date.now()}`, // Auto-generate SKU
            barcode: barcode,
            description: "",
            category: "",
            costPrice: "",
            sellingPrice: "",
            stockLevel: "0",
            lowStockThreshold: "10",
            taxable: true,
          })
          setIsDialogOpen(true)
          setBarcodeInput("")
        } else {
          // Product found, highlight it in search
          setSearchQuery(barcode)
          setBarcodeInput("")
        }
      }
    } catch (error) {
      console.error("Error checking barcode:", error)
      alert("Error checking barcode")
    }
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBarcodeScan(barcodeInput)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const method = editingCategory ? "PUT" : "POST"
      const body = editingCategory
        ? { id: editingCategory.id, ...categoryFormData }
        : categoryFormData

      const res = await fetch("/api/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        loadCategories()
        setCategoryFormData({ name: "", description: "" })
        setEditingCategory(null)
      } else {
        alert(editingCategory ? "Error updating category" : "Error creating category")
      }
    } catch (error) {
      console.error("Error saving category:", error)
      alert("Error saving category")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
    })
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? Products using this category will have their category unset.")) {
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/categories?id=${categoryId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        loadCategories()
        loadProducts() // Reload products to reflect category changes
      } else {
        alert("Error deleting category")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Error deleting category")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: "", description: "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/products-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode || null,
          description: formData.description || null,
          category: formData.category || null,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          sellingPrice: parseFloat(formData.sellingPrice),
          stockLevel: parseInt(formData.stockLevel),
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          taxable: formData.taxable,
        })
      })

      if (res.ok) {
        setIsDialogOpen(false)
        loadProducts()
        // Reset form
        setFormData({
          name: "",
          sku: "",
          barcode: "",
          description: "",
          category: "",
          costPrice: "",
          sellingPrice: "",
          stockLevel: "",
          lowStockThreshold: "10",
          taxable: true,
        })
      } else {
        alert("Error creating product")
      }
    } catch (error) {
      console.error("Error creating product:", error)
      alert("Error creating product")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const lowStockCount = products.filter(p => p.stockLevel <= p.lowStockThreshold).length

  // Permission checks
  const user = useUser()
  const canManageProducts = usePermission("editProduct") // Stock Manager and Super Admin can add/edit products
  const canManageCategories = usePermission("manageCategories") // Stock Manager and Super Admin

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
                  <BreadcrumbPage>Products</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MUR {products.reduce((sum, p) => sum + (p.costPrice || 0) * p.stockLevel, 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Manage your product inventory</CardDescription>
                </div>
                <div className="flex gap-2">
                  {canManageCategories && (
                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                      <Tag className="mr-2 h-4 w-4" />
                      Manage Categories
                    </Button>
                  )}
                  {canManageProducts && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3">
                {/* Barcode Scanner Input */}
                <form onSubmit={(e) => { e.preventDefault(); handleBarcodeScan(barcodeInput); }} className="flex gap-2">
                  <div className="relative flex-1">
                    <Scan className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Scan barcode to add new product or search existing..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      className="h-12 pl-10 text-lg"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12" disabled={!barcodeInput.trim()}>
                    Scan
                  </Button>
                </form>
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.barcode || "-"}</TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell className="text-right">
                        {product.costPrice ? `MUR ${product.costPrice.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        MUR {product.sellingPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.stockLevel <= product.lowStockThreshold ? "destructive" : "default"}>
                          {product.stockLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.stockLevel <= product.lowStockThreshold && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                        {product.stockLevel > product.lowStockThreshold && (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Add Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the product details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="name">Product Name *</FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sku">SKU *</FieldLabel>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="barcode">Barcode</FieldLabel>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <Select
                    value={formData.category || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="costPrice">Cost Price (MUR)</FieldLabel>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sellingPrice">Selling Price (MUR) *</FieldLabel>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="stockLevel">Initial Stock *</FieldLabel>
                  <Input
                    id="stockLevel"
                    type="number"
                    value={formData.stockLevel}
                    onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lowStockThreshold">Low Stock Threshold *</FieldLabel>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <Field>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.taxable}
                    onCheckedChange={(checked) => setFormData({ ...formData, taxable: checked as boolean })}
                  />
                  <span>Taxable (15% VAT)</span>
                </label>
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Product Categories</DialogTitle>
            <DialogDescription>
              Add and manage product categories
            </DialogDescription>
          </DialogHeader>

          {/* Add/Edit Category Form */}
          <form onSubmit={handleCategorySubmit} className="space-y-4 border-b pb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              {editingCategory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="categoryName">Category Name *</FieldLabel>
                <Input
                  id="categoryName"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="categoryDescription">Description</FieldLabel>
                <Input
                  id="categoryDescription"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (editingCategory ? "Updating..." : "Adding...") : (editingCategory ? "Update Category" : "Add Category")}
            </Button>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <h3 className="font-semibold">Existing Categories</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet. Add one above!</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        disabled={isLoading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
