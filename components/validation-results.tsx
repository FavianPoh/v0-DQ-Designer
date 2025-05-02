"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ValidationResult, DataTables, DataRecord } from "@/lib/types"
import {
  AlertTriangle,
  CheckCircle,
  Filter,
  AlertCircle,
  AlertOctagon,
  RefreshCw,
  Edit,
  Eye,
  Info,
  TableIcon,
  Calendar,
  XCircle,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RuleForm } from "@/components/rule-form"
import type { DataQualityRule, ValueList } from "@/lib/types"

interface ValidationResultsProps {
  results: ValidationResult[]
  datasets: DataTables
  tables: string[]
  onRefresh: () => void
  onRuleClick: (ruleId: string | DataQualityRule) => void
  rules: DataQualityRule[]
  valueLists?: ValueList[]
  showPassingRules?: boolean
  onTogglePassingRules?: () => void
}

export function ValidationResults({
  results: initialResults,
  datasets: initialDatasets,
  tables,
  onRefresh,
  onRuleClick,
  rules,
  valueLists = [],
  showPassingRules = false,
  onTogglePassingRules,
}: ValidationResultsProps) {
  // Filter states
  const [filterTable, setFilterTable] = useState<string>("all")
  const [filterColumn, setFilterColumn] = useState<string>("all")
  const [filterRule, setFilterRule] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [showPassingRows, setShowPassingRows] = useState<boolean>(showPassingRules)
  const [activeTab, setActiveTab] = useState<string>("issues")
  const [filterRuleType, setFilterRuleType] = useState<string>("all")

  // Row data dialog state
  const [rowDataDialogOpen, setRowDataDialogOpen] = useState<boolean>(false)
  const [selectedRowData, setSelectedRowData] = useState<{
    mainRow: DataRecord | null
    table: string
    rowIndex: number
    relatedData?: Record<string, DataRecord[]>
  } | null>(null)

  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState<boolean>(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  // Compute derived data using useMemo to avoid recalculations on every render
  const {
    allColumns,
    availableColumns,
    uniqueRules,
    availableRules,
    filteredResults,
    passingResults,
    totalIssues,
    totalFailures,
    totalWarnings,
    totalRecords,
    failureRecords,
    passRate,
    ruleTypes,
  } = useMemo(() => {
    const results = initialResults
    const datasets = initialDatasets

    // Get all columns from all tables
    const allColumns = new Set<string>()
    Object.values(datasets).forEach((tableData) => {
      if (tableData.length > 0) {
        Object.keys(tableData[0]).forEach((col) => allColumns.add(col))
      }
    })
    const columnsArray = Array.from(allColumns)

    // Get all unique rules
    const uniqueRules = [...new Set(results.map((r) => r.ruleName))]

    // Filter results based on current filters
    const filteredResults = results.filter((result) => {
      // Get the rule definition to check its type
      const ruleDefinition = rules.find(
        (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
      )

      const ruleType = ruleDefinition?.ruleType || ""

      // Check if rule type matches the filter
      const matchesRuleTypeFilter = filterRuleType === "all" || ruleType === filterRuleType

      return (
        (filterTable === "all" || result.table === filterTable) &&
        (filterColumn === "all" || result.column === filterColumn) &&
        (filterRule === "all" || result.ruleName === filterRule) &&
        (filterSeverity === "all" || result.severity === filterSeverity) &&
        matchesRuleTypeFilter &&
        result.severity !== "success"
      ) // Only include non-success results in the issues tab
    })

    // Generate passing results if needed
    const passingResults: any[] = []
    if (showPassingRows) {
      // First, include any existing success results
      const existingSuccessResults = results.filter((r) => {
        // Get the rule definition to check its type
        const ruleDefinition = rules.find(
          (r2) => r2.id === r.ruleId || r2.name === r.ruleName || r.ruleName.includes(`[ID: ${r2.id}]`),
        )

        const ruleType = ruleDefinition?.ruleType || ""

        // Check if rule type matches the filter
        const matchesRuleTypeFilter = filterRuleType === "all" || ruleType === filterRuleType

        return (
          r.severity === "success" &&
          (filterTable === "all" || r.table === filterTable) &&
          (filterColumn === "all" || r.column === filterColumn) &&
          (filterRule === "all" || r.ruleName === filterRule) &&
          matchesRuleTypeFilter
        )
      })

      existingSuccessResults.forEach((result) => {
        // Extract rule ID if needed
        const ruleId = result.ruleId || result.ruleName.match(/\[ID: ([a-zA-Z0-9-]+)\]$/)?.[1] || ""
        const ruleNameWithoutId = result.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")

        passingResults.push({
          ...result,
          ruleNameWithoutId,
          ruleId,
        })
      })

      // For each table
      Object.entries(datasets).forEach(([tableName, tableData]) => {
        // Skip if we're filtering by table and this isn't the selected table
        if (filterTable !== "all" && tableName !== filterTable) return

        // For each row in the table
        tableData.forEach((row, rowIndex) => {
          // Get all rules that apply to this table
          const tableRules = rules.filter((r) => {
            // Check if rule type matches the filter
            const matchesRuleTypeFilter = filterRuleType === "all" || r.ruleType === filterRuleType

            return (
              r.table === tableName &&
              matchesRuleTypeFilter &&
              (filterRule === "all" || r.name === filterRule || r.name.includes(filterRule))
            )
          })

          // Skip if no rules match our filters
          if (tableRules.length === 0) return

          // For each applicable rule
          tableRules.forEach((rule) => {
            // Skip if we already have a result for this rule and row
            const hasResult = results.some(
              (r) =>
                r.table === tableName &&
                r.rowIndex === rowIndex &&
                (r.ruleName === rule.name || r.ruleName.includes(`[ID: ${rule.id}]`) || r.ruleId === rule.id),
            )

            if (hasResult) return

            // If we're filtering by column, skip if this rule doesn't apply to the column
            if (filterColumn !== "all" && rule.column !== filterColumn) return

            // Create a passing result
            passingResults.push({
              rowIndex,
              table: tableName,
              column: rule.column,
              ruleName: rule.name,
              ruleNameWithoutId: rule.name.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, ""),
              ruleId: rule.id,
              message: "Passed validation",
              severity: "success",
            })
          })
        })
      })
    }

    // Get rule types based on the active tab
    const ruleTypes = new Set<string>()

    // If we're on the issues tab, get rule types from failing rules
    if (activeTab === "issues" || !showPassingRows) {
      results
        .filter((r) => r.severity !== "success")
        .forEach((result) => {
          const ruleDefinition = rules.find(
            (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
          )
          if (ruleDefinition?.ruleType) {
            ruleTypes.add(ruleDefinition.ruleType)
          }
        })
    }
    // If we're on the passing tab, get rule types from passing rules
    else if (activeTab === "passing") {
      // First from explicit success results
      results
        .filter((r) => r.severity === "success")
        .forEach((result) => {
          const ruleDefinition = rules.find(
            (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
          )
          if (ruleDefinition?.ruleType) {
            ruleTypes.add(ruleDefinition.ruleType)
          }
        })

      // Then from inferred passing results
      passingResults.forEach((result) => {
        const ruleDefinition = rules.find(
          (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
        )
        if (ruleDefinition?.ruleType) {
          ruleTypes.add(ruleDefinition.ruleType)
        }
      })
    }

    // Get available rules based on the active tab and filters
    let availableRules: string[] = []

    if (activeTab === "issues" || !showPassingRows) {
      // For issues tab, get rules that have failures
      availableRules = [
        ...new Set(
          results
            .filter((r) => r.severity !== "success")
            .filter((r) => filterTable === "all" || r.table === filterTable)
            .filter((r) => {
              if (filterRuleType === "all") return true
              const ruleDefinition = rules.find(
                (rule) => rule.id === r.ruleId || rule.name === r.ruleName || r.ruleName.includes(`[ID: ${rule.id}]`),
              )
              return ruleDefinition?.ruleType === filterRuleType
            })
            .map((r) => r.ruleName),
        ),
      ]
    } else if (activeTab === "passing") {
      // For passing tab, get rules that have passed
      const passingRuleNames = new Set<string>()

      // Add explicit success results
      results
        .filter((r) => r.severity === "success")
        .filter((r) => filterTable === "all" || r.table === filterTable)
        .filter((r) => {
          if (filterRuleType === "all") return true
          const ruleDefinition = rules.find(
            (rule) => rule.id === r.ruleId || rule.name === r.ruleName || r.ruleName.includes(`[ID: ${rule.id}]`),
          )
          return ruleDefinition?.ruleType === filterRuleType
        })
        .forEach((r) => passingRuleNames.add(r.ruleName))

      // Add inferred passing results
      passingResults
        .filter((r) => filterTable === "all" || r.table === filterTable)
        .filter((r) => {
          if (filterRuleType === "all") return true
          const ruleDefinition = rules.find(
            (rule) => rule.id === r.ruleId || rule.name === r.ruleName || r.ruleName.includes(`[ID: ${rule.id}]`),
          )
          return ruleDefinition?.ruleType === filterRuleType
        })
        .forEach((r) => passingRuleNames.add(r.ruleName))

      availableRules = Array.from(passingRuleNames)
    }

    // Sort rule types and available rules alphabetically
    const sortedRuleTypes = Array.from(ruleTypes).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    availableRules.sort((a, b) => {
      // Remove the ID part for sorting
      const nameA = a.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "").toLowerCase()
      const nameB = b.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "").toLowerCase()
      return nameA.localeCompare(nameB)
    })

    // Calculate statistics
    const totalIssues = results.filter((r) => r.severity !== "success").length
    const totalFailures = results.filter((r) => r.severity === "failure").length
    const totalWarnings = results.filter((r) => r.severity === "warning").length

    // Calculate total records across all tables or for the filtered table
    const totalRecords =
      filterTable !== "all"
        ? datasets[filterTable]?.length || 0
        : Object.values(datasets).reduce((sum, tableData) => sum + tableData.length, 0)

    // Calculate failure records
    const failureRecordsByTable = new Map<string, Set<number>>()
    results
      .filter((r) => r.severity === "failure")
      .forEach((r) => {
        if (!failureRecordsByTable.has(r.table)) {
          failureRecordsByTable.set(r.table, new Set())
        }
        failureRecordsByTable.get(r.table)?.add(r.rowIndex)
      })

    const failureRecords = Array.from(failureRecordsByTable.values()).reduce((sum, set) => sum + set.size, 0)

    const passRate = totalRecords > 0 ? ((totalRecords - failureRecords) / totalRecords) * 100 : 100

    return {
      allColumns: columnsArray,
      availableColumns: columnsArray, // Fixed: properly define availableColumns
      uniqueRules,
      availableRules,
      filteredResults,
      passingResults,
      totalIssues,
      totalFailures,
      totalWarnings,
      totalRecords,
      failureRecords,
      passRate,
      ruleTypes: sortedRuleTypes,
    }
  }, [
    initialResults,
    initialDatasets,
    filterTable,
    filterColumn,
    filterRule,
    filterSeverity,
    filterRuleType,
    showPassingRows,
    rules,
    activeTab,
  ])

  // Add this useEffect to reset the rule filter when rule type changes
  useEffect(() => {
    setFilterRule("all")
  }, [filterRuleType])

  // Reset rule type filter when tab changes
  useEffect(() => {
    setFilterRuleType("all")
    setFilterRule("all")
  }, [activeTab])

  // Debug information for date rules
  const dateRuleResults = initialResults.filter(
    (r) => r.ruleName.toLowerCase().includes("date") || r.message.toLowerCase().includes("date"),
  )
  console.log("Date rule validation results:", dateRuleResults.length, dateRuleResults)

  // Handle filter changes
  const handleTableFilterChange = (value: string) => {
    setFilterTable(value)
    setFilterColumn("all")
    setFilterRule("all")
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Reset all filters
  const resetAllFilters = () => {
    setFilterTable("all")
    setFilterColumn("all")
    setFilterRuleType("all")
    setFilterRule("all")
    setFilterSeverity("all")
  }

  // Handle row data view
  const handleViewRowData = (result: any) => {
    const mainRow = initialDatasets[result.table]?.[result.rowIndex] || null

    // Find related tables for cross-table rules
    const relatedData: Record<string, DataRecord[]> = {}

    // First, check if this is a reference integrity or composite reference rule
    // by examining the rule name (more reliable than message parsing)
    const isReferenceRule =
      result.ruleName.toLowerCase().includes("reference") ||
      result.ruleName.toLowerCase().includes("integrity") ||
      result.ruleName.toLowerCase().includes("lookup") ||
      result.ruleName.toLowerCase().includes("cross-table")

    if (isReferenceRule) {
      // Include all tables except the main one
      Object.entries(initialDatasets).forEach(([tableName, tableData]) => {
        if (tableName !== result.table) {
          relatedData[tableName] = tableData
        }
      })
    } else {
      // Try to extract table names from the message using various patterns
      const tablePatterns = [
        /\b([a-zA-Z]+)\.(([a-zA-Z]+))\b/g, // table.column pattern
        /\bin ([a-zA-Z]+)\b/g, // "in table" pattern
        /\bfrom ([a-zA-Z]+)\b/g, // "from table" pattern
        /\btable ([a-zA-Z]+)\b/g, // "table X" pattern
        /\b(users|transactions)\b/gi, // directly match known table names
      ]

      // Try each pattern to find table references
      tablePatterns.forEach((pattern) => {
        const matches = [...(result.message || "").matchAll(pattern)]
        matches.forEach((match) => {
          // Extract table name based on the pattern
          let tableName = match[1]
          if (pattern.toString().includes("in ")) {
            tableName = match[0].replace("in ", "")
          } else if (pattern.toString().includes("from ")) {
            tableName = match[0].replace("from ", "")
          } else if (pattern.toString().includes("table ")) {
            tableName = match[0].replace("table ", "")
          }

          // Clean up the table name
          tableName = tableName.trim().toLowerCase()

          // Add the table data if it exists and isn't the main table
          if (tableName && tableName !== result.table.toLowerCase() && initialDatasets[tableName]) {
            relatedData[tableName] = initialDatasets[tableName]
          } else if (
            tableName &&
            tableName !== result.table.toLowerCase() &&
            initialDatasets[tableName.toLowerCase()]
          ) {
            // Try case-insensitive match
            relatedData[tableName.toLowerCase()] = initialDatasets[tableName.toLowerCase()]
          }
        })
      })

      // If we still haven't found any related tables but the message mentions references
      // or lookups, include all other tables as potentially relevant
      if (
        Object.keys(relatedData).length === 0 &&
        (result.message?.includes("reference") || result.message?.includes("lookup") || result.message?.includes("key"))
      ) {
        Object.entries(initialDatasets).forEach(([tableName, tableData]) => {
          if (tableName !== result.table) {
            relatedData[tableName] = tableData
          }
        })
      }
    }

    setSelectedRowData({
      mainRow,
      table: result.table,
      rowIndex: result.rowIndex,
      relatedData: Object.keys(relatedData).length > 0 ? relatedData : undefined,
    })

    setRowDataDialogOpen(true)
  }

  const handleRuleClick = (ruleId: string) => {
    console.log("Rule click handler called with ID:", ruleId)
    // Pass the rule ID to the parent component
    onRuleClick(ruleId)
  }

  // Add debug logging for validation results
  useEffect(() => {
    if (initialResults.length > 0) {
      console.log("ValidationResults component received:", initialResults)

      // Check for date rules
      const dateRuleResults = initialResults.filter(
        (r) => r.ruleName.toLowerCase().includes("date") || r.message.toLowerCase().includes("date"),
      )
      console.log("Date rule results:", dateRuleResults)
    }
  }, [initialResults])

  const handleTogglePassingRows = (checked: boolean) => {
    setShowPassingRows(checked)
    if (onTogglePassingRules) {
      onTogglePassingRules()
    }
  }

  useEffect(() => {
    setShowPassingRows(showPassingRules)
  }, [showPassingRules])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Validation Results</h2>
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Results
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Issues</CardTitle>
            <CardDescription>All validation issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalIssues}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {totalFailures} failures, {totalWarnings} warnings
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Failures</CardTitle>
            <CardDescription>Critical data issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-red-500">{totalFailures}</div>
              <AlertOctagon className="ml-2 h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Warnings</CardTitle>
            <CardDescription>Potential data issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold text-amber-500">{totalWarnings}</div>
              <AlertTriangle className="ml-2 h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pass Rate</CardTitle>
            <CardDescription>Records without failures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold">{passRate.toFixed(1)}%</div>
              {passRate >= 90 ? (
                <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="ml-2 h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Validation Results</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="text-muted-foreground hover:text-foreground"
              title="Reset all filters"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterTable} onValueChange={handleTableFilterChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterColumn} onValueChange={setFilterColumn}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Columns</SelectItem>
                {availableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRuleType} onValueChange={setFilterRuleType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All rule types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rule Types</SelectItem>
                {/* Show only the distinct rule types that exist in the rules */}
                {ruleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRule} onValueChange={setFilterRule}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All rules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rules</SelectItem>
                {availableRules.map((rule) => (
                  <SelectItem key={rule} value={rule}>
                    {rule.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="warning">Warnings Only</SelectItem>
                <SelectItem value="failure">Failures Only</SelectItem>
                <SelectItem value="success">Passing Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="show-passing"
          checked={showPassingRows}
          onCheckedChange={(checked) => {
            setShowPassingRows(checked)
            if (onTogglePassingRules) {
              onTogglePassingRules()
            }
          }}
        />
        <Label htmlFor="show-passing" className="text-sm">
          Show passing validations
        </Label>
      </div>

      {showPassingRows ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="issues">Issues ({filteredResults.length})</TabsTrigger>
            <TabsTrigger value="passing">Passing ({passingResults.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="issues">
            {renderResultsTable(
              filteredResults,
              initialDatasets,
              onRuleClick,
              false,
              handleViewRowData,
              setEditingRuleId,
              setEditRuleDialogOpen,
              rules,
            )}
          </TabsContent>

          <TabsContent value="passing">
            {renderResultsTable(
              passingResults,
              initialDatasets,
              onRuleClick,
              true,
              handleViewRowData,
              setEditingRuleId,
              setEditRuleDialogOpen,
              rules,
            )}
          </TabsContent>
        </Tabs>
      ) : (
        renderResultsTable(
          filteredResults,
          initialDatasets,
          onRuleClick,
          false,
          handleViewRowData,
          setEditingRuleId,
          setEditRuleDialogOpen,
          rules,
        )
      )}

      {/* Row Data Dialog */}
      <Dialog open={rowDataDialogOpen} onOpenChange={setRowDataDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex justify-between items-center">
            <DialogTitle>
              Row Data: {selectedRowData?.table} (Row {selectedRowData ? selectedRowData.rowIndex + 1 : ""})
            </DialogTitle>
            <DialogClose className="h-4 w-4" />
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="space-y-6 p-1">
              {/* Main Row Data */}
              {selectedRowData?.mainRow && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TableIcon className="h-4 w-4" />
                    {selectedRowData.table}
                  </h3>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(selectedRowData.mainRow).map(([column, value]) => (
                          <TableRow key={column}>
                            <TableCell className="font-medium">{column}</TableCell>
                            <TableCell>{formatValue(value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Related Tables Data */}
              {selectedRowData?.relatedData && (
                <div className="space-y-4 mt-4">
                  <h3 className="text-md font-semibold">Related Tables</h3>
                  <Tabs defaultValue={Object.keys(selectedRowData.relatedData)[0] || ""}>
                    <TabsList className="mb-2">
                      {Object.keys(selectedRowData.relatedData).map((tableName) => (
                        <TabsTrigger key={tableName} value={tableName}>
                          {tableName.charAt(0).toUpperCase() + tableName.slice(1)}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(selectedRowData.relatedData).map(([tableName, tableData]) => (
                      <TabsContent key={tableName} value={tableName} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <TableIcon className="h-4 w-4" />
                            {tableName.charAt(0).toUpperCase() + tableName.slice(1)} Table
                          </h4>
                          <Badge variant="outline">{tableData.length} records</Badge>
                        </div>

                        <div className="border rounded-md overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {tableData.length > 0 &&
                                  Object.keys(tableData[0]).map((column) => (
                                    <TableHead key={column}>{column}</TableHead>
                                  ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tableData.slice(0, 10).map((row, index) => (
                                <TableRow
                                  key={index}
                                  className={
                                    findRelatedRowMatch(selectedRowData.mainRow, row)
                                      ? "bg-blue-50 dark:bg-blue-900/10"
                                      : ""
                                  }
                                >
                                  {Object.values(row).map((value, valueIndex) => (
                                    <TableCell key={valueIndex}>{formatValue(value)}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              {tableData.length > 10 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={Object.keys(tableData[0]).length}
                                    className="text-center text-sm text-gray-500"
                                  >
                                    Showing 10 of {tableData.length} rows
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rule Editing Dialog */}
      <Dialog open={editRuleDialogOpen} onOpenChange={setEditRuleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex justify-between items-center">
            <DialogTitle>Edit Rule</DialogTitle>
            <DialogClose className="h-4 w-4" />
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-auto">
            {editingRuleId && (
              <RuleForm
                initialRule={rules.find((r) => r.id === editingRuleId)}
                tables={tables}
                datasets={initialDatasets}
                valueLists={valueLists}
                onSubmit={(updatedRule) => {
                  // Replace this line:
                  // onRuleClick(updatedRule.id)

                  // With this to update directly:
                  onRuleClick(updatedRule)
                  setEditRuleDialogOpen(false)
                }}
                onCancel={() => setEditRuleDialogOpen(false)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function renderResultsTable(
  results: any[],
  datasets: DataTables,
  onRuleClick: (ruleId: string) => void,
  isPassing: boolean,
  onViewRowData: (result: any) => void,
  setEditingRuleId: (ruleId: string | null) => void,
  setEditRuleDialogOpen: (open: boolean) => void,
  rules: DataQualityRule[],
) {
  if (results.length > 0) {
    return (
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Row</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => {
              // Extract rule name without the ID part
              const ruleName = result.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")
              const ruleId = result.ruleId || result.ruleName.match(/\[ID: ([a-zA-Z0-9-]+)\]$/)?.[1] || ""

              // Find the rule definition to get its type
              const ruleDefinition = rules.find(
                (r) => r.id === ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
              )

              const isDateRule = ruleDefinition?.ruleType?.startsWith("date-") || false

              return (
                <TableRow
                  key={index}
                  className={
                    isPassing || result.severity === "success"
                      ? "bg-green-50 dark:bg-green-900/10"
                      : result.severity === "failure"
                        ? "bg-red-50 dark:bg-red-900/10"
                        : "bg-yellow-50 dark:bg-yellow-900/10"
                  }
                >
                  <TableCell>{result.table}</TableCell>
                  <TableCell>{result.rowIndex + 1}</TableCell>
                  <TableCell>
                    {isDateRule ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {getColumnDisplay(result, datasets[result.table]?.[result.rowIndex])}
                      </div>
                    ) : (
                      getColumnDisplay(result, datasets[result.table]?.[result.rowIndex])
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isDateRule ? "outline" : "outline"} className={isDateRule ? "bg-blue-50" : ""}>
                      {ruleName}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {getValueDisplay(result, datasets[result.table]?.[result.rowIndex])}
                  </TableCell>
                  <TableCell>
                    {isPassing || result.severity === "success" ? (
                      <Badge variant="outline" className="bg-green-100 mr-2">
                        Passed
                      </Badge>
                    ) : result.severity === "failure" ? (
                      <Badge variant="destructive" className="mr-2">
                        Failure
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 mr-2">
                        Warning
                      </Badge>
                    )}
                    {/* Simplify formula messages */}
                    {result.message ? (
                      result.message.includes("Formula evaluated to false:") ? (
                        // Simplify formula failure messages
                        <span>
                          Formula failed
                          {result.message.includes("Result:")
                            ? " (" + result.message.split("Result:")[1].trim() + ")"
                            : ""}
                        </span>
                      ) : (
                        // For other types of messages, keep them as is
                        result.message
                      )
                    ) : (
                      "Validation issue"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRowData(result)}
                        className="flex items-center gap-1"
                        title="View row data"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (ruleId) {
                            // Replace this line:
                            // onRuleClick(ruleId)

                            // With these lines to edit in place:
                            setEditingRuleId(ruleId)
                            setEditRuleDialogOpen(true)
                          }
                        }}
                        disabled={!ruleId}
                        className="flex items-center gap-1"
                        title={isPassing ? "View rule" : "Edit rule"}
                      >
                        {isPassing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  } else {
    return (
      <div className="text-center py-8 border rounded-md bg-gray-50 dark:bg-gray-800">
        {isPassing ? (
          <div>
            <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No passing validations found with current filters</p>
          </div>
        ) : results.length === 0 ? (
          <div>
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">All data passed validation!</p>
          </div>
        ) : (
          <div>
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No issues found with current filters</p>
          </div>
        )}
      </div>
    )
  }
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "null"
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }

  if (value instanceof Date) {
    return value.toLocaleDateString()
  }

  return String(value)
}

// Helper function to get a better column display for multi-column rules
function getColumnDisplay(result: any, row: any): React.ReactNode {
  // If no row data or it's a passing result with a specific column already set, use the default
  if (!row || (result.severity === "success" && result.column)) {
    return result.column
  }

  // Check if this is a formula rule by looking at the message
  if (result.message && result.message.includes("Formula")) {
    // Extract formula from the message if possible
    const formulaMatch = result.message.match(/Formula evaluated to false: (.*?) \(Result:/)
    if (formulaMatch && formulaMatch[1]) {
      return <span className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">Formula: {formulaMatch[1]}</span>
    }
  }

  // For other multi-column rules, we could try to extract column names from the message
  // This is a simple approach - could be enhanced with more specific rule type handling
  if (result.message && (result.message.includes(" and ") || result.message.includes(" or "))) {
    const columns = result.message.match(/\b([a-zA-Z]+)\b should/g)
    if (columns && columns.length > 1) {
      return (
        <span className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
          Multiple: {columns.map((c: string) => c.replace(" should", "")).join(", ")}
        </span>
      )
    }
  }

  // Default fallback
  return result.column
}

// Helper function to get a better value display for multi-column rules
function getValueDisplay(result: any, row: any): React.ReactNode {
  if (!row) {
    return formatValue(null)
  }

  // Check if this is a formula rule by looking at the rule name or message
  const isFormulaRule =
    (result.ruleName && result.ruleName.toLowerCase().includes("formula")) ||
    (result.message && result.message.includes("Formula"))

  if (isFormulaRule) {
    // Try to extract the formula from the message
    let formula = ""
    if (result.message && result.message.includes("Formula evaluated to false:")) {
      const formulaMatch = result.message.match(/Formula evaluated to false: (.*?) \(Result:/)
      if (formulaMatch && formulaMatch[1]) {
        formula = formulaMatch[1]
      }
    }

    // Simplified formula display - just show the column value and simplified formula
    if (formula) {
      return (
        <div>
          <div className="font-bold">{formatValue(row[result.column])}</div>
          <div className="text-xs text-gray-500">
            Formula failed: {formula.length > 30 ? formula.substring(0, 30) + "..." : formula}
          </div>
        </div>
      )
    }
  }

  // For date values, format them nicely
  if (row[result.column] instanceof Date) {
    return (
      <div className="flex items-center gap-2">
        <span>{formatValue(row[result.column])}</span>
      </div>
    )
  }

  // For multi-column conditions, try to show relevant values
  if (result.message && (result.message.includes(" and ") || result.message.includes(" or "))) {
    const relevantColumns = Object.keys(row).filter((col) => result.message.toLowerCase().includes(col.toLowerCase()))

    if (relevantColumns.length > 1) {
      return (
        <div className="space-y-1">
          {relevantColumns.map((col) => (
            <div key={col} className="text-xs">
              <span className="font-semibold">{col}:</span> {formatValue(row[col])}
            </div>
          ))}
        </div>
      )
    }
  }

  // Default fallback to just showing the column value
  return formatValue(row[result.column])
}

// Add this helper function to highlight potentially related rows
function findRelatedRowMatch(mainRow: DataRecord | null, relatedRow: DataRecord): boolean {
  if (!mainRow) return false

  // Check for common ID patterns
  if (mainRow.id && relatedRow.id && mainRow.id === relatedRow.id) return true
  if (mainRow.userId && relatedRow.id && mainRow.userId === relatedRow.id) return true
  if (mainRow.id && relatedRow.userId && mainRow.id === relatedRow.userId) return true

  // Check for other common fields
  for (const key in mainRow) {
    if (key === "id") continue // Skip id as we already checked it

    for (const relatedKey in relatedRow) {
      if (relatedKey === "id") continue // Skip id as we already checked it

      // If the keys are the same or one contains the other
      if (key === relatedKey || key.includes(relatedKey) || relatedKey.includes(key)) {
        // And the values match
        if (mainRow[key] === relatedRow[relatedKey] && mainRow[key] !== null && mainRow[key] !== undefined) {
          return true
        }
      }
    }
  }

  return false
}
