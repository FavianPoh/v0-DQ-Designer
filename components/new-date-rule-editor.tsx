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

interface NewDateRuleEditorProps {
  rule: DataQualityRule
  tables: string[]
  datasets: DataTables
  onSave: (updatedRule: DataQualityRule) => void
  onCancel: () => void
}

export function NewDateRuleEditor({ rule, tables, datasets, onSave, onCancel }: NewDateRuleEditorProps) {
  // Create a working copy of the rule to avoid reference issues
  const [editedRule, setEditedRule] = useState<DataQualityRule>(() => {
    // Deep clone the rule to avoid reference issues
    const clonedRule = JSON.parse(JSON.stringify(rule))

    // Initialize default parameters based on rule type
    if (clonedRule.ruleType === "date-before" || clonedRule.ruleType === "date-after") {
      if (!clonedRule.parameters.compareDate) {
        // Set default to today's date
        const today = new Date()
        const formattedDate = today.toISOString().split("T")[0] // YYYY-MM-DD format
        clonedRule.parameters.compareDate = formattedDate
        console.log(`Initialized ${clonedRule.ruleType} with default compareDate:`, formattedDate)
      }
    } else if (clonedRule.ruleType === "date-between") {
      if (!clonedRule.parameters.startDate || !clonedRule.parameters.endDate) {
        // Set default start date to 30 days ago and end date to today
        const today = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(today.getDate() - 30)

        clonedRule.parameters.startDate = thirtyDaysAgo.toISOString().split("T")[0]
        clonedRule.parameters.endDate = today.toISOString().split("T")[0]
        console.log("Initialized date-between with default dates:", {
          startDate: clonedRule.parameters.startDate,
          endDate: clonedRule.parameters.endDate,
        })
      }
    } else if (clonedRule.ruleType === "date-format") {
      if (!clonedRule.parameters.format) {
        clonedRule.parameters.format = "iso"
        console.log("Initialized date-format with default format: iso")
      }
    }

    return clonedRule
  })

  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Add this debug log at the beginning of the component
  useEffect(() => {
    console.log("NewDateRuleEditor - Initial rule:", rule)
    console.log("NewDateRuleEditor - Initial parameters:", rule.parameters)
  }, [])

  // Load available columns for the selected table
  useEffect(() => {
    if (editedRule.table && datasets[editedRule.table] && datasets[editedRule.table].length > 0) {
      const columns = Object.keys(datasets[editedRule.table][0])
      setTableColumns(columns)

      // If the current column isn't in the available columns, reset it
      if (editedRule.column && !columns.includes(editedRule.column)) {
        setEditedRule((prev) => ({
          ...prev,
          column: "",
        }))
      }
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
    console.log(`NewDateRuleEditor: Column changed to ${column}`)
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
    // Extract ID suffix if it exists
    const idSuffix = editedRule.id ? ` [ID: ${editedRule.id}]` : ""

    setEditedRule((prev) => ({
      ...prev,
      name: name + idSuffix,
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
    if (editedRule.ruleType === "date-before" || editedRule.ruleType === "date-after") {
      if (!editedRule.parameters.compareDate) {
        setValidationError("Please select a comparison date")
        return false
      }
    } else if (editedRule.ruleType === "date-between") {
      if (!editedRule.parameters.startDate || !editedRule.parameters.endDate) {
        setValidationError("Please select both start and end dates")
        return false
      }
    }

    return true
  }

  // Find the handleSave function and modify it to ensure parameters are properly set
  const handleSave = () => {
    if (!validateRule()) {
      toast({
        title: "Validation Error",
        description: validationError || "Please fix the errors before saving",
        variant: "destructive",
      })
      return
    }

    // Ensure parameters are properly set before saving
    const finalRule = {
      ...editedRule,
      parameters: {
        ...editedRule.parameters,
      },
    }

    // For date-before and date-after rules, ensure compareDate is set
    if (finalRule.ruleType === "date-before" || finalRule.ruleType === "date-after") {
      if (!finalRule.parameters.compareDate) {
        setValidationError("Please select a comparison date")
        toast({
          title: "Validation Error",
          description: "Please select a comparison date",
          variant: "destructive",
        })
        return
      }
      console.log(`Saving ${finalRule.ruleType} rule with compareDate:`, finalRule.parameters.compareDate)
    }

    // For date-between rules, ensure startDate and endDate are set
    if (finalRule.ruleType === "date-between") {
      if (!finalRule.parameters.startDate || !finalRule.parameters.endDate) {
        setValidationError("Please select both start and end dates")
        toast({
          title: "Validation Error",
          description: "Please select both start and end dates",
          variant: "destructive",
        })
        return
      }
      console.log(`Saving date-between rule with startDate:`, finalRule.parameters.startDate)
      console.log(`Saving date-between rule with endDate:`, finalRule.parameters.endDate)
    }

    // For date-format rules, ensure format is set
    if (finalRule.ruleType === "date-format" && !finalRule.parameters.format) {
      finalRule.parameters.format = "iso" // Default to ISO format
    }

    console.log("Saving date rule with parameters:", finalRule.parameters)
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
              <p className="text-xs text-gray-500">Validates that the date value is before the specified date.</p>
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

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {editedRule.parameters.inclusive ? "on or " : ""}before{" "}
                {editedRule.parameters.compareDate || "[select date]"}
              </p>
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
              <p className="text-xs text-gray-500">Validates that the date value is after the specified date.</p>
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

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {editedRule.parameters.inclusive ? "on or " : ""}after{" "}
                {editedRule.parameters.compareDate || "[select date]"}
              </p>
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

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {editedRule.parameters.inclusive ? "on or " : ""}between{" "}
                {editedRule.parameters.startDate || "[start date]"} and {editedRule.parameters.endDate || "[end date]"}
              </p>
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
                  <SelectItem value="custom">Custom Format</SelectItem>
                  <SelectItem value="any">Any Valid Date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {editedRule.parameters.format === "any"
                  ? "Validates that the value can be parsed as a valid date without enforcing a specific format."
                  : "Select a specific date format to enforce."}
              </p>
            </div>

            {editedRule.parameters.format === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customFormat">Custom Format Pattern</Label>
                <Input
                  id="customFormat"
                  value={editedRule.parameters.customFormat || ""}
                  onChange={(e) => handleParameterChange("customFormat", e.target.value)}
                  placeholder="e.g., YYYY-MM-DD HH:mm:ss"
                />
                <p className="text-xs text-gray-500">
                  Use YYYY for year, MM for month, DD for day, HH for hour, mm for minute, ss for second.
                </p>
              </div>
            )}

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
        <CardTitle>Edit Date Rule: {baseName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {validationError && (
          <Alert variant="destructive" className="validation-error">
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
              <SelectTrigger id="column" className={!editedRule.column ? "border-red-500 ring-red-500" : ""}>
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
            {editedRule.column && <p className="text-xs text-green-600">Selected column: {editedRule.column}</p>}
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
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!editedRule.column}
          className={!editedRule.column ? "opacity-50 cursor-not-allowed" : ""}
        >
          Save Date Rule
        </Button>
      </CardFooter>
    </Card>
  )
}
