"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { RuleForm } from "@/components/rule-form"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"
import { SimplifiedDateRuleEditor } from "@/components/simplified-date-rule-editor"
import { toast } from "@/components/ui/use-toast"

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
  const [open, setOpen] = useState(false)
  const [rule, setRule] = useState<DataQualityRule | null>(null)
  const [isDateRule, setIsDateRule] = useState(false)

  // When ruleId changes, find the rule and open the dialog
  useEffect(() => {
    if (ruleId) {
      const foundRule = rules.find((r) => r.id === ruleId)
      if (foundRule) {
        // Create a deep copy to avoid reference issues
        const ruleCopy = JSON.parse(JSON.stringify(foundRule))
        console.log("Found rule to edit:", ruleCopy)

        // Check if it's a date rule
        const isDate = ruleCopy.ruleType?.startsWith("date-") || false
        setIsDateRule(isDate)

        if (isDate) {
          console.log("Editing date rule with column:", ruleCopy.column)
        }

        setRule(ruleCopy)
        setOpen(true)
      } else {
        console.error("Rule not found:", ruleId)
        setOpen(false)
      }
    } else {
      setOpen(false)
      setRule(null)
      setIsDateRule(false)
    }
  }, [ruleId, rules])

  // Handle dialog close
  const handleClose = () => {
    setOpen(false)
    onCancel()
  }

  // Handle rule update
  const handleUpdate = (updatedRule: DataQualityRule) => {
    // Special validation for date rules
    if (updatedRule.ruleType?.startsWith("date-") && !updatedRule.column) {
      toast({
        title: "Error",
        description: "Please select a column for the date rule",
        variant: "destructive",
      })
      return
    }

    console.log("Updating rule with column:", updatedRule.column)
    onUpdateRule(updatedRule)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleClose()
        }
        setOpen(open)
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        {rule && isDateRule ? (
          <SimplifiedDateRuleEditor
            rule={rule}
            tables={tables}
            datasets={datasets}
            onSave={handleUpdate}
            onCancel={handleClose}
          />
        ) : rule ? (
          <RuleForm
            initialRule={rule}
            tables={tables}
            datasets={datasets}
            valueLists={valueLists}
            onSubmit={handleUpdate}
            onCancel={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
