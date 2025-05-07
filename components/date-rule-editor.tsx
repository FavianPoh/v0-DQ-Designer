"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch" // Import Switch component
import type { DataQualityRule, RuleSeverity } from "@/lib/types"

interface DateRuleEditorProps {
  rule: DataQualityRule
  tables: string[]
  datasets: any
  onSave: (rule: DataQualityRule) => void
  onCancel: () => void
}

export function DateRuleEditor({ rule, tables, datasets, onSave, onCancel }: DateRuleEditorProps) {
  const [editedRule, setEditedRule] = useState<DataQualityRule>({ ...rule })
  const [validationError, setValidationError] = useState<string | null>(null)

  // Initialize default parameters if they don't exist
  useEffect(() => {
    const updatedRule = { ...rule }

    // Ensure parameters object exists
    if (!updatedRule.parameters) {
      updatedRule.parameters = {}
    }

    // Set default parameters based on rule type
    if (updatedRule.ruleType === "date-before" || updatedRule.ruleType === "date-after") {
      if (!updatedRule.parameters.compareDate) {
        // Set default to today's date
        const today = new Date()
        updatedRule.parameters.compareDate = today.toISOString().split("T")[0] // YYYY-MM-DD format
      }
    } else if (updatedRule.ruleType === "date-between") {
      if (!updatedRule.parameters.startDate) {
        // Set default start date to 30 days ago
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        updatedRule.parameters.startDate = thirtyDaysAgo.toISOString().split("T")[0]
      }

      if (!updatedRule.parameters.endDate) {
        // Set default end date to today
        const today = new Date()
        updatedRule.parameters.endDate = today.toISOString().split("T")[0]
      }
    } else if (updatedRule.ruleType === "date-format" && !updatedRule.parameters.format) {
      updatedRule.parameters.format = "iso" // Default to ISO format
    }

    // Ensure enabled property exists
    if (updatedRule.enabled === undefined) {
      updatedRule.enabled = true
    }

    setEditedRule(updatedRule)
  }, [rule])

  const handleSave = () => {
    // Validate required parameters based on rule type
    let isValid = true
    let errorMessage = ""

    if (editedRule.ruleType === "date-before" || editedRule.ruleType === "date-after") {
      if (!editedRule.parameters.compareDate) {
        isValid = false
        errorMessage = "Compare date is required"
      }
    } else if (editedRule.ruleType === "date-between") {
      if (!editedRule.parameters.startDate) {
        isValid = false
        errorMessage = "Start date is required"
      } else if (!editedRule.parameters.endDate) {
        isValid = false
        errorMessage = "End date is required"
      }
    } else if (editedRule.ruleType === "date-format" && !editedRule.parameters.format) {
      isValid = false
      errorMessage = "Format is required"
    }

    if (!isValid) {
      setValidationError(errorMessage)
      return
    }

    // Clear validation error
    setValidationError(null)

    // Save the rule
    onSave(editedRule)
  }

  const handleChange = (field: string, value: any) => {
    setEditedRule((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleParameterChange = (paramName: string, value: any) => {
    setEditedRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramName]: value,
      },
    }))
  }

  // Toggle rule enabled/disabled
  const handleEnabledToggle = (enabled: boolean) => {
    setEditedRule((prev) => ({
      ...prev,
      enabled,
    }))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Date Rule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input id="name" value={editedRule.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table">Table</Label>
            <Select value={editedRule.table} onValueChange={(value) => handleChange("table", value)}>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="column">Column</Label>
            <Input id="column" value={editedRule.column} onChange={(e) => handleChange("column", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select
              value={editedRule.severity}
              onValueChange={(value) => handleChange("severity", value as RuleSeverity)}
            >
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={editedRule.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        {/* Rule enabled toggle */}
        <div className="flex items-center space-x-2">
          <Switch id="enabled" checked={editedRule.enabled} onCheckedChange={handleEnabledToggle} />
          <Label htmlFor="enabled">Rule Enabled</Label>
        </div>

        {/* Date-specific parameters */}
        {editedRule.ruleType === "date-before" && (
          <div className="space-y-2">
            <Label htmlFor="compareDate">Compare Date (Before)</Label>
            <Input
              id="compareDate"
              type="date"
              value={editedRule.parameters.compareDate || ""}
              onChange={(e) => handleParameterChange("compareDate", e.target.value)}
            />
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="inclusive"
                checked={editedRule.parameters.inclusive || false}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked)}
              />
              <Label htmlFor="inclusive">Include Compare Date (On or Before)</Label>
            </div>
          </div>
        )}

        {editedRule.ruleType === "date-after" && (
          <div className="space-y-2">
            <Label htmlFor="compareDate">Compare Date (After)</Label>
            <Input
              id="compareDate"
              type="date"
              value={editedRule.parameters.compareDate || ""}
              onChange={(e) => handleParameterChange("compareDate", e.target.value)}
            />
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="inclusive"
                checked={editedRule.parameters.inclusive || false}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked)}
              />
              <Label htmlFor="inclusive">Include Compare Date (On or After)</Label>
            </div>
          </div>
        )}

        {editedRule.ruleType === "date-between" && (
          <div className="space-y-4">
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
            <div className="flex items-center space-x-2">
              <Switch
                id="inclusive"
                checked={editedRule.parameters.inclusive || false}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked)}
              />
              <Label htmlFor="inclusive">Include Start and End Dates</Label>
            </div>
          </div>
        )}

        {editedRule.ruleType === "date-format" && (
          <div className="space-y-2">
            <Label htmlFor="format">Date Format</Label>
            <Select
              value={editedRule.parameters.format || "iso"}
              onValueChange={(value) => handleParameterChange("format", value)}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                <SelectItem value="eu">EU (DD/MM/YYYY)</SelectItem>
                <SelectItem value="any">Any Valid Date</SelectItem>
                <SelectItem value="custom">Custom Format</SelectItem>
              </SelectContent>
            </Select>

            {editedRule.parameters.format === "custom" && (
              <div className="mt-2">
                <Label htmlFor="customFormat">Custom Format Pattern</Label>
                <Input
                  id="customFormat"
                  value={editedRule.parameters.customFormat || ""}
                  onChange={(e) => handleParameterChange("customFormat", e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use YYYY for year, MM for month, DD for day, HH for hour, mm for minute, ss for second
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <Switch
                id="required"
                checked={editedRule.parameters.required || false}
                onCheckedChange={(checked) => handleParameterChange("required", checked)}
              />
              <Label htmlFor="required">Required (Validate Empty Values)</Label>
            </div>
          </div>
        )}

        {validationError && <div className="text-red-500 text-sm">{validationError}</div>}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </CardFooter>
    </Card>
  )
}
