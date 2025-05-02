"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RuleForm } from "@/components/rule-form"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"
import { JavaScriptExplainer } from "./javascript-explainer"

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
  const [isOpen, setIsOpen] = useState(false)
  const [rule, setRule] = useState<DataQualityRule | undefined>(undefined)

  // When ruleId changes, find the rule and open the dialog
  useEffect(() => {
    if (ruleId) {
      const foundRule = rules.find((r) => r.id === ruleId)
      setRule(foundRule)
      setIsOpen(true)
    } else {
      setIsOpen(false)
      setRule(undefined)
    }
  }, [ruleId, rules])

  const handleUpdateRule = (updatedRule: DataQualityRule) => {
    onUpdateRule(updatedRule)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
    onCancel()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          onCancel()
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule: {rule?.name?.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")}</DialogTitle>
        </DialogHeader>
        {rule && (
          <>
            <RuleForm
              initialRule={rule}
              tables={tables}
              datasets={datasets}
              valueLists={valueLists}
              onSubmit={handleUpdateRule}
              onCancel={handleCancel}
            />
            {rule.ruleType === "custom" && rule.parameters.functionBody && (
              <JavaScriptExplainer code={rule.parameters.functionBody} columnName={rule.column} />
            )}
            {rule.ruleType === "formula" && rule.parameters.formula && (
              <JavaScriptExplainer code={rule.parameters.formula} columnName={rule.column} />
            )}
            {rule.ruleType === "cross-column" && rule.parameters.condition && (
              <JavaScriptExplainer code={rule.parameters.condition} columnName={rule.column} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
