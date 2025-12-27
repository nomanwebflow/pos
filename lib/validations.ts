import { z } from 'zod';

export const SaleItemSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
    subtotal: z.number().min(0),
    taxAmount: z.number().min(0).optional(),
    total: z.number().min(0).optional(), // Calculated if missing but good to validate if sent
});

export const SaleSchema = z.object({
    total: z.number().min(0),
    subtotal: z.number().min(0),
    taxAmount: z.number().min(0),
    discount: z.number().min(0).optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'MIXED']),
    cardAmount: z.number().min(0).optional().nullable(),
    cashReceived: z.number().min(0).optional().nullable(),
    cashChange: z.number().min(0).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    items: z.array(SaleItemSchema).min(1),
});

export const CustomerSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable().or(z.literal('')),
    address: z.string().max(500).optional().nullable(),
    taxNumber: z.string().max(50).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    isActive: z.boolean().optional().or(z.number().min(0).max(1)), // Handle legacy number handling
});

export const RefundItemSchema = z.object({
    saleItemId: z.string().uuid(),
    productId: z.string().uuid(),
    quantityToRefund: z.number().int().positive(),
    unitPrice: z.number().min(0),
    subtotal: z.number().min(0),
    taxAmount: z.number().min(0),
    total: z.number().min(0),
});

export const RefundCreateItemSchema = z.object({
    saleItemId: z.string().uuid(),
    quantityToRefund: z.number().int().positive(),
});

export const RefundSchema = z.object({
    saleId: z.string().uuid(),
    items: z.array(RefundItemSchema).min(1),
    reason: z.string().min(10).max(500),
    refundType: z.enum(['FULL', 'PARTIAL']),
    paymentMethod: z.enum(['CASH', 'CARD', 'MIXED']),
    notes: z.string().max(500).optional().nullable(),
    stockAction: z.enum(['RESTOCK', 'DISCARD']).optional(), // For UI logic
});

export const RefundCreateSchema = z.object({
    saleId: z.string().uuid(),
    items: z.array(RefundCreateItemSchema).min(1),
    reason: z.string().min(10).max(500),
    paymentMethod: z.enum(['CASH', 'CARD', 'MIXED']),
    notes: z.string().max(500).optional().nullable(),
});
