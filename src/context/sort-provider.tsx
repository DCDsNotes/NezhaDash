import { ReactNode, useState } from "react"

import { SortContext, SortOrder, SortProp } from "./sort-context"

export function SortProvider({ children }: { children: ReactNode }) {
  const [sortProp, setSortProp] = useState<SortProp>("DisplayIndex")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  return <SortContext.Provider value={{ sortProp, setSortProp, sortOrder, setSortOrder }}>{children}</SortContext.Provider>
}
