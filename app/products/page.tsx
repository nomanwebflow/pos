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
import { Plus, Search, Package, AlertTriangle, Edit, Tag, Scan, Trash2, X, Upload, Archive, ArrowUpDown, ArrowUp, ArrowDown, ImageIcon } from "lucide-react"
import { useUser, usePermission } from "@/components/rbac"
import Papa from "papaparse"
import { useRef } from "react"
import { ProductImportDialog } from "@/components/product-import-dialog"
import { ImageUpload } from "@/components/image-upload"
import Image from "next/image"
import { toast } from "sonner"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
  imageUrl: string | null
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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
    imageUrl: "",
  })

  // Bulk Actions State
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  // Sorting State
  const [sortColumn, setSortColumn] = useState<keyof Product | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/products/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProducts })
      })
      if (res.ok) {
        toast.success(`Deleted ${selectedProducts.length} products`)
        setSelectedProducts([])
        loadProducts()
      } else {
        toast.error('Failed to delete products')
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Error deleting products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkDraft = async () => {
    if (!confirm(`Set ${selectedProducts.length} products to Inactive (Draft)?`)) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/products/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProducts, updates: { isActive: 0 } }) // 0 = Inactive
      })
      if (res.ok) {
        toast.success(`Updated ${selectedProducts.length} products to Draft`)
        setSelectedProducts([])
        loadProducts()
      } else {
        toast.error('Failed to update products')
      }
    } catch (error) {
      console.error('Bulk update error:', error)
      toast.error('Error updating products')
    } finally {
      setIsLoading(false)
    }
  }

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'all'>('active')

  useEffect(() => {
    loadProducts()
    // categories loaded once on mount
  }, [statusFilter]) // Reload when status filter changes

  useEffect(() => {
    // Initial load including categories
    loadCategories()
  }, [])


  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products-supabase?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
        // Clear selection to avoid actions on hidden items
        setSelectedProducts([])
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
          handleNewProduct(barcode)
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

  const handleNewProduct = (barcodeRaw?: string) => {
    setEditingProduct(null)
    setFormData({
      name: "",
      sku: `SKU-${Date.now()}`,
      barcode: barcodeRaw || "",
      description: "",
      category: "",
      costPrice: "",
      sellingPrice: "",
      stockLevel: "",
      lowStockThreshold: "10",
      taxable: true,
      imageUrl: "",
    })
    setIsDialogOpen(true)
    setBarcodeInput("")
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      description: product.description || "",
      category: product.category || "",
      costPrice: product.costPrice ? product.costPrice.toString() : "",
      sellingPrice: product.sellingPrice.toString(),
      stockLevel: product.stockLevel.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      taxable: Boolean(product.taxable),
      imageUrl: product.imageUrl || "",
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const method = editingProduct ? "PATCH" : "POST"
      const body = {
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
        imageUrl: formData.imageUrl || null,
        ...(editingProduct ? { id: editingProduct.id } : {})
      }

      const res = await fetch("/api/products-supabase", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setIsDialogOpen(false)
        loadProducts()
        setEditingProduct(null) // Reset editing state
        handleNewProduct() // Reset form to default for next open
      } else {
        alert(editingProduct ? "Error updating product" : "Error creating product")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sorting handler
  const handleSort = (column: keyof Product) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex)

  const lowStockCount = products.filter(p => p.stockLevel <= p.lowStockThreshold).length

  // Sort icon component
  const SortIcon = ({ column }: { column: keyof Product }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }

  // Permission checks
  const user = useUser()
  // Super Admin can edit products
  const canManageProducts = usePermission("editProduct")
  const canManageCategories = usePermission("manageCategories")

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
                  <CardDescription>
                    {products.length} products total
                    {selectedProducts.length > 0 && <span className="ml-2 font-medium text-primary">({selectedProducts.length} selected)</span>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedProducts.length > 0 && canManageProducts && (
                    <>
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedProducts.length})
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleBulkDraft}>
                        <Archive className="mr-2 h-4 w-4" />
                        Draft ({selectedProducts.length})
                      </Button>
                      <div className="mx-2 w-px bg-border" />
                    </>
                  )}
                  {canManageProducts && (
                    <ProductImportDialog onSuccess={() => {
                      loadProducts()
                      loadCategories()
                    }} />
                  )}
                  {canManageCategories && (
                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
                      <Tag className="mr-2 h-4 w-4" />
                      Manage Categories
                    </Button>
                  )}
                  {canManageProducts && (
                    <Button onClick={() => handleNewProduct()}>
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
                {/* Status Filter */}
                <div className="w-[150px]">
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft (Inactive)</SelectItem>
                      <SelectItem value="all">All Products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Name <SortIcon column="name" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('sku')}>
                      <div className="flex items-center">SKU <SortIcon column="sku" /></div>
                    </TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('category')}>
                      <div className="flex items-center">Category <SortIcon column="category" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('costPrice')}>
                      <div className="flex items-center justify-end">Cost Price <SortIcon column="costPrice" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('sellingPrice')}>
                      <div className="flex items-center justify-end">Selling Price <SortIcon column="sellingPrice" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('stockLevel')}>
                      <div className="flex items-center justify-end">Stock <SortIcon column="stockLevel" /></div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    {canManageProducts && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.imageUrl ? (
                          <div className="relative h-10 w-10 rounded-md overflow-hidden border">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
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
                        {!product.isActive && <Badge variant="secondary" className="mr-2">Draft</Badge>}
                        {product.stockLevel <= product.lowStockThreshold && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                        {product.stockLevel > product.lowStockThreshold && product.isActive === 1 && (
                          <Badge variant="default">In Stock</Badge>
                        )}
                      </TableCell>
                      {canManageProducts && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) setCurrentPage(currentPage - 1)
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setCurrentPage(page)
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        }
                        return null
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                          }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product details below" : "Enter the product details below"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel>Product Image</FieldLabel>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url || "" })}
                />
              </Field>
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
                  <FieldLabel htmlFor="stockLevel">Stock Level *</FieldLabel>
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
                {isLoading ? (editingProduct ? "Updating..." : "Creating...") : (editingProduct ? "Update Product" : "Create Product")}
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
