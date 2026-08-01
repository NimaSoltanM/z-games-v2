import { mkdir, rename } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = fileURLToPath(new URL("../", import.meta.url))
const outputDir = join(root, "public", "brand")
const catalogOutputDir = join(root, "public", "catalog")
const logoInput = join(root, "image-sources", "logo.png")
const socialInput = join(root, "image-sources", "og-default.jpg")
const gtaCoverInput = join(root, "image-sources", "gta.webp")

await Promise.all([
  mkdir(outputDir, { recursive: true }),
  mkdir(catalogOutputDir, { recursive: true }),
])

async function writeAtomically(outputPath, build) {
  const temporaryPath = `${outputPath}.tmp`
  await build(temporaryPath)
  await rename(temporaryPath, outputPath)
}

async function buildLogo(size) {
  const outputPath = join(outputDir, `logo-${size}.webp`)
  await writeAtomically(outputPath, (temporaryPath) =>
    sharp(logoInput)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 88, effort: 6, alphaQuality: 100 })
      .toFile(temporaryPath)
  )
}

async function buildAppIcon(size) {
  const outputPath = join(outputDir, `icon-${size}.png`)
  await writeAtomically(outputPath, (temporaryPath) =>
    sharp(logoInput)
      .resize(size, size, {
        fit: "contain",
        background: { r: 23, g: 23, b: 23, alpha: 1 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(temporaryPath)
  )
}

async function buildFavicon() {
  const outputPath = join(outputDir, "favicon-32.png")
  await writeAtomically(outputPath, (temporaryPath) =>
    sharp(logoInput)
      .resize(32, 32, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(temporaryPath)
  )
}

await Promise.all([
  buildFavicon(),
  buildLogo(32),
  buildLogo(64),
  buildAppIcon(192),
  buildAppIcon(512),
  writeAtomically(join(outputDir, "og-default.jpg"), (temporaryPath) =>
    sharp(socialInput)
      .resize(1200, 630, { fit: "cover", withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(temporaryPath)
  ),
  writeAtomically(join(catalogOutputDir, "gta-card.webp"), (temporaryPath) =>
    sharp(gtaCoverInput)
      .resize(360, 480, { fit: "cover", position: "centre" })
      .webp({ quality: 80, effort: 6 })
      .toFile(temporaryPath)
  ),
])

console.log("Optimized static images in public/brand and public/catalog")
