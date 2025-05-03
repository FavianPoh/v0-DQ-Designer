"use client"

import { useState, useEffect } from "react"
import { SimplifiedDateRuleEditor } from "@/components/simplified-date-rule-editor"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"

interface DirectRuleEditorProps {
  ruleId: string | null
  rules: DataQualityRule[]
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onUpdateRule: (rule: DataQualityRule) => void
  onCancel: () => void
}

export function DirectRuleEditor({
  ruleId,
  rules,
  tables,
  datasets,
  valueLists,
  onUpdateRule,
  onCancel,
}: DirectRuleEditorProps) {
  const [rule, setRule] = useState<DataQualityRule | null>(null)

  // Update the rule when the ruleId changes
  useEffect(() => {
    if (ruleId) {
      const foundRule = rules.find((r) => r.id === ruleId)
      if (foundRule) {
        console.log("DirectRuleEditor: Found rule to edit:", foundRule)
        // Create a deep copy to avoid reference issues
        setRule(JSON.parse(JSON.stringify(foundRule)))
      } else {
        console.error("DirectRuleEditor: Rule not found for ID:", ruleId)
        setRule(null)
      }
    } else {
      setRule(null)
    }
  }, [ruleId, rules])

  // If no rule is selected, don't render anything
  if (!rule) {
    return null
  }

  // Check if this is a date rule
  const isDateRule = rule.ruleType.startsWith("date-")

  if (isDateRule) {
    // Use the simplified date rule editor for better UX
    return (
      <SimplifiedDateRuleEditor
        rule={rule}
        tables={tables}
        datasets={datasets}
        onSave={onUpdateRule}
        onCancel={onCancel}
      />
    )
  }

  // For other rule types, we could add specialized editors here
  return null
}
