import { google, type drive_v3 } from 'googleapis'
import type { DriveFile } from '@/lib/types'
import { createOAuth2Client } from './auth'

export function getDriveClient(refreshToken: string): drive_v3.Drive {
  const auth = createOAuth2Client()
  auth.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: 'v3', auth })
}

export async function listFolder(
  drive: drive_v3.Drive,
  folderId: string,
): Promise<DriveFile[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime)',
    pageSize: 100,
  })
  return mapFiles(res.data.files)
}

export async function readFile(
  drive: drive_v3.Drive,
  fileId: string,
  mimeType: string,
): Promise<string> {
  if (mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' })
    return res.data as string
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const res = await drive.files.export({ fileId, mimeType: 'text/csv' }, { responseType: 'text' })
    return res.data as string
  }
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
  return res.data as string
}

export async function searchFiles(
  drive: drive_v3.Drive,
  query: string,
): Promise<DriveFile[]> {
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime)',
    pageSize: 100,
  })
  return mapFiles(res.data.files)
}

function mapFiles(files: drive_v3.Schema$File[] | undefined): DriveFile[] {
  if (!files) return []
  return files.map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime!,
  }))
}
