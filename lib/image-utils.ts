/**
 * Image processing utilities for WebP conversion and cropping
 */

export interface ImageProcessOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1, WebP quality
  cropMode?: 'cover' | 'contain' | 'exact' // cover = fill, contain = fit inside, exact = force dimensions
  format?: 'webp' | 'jpeg' | 'png'
}

const DEFAULT_OPTIONS: Required<ImageProcessOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.85,
  cropMode: 'cover',
  format: 'webp'
}

/**
 * Process and convert image to WebP with optional cropping
 * @param file - Original image file
 * @param options - Processing options
 * @returns Processed image as Blob
 */
export async function processImage(
  file: File,
  options: ImageProcessOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      try {
        // Clean up object URL
        URL.revokeObjectURL(objectUrl)

        // Calculate dimensions
        const dimensions = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight,
          opts.cropMode
        )

        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = dimensions.canvasWidth
        canvas.height = dimensions.canvasHeight
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Set high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw image with proper cropping/scaling
        ctx.drawImage(
          img,
          dimensions.sx,
          dimensions.sy,
          dimensions.sWidth,
          dimensions.sHeight,
          0,
          0,
          dimensions.canvasWidth,
          dimensions.canvasHeight
        )

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert canvas to blob'))
            }
          },
          `image/${opts.format}`,
          opts.quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

interface ImageDimensions {
  canvasWidth: number
  canvasHeight: number
  sx: number // source x
  sy: number // source y
  sWidth: number // source width
  sHeight: number // source height
}

/**
 * Calculate dimensions for cropping/resizing based on mode
 */
function calculateDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number,
  cropMode: 'cover' | 'contain' | 'exact'
): ImageDimensions {
  if (cropMode === 'exact') {
    // Force exact dimensions, may distort aspect ratio
    return {
      canvasWidth: maxWidth,
      canvasHeight: maxHeight,
      sx: 0,
      sy: 0,
      sWidth: imgWidth,
      sHeight: imgHeight
    }
  }

  const imgAspect = imgWidth / imgHeight
  const targetAspect = maxWidth / maxHeight

  if (cropMode === 'contain') {
    // Fit image inside bounds, maintain aspect ratio
    let canvasWidth = maxWidth
    let canvasHeight = maxHeight

    if (imgAspect > targetAspect) {
      // Image is wider
      canvasHeight = maxWidth / imgAspect
    } else {
      // Image is taller
      canvasWidth = maxHeight * imgAspect
    }

    return {
      canvasWidth: Math.round(canvasWidth),
      canvasHeight: Math.round(canvasHeight),
      sx: 0,
      sy: 0,
      sWidth: imgWidth,
      sHeight: imgHeight
    }
  }

  // Cover mode: fill entire canvas, crop excess
  let sx = 0
  let sy = 0
  let sWidth = imgWidth
  let sHeight = imgHeight

  if (imgAspect > targetAspect) {
    // Image is wider, crop left/right
    sWidth = imgHeight * targetAspect
    sx = (imgWidth - sWidth) / 2
  } else {
    // Image is taller, crop top/bottom
    sHeight = imgWidth / targetAspect
    sy = (imgHeight - sHeight) / 2
  }

  return {
    canvasWidth: maxWidth,
    canvasHeight: maxHeight,
    sx: Math.round(sx),
    sy: Math.round(sy),
    sWidth: Math.round(sWidth),
    sHeight: Math.round(sHeight)
  }
}

/**
 * Create a preview URL from a blob
 */
export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): string | null {
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return 'File must be an image'
  }

  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return `File size must be less than ${maxSizeMB}MB`
  }

  // Check file type (accept common formats)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF'
  }

  return null
}

/**
 * Generate a unique filename with WebP extension
 */
export function generateWebPFileName(prefix: string = 'img'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}/${timestamp}-${random}.webp`
}

/**
 * Calculate optimal dimensions for product images
 */
export function getProductImageDimensions(type: 'thumbnail' | 'detail' | 'gallery') {
  switch (type) {
    case 'thumbnail':
      return { maxWidth: 200, maxHeight: 200, quality: 0.80 }
    case 'detail':
      return { maxWidth: 800, maxHeight: 800, quality: 0.85 }
    case 'gallery':
      return { maxWidth: 1200, maxHeight: 1200, quality: 0.90 }
    default:
      return { maxWidth: 800, maxHeight: 800, quality: 0.85 }
  }
}
