"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
    RotateCcw,
    Search,
    Calendar,
    Filter,
    Eye,
    ArrowUpDown,
    Download,
} from "lucide-react"

import { useUser } from "@/components/rbac"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface RefundItem {
    id: string
    product: {
        name: string
        sku: string | null
    }
    quantity: number
    unitPrice: number
    total: number
}

interface Refund {
    id: string
    refundNumber: string
    createdAt: string
    total: number
    reason: string
    status: string
    paymentMethod: string | null
    notes: string | null
    sale: {
        saleNumber: string
    }
    user: {
        name: string
    }
    items?: RefundItem[]
    refundType?: string
}

export default function RefundsPage() {
    const [refunds, setRefunds] = useState<Refund[]>([])
    const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // Stats
    const [totalRefunded, setTotalRefunded] = useState(0)

    // Pagination
    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const { user, loading: userLoading } = useUser()

    useEffect(() => {
        loadRefunds()
    }, [])

    useEffect(() => {
        filterRefunds()
    }, [searchQuery, refunds])

    const loadRefunds = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/refunds?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setRefunds(data.refunds || [])
                setFilteredRefunds(data.refunds || [])
                setTotalRefunded(data.totalRefunded || 0)
            }
        } catch (error) {
            console.error("Error loading refunds:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const filterRefunds = () => {
        if (!searchQuery.trim()) {
            setFilteredRefunds(refunds)
            return
        }

        const query = searchQuery.toLowerCase()
        const filtered = refunds.filter(refund =>
            refund.refundNumber.toLowerCase().includes(query) ||
            refund.sale.saleNumber.toLowerCase().includes(query) ||
            refund.reason.toLowerCase().includes(query)
        )
        setFilteredRefunds(filtered)
        setCurrentPage(1) // Reset to first page on search
    }

    const handleDateFilter = () => {
        loadRefunds()
    }

    const viewRefundDetail = async (refundId: string) => {
        try {
            const res = await fetch(`/api/refunds?refundId=${refundId}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedRefund(data)
                setIsDetailOpen(true)
            }
        } catch (error) {
            console.error("Error loading refund details:", error)
        }
    }

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredRefunds.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage)

    const handleApplyFilter = () => {
        loadRefunds()
    }

    if (userLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    const isCashier = user?.role === 'CASHIER'

    if (isCashier) {
        return (
            <div className="flex flex-col h-screen bg-background">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-muted/40 px-4">
                    <h1 className="text-lg font-semibold">Refund History</h1>
                    <div className="ml-auto">
                        <Button onClick={() => window.location.href = '/checkout'}>Back to POS</Button>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
                    {/* Simplified Filters for Cashier */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Search Refunds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search refund #, sale # or reason..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Refunds Table */}
                    <Card className="flex-1">
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Refund #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
                                        </TableRow>
                                    ) : currentItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No refunds found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        currentItems.map((refund) => (
                                            <TableRow key={refund.id}>
                                                <TableCell className="font-medium text-blue-600">{refund.refundNumber}</TableCell>
                                                <TableCell>{format(new Date(refund.createdAt), "dd MMM, HH:mm")}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">
                                                    - MUR {Number(refund.total).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost" onClick={() => viewRefundDetail(refund.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Refund Detail Dialog */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Refund Details: {selectedRefund?.refundNumber}</DialogTitle>
                        </DialogHeader>

                        {selectedRefund && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Original Sale:</span>
                                        <p className="font-semibold">{selectedRefund.sale?.saleNumber}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Refund Method:</span>
                                        <p className="font-semibold">{selectedRefund.paymentMethod}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-md border">
                                    <div className="mb-2">
                                        <p className="text-sm"><strong>Reason:</strong> {selectedRefund.reason}</p>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedRefund.items?.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product.name}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right font-medium">MUR {Number(item.total).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="flex justify-end pt-4 border-t">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total Refunded</p>
                                        <p className="text-2xl font-bold text-red-600">MUR {Number(selectedRefund.total).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-gray-50/50 w-full">
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="flex h-16 items-center border-b bg-white px-6 shadow-sm">
                        <SidebarTrigger className="mr-4" />
                        <h1 className="text-xl font-semibold text-gray-800">Refunds</h1>
                    </div>

                    <div className="p-6 max-w-7xl mx-auto space-y-6">

                        {/* Stats Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Refunds (Today)
                                    </CardTitle>
                                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{filteredRefunds.length}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Refunded Amount
                                    </CardTitle>
                                    <div className="h-4 w-4 text-muted-foreground font-bold">MUR</div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">MUR {totalRefunded.toFixed(2)}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex gap-2 items-center flex-1">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search refund #, sale # or reason..."
                                        className="pl-8"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-[150px]"
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-[150px]"
                                    />
                                </div>
                                <Button variant="outline" onClick={handleApplyFilter}>
                                    <Filter className="mr-2 h-4 w-4" />
                                    Apply Filter
                                </Button>
                            </div>
                        </div>

                        {/* Refunds Table */}
                        <div className="bg-white rounded-lg border shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Refund Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Sale Number</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Processed By</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                Loading refunds...
                                            </TableCell>
                                        </TableRow>
                                    ) : currentItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No refunds found within the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        currentItems.map((refund) => (
                                            <TableRow key={refund.id}>
                                                <TableCell className="font-medium text-blue-600">
                                                    {refund.refundNumber}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(refund.createdAt), "dd MMM yyyy, HH:mm")}
                                                </TableCell>
                                                <TableCell>{refund.sale?.saleNumber}</TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={refund.reason}>
                                                    {refund.reason}
                                                </TableCell>
                                                <TableCell>{refund.user?.name}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">
                                                    - MUR {Number(refund.total).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => viewRefundDetail(refund.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {filteredRefunds.length > itemsPerPage && (
                                <div className="py-4">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>

                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <PaginationItem key={i}>
                                                    <PaginationLink
                                                        isActive={currentPage === i + 1}
                                                        onClick={() => setCurrentPage(i + 1)}
                                                        className="cursor-pointer"
                                                    >
                                                        {i + 1}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}

                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Refund Detail Dialog */}
                    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Refund Details: {selectedRefund?.refundNumber}</DialogTitle>
                                <div className="hidden">
                                    <DialogDescription>
                                        Details for refund {selectedRefund?.refundNumber} processed on {selectedRefund ? format(new Date(selectedRefund.createdAt), "dd MMM yyyy") : ''}
                                    </DialogDescription>
                                </div>
                            </DialogHeader>

                            {selectedRefund && (
                                <div className="space-y-6">
                                    {/* Header Info */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Original Sale:</span>
                                            <p className="font-semibold">{selectedRefund.sale?.saleNumber}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Date Processed:</span>
                                            <p className="font-semibold">
                                                {format(new Date(selectedRefund.createdAt), "dd MMM yyyy, HH:mm")}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Processed By:</span>
                                            <p className="font-semibold">{selectedRefund.user?.name}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Refund Method:</span>
                                            <p className="font-semibold">{selectedRefund.paymentMethod}</p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h3 className="font-semibold mb-2">Refunded Items</h3>
                                        <div className="border rounded-md overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Product</TableHead>
                                                        <TableHead className="text-right">Qty</TableHead>
                                                        <TableHead className="text-right">Unit Price</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedRefund.items?.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>
                                                                <div className="font-medium">{item.product.name}</div>
                                                                <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">MUR {Number(item.unitPrice).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-medium">MUR {Number(item.total).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Reason & Notes */}
                                    <div className="bg-gray-50 p-3 rounded-md border">
                                        <div className="mb-2">
                                            <span className="text-xs text-muted-foreground uppercase font-bold">Reason</span>
                                            <p className="text-sm">{selectedRefund.reason}</p>
                                        </div>
                                        {selectedRefund.notes && (
                                            <div>
                                                <span className="text-xs text-muted-foreground uppercase font-bold">Notes</span>
                                                <p className="text-sm">{selectedRefund.notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-end pt-4 border-t">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Total Refunded</p>
                                            <p className="text-2xl font-bold text-red-600">MUR {Number(selectedRefund.total).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                </main>
            </div>
        </SidebarProvider>
    )
}
