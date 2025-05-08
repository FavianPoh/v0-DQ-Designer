"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DataTables, DataRecord, DataQualityRule, ValueList, ValidationResult } from "@/lib/types"
import {
  AlertTriangle,
  CheckCircle,
  Filter,
  AlertCircle,
  AlertOctagon,
  RefreshCw,
  Edit,
  Info,
  TableIcon,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RuleForm } from "@/components/rule-form"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"

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
  onRowClick?: (result: ValidationResult) => void
  onViewData?: (result: ValidationResult) => void
  onEditRule?: (rule: DataQualityRule) => void
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
  onRowClick,
  onViewData,
  onEditRule,
}: ValidationResultsProps) {
  // Filter states
  const [filterTable, setFilterTable] = useState<string>("all")
  const [filterColumn, setFilterColumn] = useState<string>("all")
  const [filterRule, setFilterRule] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [showPassingValidations, setShowPassingValidations] = useState<boolean>(showPassingRules)
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

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState<Record<string, boolean>>({})
  const tableRef = useRef<HTMLTableElement>(null)

  // Define columns for validation results
  const columns = [
    { key: "table", label: "Table" },
    { key: "ruleName", label: "Rule" },
    { key: "rowIndex", label: "Row" },
    { key: "column", label: "Column" },
    { key: "value", label: "Value" },
    { key: "message", label: "Message" },
    { key: "severity", label: "Severity" },
  ]

  // Add a specific debug section for formula rules to help diagnose issues
  // Add this near the beginning of the component, after the state declarations

  useEffect(() => {
    // Log formula-related validation results
    const formulaResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("formula") ||
        rules.some((r) => r.id === result.ruleId && r.ruleType === "formula"),
    )

    if (formulaResults.length > 0) {
      console.log("Math Formula validation results:", formulaResults)

      // Check for specific formula patterns
      const scoreAgeResults = formulaResults.filter(
        (result) => result.message && result.message.includes("score") && result.message.includes("age"),
      )

      if (scoreAgeResults.length > 0) {
        console.log("Score/age formula validation results:", scoreAgeResults)
      }
    }
  }, [initialResults, rules])

  // Add this near the beginning of the component, after the state declarations
  useEffect(() => {
    // Log cross-column validation results
    const crossColumnResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("comparison") ||
        rules.some(
          (r) => r.id === result.ruleId && (r.ruleType === "cross-column" || r.ruleType === "column-comparison"),
        ),
    )

    if (crossColumnResults.length > 0) {
      console.log("Cross-Column validation results:", {
        total: crossColumnResults.length,
        success: crossColumnResults.filter((r) => r.severity === "success").length,
        failures: crossColumnResults.filter((r) => r.severity !== "success").length,
        results: crossColumnResults,
      })
    }
  }, [initialResults, rules])

  useEffect(() => {
    console.log("ValidationResults - Current validation results:", initialResults)

    // Log enum-related validation results
    const enumResults = initialResults.filter((result) => result.ruleName.toLowerCase().includes("enum"))
    if (enumResults.length > 0) {
      console.log("Enum validation results:", enumResults)
    }

    // Log success results count
    const successResults = initialResults.filter((result) => result.severity === "success")
    console.log("Success validation results:", successResults.length, successResults)

    // Log any date-related validation results
    const dateResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("date") ||
        (result.message && result.message.toLowerCase().includes("date")),
    )
    if (dateResults.length > 0) {
      console.log("Date-related validation results:", dateResults)
    }

    // Formula rule validation result
    const jsFormulaResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("javascript") ||
        (result.message && result.message.toLowerCase().includes("javascript")),
    )
    if (jsFormulaResults.length > 0) {
      console.log("JavaScript formula validation results:", jsFormulaResults)
    }

    // Add below it this additional debugging code for math formula rules
    // Log Math Formula validation results
    const mathFormulaResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("math formula") ||
        (result.message && result.message.toLowerCase().includes("math formula")),
    )
    if (mathFormulaResults.length > 0) {
      console.log("Math Formula validation results:", mathFormulaResults)
    }

    // Check for specific formula patterns
    const amountFormulaResults = initialResults.filter(
      (result) =>
        result.message &&
        (result.message.includes("amount - refundAmount") || result.message.includes("processingFee")),
    )
    if (amountFormulaResults.length > 0) {
      console.log("Amount formula validation results:", amountFormulaResults)
    }

    // Log list validation results
    const listResults = initialResults.filter(
      (result) =>
        result.ruleName.toLowerCase().includes("list") ||
        rules.some((r) => r.id === result.ruleId && r.ruleType === "list"),
    )
    if (listResults.length > 0) {
      console.log("List validation results:", listResults)
    }
  }, [initialResults, rules])

  // Sync the showPassingValidations state with the prop
  useEffect(() => {
    setShowPassingValidations(showPassingRules)
    console.log("showPassingRules prop changed:", showPassingRules)
  }, [showPassingRules])

  // Log the current state of showPassingValidations
  useEffect(() => {
    console.log("showPassingValidations state:", showPassingValidations)
  }, [showPassingValidations])

  // Filter results based on current filters and showPassingValidations
  const filteredResults = useMemo(() => {
    console.log(
      "Filtering results. Show passing:",
      showPassingValidations,
      "Initial results count:",
      initialResults.length,
      "Success results:",
      initialResults.filter((r) => r.severity === "success").length,
      "JavaScript formula results:",
      initialResults.filter((r) => r.ruleName.toLowerCase().includes("javascript")).length,
    )

    // First, apply the severity filter based on the showPassingValidations toggle
    let results = initialResults

    // If filterSeverity is set, apply that filter first
    if (filterSeverity !== "all") {
      results = results.filter((result) => result.severity === filterSeverity)
    }
    // Otherwise, apply the showPassingValidations filter
    else if (showPassingValidations === true && filterSeverity === "all") {
      // When explicitly showing passing validations and no severity filter is set,
      // only show success results
      results = results.filter((result) => result.severity === "success")
    } else if (!showPassingValidations) {
      // When not showing passing validations, filter out success results
      results = results.filter((result) => result.severity !== "success")
    }

    // Then apply the other filters
    return results.filter((result) => {
      // Apply table filter
      if (filterTable !== "all" && result.table !== filterTable) {
        return false
      }

      // Apply column filter
      if (filterColumn !== "all" && result.column !== filterColumn) {
        return false
      }

      // Apply rule filter
      if (filterRule !== "all" && result.ruleName !== filterRule) {
        return false
      }

      // Apply rule type filter
      if (filterRuleType !== "all") {
        const ruleDefinition = rules.find(
          (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
        )
        if (!ruleDefinition || ruleDefinition.ruleType !== filterRuleType) {
          return false
        }
      }

      return true
    })
  }, [
    initialResults,
    filterTable,
    filterColumn,
    filterRule,
    filterSeverity,
    filterRuleType,
    showPassingValidations,
    rules,
  ])

  // Add this right after the filteredResults useMemo:

  // Add special debug logging for cross-column validation results
  useEffect(() => {
    // Log all cross-column validation results
    const crossColumnResults = initialResults.filter((result) => {
      // Find the rule definition
      const rule = rules.find(
        (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
      )

      return rule && rule.ruleType === "column-comparison"
    })

    if (crossColumnResults.length > 0) {
      console.log("CROSS-COLUMN VALIDATION RESULTS:", {
        total: crossColumnResults.length,
        passing: crossColumnResults.filter((r) => r.severity === "success").length,
        failing: crossColumnResults.filter((r) => r.severity !== "success").length,
        results: crossColumnResults,
      })

      // Log the filtered results to see if any cross-column validations are being filtered out
      const filteredCrossColumn = filteredResults.filter((result) => {
        const rule = rules.find(
          (r) => r.id === result.ruleId || r.name === result.ruleName || result.ruleName.includes(`[ID: ${r.id}]`),
        )

        return rule && rule.ruleType === "column-comparison"
      })

      console.log("FILTERED CROSS-COLUMN RESULTS:", {
        total: filteredCrossColumn.length,
        passing: filteredCrossColumn.filter((r) => r.severity === "success").length,
        failing: filteredCrossColumn.filter((r) => r.severity !== "success").length,
      })
    }
  }, [initialResults, filteredResults, rules])

  // Compute derived data using useMemo to avoid recalculations on every render
  /*
  const {
    allColumns,
    availableColumns,
    uniqueRules,
    availableRules,
    filteredResults: computedFilteredResults,
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
  */

  // Calculate optimal column widths based on content
  useEffect(() => {
    if (initialResults.length === 0) return

    const calculateColumnWidth = (column: string) => {
      // Start with the column name length (minimum width)
      let maxWidth = column.length * 10

      // Check each row's value length
      initialResults.forEach((row) => {
        const value = (row as any)[column]
        const valueStr = value !== null && value !== undefined ? String(value) : ""
        const valueWidth = valueStr.length * 8 // Approximate width based on character count
        maxWidth = Math.max(maxWidth, valueWidth)
      })

      // Add padding and cap maximum width
      if (column === "message") {
        return Math.min(Math.max(maxWidth + 24, 100), 400) // Allow message column to be wider
      }
      return Math.min(Math.max(maxWidth + 24, 100), 200)
    }

    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column.key] = calculateColumnWidth(column.key)
    })

    // Special case for message column - allow it to be wider
    if (widths["message"]) {
      widths["message"] = Math.min(widths["message"], 400)
    }

    setColumnWidths(widths)
  }, [initialResults])

  // Apply sorting and filtering to data
  /*
  useEffect(() => {
    let filteredResults = [...initialResults]

    // Apply filters
    Object.keys(filters).forEach((key) => {
      const filterValue = filters[key].toLowerCase()
      if (filterValue) {
        filteredResults = filteredResults.filter((item) => {
          const value = (item as any)[key]
          return value !== null && value !== undefined && String(value).toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    if (sortConfig !== null) {
      filteredResults.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return sortConfig.direction === "asc" ? -1 : 1
        if (bValue === null || bValue === undefined) return sortConfig.direction === "asc" ? 1 : -1

        // Special handling for rowIndex which should be sorted numerically
        if (sortConfig.key === "rowIndex") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
        }

        // Default string comparison
        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()
        return sortConfig.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
      })
    }

    setDisplayResults(filteredResults)
  }, [initialResults, sortConfig, filters])
  */

  // Apply sorting to filtered results
  const sortedResults = useMemo(() => {
    const results = [...filteredResults]

    if (sortConfig !== null) {
      results.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key]
        const bValue = (b as any)[sortConfig.key]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return sortConfig.direction === "asc" ? -1 : 1
        if (bValue === null || bValue === undefined) return sortConfig.direction === "asc" ? 1 : -1

        // Special handling for rowIndex which should be sorted numerically
        if (sortConfig.key === "rowIndex") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
        }

        // Default string comparison
        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()
        return sortConfig.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
      })
    }

    return results
  }, [filteredResults, sortConfig])

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
            const tableData = initialDatasets[tableName]
            relatedData[tableName] = tableData
          } else if (
            tableName &&
            tableName !== result.table.toLowerCase() &&
            initialDatasets[tableName.toLowerCase()]
          ) {
            // Try case-insensitive match
            const tableData = initialDatasets[tableName.toLowerCase()]
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

    // Call the onViewData prop if provided
    if (onViewData) {
      onViewData(result)
    }
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

  const handleTogglePassingValidations = (checked: boolean) => {
    console.log(
      "Toggle passing validations:",
      checked,
      "Current passing results count:",
      initialResults.filter((r) => r.severity === "success").length,
    )
    setShowPassingValidations(checked)
    // Reset the severity filter when toggling passing validations
    setFilterSeverity("all")
    if (onTogglePassingRules) {
      onTogglePassingRules()
    }
  }

  /*
  const handleTogglePassingRows = (checked: boolean) => {
    setShowPassingRows(checked)
    if (onTogglePassingRules) {
      onTogglePassingRules()
    }
  }

  useEffect(() => {
    setShowPassingRows(showPassingRules)
  }, [showPassingRules])
  */

  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)

  /*
  const filteredResults = useMemo(() => {
    let filtered = initialResults

    // Apply table filter if selected
    if (filterTable !== "all") {
      filtered = filtered.filter((result) => result.table === filterTable)
    }

    // Apply rule filter if selected
    if (filterRule !== "all") {
      filtered = filtered.filter((result) => result.ruleName === filterRule)
    }

    // Apply severity filter if selected
    if (filterSeverity !== "all") {
      filtered = filtered.filter((result) => result.severity === filterSeverity)
    }

    // Filter out passing validations unless showPassingValidations is true
    if (!showPassingValidations) {
      filtered = filtered.filter((result) => result.severity !== "success")
    }

    return filtered
  }, [initialResults, filterTable, filterRule, filterSeverity, showPassingValidations])
  */

  // Calculate statistics
  const stats = useMemo(() => {
    // For issues, failures, and warnings, always use the filtered results WITHOUT considering the showPassingValidations toggle
    const issuesResults = initialResults.filter((r) => {
      // Apply all filters except the passing/success filter
      if (filterTable !== "all" && r.table !== filterTable) return false
      if (filterColumn !== "all" && r.column !== filterColumn) return false
      if (filterRule !== "all" && r.ruleName !== filterRule) return false
      if (filterRuleType !== "all") {
        const ruleDefinition = rules.find(
          (rule) => rule.id === r.ruleId || rule.name === r.ruleName || r.ruleName.includes(`[ID: ${rule.id}]`),
        )
        if (!ruleDefinition || ruleDefinition.ruleType !== filterRuleType) return false
      }
      // Only include non-success results for issue counts
      return r.severity !== "success"
    })

    const totalIssues = issuesResults.length
    const totalFailures = issuesResults.filter((r) => r.severity === "failure").length
    const totalWarnings = issuesResults.filter((r) => r.severity === "warning").length

    // For success count, use the filtered results WITH the success filter
    const totalSuccess = initialResults.filter((r) => r.severity === "success").length

    // Calculate total records across all tables or for the filtered table
    const totalRecords =
      filterTable !== "all"
        ? initialDatasets[filterTable]?.length || 0
        : Object.values(initialDatasets).reduce((sum, tableData) => sum + tableData.length, 0)

    // Calculate failure records based on filtered results (excluding success filter)
    const failureRecordsByTable = new Map<string, Set<number>>()
    issuesResults
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
      totalIssues,
      totalFailures,
      totalWarnings,
      totalSuccess,
      totalRecords,
      failureRecords,
      passRate,
    }
  }, [initialResults, initialDatasets, filterTable, filterColumn, filterRule, filterRuleType, rules])

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
            <div className="text-3xl font-bold">{stats.totalIssues}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalFailures} failures, {stats.totalWarnings} warnings
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
              <div className="text-3xl font-bold text-red-500">{stats.totalFailures}</div>
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
              <div className="text-3xl font-bold text-amber-500">{stats.totalWarnings}</div>
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
              <div className="text-3xl font-bold">{stats.passRate.toFixed(1)}%</div>
              {stats.passRate >= 90 ? (
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
                {Object.keys(initialDatasets)
                  .flatMap((tableName) => {
                    const tableData = initialDatasets[tableName]
                    return tableData.length > 0 ? Object.keys(tableData[0]) : []
                  })
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .sort()
                  .map((column) => (
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
                {Array.from(new Set(rules.map((r) => r.ruleType)))
                  .sort()
                  .map((type) => (
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
                {Array.from(new Set(initialResults.map((r) => r.ruleName)))
                  .sort()
                  .map((rule) => (
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
        <Switch id="show-passing" checked={showPassingValidations} onCheckedChange={handleTogglePassingValidations} />
        <Label htmlFor="show-passing" className="text-sm">
          Show passing validations {showPassingValidations ? "(on)" : "(off)"} -{" "}
          {initialResults.filter((r) => r.severity === "success").length} passing validations
        </Label>
      </div>

      <div className="rounded-md border">
        <ScrollArea className="h-[600px] w-full">
          <Table ref={tableRef}>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={{
                      width: `${columnWidths[column.key]}px`,
                      minWidth: `${columnWidths[column.key]}px`,
                    }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort(column.key)}>
                        {column.label}
                        {sortConfig?.key === column.key &&
                          (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                      </div>
                      <div className="flex items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFilter(column.key)
                                }}
                                className={`p-1 rounded-sm ${filters[column.key] ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                              >
                                <Filter size={14} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Filter {column.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {showFilters[column.key] && (
                      <div className="absolute top-full left-0 right-0 bg-white p-2 shadow-md z-20 flex gap-1">
                        <Input
                          placeholder={`Filter ${column.label}...`}
                          value={filters[column.key] || ""}
                          onChange={(e) => handleFilterChange(column.key, e.target.value)}
                          className="h-8 text-sm"
                        />
                        {filters[column.key] && (
                          <button onClick={() => clearFilter(column.key)} className="p-1 hover:bg-gray-100 rounded-sm">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.length > 0 ? (
                sortedResults.map((result, index) => (
                  <TableRow
                    key={index}
                    className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                    onClick={() => onRowClick && onRowClick(result)}
                  >
                    <TableCell>{result.table}</TableCell>
                    <TableCell>{result.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")}</TableCell>
                    <TableCell>{result.rowIndex}</TableCell>
                    <TableCell>{result.column}</TableCell>
                    <TableCell>{formatCellValue(result, initialDatasets)}</TableCell>
                    <TableCell>{result.message}</TableCell>
                    <TableCell>
                      {result.severity === "success" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">
                          Passed
                        </Badge>
                      ) : result.severity === "warning" ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">
                          Warning
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failure</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleViewRowData(result)
                          }}
                          className="h-8 w-8 p-0"
                          title="View row data"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const ruleId = result.ruleId || result.ruleName.match(/\[ID: ([a-zA-Z0-9-]+)\]$/)?.[1] || ""
                            if (ruleId) {
                              // Find the rule
                              const rule = rules.find((r) => r.id === ruleId)

                              if (rule) {
                                // Special handling for date rules
                                if (rule.ruleType?.startsWith("date-") && !rule.column) {
                                  console.log("Date rule missing column:", rule)

                                  // Try to find a suitable column
                                  if (rule.table && initialDatasets[rule.table]?.length > 0) {
                                    const availableColumns = Object.keys(initialDatasets[rule.table][0])

                                    // Look for date-like columns
                                    const dateColumns = availableColumns.filter(
                                      (col) =>
                                        col.toLowerCase().includes("date") ||
                                        col.toLowerCase().includes("time") ||
                                        col.toLowerCase().includes("day"),
                                    )

                                    if (dateColumns.length > 0) {
                                      // Use the first date-like column
                                      rule.column = dateColumns[0]
                                      console.log(`Auto-selected column for date rule: ${rule.column}`)

                                      toast({
                                        title: "Column Auto-Selected",
                                        description: `Column "${rule.column}" was automatically selected for this date rule.`,
                                        variant: "warning",
                                      })
                                    } else if (availableColumns.length > 0) {
                                      // If no date-like columns, use the first available column
                                      rule.column = availableColumns[0]
                                      console.log(`Auto-selected first available column: ${rule.column}`)

                                      toast({
                                        title: "Column Auto-Selected",
                                        description: `Column "${rule.column}" was automatically selected for this date rule.`,
                                        variant: "warning",
                                      })
                                    }
                                  }
                                }

                                // Make sure we're passing a complete rule object
                                console.log("Opening rule editor with rule:", rule)
                                setEditingRuleId(ruleId)
                                setEditRuleDialogOpen(true)

                                // Call onEditRule if provided
                                if (onEditRule) {
                                  onEditRule(rule)
                                }
                              } else {
                                console.error("Rule not found:", ruleId)
                                toast({
                                  title: "Error",
                                  description: "Could not find the rule to edit",
                                  variant: "destructive",
                                })
                              }
                            }
                          }}
                          className="h-8 w-8 p-0"
                          title="Edit rule"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-4">
                    {showPassingValidations ? (
                      <div className="flex flex-col items-center py-6">
                        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                        <p className="text-gray-500">No validation results found with current filters</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6">
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <p className="text-gray-500">No validation issues found</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Toggle "Show passing validations" to see passing rules
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

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
                  // Log the rule being submitted
                  console.log("Submitting updated rule from ValidationResults:", updatedRule)
                  // Update directly:
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

// Helper function to highlight potentially related rows
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

// Helper function to get and format the actual value being validated
function formatCellValue(result: ValidationResult, datasets: DataTables): string {
  try {
    // Get the data from the dataset
    const row = datasets[result.table]?.[result.rowIndex]
    if (!row) return "N/A"

    const value = row[result.column]

    // Format the value based on its type
    if (value === null || value === undefined) {
      return "null"
    } else if (typeof value === "object" && value instanceof Date) {
      return value.toISOString()
    } else if (typeof value === "object") {
      return JSON.stringify(value)
    } else if (typeof value === "boolean") {
      return value ? "true" : "false"
    } else if (typeof value === "string") {
      // Truncate long strings
      return value.length > 50 ? `${value.substring(0, 47)}...` : value
    } else {
      return String(value)
    }
  } catch (error) {
    console.error("Error formatting cell value:", error)
    return "Error"
  }
}
