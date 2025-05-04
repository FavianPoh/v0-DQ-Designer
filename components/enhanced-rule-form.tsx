"use client"

// Only updating the relevant parts of the file to fix column selection issues

import type React from "react"
import { useState, useEffect } from "react"

interface Rule {
  ruleType: string
  column?: string
  additionalColumns?: string[]
  table?: string
  // ... other rule properties
}

interface EnhancedRuleFormProps {
  initialRule?: Rule
  onSubmit: (rule: Rule) => void
  tables: string[]
  tableColumns: { [table: string]: string[] }
  RULE_TYPES: { value: string; label: string }[]
  onColumnChange?: (column: string) => void
}

const EnhancedRuleForm: React.FC<EnhancedRuleFormProps> = ({
  initialRule,
  onSubmit,
  tables,
  tableColumns,
  RULE_TYPES,
  onColumnChange: propsOnColumnChange,
}) => {
  const [rule, setRule] = useState<Rule>({ ruleType: "" })
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  // Inside the EnhancedRuleForm component, update the useEffect that handles initialRule
  useEffect(() => {
    if (initialRule) {
      console.log("Loading initial rule in EnhancedRuleForm:", initialRule)

      // Create a deep copy to avoid reference issues
      const ruleCopy = JSON.parse(JSON.stringify(initialRule))

      // Special handling for date rules
      if (initialRule.ruleType?.startsWith("date-")) {
        console.log("Date rule detected in EnhancedRuleForm, column =", initialRule.column)
      }

      setRule(ruleCopy)
      setSelectedColumns(initialRule.additionalColumns || [])
    }
  }, [initialRule])

  const handleSelectChange = (field: string, value: string) => {
    setRule((prevRule) => ({
      ...prevRule,
      [field]: value,
    }))
  }

  const handleRuleTypeChange = (value: string) => {
    setRule((prevRule) => ({
      ...prevRule,
      ruleType: value,
      column: undefined, // Reset column when rule type changes
    }))
  }

  // Update the handleSubmit function to ensure column is preserved
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Add validation for date rules
    if (rule.ruleType.startsWith("date-") && !rule.column) {
      alert("Please select a column for the date rule")
      return
    }

    // Add selected columns to the rule if any
    const finalRule = {
      ...rule,
      additionalColumns: selectedColumns.length > 0 ? selectedColumns : undefined,
    }

    console.log("Submitting rule with column:", finalRule.column)
    onSubmit(finalRule)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form elements go here */}
      {/* Table Select */}
      <div>
        <label>Table:</label>
        <Select value={rule.table} onValueChange={(value) => handleSelectChange("table", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a table" />
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

      {/* Column Select */}
      <div>
        <label>Column:</label>
        <Select
          value={rule.column}
          onValueChange={(value) => {
            handleSelectChange("column", value)
            if (propsOnColumnChange) {
              propsOnColumnChange(value)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a column" />
          </SelectTrigger>
          <SelectContent>
            {tableColumns[rule.table]?.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rule Type Select */}
      <div>
        <label>Rule Type:</label>
        <Select value={rule.ruleType} onValueChange={handleRuleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a rule type" />
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
      <button type="submit">Submit</button>
    </form>
  )
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default EnhancedRuleForm
