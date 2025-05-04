"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { X, Calculator } from "lucide-react"

interface FormulaRuleEditorProps {
  columns: string[]
  formula: string
  operator: string
  value: number
  onFormulaChange: (formula: string) => void
  onOperatorChange: (operator: string) => void
  onValueChange: (value: number) => void
  selectedColumn?: string // Add this prop to track the selected column
}

export function FormulaRuleEditor({
  columns,
  formula,
  operator,
  value,
  onFormulaChange,
  onOperatorChange,
  onValueChange,
  selectedColumn, // Accept the selectedColumn prop
}: FormulaRuleEditorProps) {
  const [formulaInput, setFormulaInput] = useState(formula)

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
            required
          />
          {/* Update the clear button */}
          <Button variant="outline" size="icon" onClick={(e) => clearFormula(e)} title="Clear formula">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Create a mathematical formula using column names and operators. The formula will be evaluated for each row.
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
            <Button variant="outline" size="sm" onClick={(e) => insertOperator("+", e)} className="text-lg font-mono">
              +
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => insertOperator("-", e)} className="text-lg font-mono">
              -
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => insertOperator("*", e)} className="text-lg font-mono">
              *
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => insertOperator("/", e)} className="text-lg font-mono">
              /
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => insertOperator("(", e)} className="text-lg font-mono">
              (
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => insertOperator(")", e)} className="text-lg font-mono">
              )
            </Button>
          </div>
        </Card>
      </div>

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
          <span className="font-mono">{formulaInput || "[formula]"}</span> <span className="font-mono">{operator}</span>{" "}
          <span className="font-mono">{value}</span>
        </div>
      </div>
    </div>
  )
}
