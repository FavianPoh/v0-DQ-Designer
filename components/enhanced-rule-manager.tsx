"use client"

import { useState } from "react"
import { PlusCircle, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DataQualityRule, DataTables } from "@/lib/types"

interface EnhancedRuleManagerProps {
  rules: DataQualityRule[]
  tables: DataTables
  onAddRule: (rule: DataQualityRule) => void
  onDeleteRule: (ruleId: string) => void
  onUpdateRule: (rule: DataQualityRule) => void
}

export function EnhancedRuleManager({ rules, tables, onAddRule, onDeleteRule, onUpdateRule }: EnhancedRuleManagerProps) {
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

  const filteredRules = filterTable 
    ? rules.filter(rule => rule.tableName === filterTable)
    : rules

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
                <SelectItem value="">All Tables</SelectItem>
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
            <CardTitle>Add New Rule</CardTitle>\
