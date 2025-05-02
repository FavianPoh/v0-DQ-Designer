"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Info } from "lucide-react"
import type { Condition, LogicalOperator } from "@/lib/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MultiColumnConditionEditorProps {
  columns: string[]
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

export function MultiColumnConditionEditor({ columns, conditions, onChange }: MultiColumnConditionEditorProps) {
  const [newCondition, setNewCondition] = useState<Condition>({
    column: "",
    operator: "==",
    value: "",
    logicalOperator: "AND",
  })

  // Ensure all conditions have logical operators (except the last one)
  useEffect(() => {
    if (conditions.length > 1) {
      const needsUpdate = conditions.some(
        (condition, index) => index < conditions.length - 1 && !condition.logicalOperator,
      )

      if (needsUpdate) {
        const updatedConditions = conditions.map((condition, index) => {
          if (index < conditions.length - 1 && !condition.logicalOperator) {
            return { ...condition, logicalOperator: "AND" }
          }
          return condition
        })
        onChange(updatedConditions)
      }
    }
  }, [conditions, onChange])

  const handleAddCondition = () => {
    if (!newCondition.column) return

    // Create a copy of the conditions array
    const updatedConditions = [...conditions]

    // If there are existing conditions, ensure the last one has a logical operator
    if (updatedConditions.length > 0) {
      const lastIndex = updatedConditions.length - 1
      updatedConditions[lastIndex] = {
        ...updatedConditions[lastIndex],
        logicalOperator: updatedConditions[lastIndex].logicalOperator || "AND",
      }
    }

    // Add the new condition (without a logical operator since it will be the last one)
    updatedConditions.push({
      ...newCondition,
      logicalOperator: undefined, // The last condition doesn't need a logical operator
    })

    onChange(updatedConditions)

    // Reset the new condition form
    setNewCondition({
      column: "",
      operator: "==",
      value: "",
      logicalOperator: "AND",
    })
  }

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...conditions]
    updatedConditions.splice(index, 1)

    // If we removed anything but the last condition, we need to ensure logical operators are still valid
    if (updatedConditions.length > 0) {
      // Make sure the last condition doesn't have a logical operator
      const lastIndex = updatedConditions.length - 1
      if (updatedConditions[lastIndex].logicalOperator) {
        updatedConditions[lastIndex] = {
          ...updatedConditions[lastIndex],
          logicalOperator: undefined,
        }
      }
    }

    onChange(updatedConditions)
  }

  const handleUpdateCondition = (index: number, field: keyof Condition, value: any) => {
    const updatedConditions = [...conditions]
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value,
    }
    onChange(updatedConditions)
  }

  const handleUpdateLogicalOperator = (index: number, operator: LogicalOperator) => {
    // Only update logical operators for conditions that aren't the last one
    if (index < conditions.length - 1) {
      const updatedConditions = [...conditions]
      updatedConditions[index] = {
        ...updatedConditions[index],
        logicalOperator: operator,
      }
      onChange(updatedConditions)
    }
  }

  const operatorOptions = [
    { value: "==", label: "equals" },
    { value: "!=", label: "not equals" },
    { value: ">", label: "greater than" },
    { value: ">=", label: "greater than or equal" },
    { value: "<", label: "less than" },
    { value: "<=", label: "less than or equal" },
    { value: "contains", label: "contains" },
    { value: "not-contains", label: "does not contain" },
    { value: "starts-with", label: "starts with" },
    { value: "ends-with", label: "ends with" },
    { value: "matches", label: "matches pattern" },
    { value: "is-blank", label: "is blank" },
    { value: "is-not-blank", label: "is not blank" },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Multi-Column Conditions</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Create multiple conditions connected with AND/OR operators. For example:</p>
                <ul className="list-disc pl-4 mt-1 text-xs">
                  <li>To check if category is C, D, or E AND score is greater than 75:</li>
                  <li className="pl-2 mt-1">1. category == C [OR]</li>
                  <li className="pl-2">2. category == D [OR]</li>
                  <li className="pl-2">3. category == E [AND]</li>
                  <li className="pl-2">4. score &gt; 75</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {conditions.length > 0 ? (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div key={index} className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 flex justify-between items-center border-b">
                  <div className="font-medium text-sm">Condition #{index + 1}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCondition(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`condition-${index}-column`} className="text-xs">
                        Column
                      </Label>
                      <Select
                        value={condition.column}
                        onValueChange={(value) => handleUpdateCondition(index, "column", value)}
                      >
                        <SelectTrigger id={`condition-${index}-column`}>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`condition-${index}-operator`} className="text-xs">
                        Operator
                      </Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => handleUpdateCondition(index, "operator", value as any)}
                      >
                        <SelectTrigger id={`condition-${index}-operator`}>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operatorOptions.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      {condition.operator !== "is-blank" && condition.operator !== "is-not-blank" && (
                        <>
                          <Label htmlFor={`condition-${index}-value`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`condition-${index}-value`}
                            value={condition.value === null ? "" : String(condition.value)}
                            onChange={(e) => handleUpdateCondition(index, "value", e.target.value)}
                            placeholder="Value to compare"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Only show logical operator for conditions that aren't the last one */}
                  {index < conditions.length - 1 && (
                    <div className="pt-2 border-t">
                      <Label className="text-xs mb-1 block">Connect with next condition using:</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={condition.logicalOperator === "AND" ? "default" : "outline"}
                          onClick={() => handleUpdateLogicalOperator(index, "AND")}
                          className="flex-1"
                        >
                          AND
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={condition.logicalOperator === "OR" ? "default" : "outline"}
                          onClick={() => handleUpdateLogicalOperator(index, "OR")}
                          className="flex-1"
                        >
                          OR
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
            No conditions added yet. Add a condition below.
          </div>
        )}
      </div>

      <div className="border p-4 rounded-md space-y-3">
        <h3 className="text-sm font-medium">Add a new condition</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="condition-column" className="text-xs">
              Column
            </Label>
            <Select
              value={newCondition.column}
              onValueChange={(value) => setNewCondition({ ...newCondition, column: value })}
            >
              <SelectTrigger id="condition-column">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="condition-operator" className="text-xs">
              Operator
            </Label>
            <Select
              value={newCondition.operator}
              onValueChange={(value) => setNewCondition({ ...newCondition, operator: value as any })}
            >
              <SelectTrigger id="condition-operator">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {newCondition.operator !== "is-blank" && newCondition.operator !== "is-not-blank" ? (
              <>
                <Label htmlFor="condition-value" className="text-xs">
                  Value
                </Label>
                <Input
                  id="condition-value"
                  value={newCondition.value === null ? "" : String(newCondition.value)}
                  onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
                  placeholder="Value to compare"
                />
              </>
            ) : (
              <div className="flex items-end h-full">
                <p className="text-xs text-gray-500">No value needed for this operator</p>
              </div>
            )}
          </div>
        </div>

        {conditions.length > 0 && (
          <div className="pt-2 border-t mt-3">
            <Label className="text-xs mb-1 block">Connect with previous conditions using:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={newCondition.logicalOperator === "AND" ? "default" : "outline"}
                onClick={() => setNewCondition({ ...newCondition, logicalOperator: "AND" })}
                className="flex-1"
              >
                AND
              </Button>
              <Button
                type="button"
                size="sm"
                variant={newCondition.logicalOperator === "OR" ? "default" : "outline"}
                onClick={() => setNewCondition({ ...newCondition, logicalOperator: "OR" })}
                className="flex-1"
              >
                OR
              </Button>
            </div>
          </div>
        )}

        <Button onClick={handleAddCondition} disabled={!newCondition.column} className="w-full mt-3">
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>

      {conditions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-1">How your conditions are evaluated:</h4>
          <div className="text-xs text-blue-700 font-mono bg-white p-2 rounded border border-blue-100 overflow-x-auto">
            {conditions.map((condition, index) => {
              const column = condition.column
              const operator =
                operatorOptions.find((op) => op.value === condition.operator)?.label || condition.operator
              const value = condition.value === null ? "null" : String(condition.value)
              const logicalOp = condition.logicalOperator || ""

              return (
                <span key={index}>
                  {index > 0 && <span className="font-bold"> {conditions[index - 1].logicalOperator} </span>}
                  <span>
                    ({column} {operator} {value})
                  </span>
                  {index < conditions.length - 1 && index === conditions.length - 2 && (
                    <span className="font-bold"> {logicalOp} </span>
                  )}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            This is how your conditions will be combined to evaluate the rule.
          </p>
        </div>
      )}
    </div>
  )
}
