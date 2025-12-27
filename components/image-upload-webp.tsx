"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import {
    processImage,
    validateImageFile,
    generateWebPFileName,
    getProductImageDimensions,
    type ImageProcessOptions
} from "@/lib/image-utils"

interface ImageUploadWebPProps {
    value?: string | null
    onChange: (url: string | null) => void
    disabled?: boolean
    bucketName?: string
    pathPrefix?: string
    imageType?: 'thumbnail' | 'detail' | 'gallery'
    cropMode?: 'cover' | 'contain' | 'exact'
    showPreview?: boolean
}

export function ImageUploadWebP({
    value,
    onChange,
    disabled,
    bucketName = "product-images",
    pathPrefix = "products",
    imageType = "detail",
    cropMode = "cover",
    showPreview = true
}: ImageUploadWebPProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file
        const validationError = validateImageFile(file, 10) // 10MB max before processing
        if (validationError) {
            toast.error(validationError)
            return
        }

        setIsProcessing(true)
        setProgress("Processing image...")

        try {
            // Get optimal dimensions for image type
            const dimensions = getProductImageDimensions(imageType)

            // Process image: convert to WebP and crop/resize
            const processOptions: ImageProcessOptions = {
                ...dimensions,
                cropMode,
                format: 'webp'
            }

            const processedBlob = await processImage(file, processOptions)

            // Show preview if enabled
            if (showPreview) {
                const originalSize = (file.size / 1024).toFixed(1)
                const newSize = (processedBlob.size / 1024).toFixed(1)
                const savings = (((file.size - processedBlob.size) / file.size) * 100).toFixed(0)
                console.log(`Image processed: ${originalSize}KB → ${newSize}KB (${savings}% reduction)`)
            }

            // Validate processed image size (should be under 2MB after WebP conversion)
            if (processedBlob.size > 2 * 1024 * 1024) {
                toast.error("Processed image is still too large. Try a smaller image.")
                return
            }

            setIsProcessing(false)
            setIsUploading(true)
            setProgress("Uploading to storage...")

            const supabase = createClient()

            // Generate WebP filename
            const fileName = generateWebPFileName(pathPrefix)

            // Upload the processed blob
            const { data, error } = await supabase
                .storage
                .from(bucketName)
                .upload(fileName, processedBlob, {
                    contentType: 'image/webp',
                    cacheControl: '3600',
                    upsert: false
                })

            if (error) throw error

            // Get public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from(bucketName)
                .getPublicUrl(fileName)

            onChange(publicUrl)

            const originalSize = (file.size / 1024).toFixed(1)
            const newSize = (processedBlob.size / 1024).toFixed(1)
            toast.success(`Image uploaded (${originalSize}KB → ${newSize}KB WebP)`)
        } catch (error) {
            console.error('Upload error:', error)
            toast.error("Failed to process or upload image")
        } finally {
            setIsUploading(false)
            setIsProcessing(false)
            setProgress("")
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleRemove = async () => {
        if (!value) return

        // Optionally delete from storage
        // Extract filename from URL and delete
        // For now, just clear the value
        onChange(null)
        toast.success("Image removed")
    }

    const isLoading = isUploading || isProcessing

    return (
        <div className="flex flex-col gap-4">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleUpload}
                disabled={disabled || isLoading}
            />

            {value ? (
                <div className="relative w-40 h-40 border rounded-lg overflow-hidden group">
                    <Image
                        src={value}
                        alt="Product image"
                        fill
                        className="object-cover"
                        unoptimized // Supabase URLs don't work with Next.js image optimization
                    />
                    <div className="absolute top-2 right-2">
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleRemove}
                            disabled={disabled}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    className="w-40 h-40 flex flex-col items-center justify-center gap-2 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground text-center">
                                {progress}
                            </span>
                        </>
                    ) : (
                        <>
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Upload Image
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Auto WebP
                            </span>
                        </>
                    )}
                </Button>
            )}

            {imageType && !value && (
                <div className="text-xs text-muted-foreground">
                    {imageType === 'thumbnail' && 'Max 200×200px • WebP'}
                    {imageType === 'detail' && 'Max 800×800px • WebP'}
                    {imageType === 'gallery' && 'Max 1200×1200px • WebP'}
                </div>
            )}
        </div>
    )
}
