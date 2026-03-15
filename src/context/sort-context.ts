import { createContext } from "react"

export type SortProp = string

export type SortOrder = "asc" | "desc"

export const SORT_ORDERS: SortOrder[] = ["desc", "asc"]

export interface SortContextType {
  sortProp: SortProp
  sortOrder: SortOrder
  setSortProp: (sortProp: SortProp) => void
  setSortOrder: (sortOrder: SortOrder) => void
}

export const SortContext = createContext<SortContextType | undefined>(undefined)
