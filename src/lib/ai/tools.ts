import { tool } from 'ai'
import { z } from 'zod'
import type { drive_v3 } from 'googleapis'

export function createDriveTools(drive: drive_v3.Drive) {
  return {
    list_drive_folder: tool({
      description:
        'List files in a Google Drive folder. Use when the user asks about files in a folder or provides a Drive URL.',
      inputSchema: z.object({
        folder_id: z
          .string()
          .describe('Google Drive folder ID (from URL or previous context)'),
      }),
      execute: async ({ folder_id }) => {
        const res = await drive.files.list({
          q: `'${folder_id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType, modifiedTime)',
        })
        return (res.data.files ?? []).map((f) => ({
          ...f,
          webViewLink: `https://drive.google.com/file/d/${f.id}/view`,
        }))
      },
    }),

    read_drive_file: tool({
      description:
        'Read the content of a specific file from Google Drive. Use when the user asks a question that requires reading a document.',
      inputSchema: z.object({
        file_id: z.string().describe('Google Drive file ID'),
        file_name: z.string().describe('File name (for display)'),
        mime_type: z.string().describe('MIME type of the file'),
      }),
      execute: async ({ file_id, file_name, mime_type }) => {
        const webViewLink = `https://drive.google.com/file/d/${file_id}/view`
        if (mime_type.startsWith('application/vnd.google-apps.')) {
          const res = await drive.files.export({
            fileId: file_id,
            mimeType: 'text/plain',
          })
          return { content: res.data, fileName: file_name, webViewLink }
        }
        const res = await drive.files.get(
          { fileId: file_id, alt: 'media' },
          { responseType: 'text' },
        )
        return { content: res.data, fileName: file_name, webViewLink }
      },
    }),

    search_drive: tool({
      description:
        "Search for files across Google Drive by name or content. Use when the user asks about a topic but hasn't specified a folder.",
      inputSchema: z.object({
        query: z
          .string()
          .describe('Search query (file name or content keywords)'),
      }),
      execute: async ({ query }) => {
        const res = await drive.files.list({
          q: `fullText contains '${query}' and trashed = false`,
          fields: 'files(id, name, mimeType, modifiedTime, parents)',
          pageSize: 10,
        })
        return (res.data.files ?? []).map((f) => ({
          ...f,
          webViewLink: `https://drive.google.com/file/d/${f.id}/view`,
        }))
      },
    }),
  }
}
