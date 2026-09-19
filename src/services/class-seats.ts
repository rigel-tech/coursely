import type { PayloadRequest } from 'payload'

export const lockClassSeats = async ({
  classId,
  req,
}: {
  classId: number
  req: PayloadRequest
}): Promise<void> => {
  if (!req.transactionID) return

  await req.payload.update({
    collection: 'classes',
    id: classId,
    data: {
      updatedAt: new Date().toISOString(),
    },
    req,
  })
}

export const countClassOccupancy = async ({
  classId,
  req,
}: {
  classId: number
  req: PayloadRequest
}): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: 'enrollments',
    where: {
      and: [{ class: { equals: classId } }, { enrollmentStatus: { not_equals: 'CANCELLED' } }],
    },
    overrideAccess: true,
    req,
  })

  return totalDocs
}
