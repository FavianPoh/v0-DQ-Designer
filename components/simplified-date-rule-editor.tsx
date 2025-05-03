"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import type { DataQualityRule, DataTables } from "@/lib/types"

interface SimplifiedDateRuleEditorProps {
  rule: DataQualityRule
  tables: string[]
  datasets: DataTables
  onSave: (updatedRule: DataQualityRule) => void
  onCancel: () => void
}

export function SimplifiedDateRuleEditor({ rule, tables, datasets, onSave, onCancel }: SimplifiedDateRuleEditorProps) {
  // Create a working copy of the rule to avoid reference issues
  const [editedRule, setEditedRule] = useState<DataQualityRule>(() => {
    // Deep clone the rule to avoid reference issues
    return JSON.parse(JSON.stringify(rule))
  })

  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Load available columns for the selected table
  useEffect(() => {
    if (editedRule.table && datasets[editedRule.table] && datasets[editedRule.table].length > 0) {
      const columns = Object.keys(datasets[editedRule.table][0])
      setTableColumns(columns)
    } else {
      setTableColumns([])
    }
  }, [editedRule.table, datasets])

  // Handle table change
  const handleTableChange = (table: string) => {
    setEditedRule((prev) => ({
      ...prev,
      table,
      column: "", // Reset column when table changes
    }))
    setValidationError(null)
  }

  // Handle column change
  const handleColumnChange = (column: string) => {
    console.log(`SimplifiedDateRuleEditor: Column changed to ${column}`)
    setEditedRule((prev) => ({
      ...prev,
      column,
    }))
    setValidationError(null)
  }

  // Handle parameter change
  const handleParameterChange = (key: string, value: any) => {
    setEditedRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }))
    setValidationError(null)
  }

  // Handle name change
  const handleNameChange = (name: string) => {
    setEditedRule((prev) => ({
      ...prev,
      name,
    }))
    setValidationError(null)
  }

  // Handle description change
  const handleDescriptionChange = (description: string) => {
    setEditedRule((prev) => ({
      ...prev,
      description,
    }))
    setValidationError(null)
  }

  // Validate the rule
  const validateRule = (): boolean => {
    // Check if column is selected
    if (!editedRule.column) {
      setValidationError("Please select a column for this date rule")
      return false
    }

    // Additional validation based on rule type
    if (editedRule.ruleType === "date-between") {
      if (!editedRule.parameters.startDate || !editedRule.parameters.endDate) {
        setValidationError("Please select both start and end dates")
        return false
      }
    }

    return true
  }

  // Handle save
  const handleSave = () => {
    if (!validateRule()) {
      toast({
        title: "Validation Error",
        description: validationError || "Please fix the errors before saving",
        variant: "destructive",
      })
      return
    }

    // Double-check column is selected
    if (!editedRule.column) {
      setValidationError("Please select a column for this date rule")
      toast({
        title: "Validation Error",
        description: "Please select a column for the date rule",
        variant: "destructive",
      })
      return
    }

    // Ensure the rule has the ID in the name
    let finalName = editedRule.name
    if (editedRule.id && !finalName.includes(`[ID: ${editedRule.id}]`)) {
      finalName = `${finalName} [ID: ${editedRule.id}]`
    }

    const finalRule = {
      ...editedRule,
      name: finalName,
    }

    console.log("Saving date rule with column:", finalRule.column)
    onSave(finalRule)
  }

  // Render parameters based on rule type
  const renderParameters = () => {
    switch (editedRule.ruleType) {
      case "date-before":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compareDate">Before Date</Label>
              <Input
                id="compareDate"
                type="date"
                value={editedRule.parameters.compareDate || ""}
                onChange={(e) => handleParameterChange("compareDate", e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={editedRule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the specified date (on or before)
              </Label>
            </div>
          </div>
        )

      case "date-after":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compareDate">After Date</Label>
              <Input
                id="compareDate"
                type="date"
                value={editedRule.parameters.compareDate || ""}
                onChange={(e) => handleParameterChange("compareDate", e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={editedRule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the specified date (on or after)
              </Label>
            </div>
          </div>
        )

      case "date-between":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editedRule.parameters.startDate || ""}
                  onChange={(e) => handleParameterChange("startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editedRule.parameters.endDate || ""}
                  onChange={(e) => handleParameterChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={editedRule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the boundary dates (on or between)
              </Label>
            </div>
          </div>
        )

      case "date-format":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Date Format</Label>
              <Select
                value={editedRule.parameters.format || "iso"}
                onValueChange={(value) => handleParameterChange("format", value)}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                  <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="eu">EU (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="any">Any Valid Date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {editedRule.parameters.format === "any"
                  ? "Validates that the value can be parsed as a valid date without enforcing a specific format."
                  : "Select a specific date format to enforce."}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={editedRule.parameters.required === true}
                onCheckedChange={(checked) => handleParameterChange("required", checked === true)}
              />
              <Label htmlFor="required" className="text-sm font-normal">
                Field is required (must be a valid date)
              </Label>
            </div>
          </div>
        )

      default:
        return <p>Unsupported date rule type: {editedRule.ruleType}</p>
    }
  }

  // Extract base name without ID suffix
  const baseName = editedRule.name.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Date Rule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-medium">
              Rule Name
            </Label>
            <Input
              id="name"
              value={baseName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter rule name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruleType" className="font-medium">
              Rule Type
            </Label>
            <Input id="ruleType" value={editedRule.ruleType} disabled className="bg-gray-100" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="table" className="font-medium">
              Table
            </Label>
            <Select value={editedRule.table} onValueChange={handleTableChange}>
              <SelectTrigger id="table">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="column" className="font-medium text-red-600">
              Column (Required)
            </Label>
            <Select value={editedRule.column} onValueChange={handleColumnChange}>
              <SelectTrigger id="column" className={!editedRule.column ? "border-red-500" : ""}>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {tableColumns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!editedRule.column && (
              <p className="text-xs text-red-500 font-medium">You must select a column for date rules</p>
            )}
          </div>
        </div>

        <div className="border p-4 rounded-md space-y-4">
          <h3 className="font-medium">Rule Parameters</h3>
          {renderParameters()}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="font-medium">
            Description
          </Label>
          <Input
            id="description"
            value={editedRule.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Describe what this rule checks for..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity" className="font-medium">
            Severity
          </Label>
          <Select
            value={editedRule.severity}
            onValueChange={(value) => setEditedRule((prev) => ({ ...prev, severity: value }))}
          >
            <SelectTrigger id="severity">
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!editedRule.column}>
          Save Date Rule
        </Button>
      </CardFooter>
    </Card>
  )
}
