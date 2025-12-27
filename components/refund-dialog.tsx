"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface SaleItem {
    id: string
    productName: string
    sku: string
    quantity: number
    quantityRefunded: number
    unitPrice: number
    taxAmount: number
    total: number
}

interface Sale {
    id: string
    saleNumber: string
    total: number
    createdAt: string
    refundStatus: string
    totalRefunded: number
    items: SaleItem[]
}

interface RefundDialogProps {
    sale: Sale | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function RefundDialog({ sale, open, onOpenChange, onSuccess }: RefundDialogProps) {
    const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({})
    const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
    const [reason, setReason] = useState("")
    const [notes, setNotes] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open && sale) {
            setSelectedItems({})
            setPaymentMethod("CASH")
            setReason("")
            setNotes("")
            setShowConfirmation(false)
        }
    }, [open, sale])

    if (!sale) return null

    const refundableItems = sale.items.filter(item =>
        item.quantity > item.quantityRefunded
    )

    const handleItemSelect = (itemId: string, checked: boolean) => {
        if (checked) {
            const item = refundableItems.find(i => i.id === itemId)
            if (item) {
                const maxRefundable = item.quantity - item.quantityRefunded
                setSelectedItems(prev => ({ ...prev, [itemId]: maxRefundable }))
            }
        } else {
            const newSelected = { ...selectedItems }
            delete newSelected[itemId]
            setSelectedItems(newSelected)
        }
    }

    const handleQuantityChange = (itemId: string, quantity: number) => {
        const item = refundableItems.find(i => i.id === itemId)
        if (item) {
            const maxRefundable = item.quantity - item.quantityRefunded
            const validQuantity = Math.min(Math.max(1, quantity), maxRefundable)
            setSelectedItems(prev => ({ ...prev, [itemId]: validQuantity }))
        }
    }

    // Calculate refund totals
    const calculateTotals = () => {
        let subtotal = 0
        let tax = 0
        Object.entries(selectedItems).forEach(([itemId, quantity]) => {
            const item = refundableItems.find(i => i.id === itemId)
            if (item) {
                subtotal += item.unitPrice * quantity
                // Proportional tax logic
                // The API calculates tax as: (saleItem.taxAmount / saleItem.quantity) * refundQuantity
                // We need to match this exactly.
                // Assuming saleItem has taxAmount. Wait, the interface SaleItem above doesn't have taxAmount.
                // I need to add taxAmount to the SaleItem interface first.
                // For now, I will use a fallback or assume it's passed.
                // Looking at route.ts, taxAmount IS passed: *, saleItems:SaleItem(*)
                // But the interface in this file needs updating.

                // Let's rely on the fact that `item` comes from `sale.items` which comes from API.
                // I will cast it to any or update interface. 
                // Updating interface is better. 
                // But in this replace block I am only replacing this function.
                // I will assume item comes with taxAmount and cast it if needed.
                const taxAmount = (item as any).taxAmount || 0
                const taxPerUnit = item.quantity > 0 ? (taxAmount / item.quantity) : 0
                tax += taxPerUnit * quantity
            }
        })
        const total = subtotal + tax
        return { subtotal, tax, total }
    }

    const { subtotal, tax, total } = calculateTotals()

    const handleSubmit = async () => {
        // Validation
        if (Object.keys(selectedItems).length === 0) {
            toast.error("Please select at least one item to refund")
            return
        }

        if (!reason) {
            toast.error("Please select a reason for refund")
            return
        }

        // If "OTHER" is selected, notes must be provided
        if (reason === "OTHER" && (!notes || notes.trim().length < 5)) {
            toast.error("Please specify the reason in the notes field")
            return
        }

        setShowConfirmation(true)
    }

    const processRefund = async () => {
        setIsProcessing(true)
        try {
            const items = Object.entries(selectedItems).map(([saleItemId, quantityToRefund]) => ({
                saleItemId,
                quantityToRefund
            }))

            const res = await fetch('/api/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    saleId: sale.id,
                    items,
                    paymentMethod,
                    reason: reason === "OTHER" ? notes : reason,
                    notes: reason === "OTHER" ? undefined : (notes || undefined)
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(`Refund processed successfully: ${data.refundNumber}`)
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(data.error || 'Failed to process refund')
            }
        } catch (error) {
            console.error('Error processing refund:', error)
            toast.error('Error processing refund')
        } finally {
            setIsProcessing(false)
            setShowConfirmation(false)
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allItems: { [key: string]: number } = {}
            refundableItems.forEach(item => {
                const maxRefundable = item.quantity - item.quantityRefunded
                allItems[item.id] = maxRefundable
            })
            setSelectedItems(allItems)
        } else {
            setSelectedItems({})
        }
    }

    const areAllItemsSelected = refundableItems.length > 0 && refundableItems.every(item => item.id in selectedItems)
    const isIndeterminate = refundableItems.some(item => item.id in selectedItems) && !areAllItemsSelected

    return (
        <>
            <Dialog open={open && !showConfirmation} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            Process Refund
                        </DialogTitle>
                        <DialogDescription>
                            Sale #{sale.saleNumber} • {new Date(sale.createdAt).toLocaleDateString()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Sale Info */}
                        <div className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Original Total</p>
                                    <p className="text-lg font-bold">MUR {sale.total.toFixed(2)}</p>
                                </div>
                                {sale.totalRefunded > 0 && (
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Already Refunded</p>
                                        <p className="text-lg font-bold text-destructive">-MUR {sale.totalRefunded.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Selection */}
                        <div>
                            <h3 className="font-semibold mb-2">Select Items to Refund</h3>
                            <div className="overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={areAllItemsSelected || (isIndeterminate ? "indeterminate" : false)}
                                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                />
                                            </TableHead>
                                            <TableHead className="min-w-[150px]">Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Available</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Quantity</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Unit Price</TableHead>
                                            <TableHead className="text-right whitespace-nowrap">Refund Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {refundableItems.map((item) => {
                                            const maxRefundable = item.quantity - item.quantityRefunded
                                            const isSelected = item.id in selectedItems
                                            const quantity = selectedItems[item.id] || maxRefundable
                                            const refundAmount = item.unitPrice * quantity * 1.15

                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => handleItemSelect(item.id, !!checked)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                                    <TableCell>{item.sku}</TableCell>
                                                    <TableCell className="text-right">{maxRefundable}</TableCell>
                                                    <TableCell className="text-right">
                                                        {isSelected ? (
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={maxRefundable}
                                                                value={quantity}
                                                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                                                className="w-20 text-right h-8"
                                                            />
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">MUR {item.unitPrice.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-medium whitespace-nowrap">
                                                        {isSelected ? `MUR ${refundAmount.toFixed(2)}` : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Refund Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                    <SelectItem value="MIXED">Internet Banking</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Reason for Refund <span className="text-destructive">*</span>
                            </label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                                    <SelectItem value="Defective or damaged product">Defective or damaged product</SelectItem>
                                    <SelectItem value="Wrong item purchased">Wrong item purchased</SelectItem>
                                    <SelectItem value="Wrong item delivered">Wrong item delivered</SelectItem>
                                    <SelectItem value="Product not as described">Product not as described</SelectItem>
                                    <SelectItem value="Duplicate purchase">Duplicate purchase</SelectItem>
                                    <SelectItem value="Price match or adjustment">Price match or adjustment</SelectItem>
                                    <SelectItem value="Quality not satisfactory">Quality not satisfactory</SelectItem>
                                    <SelectItem value="Expired or spoiled product">Expired or spoiled product</SelectItem>
                                    <SelectItem value="OTHER">Other (specify below)</SelectItem>
                                </SelectContent>
                            </Select>
                            {reason === "OTHER" && (
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Please specify the reason..."
                                    rows={2}
                                    className="mt-2"
                                />
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Additional Notes (Optional)</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={2}
                            />
                        </div>

                        {/* Totals */}
                        {Object.keys(selectedItems).length > 0 && (
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>MUR {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax:</span>
                                    <span>MUR {tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold border-t pt-2">
                                    <span>Total Refund:</span>
                                    <span className="text-destructive">MUR {total.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isProcessing || Object.keys(selectedItems).length === 0 || !reason || (reason === "OTHER" && (!notes || notes.trim().length < 5))}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Process Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Confirm Refund
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to process this refund?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-4">
                        <div className="flex justify-between">
                            <span>Sale Number:</span>
                            <span className="font-medium">{sale.saleNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Items to Refund:</span>
                            <span className="font-medium">{Object.keys(selectedItems).length}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Refund Amount:</span>
                            <span className="text-destructive">MUR {total.toFixed(2)}</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button onClick={processRefund} disabled={isProcessing} variant="destructive">
                            {isProcessing ? 'Processing...' : 'Confirm Refund'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
