"use client"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OptimizedDatasetViewerProps {
  data: any[]
  validationResults?: any[]
  tableName: string
  onRowClick?: (rowIndex: number) => void
}

export function OptimizedDatasetViewer({
  data,
  validationResults,
  tableName,
  onRowClick,
}: OptimizedDatasetViewerProps) {
  const [displayData, setDisplayData] = useState<any[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState<Record<string, boolean>>({})
  const tableRef = useRef<HTMLTableElement>(null)

  // Get all column names from the first row of data
  const columns = data && data.length > 0 ? Object.keys(data[0] || {}) : []

  // Calculate optimal column widths based on content - only when data changes
  useEffect(() => {
    if (!data || data.length === 0) return

    const calculateColumnWidth = (column: string) => {
      // Start with the column name length (minimum width)
      let maxWidth = column.length * 10

      // Check each row's value length
      data.forEach((row) => {
        if (!row) return
        const value = row[column]
        const valueStr = value !== null && value !== undefined ? String(value) : ""
        const valueWidth = valueStr.length * 8 // Approximate width based on character count
        maxWidth = Math.max(maxWidth, valueWidth)
      })

      // Add padding and cap maximum width
      return Math.min(Math.max(maxWidth + 24, 100), 300)
    }

    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column] = calculateColumnWidth(column)
    })

    setColumnWidths(widths)
  }, [data, columns])

  // Apply sorting and filtering to data
  useEffect(() => {
    if (!data) {
      setDisplayData([])
      return
    }

    let result = [...data]

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key].toLowerCase()
      if (filterValue) {
        result = result.filter((item) => {
          if (!item) return false
          const value = item[key]
          return value !== null && value !== undefined && String(value).toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (!a || !b) return 0

        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return sortConfig.direction === "asc" ? -1 : 1
        if (bValue === null || bValue === undefined) return sortConfig.direction === "asc" ? 1 : -1

        // Compare based on type
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
        }

        // Default string comparison
        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()
        return sortConfig.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
      })
    }

    setDisplayData(result)
  }, [data, sortConfig, filters])

  const handleSort = (column: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc"
    } else if (sortConfig && sortConfig.key === column && sortConfig.direction === "desc") {
      // Clear sort if clicking the same column that's already sorted desc
      setSortConfig(null)
      return
    }

    setSortConfig({ key: column, direction })
  }

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }))
  }

  const toggleFilter = (column: string) => {
    setShowFilters((prev) => ({
      ...prev,
      [column]: !prev[column],
    }))
  }

  const clearFilter = (column: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      delete newFilters[column]
      return newFilters
    })
    setShowFilters((prev) => ({
      ...prev,
      [column]: false,
    }))
  }

  // Function to check if a cell has validation errors
  const getCellValidationResults = (rowIndex: number, column: string) => {
    if (!validationResults) return []

    return validationResults.filter((result) => result.rowIndex === rowIndex && result.column === column)
  }

  // Function to check if a row has any validation errors
  const getRowValidationResults = (rowIndex: number) => {
    if (!validationResults) return []

    return validationResults.filter((result) => result.rowIndex === rowIndex)
  }

  return (
    <div className="rounded-md border overflow-auto">
      <div className="max-h-[600px] overflow-auto">
        <Table ref={tableRef}>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column}
                  style={{
                    width: `${columnWidths[column]}px`,
                    minWidth: `${columnWidths[column]}px`,
                  }}
                  className="relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort(column)}>
                      {column}
                      {sortConfig?.key === column &&
                        (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                    <div className="flex items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFilter(column)
                              }}
                              className={`p-1 rounded-sm ${filters[column] ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                            >
                              <Filter size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filter {column}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {showFilters[column] && (
                    <div className="absolute top-full left-0 right-0 bg-white p-2 shadow-md z-20 flex gap-1">
                      <Input
                        placeholder={`Filter ${column}...`}
                        value={filters[column] || ""}
                        onChange={(e) => handleFilterChange(column, e.target.value)}
                        className="h-8 text-sm"
                      />
                      {filters[column] && (
                        <button onClick={() => clearFilter(column)} className="p-1 hover:bg-gray-100 rounded-sm">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData && displayData.length > 0 ? (
              displayData.map((row, rowIndex) => {
                if (!row) return null

                const rowResults = getRowValidationResults(rowIndex)
                const hasRowErrors = rowResults.length > 0

                return (
                  <TableRow
                    key={rowIndex}
                    className={`
                      ${hasRowErrors ? "bg-red-50/30" : ""}
                      ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                    `}
                    onClick={() => onRowClick && onRowClick(rowIndex)}
                  >
                    {columns.map((column) => {
                      const cellResults = getCellValidationResults(rowIndex, column)
                      const hasErrors = cellResults.length > 0

                      return (
                        <TableCell key={`${rowIndex}-${column}`} className={hasErrors ? "relative bg-red-50" : ""}>
                          <div className="flex items-center gap-2">
                            <span>{row[column] !== null && row[column] !== undefined ? String(row[column]) : ""}</span>
                            {hasErrors && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="ml-1">
                                      {cellResults.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-xs">
                                      {cellResults.map((result, i) => (
                                        <p key={i} className="text-sm">
                                          {result.ruleName}: {result.message}
                                        </p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-4">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
