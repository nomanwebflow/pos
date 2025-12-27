/**
 * Batch image processing utilities
 * For advanced use cases like generating multiple sizes, batch conversions, etc.
 */

import { processImage, type ImageProcessOptions } from './image-utils'

export interface ImageVariant {
  name: string
  options: ImageProcessOptions
}

export interface ProcessedImageSet {
  original: File
  variants: Map<string, Blob>
}

/**
 * Generate multiple image variants from a single upload
 * Useful for creating thumbnail, detail, and gallery versions
 */
export async function generateImageVariants(
  file: File,
  variants: ImageVariant[]
): Promise<ProcessedImageSet> {
  const processedVariants = new Map<string, Blob>()

  // Process all variants in parallel for speed
  const promises = variants.map(async (variant) => {
    const blob = await processImage(file, variant.options)
    processedVariants.set(variant.name, blob)
  })

  await Promise.all(promises)

  return {
    original: file,
    variants: processedVariants
  }
}

/**
 * Preset variant configurations for common use cases
 */
export const IMAGE_PRESETS = {
  // E-commerce product images
  ecommerce: [
    {
      name: 'thumbnail',
      options: { maxWidth: 200, maxHeight: 200, quality: 0.80, cropMode: 'cover' as const }
    },
    {
      name: 'detail',
      options: { maxWidth: 800, maxHeight: 800, quality: 0.85, cropMode: 'cover' as const }
    },
    {
      name: 'zoom',
      options: { maxWidth: 1600, maxHeight: 1600, quality: 0.90, cropMode: 'contain' as const }
    }
  ],

  // POS product images (optimized for speed)
  pos: [
    {
      name: 'thumbnail',
      options: { maxWidth: 150, maxHeight: 150, quality: 0.75, cropMode: 'cover' as const }
    },
    {
      name: 'display',
      options: { maxWidth: 600, maxHeight: 600, quality: 0.80, cropMode: 'cover' as const }
    }
  ],

  // Profile/avatar images
  avatar: [
    {
      name: 'small',
      options: { maxWidth: 64, maxHeight: 64, quality: 0.80, cropMode: 'cover' as const }
    },
    {
      name: 'medium',
      options: { maxWidth: 128, maxHeight: 128, quality: 0.85, cropMode: 'cover' as const }
    },
    {
      name: 'large',
      options: { maxWidth: 256, maxHeight: 256, quality: 0.85, cropMode: 'cover' as const }
    }
  ]
} as const

/**
 * Generate standard product image set (thumbnail + detail)
 * This is the most common use case for POS systems
 */
export async function generateProductImages(file: File): Promise<{
  thumbnail: Blob
  detail: Blob
}> {
  const [thumbnail, detail] = await Promise.all([
    processImage(file, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.80,
      cropMode: 'cover'
    }),
    processImage(file, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
      cropMode: 'cover'
    })
  ])

  return { thumbnail, detail }
}

/**
 * Batch process multiple images
 * Useful for bulk product imports
 */
export async function batchProcessImages(
  files: File[],
  options: ImageProcessOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<Blob[]> {
  const results: Blob[] = []
  let completed = 0

  // Process in chunks of 3 to avoid overwhelming the browser
  const chunkSize = 3
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(
      chunk.map(file => processImage(file, options))
    )

    results.push(...chunkResults)
    completed += chunk.length

    if (onProgress) {
      onProgress(completed, files.length)
    }
  }

  return results
}

/**
 * Convert a data URL to a File object
 * Useful when working with image editors or cropping libraries
 */
export function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

/**
 * Convert a blob to a data URL
 * Useful for preview functionality
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Calculate total size reduction from batch processing
 */
export function calculateSizeReduction(
  originalFiles: File[],
  processedBlobs: Blob[]
): {
  originalSize: number
  processedSize: number
  reduction: number
  reductionPercent: number
} {
  const originalSize = originalFiles.reduce((sum, file) => sum + file.size, 0)
  const processedSize = processedBlobs.reduce((sum, blob) => sum + blob.size, 0)
  const reduction = originalSize - processedSize
  const reductionPercent = (reduction / originalSize) * 100

  return {
    originalSize,
    processedSize,
    reduction,
    reductionPercent
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Example: Upload multiple product images with progress tracking
 */
export async function uploadProductImageSet(
  file: File,
  supabase: any,
  bucketName: string,
  pathPrefix: string,
  onProgress?: (stage: string, percent: number) => void
): Promise<{
  thumbnailUrl: string
  detailUrl: string
}> {
  // Stage 1: Generate variants (0-50%)
  onProgress?.('Processing images...', 0)

  const { thumbnail, detail } = await generateProductImages(file)

  onProgress?.('Processing images...', 50)

  // Stage 2: Upload thumbnail (50-75%)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)

  const thumbnailPath = `${pathPrefix}/thumbnails/${timestamp}-${random}.webp`
  const { error: thumbError } = await supabase.storage
    .from(bucketName)
    .upload(thumbnailPath, thumbnail, { contentType: 'image/webp' })

  if (thumbError) throw thumbError

  onProgress?.('Uploading...', 75)

  // Stage 3: Upload detail (75-100%)
  const detailPath = `${pathPrefix}/${timestamp}-${random}.webp`
  const { error: detailError } = await supabase.storage
    .from(bucketName)
    .upload(detailPath, detail, { contentType: 'image/webp' })

  if (detailError) throw detailError

  onProgress?.('Complete', 100)

  // Get public URLs
  const { data: { publicUrl: thumbnailUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(thumbnailPath)

  const { data: { publicUrl: detailUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(detailPath)

  return { thumbnailUrl, detailUrl }
}
