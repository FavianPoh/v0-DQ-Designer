"use client"

import { useState } from "react"
import { PlusCircle, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnhancedRuleForm } from "@/components/enhanced-rule-form"
import type { DataQualityRule, DataTables } from "@/lib/types"

interface EnhancedRuleManagerProps {
  rules: DataQualityRule[]
  tables: DataTables
  onAddRule: (rule: DataQualityRule) => void
  onDeleteRule: (ruleId: string) => void
  onUpdateRule: (rule: DataQualityRule) => void
}

export function EnhancedRuleManager({
  rules,
  tables,
  onAddRule,
  onDeleteRule,
  onUpdateRule,
}: EnhancedRuleManagerProps) {
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [filterTable, setFilterTable] = useState<string>("")

  const handleAddRule = (rule: DataQualityRule) => {
    onAddRule(rule)
    setIsAddingRule(false)
  }

  const handleUpdateRule = (rule: DataQualityRule) => {
    onUpdateRule(rule)
    setEditingRuleId(null)
  }

  const handleCancelEdit = () => {
    setIsAddingRule(false)
    setEditingRuleId(null)
  }

  const filteredRules = filterTable ? rules.filter((rule) => rule.tableName === filterTable) : rules

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Data Quality Rules</h2>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isAddingRule && !editingRuleId && (
            <Button onClick={() => setIsAddingRule(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          )}
        </div>
      </div>

      {isAddingRule && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedRuleForm tables={tables} onSubmit={handleAddRule} onCancel={handleCancelEdit} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className={`hover:shadow-md transition-shadow ${rule.enabled ? "" : "opacity-60"}`}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{rule.name}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingRuleId(rule.id)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDeleteRule(rule.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Table:</span> {rule.tableName}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Column:</span> {rule.columnName}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Type:</span> {rule.ruleType}
                </div>
                {rule.description && (
                  <div className="text-sm">
                    <span className="font-medium">Description:</span> {rule.description}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">{rule.enabled ? "Enabled" : "Disabled"}</span>
                  <Button variant="ghost" size="sm" onClick={() => onUpdateRule({ ...rule, enabled: !rule.enabled })}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingRuleId && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedRuleForm
              tables={tables}
              initialValues={rules.find((r) => r.id === editingRuleId)}
              onSubmit={handleUpdateRule}
              onCancel={handleCancelEdit}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
