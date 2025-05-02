"use client"

import { useState, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Filter, X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Pencil, Save, Trash, Shield, ShieldAlert } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RuleForm } from "@/components/rule-form"
import type { DataRecord, DataQualityRule, ValueList } from "@/lib/types"

interface DatasetViewerProps {
  data: any[]
  validationResults?: any[]
  tableName: string
  onDataChange?: (newData: DataRecord[]) => void
  onAddRule?: (rule: DataQualityRule) => void
  valueLists?: ValueList[]
  datasets?: Record<string, DataRecord[]>
}

export function DatasetViewer({
  data,
  validationResults,
  tableName,
  onDataChange,
  onAddRule,
  valueLists = [],
  datasets = {},
}: DatasetViewerProps) {
  const [displayData, setDisplayData] = useState<any[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState<Record<string, boolean>>({})
  const tableRef = useRef<HTMLTableElement>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editedData, setEditedData] = useState<DataRecord | null>(null)
  const [createRuleDialogOpen, setCreateRuleDialogOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const rowsPerPage = 10

  // Get all column names from the first row of data
  const columns = data.length > 0 ? Object.keys(data[0]) : []

  // Calculate optimal column widths based on content
  useEffect(() => {
    if (data.length === 0) return

    const calculateColumnWidth = (column: string) => {
      // Start with the column name length (minimum width)
      let maxWidth = column.length * 10

      // Check each row's value length
      data.forEach((row) => {
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
    let result = [...data]

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key].toLowerCase()
      if (filterValue) {
        result = result.filter((item) => {
          const value = item[key]
          return value !== null && value !== undefined && String(value).toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    if (sortConfig !== null) {
      result.sort((a, b) => {
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

  const filteredData = data.filter((row) =>
    Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const handleEditClick = (rowIndex: number) => {
    setEditingRow(rowIndex)
    setEditedData({ ...filteredData[rowIndex] })
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
    setEditedData(null)
  }

  const handleSaveEdit = () => {
    if (editingRow !== null && editedData) {
      const newData = [...data]
      const actualIndex = data.findIndex((item) => item.id === filteredData[editingRow].id)

      if (actualIndex !== -1) {
        newData[actualIndex] = editedData
        if (onDataChange) {
          onDataChange(newData)
        }
      }

      setEditingRow(null)
      setEditedData(null)
    }
  }

  const handleInputChange = (column: string, value: any) => {
    if (editedData) {
      setEditedData({
        ...editedData,
        [column]: value,
      })
    }
  }

  const handleAddRow = () => {
    const newId = Math.max(...data.map((item) => item.id), 0) + 1

    // Create a new row with default values based on the first row's structure
    const newRow: DataRecord = { id: newId }

    if (data.length > 0) {
      const template = data[0]
      Object.keys(template).forEach((key) => {
        if (key === "id") return

        const value = template[key]
        if (typeof value === "boolean") {
          newRow[key] = false
        } else if (typeof value === "number") {
          newRow[key] = 0
        } else if (value instanceof Date) {
          newRow[key] = new Date()
        } else if (Array.isArray(value)) {
          newRow[key] = []
        } else if (typeof value === "object" && value !== null) {
          newRow[key] = {}
        } else {
          newRow[key] = ""
        }
      })
    }

    const newData = [...data, newRow]
    if (onDataChange) {
      onDataChange(newData)
    }
  }

  const handleDeleteRow = (rowIndex: number) => {
    const actualIndex = data.findIndex((item) => item.id === filteredData[rowIndex].id)

    if (actualIndex !== -1) {
      const newData = [...data]
      newData.splice(actualIndex, 1)
      if (onDataChange) {
        onDataChange(newData)
      }
    }
  }

  const handleCreateRule = (column: string, rowIndex: number) => {
    setSelectedColumn(column)
    setSelectedRowIndex(rowIndex)
    setCreateRuleDialogOpen(true)
  }

  const handleRuleSubmit = (rule: DataQualityRule) => {
    if (onAddRule) {
      onAddRule(rule)
      setCreateRuleDialogOpen(false)
    }
  }

  // Add a function to determine the validation status of a cell
  const getCellValidationStatus = (rowIndex: number, column: string) => {
    if (!validationResults) return null
    // Filter validation results for this specific cell
    const cellResults = validationResults.filter(
      (result) => result.table === tableName && result.rowIndex === rowIndex && result.column === column,
    )

    // If no results, return null (no highlighting)
    if (cellResults.length === 0) return null

    // Check for failures first (highest priority)
    if (cellResults.some((result) => result.severity === "failure")) {
      return "failure"
    }

    // Then check for warnings
    if (cellResults.some((result) => result.severity === "warning")) {
      return "warning"
    }

    // If no failures or warnings, but we have results, they must be successes
    return "success"
  }

  // Add a function to get the appropriate CSS class based on validation status
  const getCellHighlightClass = (rowIndex: number, column: string) => {
    const status = getCellValidationStatus(rowIndex, column)

    switch (status) {
      case "failure":
        return "bg-red-100 dark:bg-red-900/20"
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900/20"
      case "success":
        return "" // No highlighting for success
      default:
        return "" // No highlighting if no validation results
    }
  }

  // Add this function to get validation messages for a cell
  const getCellValidationMessages = (rowIndex: number, column: string) => {
    if (!validationResults) return null
    // Filter validation results for this specific cell
    const cellResults = validationResults.filter(
      (result) => result.table === tableName && result.rowIndex === rowIndex && result.column === column,
    )

    if (cellResults.length === 0) return null

    // Group by severity
    const failures = cellResults.filter((r) => r.severity === "failure")
    const warnings = cellResults.filter((r) => r.severity === "warning")

    return {
      failures,
      warnings,
      count: cellResults.length,
    }
  }

  // Update the renderEditableCell function to handle the case when editing
  const renderEditableCell = (column: string, value: any, rowIndex: number) => {
    // Get the highlight class for this cell
    const highlightClass = getCellHighlightClass(rowIndex, column)
    const validationMessages = getCellValidationMessages(rowIndex, column)

    if (editingRow !== rowIndex) {
      // If there are validation messages, wrap in tooltip
      if (validationMessages && (validationMessages.failures.length > 0 || validationMessages.warnings.length > 0)) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <div className={`flex items-center justify-between group ${highlightClass} rounded p-1 w-full`}>
                  <span className="mr-2">{formatCellValue(value)}</span>
                  {onAddRule && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCreateRule(column, rowIndex)}
                      title={`Create rule for ${column}`}
                    >
                      <ShieldAlert className="h-4 w-4 text-blue-500" />
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-[300px] z-50">
                <div className="space-y-2">
                  <p className="font-semibold">Validation Issues ({validationMessages.count})</p>
                  {validationMessages.failures.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-red-500 font-medium">Failures:</p>
                      <ul className="list-disc pl-4 text-sm">
                        {validationMessages.failures.map((failure, i) => (
                          <li key={i}>{failure.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationMessages.warnings.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-amber-500 font-medium">Warnings:</p>
                      <ul className="list-disc pl-4 text-sm">
                        {validationMessages.warnings.map((warning, i) => (
                          <li key={i}>{warning.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      return (
        <div className={`flex items-center justify-between group ${highlightClass} rounded p-1`}>
          <span className="mr-2">{formatCellValue(value)}</span>
          {onAddRule && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleCreateRule(column, rowIndex)}
              title={`Create rule for ${column}`}
            >
              <ShieldAlert className="h-4 w-4 text-blue-500" />
            </Button>
          )}
        </div>
      )
    }

    // Rest of the function for editing mode remains the same...
    if (editedData === null) return formatCellValue(value)

    // Render different input types based on the data type
    if (typeof value === "boolean") {
      return <Checkbox checked={editedData[column]} onCheckedChange={(checked) => handleInputChange(column, checked)} />
    } else if (typeof value === "number") {
      return (
        <Input
          type="number"
          value={editedData[column]}
          onChange={(e) => handleInputChange(column, Number(e.target.value))}
          className={`w-full h-8 ${highlightClass}`}
        />
      )
    } else if (value instanceof Date) {
      return (
        <Input
          type="date"
          value={value ? new Date(editedData[column]).toISOString().split("T")[0] : ""}
          onChange={(e) => handleInputChange(column, new Date(e.target.value))}
          className={`w-full h-8 ${highlightClass}`}
        />
      )
    } else if (column === "status" && tableName === "users") {
      return (
        <Select value={editedData[column]} onValueChange={(value) => handleInputChange(column, value)}>
          <SelectTrigger className={`h-8 ${highlightClass}`}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="inactive">inactive</SelectItem>
          </SelectContent>
        </Select>
      )
    } else if (column === "status" && tableName === "transactions") {
      return (
        <Select value={editedData[column]} onValueChange={(value) => handleInputChange(column, value)}>
          <SelectTrigger className={`h-8 ${highlightClass}`}>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completed">completed</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="disputed">disputed</SelectItem>
          </SelectContent>
        </Select>
      )
    } else if (column === "transactionType" && tableName === "transactions") {
      return (
        <Select value={editedData[column]} onValueChange={(value) => handleInputChange(column, value)}>
          <SelectTrigger className={`h-8 ${highlightClass}`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="purchase">purchase</SelectItem>
            <SelectItem value="refund">refund</SelectItem>
            <SelectItem value="subscription">subscription</SelectItem>
            <SelectItem value="cancellation">cancellation</SelectItem>
          </SelectContent>
        </Select>
      )
    } else if (column === "paymentMethod" && tableName === "transactions") {
      return (
        <Select value={editedData[column]} onValueChange={(value) => handleInputChange(column, value)}>
          <SelectTrigger className={`h-8 ${highlightClass}`}>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credit_card">credit_card</SelectItem>
            <SelectItem value="paypal">paypal</SelectItem>
            <SelectItem value="bank_transfer">bank_transfer</SelectItem>
            <SelectItem value="crypto">crypto</SelectItem>
          </SelectContent>
        </Select>
      )
    } else {
      return (
        <Input
          type="text"
          value={editedData[column] || ""}
          onChange={(e) => handleInputChange(column, e.target.value)}
          className={`w-full h-8 ${highlightClass}`}
        />
      )
    }
  }

  // Function to create an initial rule based on the selected column and value
  const createInitialRule = (): DataQualityRule | undefined => {
    if (!selectedColumn) return undefined

    // Create a rule ID
    const ruleId = crypto.randomUUID()

    // Get a sample value if we have a selected row, otherwise use a default approach
    let value = undefined
    if (selectedRowIndex !== null) {
      value = filteredData[selectedRowIndex][selectedColumn]
    } else if (data.length > 0) {
      // If no specific row is selected, use the first non-null value from the column as a sample
      for (const row of data) {
        if (row[selectedColumn] !== null && row[selectedColumn] !== undefined) {
          value = row[selectedColumn]
          break
        }
      }
    }

    const valueType = typeof value

    // Determine the best rule type based on the column and value
    let ruleType = "required" as const
    let parameters: Record<string, any> = {}
    let ruleName = `${selectedColumn} Validation`

    if (value !== undefined) {
      if (valueType === "number") {
        ruleType = "range"
        // For numeric values, create a range rule with some buffer
        const buffer = Math.abs(value) * 0.1 // 10% buffer
        parameters = {
          min: value - buffer,
          max: value + buffer,
        }
        ruleName = `${selectedColumn} Range Check`
      } else if (valueType === "string") {
        if (value === "") {
          ruleType = "required"
          ruleName = `${selectedColumn} Required`
        } else if (selectedColumn.toLowerCase().includes("email")) {
          ruleType = "regex"
          parameters = {
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          }
          ruleName = `${selectedColumn} Email Format`
        } else {
          ruleType = "enum"
          parameters = {
            allowedValues: [value],
          }
          ruleName = `${selectedColumn} Allowed Values`
        }
      } else if (valueType === "boolean") {
        ruleType = "enum"
        parameters = {
          allowedValues: [true, false],
        }
        ruleName = `${selectedColumn} Boolean Check`
      } else if (value instanceof Date) {
        ruleType = "custom"
        parameters = {
          functionBody: "return value instanceof Date && !isNaN(value.getTime());",
        }
        ruleName = `${selectedColumn} Valid Date`
      }
    } else {
      // Default to required rule if we don't have a sample value
      ruleType = "required"
      ruleName = `${selectedColumn} Required`
    }

    return {
      id: ruleId,
      name: ruleName,
      table: tableName,
      column: selectedColumn,
      ruleType,
      parameters,
      description: `Validates the ${selectedColumn} field`,
      severity: "failure",
    }
  }

  // Add a function to check if there are any validation issues
  const hasValidationIssues = () => {
    if (!validationResults) return false
    return validationResults.some(
      (result) => result.table === tableName && (result.severity === "failure" || result.severity === "warning"),
    )
  }

  // Then in the return statement, add the legend above the table
  return (
    <div className="space-y-4">
      <TooltipProvider>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Dataset ({data.length} records)</h2>
          <div className="flex gap-4">
            <div className="w-64">
              <Input placeholder="Search data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {onDataChange && (
              <Button onClick={handleAddRow} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Row
              </Button>
            )}
          </div>
        </div>

        {/* Add validation legend if there are issues */}
        {hasValidationIssues() && (
          <div className="flex items-center gap-4 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
            <span className="font-medium">Data Validation:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-900/20 rounded"></div>
              <span>Failure</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/20 rounded"></div>
              <span>Warning</span>
            </div>
            <span className="text-xs text-gray-500">(Hover over highlighted cells to see validation messages)</span>
          </div>
        )}

        <div className="rounded-md border">
          <div className="max-h-[600px] overflow-auto">
            <Table ref={tableRef}>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  {onDataChange && <TableHead className="w-[100px]">Actions</TableHead>}
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      style={{ width: `${columnWidths[column]}px`, minWidth: `${columnWidths[column]}px` }}
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
                          {onAddRule && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setSelectedColumn(column)
                                setSelectedRowIndex(null)
                                setCreateRuleDialogOpen(true)
                              }}
                              title={`Create rule for ${column}`}
                            >
                              <Shield className="h-3 w-3 text-blue-500" />
                            </Button>
                          )}
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
                {displayData.length > 0 ? (
                  displayData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {onDataChange && (
                        <TableCell>
                          {editingRow === rowIndex ? (
                            <div className="flex space-x-1">
                              <Button variant="outline" size="icon" onClick={handleSaveEdit} title="Save">
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={handleCancelEdit} title="Cancel">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditClick(rowIndex)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteRow(rowIndex)}
                                title="Delete"
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const cellResults = getCellValidationResults(rowIndex, column)
                        const hasErrors = cellResults.length > 0

                        return (
                          <TableCell key={`${rowIndex}-${column}`} className={hasErrors ? "relative bg-red-50" : ""}>
                            {onDataChange ? (
                              renderEditableCell(column, row[column], rowIndex)
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>
                                  {row[column] !== null && row[column] !== undefined ? String(row[column]) : ""}
                                </span>
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
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div>
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredData.length)} of{" "}
              {filteredData.length} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Rule Creation Dialog */}
        <Dialog open={createRuleDialogOpen} onOpenChange={setCreateRuleDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Create Rule for {selectedColumn ? `"${selectedColumn}"` : "Column"}
                {selectedRowIndex !== null ? ` (Row ${selectedRowIndex + 1})` : ""}
              </DialogTitle>
            </DialogHeader>
            <RuleForm
              initialRule={createInitialRule()}
              tables={Object.keys(datasets)}
              datasets={datasets}
              valueLists={valueLists}
              onSubmit={handleRuleSubmit}
              onCancel={() => setCreateRuleDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  )
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  if (value instanceof Date) {
    return value.toLocaleDateString()
  }

  if (typeof value === "number") {
    return value.toString()
  }

  return String(value)
}
