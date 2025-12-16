"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string | null) => void
    disabled?: boolean
    bucketName?: string
    pathPrefix?: string
}

export function ImageUpload({
    value,
    onChange,
    disabled,
    bucketName = "product-images",
    pathPrefix = "products"
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error("Invalid file type. Please upload an image.")
            return
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size too large. Max 2MB allowed.")
            return
        }

        setIsUploading(true)
        const supabase = createClient()

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

            const { data, error } = await supabase
                .storage
                .from(bucketName)
                .upload(fileName, file)

            if (error) throw error

            const { data: { publicUrl } } = supabase
                .storage
                .from(bucketName)
                .getPublicUrl(fileName)

            onChange(publicUrl)
            toast.success("Image uploaded successfully")
        } catch (error) {
            console.error('Upload error:', error)
            toast.error("Failed to upload image")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleRemove = () => {
        onChange(null)
    }

    return (
        <div className="flex flex-col gap-4">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={disabled || isUploading}
            />

            {value ? (
                <div className="relative w-40 h-40 border rounded-lg overflow-hidden group">
                    <Image
                        src={value}
                        alt="Product image"
                        fill
                        className="object-cover"
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
                    disabled={disabled || isUploading}
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                        {isUploading ? "Uploading..." : "Upload Image"}
                    </span>
                </Button>
            )}
        </div>
    )
}
