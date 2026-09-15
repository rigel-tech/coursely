import type { Payload } from 'payload'
import fs from 'fs'
import path from 'path'

const text = (t: string, format = 0) =>
  ({ mode: 'normal', text: t, type: 'text', style: '', detail: 0, format, version: 1 }) as const

const node = (type: string, children: unknown[], extra?: Record<string, unknown>) =>
  ({ type, format: '', indent: 0, version: 1, direction: 'ltr', children, ...extra }) as const

export const lexicalDoc = (children: unknown[]) => ({ root: node('root', children) })

export const heading = (t: string, tag: 'h1' | 'h2' | 'h3' | 'h4' = 'h2') =>
  node('heading', [text(t, 1)], { tag })

export const paragraph = (t: string) => node('paragraph', [text(t)])

export const list = (items: string[], listType: 'bullet' | 'number' = 'bullet') =>
  node(
    'list',
    items.map((t, i) => node('listitem', [text(t)], { value: i + 1 })),
    {
      listType,
      start: 1,
      tag: listType === 'bullet' ? 'ul' : 'ol',
    },
  )

export async function getOrCreateMedia(
  payload: Payload,
  relativePath: string,
  alt: string,
): Promise<number | undefined> {
  const filename = path.basename(relativePath)
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    return existing.docs[0].id
  }

  const filePath = path.resolve(process.cwd(), relativePath)
  if (fs.existsSync(filePath)) {
    try {
      const created = await payload.create({
        collection: 'media',
        filePath,
        data: { alt },
      })
      return created.id
    } catch {
      return undefined
    }
  }
  return undefined
}
