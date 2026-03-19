import sharp from "sharp";
import { logger } from "@/server/lib/logger";

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<Buffer> {
  const { width, height, quality = 85, format = "jpeg" } = options;

  let pipeline = sharp(inputBuffer);

  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: "cover",
      withoutEnlargement: true,
    });
  }

  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality });
      break;
    case "png":
      pipeline = pipeline.png({ quality });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
  }

  const result = await pipeline.toBuffer();

  logger.debug("Image processed", {
    inputSize: inputBuffer.length,
    outputSize: result.length,
    format,
  });

  return result;
}

// Platform-specific image sizes
export const PLATFORM_IMAGE_SIZES = {
  linkedin: { post: { width: 1200, height: 627 }, profile: { width: 400, height: 400 } },
  x: { post: { width: 1200, height: 675 }, profile: { width: 400, height: 400 } },
  instagram: {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 },
    landscape: { width: 1080, height: 608 },
    story: { width: 1080, height: 1920 },
  },
  tiktok: { video: { width: 1080, height: 1920 } },
  youtube: { thumbnail: { width: 1280, height: 720 } },
} as const;
