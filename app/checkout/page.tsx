"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Grid3x3,
  Wallet,
  Percent,
  Tag,
  CheckCircle2,
  Printer,
  ImageIcon,
  LogOut,
} from "lucide-react"
import { Receipt } from "@/components/receipt"
import { VirtualKeyboard } from "@/components/virtual-keyboard"
import Image from "next/image"

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  category: string | null
  sellingPrice: number
  stockLevel: number
  taxable: number
  imageUrl: string | null
}

interface CartItem extends Product {
  quantity: number
  subtotal: number
}

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MIXED">("CASH")
  const [cashAmount, setCashAmount] = useState("")
  const [cardAmount, setCardAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE")
  const [discountValue, setDiscountValue] = useState("")
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeInput, setActiveInput] = useState<"discount" | "cash" | "card" | null>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const TAX_RATE = 15 // 15% VAT for Mauritius

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/login"
        return
      }

      // Check role - SUPER_ADMIN should not access POS
      const { data: profile } = await supabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'SUPER_ADMIN') {
        alert("Super Admins cannot access the Point of Sale. Please use the Dashboard.")
        window.location.href = "/"
        return
      }

      setIsLoading(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      loadProducts()
      loadCategories()
    }
  }, [isLoading])

  // Removed auto-focus barcode input to allow search input focus


  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        console.log('[DEBUG] Products loaded:', data.length, 'products')
        setProducts(data)
      } else if (res.status === 401) {
        alert("Session expired. Please login again.")
        window.location.href = "/login"
      } else {
        console.error("Error loading products:", await res.text())
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
        // Extract category names from the category objects
        const categoryNames = data.map((cat: any) => cat.name)
        setCategories(categoryNames)
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

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcodeInput)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          addToCart(data[0])
        } else {
          alert("Product not found!")
        }
      } else if (res.status === 401) {
        alert("Session expired. Please login again.")
        window.location.href = "/login"
      }
    } catch (error) {
      console.error("Error scanning barcode:", error)
      alert("Error scanning barcode. Please try again.")
    }

    setBarcodeInput("")
  }

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id)

    if (existing) {
      if (existing.quantity >= product.stockLevel) {
        alert("Not enough stock!")
        return
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.sellingPrice }
          : item
      ))
    } else {
      if (product.stockLevel < 1) {
        alert("Product out of stock!")
        return
      }
      setCart([...cart, {
        ...product,
        quantity: 1,
        subtotal: product.sellingPrice
      }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stockLevel))
        return { ...item, quantity: newQty, subtotal: newQty * item.sellingPrice }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const taxAmount = cart.reduce((sum, item) => {
      return sum + (item.taxable ? (item.subtotal * TAX_RATE) / 100 : 0)
    }, 0)
    const totalBeforeDiscount = subtotal + taxAmount

    // Calculate discount
    let discountAmount = 0
    const discountVal = parseFloat(discountValue) || 0

    if (discountVal > 0) {
      if (discountType === "PERCENTAGE") {
        // Percentage discount (max 100%)
        const percentage = Math.min(discountVal, 100)
        discountAmount = (totalBeforeDiscount * percentage) / 100
      } else {
        // Fixed amount discount (max total)
        discountAmount = Math.min(discountVal, totalBeforeDiscount)
      }
    }

    const total = totalBeforeDiscount - discountAmount

    return { subtotal, taxAmount, discountAmount, total, totalBeforeDiscount }
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    setIsCheckoutOpen(true)

    // Pre-fill amounts when opening checkout
    const { total } = calculateTotals()
    if (paymentMethod === "CASH") {
      setCashAmount(total.toFixed(2))
      setCardAmount("")
      setActiveInput("cash") // Show virtual keyboard for cash input
    } else if (paymentMethod === "CARD") {
      setCardAmount(total.toFixed(2))
      setCashAmount("")
      setActiveInput(null)
    } else {
      // MIXED payment
      setActiveInput("cash")
    }
  }

  const handlePaymentMethodChange = (method: "CASH" | "CARD" | "MIXED") => {
    setPaymentMethod(method)
    const { total } = calculateTotals()

    if (method === "CASH") {
      setCashAmount(total.toFixed(2))
      setCardAmount("")
      setActiveInput("cash")
    } else if (method === "CARD") {
      setCardAmount(total.toFixed(2))
      setCashAmount("")
      setActiveInput(null) // Card doesn't need keyboard input
    } else {
      // MIXED - suggest 50/50 split
      const half = (total / 2).toFixed(2)
      setCashAmount(half)
      setCardAmount(half)
      setActiveInput("cash")
    }
  }

  const handleKeyboardInput = (value: string) => {
    if (!activeInput) return

    if (activeInput === "discount") {
      setDiscountValue(prev => {
        const newValue = prev + value
        // Validate discount
        if (discountType === "PERCENTAGE") {
          const num = parseFloat(newValue)
          if (num > 100) return prev
        }
        return newValue
      })
    } else if (activeInput === "cash") {
      setCashAmount(prev => {
        const newValue = prev + value
        // Auto-adjust card amount for mixed payment
        if (paymentMethod === "MIXED") {
          const cash = parseFloat(newValue) || 0
          const remaining = calculateTotals().total - cash
          setCardAmount(remaining > 0 ? remaining.toFixed(2) : "0")
        }
        return newValue
      })
    } else if (activeInput === "card") {
      setCardAmount(prev => {
        const newValue = prev + value
        // Auto-adjust cash amount for mixed payment
        if (paymentMethod === "MIXED") {
          const card = parseFloat(newValue) || 0
          const remaining = calculateTotals().total - card
          setCashAmount(remaining > 0 ? remaining.toFixed(2) : "0")
        }
        return newValue
      })
    }
  }

  const handleKeyboardBackspace = () => {
    if (!activeInput) return

    if (activeInput === "discount") {
      setDiscountValue(prev => prev.slice(0, -1))
    } else if (activeInput === "cash") {
      setCashAmount(prev => {
        const newValue = prev.slice(0, -1)
        if (paymentMethod === "MIXED") {
          const cash = parseFloat(newValue) || 0
          const remaining = calculateTotals().total - cash
          setCardAmount(remaining > 0 ? remaining.toFixed(2) : "0")
        }
        return newValue
      })
    } else if (activeInput === "card") {
      setCardAmount(prev => {
        const newValue = prev.slice(0, -1)
        if (paymentMethod === "MIXED") {
          const card = parseFloat(newValue) || 0
          const remaining = calculateTotals().total - card
          setCashAmount(remaining > 0 ? remaining.toFixed(2) : "0")
        }
        return newValue
      })
    }
  }

  const handleKeyboardClear = () => {
    if (!activeInput) return

    if (activeInput === "discount") {
      setDiscountValue("")
    } else if (activeInput === "cash") {
      setCashAmount("")
      if (paymentMethod === "MIXED") {
        setCardAmount(calculateTotals().total.toFixed(2))
      }
    } else if (activeInput === "card") {
      setCardAmount("")
      if (paymentMethod === "MIXED") {
        setCashAmount(calculateTotals().total.toFixed(2))
      }
    }
  }

  const processPayment = async () => {
    if (isProcessing) return

    const { subtotal, taxAmount, discountAmount, total } = calculateTotals()

    let cash = 0
    let card = 0

    if (paymentMethod === "CASH") {
      cash = parseFloat(cashAmount)
      if (isNaN(cash) || cash < total) {
        alert("Insufficient cash amount!")
        return
      }
    } else if (paymentMethod === "CARD") {
      card = parseFloat(cardAmount)
      if (isNaN(card) || card < total) {
        alert("Invalid card amount!")
        return
      }
    } else if (paymentMethod === "MIXED") {
      cash = parseFloat(cashAmount) || 0
      card = parseFloat(cardAmount) || 0

      const totalPaid = cash + card
      if (Math.abs(totalPaid - total) > 0.01) { // Allow 1 cent difference for rounding
        alert(`Total payment (MUR ${totalPaid.toFixed(2)}) must equal the sale total (MUR ${total.toFixed(2)})`)
        return
      }
    }

    setIsProcessing(true)

    try {
      const saleData = {
        subtotal,
        taxAmount,
        total,
        discount: discountAmount,
        paymentMethod,
        cashReceived: cash > 0 ? cash : null,
        cashChange: paymentMethod === "CASH" ? cash - total : null,
        cardAmount: card > 0 ? card : null,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          subtotal: item.subtotal,
          taxAmount: item.taxable ? (item.subtotal * TAX_RATE) / 100 : 0,
          total: item.subtotal + (item.taxable ? (item.subtotal * TAX_RATE) / 100 : 0)
        }))
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      })

      if (res.ok) {
        const result = await res.json()

        // Prepare completed sale data
        const completedSaleData = {
          saleNumber: result.saleNumber,
          date: new Date().toISOString(),
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.sellingPrice,
            subtotal: item.subtotal,
          })),
          subtotal,
          taxAmount,
          discountAmount,
          total,
          paymentMethod,
          cashReceived: cash > 0 ? cash : undefined,
          cashChange: paymentMethod === "CASH" ? cash - total : (paymentMethod === "MIXED" && cash > (total - card) ? cash - (total - card) : undefined),
          cardAmount: card > 0 ? card : undefined,
        }

        setCompletedSale(completedSaleData)
        setIsCheckoutOpen(false)
        setIsSuccessModalOpen(true)

        // Auto-trigger print after a short delay
        setTimeout(() => {
          handlePrint()
        }, 500)

        clearCart()
        setCashAmount("")
        setCardAmount("")
        setDiscountValue("")
        await loadProducts() // Reload to update stock levels
      } else if (res.status === 401) {
        alert("Session expired. Please login again.")
        window.location.href = "/login"
      } else if (res.status === 403) {
        alert("You don't have permission to process sales.")
      } else {
        const errorData = await res.json()
        alert(`Error processing sale: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      alert("Error processing payment")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    if (receiptRef.current) {
      window.print()
    }
  }

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false)
    setCompletedSale(null)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const { subtotal, taxAmount, discountAmount, total } = calculateTotals()

  // Calculate payment percentages for mixed payment
  const cashPercentage = paymentMethod === "MIXED" && total > 0
    ? ((parseFloat(cashAmount) || 0) / total * 100).toFixed(1)
    : "0"
  const cardPercentage = paymentMethod === "MIXED" && total > 0
    ? ((parseFloat(cardAmount) || 0) / total * 100).toFixed(1)
    : "0"

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-5 w-5" />
              <h1 className="text-xl font-bold">Checkout</h1>
            </div>
          </div>
          <div className="px-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push("/login")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-clip">
          {/* Left Panel - Products */}
          <div className="flex w-2/3 flex-col border-r">
            {/* Search and Barcode */}
            <div className="border-b p-4">
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-10 text-lg"
                  />
                </div>
              </div>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Scan or enter barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="h-12 pl-10 text-lg"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12">
                  Add
                </Button>
              </form>
            </div>

            {/* Categories */}
            <div className="border-b p-4">
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden scrollbar-thin flex-nowrap">
                  <TabsTrigger value="all" className="text-lg">
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    All
                  </TabsTrigger>
                  {categories.map(category => (
                    <TabsTrigger key={category} value={category} className="text-lg">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => addToCart(product)}
                  >
                    <CardHeader className="p-0">
                      <div className="aspect-square w-full relative bg-muted">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                          </div>
                        )}
                        {product.stockLevel <= 10 && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="destructive" className="shadow-sm">
                              Low Stock: {product.stockLevel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="mb-1">
                        <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold">MUR {product.sellingPrice.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="sticky top-16 flex w-1/3 flex-col" style={{ height: 'calc(100vh - 64px)' }}>
            <div className="border-b p-4 shrink-0">
              <h2 className="text-xl font-bold">Cart ({cart.length} items)</h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {cart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                  <div>
                    <ShoppingCart className="mx-auto h-12 w-12 mb-2" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Scan or select products to add</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            MUR {item.sellingPrice.toFixed(2)} each
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">MUR {item.subtotal.toFixed(2)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Totals and Checkout - Sticky within cart panel */}
            <div className="shrink-0 border-t bg-card p-4 shadow-lg">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>MUR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (15%):</span>
                  <span>MUR {taxAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Discount:</span>
                    <span>-MUR {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>MUR {total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-14"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1 h-14 text-lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </div>

              {/* Virtual Keyboard */}
              <div className="mt-4 pt-4 border-t">
                <VirtualKeyboard
                  onRefund={() => router.push('/transactions')}
                  onKeyPress={(key) => {
                    if (activeInput) {
                      handleKeyboardInput(key)
                    } else {
                      // Default to barcode input if no specific input is active
                      setBarcodeInput(prev => prev + key)
                    }
                  }}
                  onBackspace={() => {
                    if (activeInput) {
                      handleKeyboardBackspace()
                    } else {
                      setBarcodeInput(prev => prev.slice(0, -1))
                    }
                  }}
                  onClear={() => {
                    if (activeInput) {
                      handleKeyboardClear()
                    } else {
                      setBarcodeInput("")
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Receipt for Printing */}
        {completedSale && (
          <div ref={receiptRef} className="hidden print:block">
            <Receipt {...completedSale} />
          </div>
        )}

        {/* Success Modal */}
        <Dialog open={isSuccessModalOpen} onOpenChange={handleCloseSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl">Sale Completed!</DialogTitle>
              <DialogDescription className="text-center">
                Your sale has been processed successfully
              </DialogDescription>
            </DialogHeader>
            {completedSale && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Sale Number:</span>
                    <span className="font-mono font-bold">{completedSale.saleNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Date:</span>
                    <span>{new Date(completedSale.date).toLocaleString()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>MUR {completedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (15%):</span>
                    <span>MUR {completedSale.taxAmount.toFixed(2)}</span>
                  </div>
                  {completedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-MUR {completedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>MUR {completedSale.total.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span>Payment Method:</span>
                    <span className="font-medium">{completedSale.paymentMethod}</span>
                  </div>
                  {completedSale.cashReceived && (
                    <div className="flex justify-between text-sm">
                      <span>Cash Received:</span>
                      <span>MUR {completedSale.cashReceived.toFixed(2)}</span>
                    </div>
                  )}
                  {completedSale.cashChange !== undefined && completedSale.cashChange > 0 && (
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Change:</span>
                      <span>MUR {completedSale.cashChange.toFixed(2)}</span>
                    </div>
                  )}
                  {completedSale.cardAmount && (
                    <div className="flex justify-between text-sm">
                      <span>Card Payment:</span>
                      <span>MUR {completedSale.cardAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={handleCloseSuccessModal}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Checkout Dialog */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Total Amount: MUR {total.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Discount Section */}
              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Discount (Optional)</label>
                </div>
                <div className="flex gap-2">
                  <Select value={discountType} onValueChange={(value: "PERCENTAGE" | "FIXED") => setDiscountType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">%</SelectItem>
                      <SelectItem value="FIXED">MUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    inputMode="none"
                    placeholder={discountType === "PERCENTAGE" ? "0-100" : "0.00"}
                    value={discountValue}
                    onFocus={() => setActiveInput("discount")}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="flex-1"
                  />
                </div>
                {discountAmount > 0 && (
                  <p className="text-sm text-green-600 font-medium">
                    Discount Applied: -MUR {discountAmount.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="CARD">
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="MIXED">
                      <div className="flex items-center">
                        <Wallet className="mr-2 h-4 w-4" />
                        Internet Banking
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "CASH" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Cash Received</label>
                  <Input
                    type="text"
                    inputMode="none"
                    placeholder="0.00"
                    value={cashAmount}
                    onFocus={() => setActiveInput("cash")}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="h-12 text-lg"
                  />
                  {cashAmount && parseFloat(cashAmount) >= total && (
                    <p className="mt-2 text-sm font-medium text-green-600">
                      Change: MUR {(parseFloat(cashAmount) - total).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {paymentMethod === "CARD" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Card Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    className="h-12 text-lg"
                    disabled
                  />
                </div>
              )}

              {paymentMethod === "MIXED" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Cash Amount {cashPercentage !== "0" && `(${cashPercentage}%)`}
                    </label>
                    <Input
                      type="text"
                      inputMode="none"
                      placeholder="0.00"
                      value={cashAmount}
                      onFocus={() => setActiveInput("cash")}
                      onChange={(e) => {
                        const cash = parseFloat(e.target.value) || 0
                        setCashAmount(e.target.value)
                        // Auto-adjust card amount
                        const remaining = total - cash
                        setCardAmount(remaining > 0 ? remaining.toFixed(2) : "0")
                      }}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Card Amount {cardPercentage !== "0" && `(${cardPercentage}%)`}
                    </label>
                    <Input
                      type="text"
                      inputMode="none"
                      placeholder="0.00"
                      value={cardAmount}
                      onFocus={() => setActiveInput("card")}
                      onChange={(e) => {
                        const card = parseFloat(e.target.value) || 0
                        setCardAmount(e.target.value)
                        // Auto-adjust cash amount
                        const remaining = total - card
                        setCashAmount(remaining > 0 ? remaining.toFixed(2) : "0")
                      }}
                      className="h-12 text-lg"
                    />
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm">
                      <span className="font-medium">Total Entered:</span>{" "}
                      MUR {((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0)).toFixed(2)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Required:</span> MUR {total.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Virtual Keyboard */}
              {activeInput && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">
                    {activeInput === "discount" && "Entering Discount"}
                    {activeInput === "cash" && "Entering Cash Amount"}
                    {activeInput === "card" && "Entering Card Amount"}
                  </p>
                  <VirtualKeyboard
                    onKeyPress={handleKeyboardInput}
                    onBackspace={handleKeyboardBackspace}
                    onClear={handleKeyboardClear}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCheckoutOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={processPayment} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Complete Sale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
