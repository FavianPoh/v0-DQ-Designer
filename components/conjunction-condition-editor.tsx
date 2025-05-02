"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import type { Condition } from "@/lib/types"

interface ConjunctionConditionEditorProps {
  columns: string[]
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

export function ConjunctionConditionEditor({ columns, conditions, onChange }: ConjunctionConditionEditorProps) {
  const [newCondition, setNewCondition] = useState<Condition>({
    column: "",
    operator: "!=",
    value: "",
  })

  const handleAddCondition = () => {
    if (!newCondition.column) return

    const updatedConditions = [...conditions, { ...newCondition }]
    onChange(updatedConditions)

    // Reset the new condition form
    setNewCondition({
      column: "",
      operator: "!=",
      value: "",
    })
  }

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...conditions]
    updatedConditions.splice(index, 1)
    onChange(updatedConditions)
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
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Conditions (All conditions must be true)</h3>

        {conditions.length > 0 ? (
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <Card key={index}>
                <CardContent className="py-3 flex items-center gap-2">
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium">{condition.column}</span>
                    <span className="text-sm">
                      {operatorOptions.find((op) => op.value === condition.operator)?.label || condition.operator}
                    </span>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {condition.value === "" ? "''" : String(condition.value)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCondition(index)}
                    title="Remove condition"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <Label htmlFor="condition-value" className="text-xs">
              Value
            </Label>
            <Input
              id="condition-value"
              value={newCondition.value === null ? "" : String(newCondition.value)}
              onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
              placeholder="Value to compare"
            />
          </div>
        </div>

        <Button onClick={handleAddCondition} disabled={!newCondition.column} size="sm" className="w-full mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        <p>All conditions must be true for the rule to pass. When a rule passes, no validation error is triggered.</p>
        <p className="mt-1">
          Example: If you want to ensure that both email and name are not blank, create conditions: "email != blank" AND
          "name != blank".
        </p>
      </div>
    </div>
  )
}
