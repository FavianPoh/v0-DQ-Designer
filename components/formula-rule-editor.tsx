"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { X, Calculator, ActivityIcon as Function } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AggregationFunctionEditor } from "./aggregation-function-editor"
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

  // Update the formula input when the formula prop changes
  useEffect(() => {
    setFormulaInput(formula)
  }, [formula])

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

  // Insert an aggregation function into the formula
  const insertAggregation = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!aggregations || index >= aggregations.length) return

    const agg = aggregations[index]
    const funcName = getFunctionName(agg.function)
    const aggText = `${funcName}("${agg.column}")`

    const newFormula = formulaInput ? `${formulaInput} ${aggText}` : aggText
    handleFormulaChange(newFormula)
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
              <Label className="mb-2 block">Insert Aggregation Functions</Label>
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
                  "Click on an aggregation function below to insert it into your formula."
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {aggregations.map((agg, index) => (
                  <Button
                    key={index}
                    variant={
                      formulaInput.includes(`${getFunctionName(agg.function)}("${agg.column}")`)
                        ? "secondary"
                        : "outline"
                    }
                    size="sm"
                    onClick={(e) => insertAggregation(index, e)}
                    className="text-xs"
                  >
                    {getFunctionName(agg.function)}("{agg.column}")
                  </Button>
                ))}
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
