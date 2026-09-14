import type { Payload } from 'payload'

type PageIds = { homePageId?: string | number | null; aboutPageId?: string | number | null }

export async function seedHeader(payload: Payload, ids: PageIds = {}) {
  const existing = await payload.findGlobal({ slug: 'header' })
  if (existing?.navItems && existing.navItems.length >= 3) {
    return payload.logger.info('Header sẵn sàng.')
  }

  let { homePageId, aboutPageId } = ids
  if (!homePageId) {
    const r = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'home' } },
      limit: 1,
    })
    homePageId = r.docs[0]?.id
  }
  if (!aboutPageId) {
    const r = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'gioi-thieu' } },
      limit: 1,
    })
    aboutPageId = r.docs[0]?.id
  }

  const toId = (v: string | number) => (typeof v === 'string' ? Number(v) || v : v)
  const refLink = (id: string | number, label: string) => ({
    type: 'reference' as const,
    reference: { relationTo: 'pages' as const, value: toId(id) },
    label,
  })
  const customLink = (url: string, label: string) => ({ type: 'custom' as const, url, label })

  const navItems = [
    { link: homePageId ? refLink(homePageId, 'Trang chủ') : customLink('/', 'Trang chủ') },
    { link: customLink('/khoa-hoc', 'Khóa học') },
    {
      link: aboutPageId
        ? refLink(aboutPageId, 'Giới thiệu')
        : customLink('/gioi-thieu', 'Giới thiệu'),
    },
  ]

  await payload.updateGlobal({
    slug: 'header',
    context: { disableRevalidate: true },
    data: { navItems: navItems as never },
  })

  payload.logger.info('Đã cấu hình Header: Trang chủ · Khóa học · Giới thiệu')
}
