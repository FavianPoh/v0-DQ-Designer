"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import type { CrossTableCondition, LogicalOperator, DataTables } from "@/lib/types"

interface CrossTableConditionEditorProps {
  datasets: DataTables
  conditions: CrossTableCondition[]
  onChange: (conditions: CrossTableCondition[]) => void
}

export function CrossTableConditionEditor({ datasets, conditions, onChange }: CrossTableConditionEditorProps) {
  const [newCondition, setNewCondition] = useState<CrossTableCondition>({
    table: Object.keys(datasets)[0] || "",
    column: "",
    operator: "!=",
    value: "",
    logicalOperator: "AND",
  })

  const handleAddCondition = () => {
    if (!newCondition.table || !newCondition.column) return

    const updatedConditions = [...conditions, { ...newCondition }]
    onChange(updatedConditions)

    // Reset the new condition form but keep the selected table
    setNewCondition({
      table: newCondition.table,
      column: "",
      operator: "!=",
      value: "",
      logicalOperator: "AND",
    })
  }

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...conditions]
    updatedConditions.splice(index, 1)
    onChange(updatedConditions)
  }

  const handleUpdateCondition = (index: number, field: keyof CrossTableCondition, value: any) => {
    const updatedConditions = [...conditions]
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value,
    }
    onChange(updatedConditions)
  }

  const getColumnsForTable = (tableName: string) => {
    if (datasets[tableName] && datasets[tableName].length > 0) {
      return Object.keys(datasets[tableName][0])
    }
    return []
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
        <h3 className="text-sm font-medium">Cross-Table Conditions</h3>

        {conditions.length > 0 ? (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="space-y-2">
                <Card>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      <div>
                        <Label htmlFor={`condition-${index}-table`} className="text-xs">
                          Table
                        </Label>
                        <Select
                          value={condition.table}
                          onValueChange={(value) => {
                            // When changing table, reset column
                            handleUpdateCondition(index, "table", value)
                            handleUpdateCondition(index, "column", "")
                          }}
                        >
                          <SelectTrigger id={`condition-${index}-table`}>
                            <SelectValue placeholder="Select table" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(datasets).map((table) => (
                              <SelectItem key={table} value={table}>
                                {table.charAt(0).toUpperCase() + table.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                            {getColumnsForTable(condition.table).map((column) => (
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

                      <div className="flex items-end gap-2">
                        {index < conditions.length - 1 && (
                          <div className="flex-1">
                            <Label htmlFor={`condition-${index}-logical`} className="text-xs">
                              Connect with
                            </Label>
                            <Select
                              value={condition.logicalOperator || "AND"}
                              onValueChange={(value) =>
                                handleUpdateCondition(index, "logicalOperator", value as LogicalOperator)
                              }
                            >
                              <SelectTrigger id={`condition-${index}-logical`}>
                                <SelectValue placeholder="Logical operator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCondition(index)}
                          title="Remove condition"
                          className="mb-1"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {index < conditions.length - 1 && (
                  <div className="flex justify-center">
                    <div className="px-4 py-1 bg-gray-100 rounded-full text-sm font-medium">
                      {condition.logicalOperator || "AND"}
                    </div>
                  </div>
                )}
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <Label htmlFor="new-condition-table" className="text-xs">
              Table
            </Label>
            <Select
              value={newCondition.table}
              onValueChange={(value) => {
                setNewCondition({
                  ...newCondition,
                  table: value,
                  column: "", // Reset column when table changes
                })
              }}
            >
              <SelectTrigger id="new-condition-table">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(datasets).map((table) => (
                  <SelectItem key={table} value={table}>
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-condition-column" className="text-xs">
              Column
            </Label>
            <Select
              value={newCondition.column}
              onValueChange={(value) => setNewCondition({ ...newCondition, column: value })}
            >
              <SelectTrigger id="new-condition-column">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {getColumnsForTable(newCondition.table).map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-condition-operator" className="text-xs">
              Operator
            </Label>
            <Select
              value={newCondition.operator}
              onValueChange={(value) => setNewCondition({ ...newCondition, operator: value as any })}
            >
              <SelectTrigger id="new-condition-operator">
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
                <Label htmlFor="new-condition-value" className="text-xs">
                  Value
                </Label>
                <Input
                  id="new-condition-value"
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
          <div>
            <Label htmlFor="new-condition-logical" className="text-xs">
              Connect with previous condition using
            </Label>
            <Select
              value={newCondition.logicalOperator || "AND"}
              onValueChange={(value) => setNewCondition({ ...newCondition, logicalOperator: value as LogicalOperator })}
            >
              <SelectTrigger id="new-condition-logical">
                <SelectValue placeholder="Logical operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleAddCondition}
          disabled={!newCondition.table || !newCondition.column}
          size="sm"
          className="w-full mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        <p>
          Create conditions that reference columns from any table. These conditions are combined with the primary rule
          using AND logic.
        </p>
        <p className="mt-1">
          Example: If your primary rule checks "age &gt; 18" in the users table, you can add a condition to check
          "transactions.amount &gt; 100" in the transactions table.
        </p>
      </div>
    </div>
  )
}
