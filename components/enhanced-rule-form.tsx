"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { DataQualityRule, RuleType, RuleSeverity, TableName, DataTables } from "@/lib/types"
import { TooltipProvider } from "@/components/ui/tooltip"

interface EnhancedRuleFormProps {
  initialRule?: DataQualityRule
  tables: DataTables
  onSubmit: (rule: DataQualityRule) => void
  onCancel: () => void
}

const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "required", label: "Required Field" },
  { value: "range", label: "Numeric Range" },
  { value: "regex", label: "Regex Pattern" },
  { value: "unique", label: "Unique Values" },
  { value: "type", label: "Data Type" },
  { value: "enum", label: "Enumeration" },
  { value: "dependency", label: "Conditional Dependency" },
  { value: "cross-column", label: "Cross-Column Validation" },
  { value: "lookup", label: "Table Lookup" },
  { value: "custom", label: "Custom Function" },
].sort((a, b) => a.label.localeCompare(b.label))

export function EnhancedRuleForm({ initialRule, tables, onSubmit, onCancel }: EnhancedRuleFormProps) {
  const [rule, setRule] = useState<DataQualityRule>(
    initialRule || {
      id: crypto.randomUUID(),
      name: "",
      tableName: "users",
      column: "",
      ruleType: "required",
      parameters: {},
      description: "",
      severity: "failure",
      enabled: true,
    },
  )

  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  useEffect(() => {
    if (initialRule) {
      setRule(initialRule)
      setSelectedColumns(initialRule.additionalColumns || [])
    }
  }, [initialRule])

  const handleChange = (field: keyof DataQualityRule, value: any) => {
    setRule((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleParameterChange = (key: string, value: any) => {
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Add selected columns to the rule if any
    const finalRule = {
      ...rule,
      additionalColumns: selectedColumns.length > 0 ? selectedColumns : undefined,
    }

    onSubmit(finalRule)
  }

  const getColumnsForTable = (tableName: TableName) => {
    if (tables[tableName] && tables[tableName].length > 0) {
      return Object.keys(tables[tableName][0])
    }
    return []
  }

  const currentTableColumns = getColumnsForTable(rule.tableName)

  const addColumnToSelection = (column: string) => {
    if (!selectedColumns.includes(column) && column !== rule.column) {
      setSelectedColumns([...selectedColumns, column])
    }
  }

  const removeColumnFromSelection = (column: string) => {
    setSelectedColumns(selectedColumns.filter((c) => c !== column))
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              value={rule.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Valid Probability Range"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={rule.severity} onValueChange={(value) => handleChange("severity", value as RuleSeverity)}>
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Warnings highlight potential issues but don't count as validation failures.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tableName">Table</Label>
            <Select
              value={rule.tableName}
              onValueChange={(value) => {
                handleChange("tableName", value as TableName)
                // Reset column when table changes
                handleChange("column", "")
                setSelectedColumns([])
              }}
            >
              <SelectTrigger id="tableName">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="column">Primary Column</Label>
            <Select value={rule.column} onValueChange={(value) => handleChange("column", value)}>
              <SelectTrigger id="column">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {currentTableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ruleType">Rule Type</Label>
            <Select value={rule.ruleType} onValueChange={(value) => handleChange("ruleType", value as RuleType)}>
              <SelectTrigger id="ruleType">
                <SelectValue placeholder="Select rule type" />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="enabled"
                checked={rule.enabled !== false}
                onCheckedChange={(checked) => handleChange("enabled", checked === true)}
              />
              <Label htmlFor="enabled" className="font-normal">
                Rule enabled
              </Label>
            </div>
            <p className="text-xs text-gray-500">Disabled rules will not be evaluated during validation.</p>
          </div>
        </div>

        {rule.ruleType === "lookup" && (
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-medium">Lookup Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceTable">Reference Table</Label>
                <Select
                  value={rule.referenceTable || ""}
                  onValueChange={(value) => handleChange("referenceTable", value as TableName)}
                >
                  <SelectTrigger id="referenceTable">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceColumn">Reference Column</Label>
                <Select
                  value={rule.referenceColumn || ""}
                  onValueChange={(value) => handleChange("referenceColumn", value)}
                >
                  <SelectTrigger id="referenceColumn">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {rule.referenceTable &&
                      tables[rule.referenceTable] &&
                      tables[rule.referenceTable].length > 0 &&
                      Object.keys(tables[rule.referenceTable][0]).map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic parameters based on rule type */}
        <div className="space-y-4 border p-4 rounded-md">
          <h3 className="font-medium">Rule Parameters</h3>

          {rule.ruleType === "required" && (
            <p className="text-sm text-gray-500">No parameters needed for required field check.</p>
          )}

          {rule.ruleType === "range" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min">Minimum Value</Label>
                <Input
                  id="min"
                  type="number"
                  value={rule.parameters.min ?? ""}
                  onChange={(e) => handleParameterChange("min", Number.parseFloat(e.target.value))}
                  placeholder="e.g., 0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Maximum Value</Label>
                <Input
                  id="max"
                  type="number"
                  value={rule.parameters.max ?? ""}
                  onChange={(e) => handleParameterChange("max", Number.parseFloat(e.target.value))}
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          )}

          {rule.ruleType === "regex" && (
            <div className="space-y-2">
              <Label htmlFor="pattern">Regex Pattern</Label>
              <Input
                id="pattern"
                value={rule.parameters.pattern ?? ""}
                onChange={(e) => handleParameterChange("pattern", e.target.value)}
                placeholder="e.g., ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
              />
            </div>
          )}

          {rule.ruleType === "type" && (
            <div className="space-y-2">
              <Label htmlFor="dataType">Expected Data Type</Label>
              <Select
                value={rule.parameters.dataType ?? ""}
                onValueChange={(value) => handleParameterChange("dataType", value)}
              >
                <SelectTrigger id="dataType">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="object">Object</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {rule.ruleType === "enum" && (
            <div className="space-y-2">
              <Label htmlFor="allowedValues">Allowed Values (comma separated)</Label>
              <Input
                id="allowedValues"
                value={Array.isArray(rule.parameters.allowedValues) ? rule.parameters.allowedValues.join(", ") : ""}
                onChange={(e) =>
                  handleParameterChange(
                    "allowedValues",
                    e.target.value.split(",").map((v) => v.trim()),
                  )
                }
                placeholder="e.g., active, pending, inactive"
              />
            </div>
          )}

          {rule.ruleType === "dependency" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dependsOn">Depends On Column</Label>
                <Select
                  value={rule.parameters.dependsOn ?? ""}
                  onValueChange={(value) => handleParameterChange("dependsOn", value)}
                >
                  <SelectTrigger id="dependsOn">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTableColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition (JavaScript expression)</Label>
                <Input
                  id="condition"
                  value={rule.parameters.condition ?? ""}
                  onChange={(e) => handleParameterChange("condition", e.target.value)}
                  placeholder="e.g., dependsOnValue === true"
                />
                <p className="text-xs text-gray-500">
                  Use 'dependsOnValue' to refer to the value of the dependency column
                </p>
              </div>
            </div>
          )}

          {rule.ruleType === "cross-column" && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition (JavaScript expression)</Label>
              <Textarea
                id="condition"
                value={rule.parameters.condition ?? ""}
                onChange={(e) => handleParameterChange("condition", e.target.value)}
                placeholder="e.g., value > 100 ? row.notes !== null : true"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Use 'value' to refer to the primary column value and 'row' to access any column in the record
              </p>
            </div>
          )}

          {rule.ruleType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="functionBody">Custom Validation Function</Label>
              <Textarea
                id="functionBody"
                value={rule.parameters.functionBody ?? ""}
                onChange={(e) => handleParameterChange("functionBody", e.target.value)}
                placeholder="return value !== null && typeof value === 'string' && value.length > 0;"
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Write a function body that returns true if valid, false if invalid. The function has access to 'value'
                (the cell value) and 'row' (the entire data row).
              </p>
            </div>
          )}
        </div>

        {/* Secondary Columns section moved here, just above Description */}
        {(rule.ruleType === "cross-column" || rule.ruleType === "custom") && (
          <div className="space-y-2 border p-4 rounded-md">
            <Label>Additional Columns</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedColumns.map((column) => (
                <Badge key={column} variant="secondary" className="flex items-center gap-1">
                  {column}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      removeColumnFromSelection(column)
                    }}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select onValueChange={addColumnToSelection}>
                <SelectTrigger id="additionalColumn" className="flex-1">
                  <SelectValue placeholder="Add column" />
                </SelectTrigger>
                <SelectContent>
                  {currentTableColumns
                    .filter((col) => col !== rule.column && !selectedColumns.includes(col))
                    .map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const select = document.getElementById("additionalColumn") as HTMLSelectElement
                  if (select && select.value) {
                    addColumnToSelection(select.value)
                  }
                }}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select additional columns that this rule will reference</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={rule.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this rule checks for..."
            rows={2}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{initialRule ? "Update Rule" : "Add Rule"}</Button>
        </div>
      </form>
    </TooltipProvider>
  )
}
