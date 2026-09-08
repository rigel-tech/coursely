import { HeaderClient } from './Component.client'
import { getHeaderData } from './service'
import React from 'react'

export async function Header() {
  const headerData = await getHeaderData()

  return <HeaderClient data={headerData!} />
}
