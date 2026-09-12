import { BadRequestException, Injectable } from '@nestjs/common'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {} from 'multer'

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
@Injectable()
export class StorageService {
  private readonly uploadDir = join(process.cwd(), 'uploads')

  async upload(file: Express.Multer.File, folder: string) {
    const directory = join(this.uploadDir, folder)

    await mkdir(directory, {
      recursive: true,
    })

    const extension = extensionByMimeType[file.mimetype]
    if (!extension) throw new BadRequestException('Unsupported file type')
    const filename = `${randomUUID()}${extension}`
    const filePath = join(directory, filename)

    await writeFile(filePath, file.buffer)

    return {
      key: `${folder}/${filename}`,
      url: `/uploads/${folder}/${filename}`,
    }
  }
}
