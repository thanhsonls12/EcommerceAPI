import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type {} from 'multer'
import { MESSAGE } from '../constants/message.constant'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import envConfig from '../config'

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(envConfig.SUPABASE_URL, envConfig.SUPABASE_SECRET_KEY)
  }

  async upload(file: Express.Multer.File, folder: string) {
    const extension = extensionByMimeType[file.mimetype]
    if (!extension) throw new BadRequestException(MESSAGE.STORAGE.UNSUPPORTED_FILE_TYPE)
    const filename = `${randomUUID()}${extension}`

    const key = `${folder}/${filename}`

    const { error } = await this.supabase.storage.from(envConfig.SUPABASE_STORAGE_BUCKET).upload(key, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    })

    if (error) {
      throw new InternalServerErrorException('Failed to upload file')
    }

    const { data } = this.supabase.storage.from(envConfig.SUPABASE_STORAGE_BUCKET).getPublicUrl(key)

    return {
      key,
      url: data.publicUrl,
    }
  }

  async remove(key: string) {
    const { error } = await this.supabase.storage.from(envConfig.SUPABASE_STORAGE_BUCKET).remove([key])
    if (error) throw new InternalServerErrorException('Failed to remove file')
  }
}
