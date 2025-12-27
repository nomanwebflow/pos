
"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress" // Requires `npx shadcn-ui@latest add progress` if not present? I'll assume it exists or use simple div.
import { Upload, FileUp, CheckCircle, AlertCircle, XCircle, Download } from "lucide-react"
import Papa from "papaparse"
import { toast } from "sonner"

// CSV Headers matching the parser logic
const CSV_TEMPLATE = `Name,SKU,Category,Selling Price,Cost Price,Stock Level,Low Stock Threshold,Barcode,Description
Sample Product,SKU-001,Electronics,1000,800,50,10,123456789,Sample description`

// Helper for progress bar if shadcn/ui progress is standard
// If it fails, I'll fallback to standard HTML progress in a fix.

interface ImportSummary {
    total: number
    success: number
    failed: number
    errors: { name: string; error: string }[]
}

interface ProductImportDialogProps {
    onSuccess?: () => void
}

export function ProductImportDialog({ onSuccess }: ProductImportDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [summary, setSummary] = useState<ImportSummary | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setSummary(null)
            setProgress(0)
        }
    }

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file first")
            return
        }

        // File size limit (5MB ≈ 5000 products)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File too large. Maximum 5MB (≈5000 products)")
            return
        }

        setIsLoading(true)
        setProgress(0)
        setSummary(null)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                // Remove BOM from first header (common in Excel exports)
                return header.replace(/^\uFEFF/, '').trim()
            },
            complete: async (results) => {
                const data = results.data
                if (data.length === 0) {
                    toast.error("No data found in CSV")
                    setIsLoading(false)
                    return
                }

                // Validate required columns exist
                const csvColumns = Object.keys(data[0] || {})
                const requiredColumns = ['Name', 'SKU']
                const missingColumns = requiredColumns.filter(col =>
                    !csvColumns.some(c => c.toLowerCase() === col.toLowerCase())
                )

                if (missingColumns.length > 0) {
                    toast.error(`Missing required columns: ${missingColumns.join(', ')}. Found: ${csvColumns.join(', ')}`)
                    setIsLoading(false)
                    return
                }

                // Process in batches of 50
                const batchSize = 50
                const totalBatches = Math.ceil(data.length / batchSize)
                let processedCount = 0
                let successCount = 0
                let failedCount = 0
                const errors: { name: string; error: string }[] = []

                try {
                    for (let i = 0; i < totalBatches; i++) {
                        const rawBatch = data.slice(i * batchSize, (i + 1) * batchSize)

                        // Map CSV fields to API fields (MUST match backend expectations)
                        // Handles various column naming conventions
                        const batch = rawBatch.map((item: any) => ({
                            name: item['Name'] || item['name'] || item['Product Name'] || item['ProductName'] || item['PRODUCT NAME'],
                            sellingPrice: item['Selling Price'] || item['SellingPrice'] || item['sellingPrice'] || item['Price'] || item['price'] || item['SELLING PRICE'] || item['PRICE'] || item['Unit Price'] || item['UnitPrice'],
                            costPrice: item['Cost Price'] || item['CostPrice'] || item['costPrice'] || item['Cost'] || item['cost'] || item['COST PRICE'] || item['COST'],
                            stockLevel: item['Stock Level'] || item['StockLevel'] || item['stockLevel'] || item['Stock'] || item['stock'] || item['STOCK LEVEL'] || item['STOCK'] || item['Quantity'] || item['quantity'] || item['Qty'] || item['QTY'],
                            lowStockThreshold: item['Low Stock Threshold'] || item['LowStockThreshold'] || item['lowStockThreshold'] || item['Min Stock'] || item['minStock'] || item['LOW STOCK THRESHOLD'] || item['Reorder Level'] || '10',
                            sku: item['SKU'] || item['sku'] || item['Sku'] || item['Product Code'] || item['ProductCode'] || item['Code'],
                            category: item['Category'] || item['category'] || item['CATEGORY'] || item['Product Category'],
                            barcode: item['Barcode'] || item['barcode'] || item['BARCODE'] || item['Bar Code'] || item['EAN'] || item['UPC'],
                            description: item['Description'] || item['description'] || item['DESCRIPTION'] || item['Product Description']
                        }))

                        const stats = await sendBatch(batch)

                        successCount += stats.success
                        failedCount += stats.failed
                        if (stats.errors) errors.push(...stats.errors)

                        processedCount += rawBatch.length
                        setProgress(Math.round((processedCount / data.length) * 100))
                    }


                    if (failedCount === 0) {
                        toast.success(`Import completed successfully: ${successCount} added`)
                        if (onSuccess) onSuccess()
                        setIsOpen(false) // Triggers reset via onOpenChange
                    } else {
                        setSummary({
                            total: data.length,
                            success: successCount,
                            failed: failedCount,
                            errors: errors
                        })
                        toast.warning(`Import completed with ${failedCount} errors`)
                        if (onSuccess) onSuccess()
                    }

                } catch (error) {
                    console.error("Import execution error:", error)
                    toast.error("Failed to process import")
                } finally {
                    setIsLoading(false)
                }
            },
            error: (error) => {
                console.error("CSV parse error:", error)
                toast.error("Failed to parse CSV file")
                setIsLoading(false)
            }
        })
    }

    const sendBatch = async (batch: any[]) => {
        const res = await fetch("/api/products/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: batch })
        })

        if (!res.ok) {
            // If whole batch fails (e.g. 500), count all as failed
            throw new Error(`Server error: ${res.statusText}`)
        }
        return await res.json()
    }

    const reset = () => {
        setFile(null)
        setSummary(null)
        setProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'product_import_template.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val)
            if (!val) reset()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Products</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: Name, SKU, Category, Selling Price, etc.
                        <br />
                        <Button variant="link" className="px-0 h-auto font-normal text-primary" onClick={downloadTemplate}>
                            <Download className="h-3 w-3 mr-1" /> Download Sample Template
                        </Button>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!summary ? (
                        <>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="csvFile">CSV File</Label>
                                <Input
                                    ref={fileInputRef}
                                    id="csvFile"
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                />
                            </div>

                            {isLoading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Processing...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    {/* Fallback progress bar in case component is missing */}
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                <CheckCircle className="h-5 w-5" />
                                <span>Import Completed</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-muted p-2 rounded-md">
                                    <div className="text-xl font-bold">{summary.total}</div>
                                    <div className="text-xs text-muted-foreground">Total</div>
                                </div>
                                <div className="bg-green-100 p-2 rounded-md text-green-800">
                                    <div className="text-xl font-bold">{summary.success}</div>
                                    <div className="text-xs">Success</div>
                                </div>
                                <div className="bg-red-100 p-2 rounded-md text-red-800">
                                    <div className="text-xl font-bold">{summary.failed}</div>
                                    <div className="text-xs">Failed</div>
                                </div>
                            </div>

                            {summary.errors.length > 0 && (
                                <div className="mt-4 p-3 bg-red-50 text-red-900 rounded-md text-sm max-h-40 overflow-y-auto">
                                    <p className="font-semibold mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> Errors
                                    </p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        {summary.errors.slice(0, 10).map((e, idx) => (
                                            <li key={idx}>
                                                <span className="font-medium">{e.name || 'Row ' + idx}:</span> {e.error}
                                            </li>
                                        ))}
                                    </ul>
                                    {summary.errors.length > 10 && (
                                        <p className="text-xs mt-2 italic">...and {summary.errors.length - 10} more errors.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!summary ? (
                        <Button onClick={handleUpload} disabled={!file || isLoading}>
                            {isLoading ? "Importing..." : "Start Import"}
                        </Button>
                    ) : (
                        <Button onClick={() => setIsOpen(false)}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
