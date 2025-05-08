"use client"

import { useState, useEffect } from "react"
import { SimplifiedDateRuleEditor } from "@/components/simplified-date-rule-editor"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"
import { FormulaRuleEditor } from "@/components/formula-rule-editor"

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
  const [tableColumns, setTableColumns] = useState<{ [tableName: string]: string[] }>({})

  // Update the rule when the ruleId changes
  useEffect(() => {
    if (ruleId && rules) {
      const foundRule = rules.find((r) => r.id === ruleId)
      if (foundRule) {
        console.log("Loading rule in DirectRuleEditor:", foundRule)

        // Add specific logging for type validation rules
        if (foundRule.ruleType === "type") {
          console.log("Type Validation rule parameters:", foundRule.parameters)
          console.log("dataType value:", foundRule.parameters.dataType)
        }

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

  useEffect(() => {
    // Extract column names for each table
    const columnData: { [tableName: string]: string[] } = {}

    // Iterate through each table in the datasets
    for (const tableName of tables) {
      if (datasets[tableName] && datasets[tableName].length > 0) {
        // Get column names from the first row's keys
        columnData[tableName] = Object.keys(datasets[tableName][0])
      } else {
        columnData[tableName] = []
      }
    }

    setTableColumns(columnData)
  }, [datasets, tables])

  const handleParameterChange = (parameterName: string, newValue: any) => {
    if (rule) {
      const updatedRule: DataQualityRule = {
        ...rule,
        parameters: {
          ...rule.parameters,
          [parameterName]: newValue,
        },
      }
      setRule(updatedRule)
    }
  }

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
  return (
    <div>
      {rule.ruleType === "formula" && (
        <FormulaRuleEditor
          columns={tableColumns[rule.table] || []}
          formula={rule.parameters.formula || ""}
          operator={rule.parameters.operator || "=="}
          value={rule.parameters.value !== undefined ? rule.parameters.value : 0}
          onFormulaChange={(formula) => handleParameterChange("formula", formula)}
          onOperatorChange={(operator) => handleParameterChange("operator", operator)}
          onValueChange={(value) => {
            console.log("DirectRuleEditor: Setting formula comparison value to:", value)
            handleParameterChange("value", value)
          }}
          selectedColumn={rule.column}
          aggregations={rule.parameters.aggregations || []}
          onAggregationsChange={(aggregations) => {
            console.log("DirectRuleEditor: Updating aggregations:", aggregations)
            handleParameterChange("aggregations", aggregations)
          }}
        />
      )}
    </div>
  )
}
