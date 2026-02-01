import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFilesList = vi.fn()
const mockFilesGet = vi.fn()
const mockFilesExport = vi.fn()
const mockSetCredentials = vi.fn()

vi.mock('googleapis', () => {
  const OAuth2 = vi.fn(function (this: Record<string, unknown>) {
    this.setCredentials = mockSetCredentials
  })
  return {
    google: {
      auth: { OAuth2 },
      drive: vi.fn(() => ({
        files: {
          list: mockFilesList,
          get: mockFilesGet,
          export: mockFilesExport,
        },
      })),
    },
  }
})

import { getDriveClient, listFolder, readFile, searchFiles } from './drive'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GOOGLE_CLIENT_ID = 'test-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback'
})

describe('getDriveClient', () => {
  it('returns a Drive instance with refresh token set', () => {
    const drive = getDriveClient('refresh-token')
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'refresh-token' })
    expect(drive).toBeDefined()
    expect(drive.files).toBeDefined()
  })
})

const sampleFiles = [
  { id: '1', name: 'doc.txt', mimeType: 'text/plain', modifiedTime: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'sheet.csv', mimeType: 'text/csv', modifiedTime: '2026-01-02T00:00:00Z' },
]

describe('listFolder', () => {
  it('returns DriveFile[] for a given folder', async () => {
    mockFilesList.mockResolvedValue({ data: { files: sampleFiles } })
    const drive = getDriveClient('token')
    const result = await listFolder(drive, 'folder-id')
    expect(mockFilesList).toHaveBeenCalledWith({
      q: "'folder-id' in parents and trashed = false",
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 100,
    })
    expect(result).toEqual(sampleFiles)
  })

  it('returns empty array when no files', async () => {
    mockFilesList.mockResolvedValue({ data: { files: undefined } })
    const drive = getDriveClient('token')
    expect(await listFolder(drive, 'empty-folder')).toEqual([])
  })
})

describe('readFile', () => {
  it('exports Google Docs as plain text', async () => {
    mockFilesExport.mockResolvedValue({ data: 'doc content' })
    const drive = getDriveClient('token')
    const result = await readFile(drive, 'file-1', 'application/vnd.google-apps.document')
    expect(mockFilesExport).toHaveBeenCalledWith(
      { fileId: 'file-1', mimeType: 'text/plain' },
      { responseType: 'text' },
    )
    expect(result).toBe('doc content')
  })

  it('exports Google Sheets as CSV', async () => {
    mockFilesExport.mockResolvedValue({ data: 'a,b,c' })
    const drive = getDriveClient('token')
    const result = await readFile(drive, 'file-2', 'application/vnd.google-apps.spreadsheet')
    expect(mockFilesExport).toHaveBeenCalledWith(
      { fileId: 'file-2', mimeType: 'text/csv' },
      { responseType: 'text' },
    )
    expect(result).toBe('a,b,c')
  })

  it('downloads other files directly', async () => {
    mockFilesGet.mockResolvedValue({ data: 'raw content' })
    const drive = getDriveClient('token')
    const result = await readFile(drive, 'file-3', 'text/plain')
    expect(mockFilesGet).toHaveBeenCalledWith(
      { fileId: 'file-3', alt: 'media' },
      { responseType: 'text' },
    )
    expect(result).toBe('raw content')
  })
})

describe('searchFiles', () => {
  it('searches files with a custom query', async () => {
    mockFilesList.mockResolvedValue({ data: { files: sampleFiles } })
    const drive = getDriveClient('token')
    const result = await searchFiles(drive, "name contains 'report'")
    expect(mockFilesList).toHaveBeenCalledWith({
      q: "name contains 'report'",
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 100,
    })
    expect(result).toEqual(sampleFiles)
  })
})
