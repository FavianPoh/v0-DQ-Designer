"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Calculator } from "lucide-react"
import type { DataRecord } from "@/lib/types"

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
}: SyntaxDrivenFormulaEditorProps) {
  const [formulaInput, setFormulaInput] = useState(formula)

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

  const clearFormula = () => {
    handleFormulaChange("")
  }

  return (
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
          Create a formula using column names and operators.{" "}
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
  )
}
