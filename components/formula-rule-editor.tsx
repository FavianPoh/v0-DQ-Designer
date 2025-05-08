"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { X, Calculator, ActivityIcon as Function, FilterIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AggregationFunctionEditor from "@/components/aggregation-function-editor"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { AggregationConfig } from "@/lib/types"

interface FormulaRuleEditorProps {
  columns: string[]
  formula: string
  operator: string
  value: number
  onFormulaChange: (formula: string) => void
  onOperatorChange: (operator: string) => void
  onValueChange: (value: number) => void
  selectedColumn?: string // Add this prop to track the selected column
  aggregations?: AggregationConfig[]
  onAggregationsChange?: (aggregations: AggregationConfig[]) => void
}

export function FormulaRuleEditor({
  columns,
  formula,
  operator,
  value,
  onFormulaChange,
  onOperatorChange,
  onValueChange,
  selectedColumn,
  aggregations = [],
  onAggregationsChange,
}: FormulaRuleEditorProps) {
  const [formulaInput, setFormulaInput] = useState(formula)
  const [activeTab, setActiveTab] = useState<string>("formula")

  // Update the useEffect hook to properly initialize the formula input when the formula prop changes
  // This ensures that when editing an existing rule, the formula field is pre-populated
  useEffect(() => {
    console.log("Formula prop changed:", formula)
    if (formula) {
      console.log("Setting formula input to:", formula)
      setFormulaInput(formula)
    }
  }, [formula])

  // Ensure the component properly initializes with all props
  useEffect(() => {
    console.log("FormulaRuleEditor props:", {
      formula,
      operator,
      value,
      aggregations,
    })

    // Ensure formula input is initialized with the formula prop
    if (formula && formulaInput !== formula) {
      console.log("Initializing formula input with:", formula)
      setFormulaInput(formula)
    }
  }, [formula, operator, value, aggregations, formulaInput])

  // Add a new useEffect to ensure operator and value are initialized with their props
  useEffect(() => {
    // If operator is undefined or null, set a default
    if (operator === undefined || operator === null) {
      console.log("Setting default operator to '=='")
      onOperatorChange("==")
    }

    // If value is undefined or null, set a default
    if (value === undefined || value === null) {
      console.log("Setting default value to 0")
      onValueChange(0)
    } else if (value !== 0) {
      // Log non-zero values to help with debugging
      console.log("Using non-zero comparison value:", value)
    }
  }, [operator, value, onOperatorChange, onValueChange])

  // Update the handleFormulaChange function to add validation
  const handleFormulaChange = (newFormula: string) => {
    setFormulaInput(newFormula)
    onFormulaChange(newFormula)
  }

  // Update the insertColumn function to prevent event propagation
  const insertColumn = (column: string, e: React.MouseEvent) => {
    // Prevent event propagation to stop the rule builder from closing
    e.preventDefault()
    e.stopPropagation()

    const newFormula = formulaInput ? `${formulaInput} ${column}` : column
    handleFormulaChange(newFormula)
  }

  // Update the insertOperator function to prevent event propagation
  const insertOperator = (op: string, e: React.MouseEvent) => {
    // Prevent event propagation to stop the rule builder from closing
    e.preventDefault()
    e.stopPropagation()

    const newFormula = formulaInput ? `${formulaInput} ${op} ` : ""
    handleFormulaChange(newFormula)
  }

  // Update the clearFormula function to prevent event propagation
  const clearFormula = (e: React.MouseEvent) => {
    // Prevent event propagation to stop the rule builder from closing
    e.preventDefault()
    e.stopPropagation()

    handleFormulaChange("")
  }

  // Add support for distinct group aggregations in the getFullAggregationText function

  // Helper function to generate the full aggregation text with filters
  const getFullAggregationText = (agg: AggregationConfig): string => {
    const funcName = getFunctionName(agg.function)

    // Check if this is a distinct group aggregation
    if (agg.function.startsWith("distinct-group-") && agg.groupColumns?.length) {
      // Format the group columns as an array
      const groupColumnsText = `[${agg.groupColumns.map((col) => `"${col}"`).join(", ")}]`

      // Return the full distinct group function text, with or without distinctColumn
      if (agg.distinctColumn) {
        return `${funcName}("${agg.column}", ${groupColumnsText}, "${agg.distinctColumn}")`
      } else {
        return `${funcName}("${agg.column}", ${groupColumnsText})`
      }
    }

    // Update how we format the filter text for aggregations
    let filterText = ""
    if (agg.filter) {
      if ("conditions" in agg.filter) {
        // New multi-condition filter
        const conditions = agg.filter.conditions
          .map((c) => `${c.column} ${c.operator} ${typeof c.value === "string" ? `"${c.value}"` : c.value}`)
          .join(` ${agg.filter.type} `)
        filterText = `, ${conditions}`
      } else {
        // Legacy single condition filter
        filterText = `, ${agg.filter.column} ${agg.filter.operator} ${
          typeof agg.filter.value === "string" ? `"${agg.filter.value}"` : agg.filter.value
        }`
      }
    }

    return `${funcName}("${agg.column}"${filterText})`
  }

  // Insert an aggregation function into the formula
  const insertAggregation = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!aggregations || index >= aggregations.length) return

    const agg = aggregations[index]
    const aggText = getFullAggregationText(agg)
    const funcName = getFunctionName(agg.function)

    // Check if this is a distinct group aggregation
    if (agg.function.startsWith("distinct-group-")) {
      // For distinct group aggregations, we need a different pattern
      const basePattern = new RegExp(`${funcName}\$$"${agg.column}",[^)]+\$$`, "g")

      if (formulaInput.match(basePattern)) {
        // Replace the existing function with the new one
        const newFormula = formulaInput.replace(basePattern, aggText)
        handleFormulaChange(newFormula)
      } else {
        // If it doesn't exist, append with proper spacing
        const newFormula = formulaInput.trim()
          ? formulaInput.trim().endsWith("+") ||
            formulaInput.trim().endsWith("-") ||
            formulaInput.trim().endsWith("*") ||
            formulaInput.trim().endsWith("/") ||
            formulaInput.trim().endsWith("(")
            ? `${formulaInput} ${aggText}`
            : `${formulaInput} + ${aggText}` // Default to addition if no operator
          : aggText
        handleFormulaChange(newFormula)
      }
      return
    }

    // Check if this function already exists in the formula (with or without filters)
    const basePattern = new RegExp(`${funcName}\\("${agg.column}"(,\\s*[^)]*)?\$$`, "g")

    if (formulaInput.match(basePattern)) {
      // Replace the existing function with the new one
      const newFormula = formulaInput.replace(basePattern, aggText)
      handleFormulaChange(newFormula)
    } else {
      // If it doesn't exist, append with proper spacing
      const newFormula = formulaInput.trim()
        ? formulaInput.trim().endsWith("+") ||
          formulaInput.trim().endsWith("-") ||
          formulaInput.trim().endsWith("*") ||
          formulaInput.trim().endsWith("/") ||
          formulaInput.trim().endsWith("(")
          ? `${formulaInput} ${aggText}`
          : `${formulaInput} + ${aggText}` // Default to addition if no operator
        : aggText
      handleFormulaChange(newFormula)
    }
  }

  // Function to remove an aggregation function from the formula
  const removeAggregation = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!aggregations || index >= aggregations.length) return

    const agg = aggregations[index]
    const funcName = getFunctionName(agg.function)

    // Check if this is a distinct group aggregation
    if (agg.function.startsWith("distinct-group-") && agg.groupColumns?.length && agg.distinctColumn) {
      // Create a pattern to match the distinct group function
      const groupColumnsText = agg.groupColumns.map((col) => `"${col}"`).join(", ")
      const basePattern = new RegExp(
        `\\s*[+\\-*/]?\\s*${funcName}\$$"${agg.column}"\\s*,\\s*\\[${groupColumnsText}\\]\\s*,\\s*"${agg.distinctColumn}"\$$`,
        "g",
      )

      // Also match if it's at the beginning of the formula
      const startPattern = new RegExp(
        `^${funcName}\$$"${agg.column}"\\s*,\\s*\\[${groupColumnsText}\\]\\s*,\\s*"${agg.distinctColumn}"\$$`,
        "g",
      )

      // Replace the function with empty string
      let newFormula = formulaInput.replace(basePattern, "")
      newFormula = newFormula.replace(startPattern, "")

      // Clean up any double operators that might result
      newFormula = newFormula.replace(/\s*[+\-*/]\s*[+\-*/]\s*/g, " + ")

      // Clean up any trailing or leading operators
      newFormula = newFormula.replace(/^\s*[+\-*/]\s*/, "")
      newFormula = newFormula.replace(/\s*[+\-*/]\s*$/, "")

      // Clean up any extra spaces
      newFormula = newFormula.trim()

      handleFormulaChange(newFormula)
      return
    }

    // Create a pattern to match the function with or without filters
    const basePattern = new RegExp(`\\s*[+\\-*/]?\\s*${funcName}\\("${agg.column}"(,\\s*[^)]*)?\$$`, "g")

    // Also match if it's at the beginning of the formula
    const startPattern = new RegExp(`^${funcName}\\("${agg.column}"(,\\s*[^)]*)?\$$`, "g")

    // Replace the function with empty string
    let newFormula = formulaInput.replace(basePattern, "")
    newFormula = newFormula.replace(startPattern, "")

    // Clean up any double operators that might result
    newFormula = newFormula.replace(/\s*[+\-*/]\s*[+\-*/]\s*/g, " + ")

    // Clean up any trailing or leading operators
    newFormula = newFormula.replace(/^\s*[+\-*/]\s*/, "")
    newFormula = newFormula.replace(/\s*[+\-*/]\s*$/, "")

    // Clean up any extra spaces
    newFormula = newFormula.trim()

    handleFormulaChange(newFormula)
  }

  // Helper function to check if an aggregation has filters
  const hasFilters = (agg: AggregationConfig): boolean => {
    return (
      !!agg.filter &&
      (("conditions" in agg.filter && agg.filter.conditions.length > 0) ||
        (!("conditions" in agg.filter) && !!agg.filter.column))
    )
  }

  // Helper function to check if an aggregation is a distinct group type
  const isDistinctGroupAggregation = (functionName: string): boolean => {
    return functionName.startsWith("distinct-group-")
  }

  const handleAggregationsChange = (newAggregations: AggregationConfig[]) => {
    if (onAggregationsChange) {
      onAggregationsChange(newAggregations)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="formula" className="flex-1">
            <Calculator className="h-4 w-4 mr-2" />
            Formula
          </TabsTrigger>
          <TabsTrigger value="aggregations" className="flex-1">
            <Function className="h-4 w-4 mr-2" />
            Aggregations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formula" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formula">
              Math Formula <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="formula"
                value={formulaInput}
                onChange={(e) => handleFormulaChange(e.target.value)}
                placeholder='e.g., SUM("amount") or amount * 0.1 + 5'
                className="font-mono"
                required
              />
              {/* Update the clear button */}
              <Button variant="outline" size="icon" onClick={(e) => clearFormula(e)} title="Clear formula">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Required:</strong> Create a mathematical formula using column names, operators, and aggregation
              functions. If you defined aggregations, you must insert them into your formula.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <Label className="mb-2 block">Insert Column</Label>
              <div className="flex flex-wrap gap-2">
                {/* Update the button onClick handlers to pass the event */}
                {/* In the Card for inserting columns */}
                {columns.map((column) => (
                  <Button
                    key={column}
                    variant="outline"
                    size="sm"
                    onClick={(e) => insertColumn(column, e)}
                    className={`text-xs ${column === selectedColumn ? "bg-blue-100" : ""}`}
                  >
                    {column}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <Label className="mb-2 block">Insert Operator</Label>
              <div className="flex flex-wrap gap-2">
                {/* In the Card for inserting operators */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator("+", e)}
                  className="text-lg font-mono"
                >
                  +
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator("-", e)}
                  className="text-lg font-mono"
                >
                  -
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator("*", e)}
                  className="text-lg font-mono"
                >
                  *
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator("/", e)}
                  className="text-lg font-mono"
                >
                  /
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator("(", e)}
                  className="text-lg font-mono"
                >
                  (
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => insertOperator(")", e)}
                  className="text-lg font-mono"
                >
                  )
                </Button>
              </div>
            </Card>
          </div>

          {aggregations && aggregations.length > 0 && (
            <Card
              className={`p-4 ${
                !formulaInput.includes("SUM(") &&
                !formulaInput.includes("AVG(") &&
                !formulaInput.includes("COUNT(") &&
                !formulaInput.includes("MIN(") &&
                !formulaInput.includes("MAX(") &&
                !formulaInput.includes("DISTINCT_COUNT(")
                  ? "border-orange-500 bg-orange-50"
                  : ""
              }`}
            >
              <Label className="mb-2 block">Aggregation Functions</Label>
              <p className="text-xs text-gray-500 mb-2">
                {!formulaInput.includes("SUM(") &&
                !formulaInput.includes("AVG(") &&
                !formulaInput.includes("COUNT(") &&
                !formulaInput.includes("MIN(") &&
                !formulaInput.includes("MAX(") &&
                !formulaInput.includes("DISTINCT_COUNT(") ? (
                  <strong className="text-orange-700">
                    You must add at least one aggregation function to your formula. Click on a button below to add it.
                  </strong>
                ) : (
                  "Click to insert or remove aggregation functions from your formula."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {aggregations.map((agg, index) => {
                  const funcName = getFunctionName(agg.function)
                  const funcPattern = new RegExp(`${funcName}\\("${agg.column}"(,\\s*[^)]*)?\$$`, "g")
                  const isInFormula = formulaInput.match(funcPattern) !== null
                  const hasFilter = hasFilters(agg)
                  const fullAggText = getFullAggregationText(agg)

                  return (
                    <div key={index} className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isInFormula ? "secondary" : "outline"}
                              size="sm"
                              onClick={(e) => insertAggregation(index, e)}
                              className={`text-xs ${hasFilter ? "pr-1" : ""}`}
                            >
                              {funcName}("{agg.column}")
                              {hasFilter && <FilterIcon className="h-3 w-3 ml-1 text-blue-500" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{fullAggText}</p>
                            <p className="text-xs mt-1">
                              {hasFilter ? "Includes filters - click to insert full function" : "Click to insert"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {isInFormula && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => removeAggregation(index, e)}
                          className="text-xs p-1 h-8 w-8"
                          title={`Remove ${funcName}("${agg.column}") from formula`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operator">Comparison Operator</Label>
              <Select value={operator} onValueChange={onOperatorChange}>
                <SelectTrigger id="operator">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equal to (==)</SelectItem>
                  <SelectItem value="!=">Not equal to (!=)</SelectItem>
                  <SelectItem value=">">Greater than (&gt;)</SelectItem>
                  <SelectItem value=">=">Greater than or equal to (&gt;=)</SelectItem>
                  <SelectItem value="<">Less than (&lt;)</SelectItem>
                  <SelectItem value="<=">Less than or equal to (&lt;=)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Comparison Value</Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => onValueChange(Number(e.target.value))}
                placeholder="e.g., 100"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md flex items-center gap-2 text-sm">
            <Calculator className="h-5 w-5 text-blue-500" />
            <div>
              <span className="font-mono">{formulaInput || "[formula]"}</span>{" "}
              <span className="font-mono">{operator}</span> <span className="font-mono">{value}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="aggregations">
          {onAggregationsChange ? (
            <AggregationFunctionEditor
              columns={columns}
              aggregations={aggregations || []}
              onAggregationsChange={handleAggregationsChange}
            />
          ) : (
            <div className="text-center p-8 border rounded-md border-dashed">
              <Function className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-500">Aggregation functions are not available in this context.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getFunctionName(func: string): string {
  switch (func) {
    case "sum":
      return "SUM"
    case "avg":
      return "AVG"
    case "count":
      return "COUNT"
    case "min":
      return "MIN"
    case "max":
      return "MAX"
    case "distinct-count":
      return "DISTINCT_COUNT"
    default:
      return func.toUpperCase()
  }
}
