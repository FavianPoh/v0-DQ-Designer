"use client"

// Only updating the relevant parts of the file to fix column selection issues

import type React from "react"
import { useState, useEffect } from "react"

interface Rule {
  ruleType: string
  column?: string
  additionalColumns?: string[]
  // ... other rule properties
}

interface EnhancedRuleFormProps {
  initialRule?: Rule
  onSubmit: (rule: Rule) => void
}

const EnhancedRuleForm: React.FC<EnhancedRuleFormProps> = ({ initialRule, onSubmit }) => {
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
      <button type="submit">Submit</button>
    </form>
  )
}

export default EnhancedRuleForm
