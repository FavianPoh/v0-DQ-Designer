"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Calculator, ActivityIcon as Function, SlidersHorizontal } from 'lucide-react'
import type { DataRecord, AggregationConfig } from "@/lib/types"
import { AggregationFunctionEditor } from "./aggregation-function-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SyntaxDrivenFormulaEditorProps {
  columns: string[]
  formula: string
  useComparison: boolean
  operator: string
  value: number
  onFormulaChange: (formula: string) => void
  onUseComparisonChange: (useComparison: boolean) => void
  onOperatorChange: (operator: string) => void
  onValueChange: (value: number) => void
  data?: DataRecord[]
  aggregations?: AggregationConfig[]
  onAggregationsChange?: (aggregations: AggregationConfig[]) => void
}

export function FormulaSyntaxEditor({
  columns,
  formula,
  useComparison,
  operator,
  value,
  onFormulaChange,
  onUseComparisonChange,
  onOperatorChange,
  onValueChange,
  data,
  aggregations = [],
  onAggregationsChange,
}: SyntaxDrivenFormulaEditorProps) {
  const [formulaInput, setFormulaInput] = useState(formula)
  const [activeTab, setActiveTab] = useState<string>("formula")

  useEffect(() => {
    setFormulaInput(formula)
  }, [formula])

  const handleFormulaChange = (newFormula: string) => {
    setFormulaInput(newFormula)
    onFormulaChange(newFormula)
  }

  const insertColumn = (column: string) => {
    const newFormula = formulaInput ? `${formulaInput} ${column}` : column
    handleFormulaChange(newFormula)
  }

  const insertOperator = (op: string) => {
    const newFormula = formulaInput ? `${formulaInput} ${op} ` : ""
    handleFormulaChange(newFormula)
  }

  const insertAggregation = (index: number) => {
    if (!aggregations || index >= aggregations.length) return

    const agg = aggregations[index]
    const funcName = getFunctionName(agg.function)
    let aggText = `${funcName}("${agg.column}")`
    
    const newFormula = formulaInput ? `${formulaInput} ${aggText}` : aggText
    handleFormulaChange(newFormula)
  }

  const clearFormula = () => {
    handleFormulaChange("")
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
        
        <TabsContent value="formula">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formula">Math Formula</Label>
              <div className="flex gap-2">
                <Input
                  id="formula"
                  value={formulaInput}
                  onChange={(e) => handleFormulaChange(e.target.value)}
                  placeholder="e.g., amount * 0.1 + 5"
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={clearFormula} title="Clear formula">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Create a formula using column names, operators, and aggregation functions.{" "}
                {useComparison
                  ? "The formula result will be compared with a value using the selected operator."
                  : "The formula should evaluate to a boolean (true/false) expression."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <Label className="mb-2 block">Insert Column</Label>
                <div className="flex flex-wrap gap-2">
                  {columns.map((column) => (
                    <Button key={column} variant="outline" size="sm" onClick={() => insertColumn(column)} className="text-xs">
                      {column}
                    </Button>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <Label className="mb-2 block">Insert Operator</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => insertOperator("+")} className="text-lg font-mono">
                    +
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertOperator("-")} className="text-lg font-mono">
                    -
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertOperator("*")} className="text-lg font-mono">
                    *
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertOperator("/")} className="text-lg font-mono">
                    /
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertOperator("(")} className="text-lg font-mono">
                    (
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => insertOperator(")")} className="text-lg font-mono">
                    )
                  </Button>
                </div>
              </Card>
            </div>

            {aggregations && aggregations.length > 0 && (
              <Card className="p-4">
                <Label className="mb-2 block">Insert Aggregation</Label>
                <div className="flex flex-wrap gap-2">
                  {aggregations.map((agg, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => insertAggregation(index)}
                      className="text-xs"
                    >
                      {getFunctionName(agg.function)}({agg.column})
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex items-center space-x-2">
              <Label htmlFor="useComparison">Use Comparison</Label>
              <Select value={useComparison.toString()} onValueChange={(value) => onUseComparisonChange(value === "true")}>
                <SelectTrigger id="useComparison" className="w-[180px]">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Compare with value</SelectItem>
                  <SelectItem value="false">No - Direct boolean expression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useComparison && (
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
                    value={String(value)}
                    onChange={(e) => onValueChange(Number(e.target.value))}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md flex items-center gap-2 text-sm">
              <Calculator className="h-5 w-5 text-blue-500" />
              <div>
                <span className="font-mono">{formulaInput || "[formula]"}</span>{" "}
                {useComparison && (
                  <>
                    <span className="font-mono">{operator}</span> <span className="font-mono">{value}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="aggregations">
          {onAggregationsChange ? (
            <AggregationFunctionEditor
              columns={columns}
              aggregations={aggregations}
              onAggregationsChange={handleAggregationsChange}
            />
          ) : (
            <div className="text-center p-8 border rounded-md border-dashed">
              <SlidersHorizontal className="mx-auto h-10 w-10 text-gray-400 mb-2" />
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
    case "sum": return "SUM"
    case "avg": return "AVG"
    case "count": return "COUNT"
    case "min": return "MIN"
    case "max": return "MAX"
    case "distinct-count": return "DISTINCT_COUNT"
    default: return func.toUpperCase()
  }
}
