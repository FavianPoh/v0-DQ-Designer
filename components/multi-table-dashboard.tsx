"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatasetViewer } from "@/components/dataset-viewer"
import { EnhancedRuleManager } from "@/components/enhanced-rule-manager"
import { MultiTableValidationResults } from "@/components/multi-table-validation-results"
import { generateSyntheticData } from "@/lib/data-generator"
import { generateTransactionsData } from "@/lib/transactions-generator"
import { validateMultiTableDataset } from "@/lib/multi-table-validator"
import type { DataQualityRule, DataTables, TableName } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function MultiTableDashboard() {
  const [tables, setTables] = useState<DataTables>(() => {
    const users = generateSyntheticData(100)
    return {
      users,
      transactions: generateTransactionsData(150, users),
    }
  })

  const [selectedTable, setSelectedTable] = useState<TableName>("users")

  const [rules, setRules] = useState<DataQualityRule[]>([
    {
      id: "1",
      name: "Probability Range",
      tableName: "users",
      column: "probability",
      ruleType: "range",
      parameters: { min: 0, max: 1 },
      description: "Probability must be between 0 and 1",
      severity: "failure",
    },
    {
      id: "2",
      name: "Required User Name",
      tableName: "users",
      column: "name",
      ruleType: "required",
      parameters: {},
      description: "Name cannot be empty",
      severity: "failure",
    },
    {
      id: "3",
      name: "Valid Transaction Amount",
      tableName: "transactions",
      column: "amount",
      ruleType: "range",
      parameters: { min: 0 },
      description: "Transaction amount must be positive",
      severity: "failure",
    },
    {
      id: "4",
      name: "Transaction Status Dependency",
      tableName: "transactions",
      column: "processedAt",
      ruleType: "dependency",
      parameters: {
        dependsOn: "status",
        condition: "dependsOnValue === 'completed' || dependsOnValue === 'refunded'",
      },
      description: "Processed date is required for completed or refunded transactions",
      severity: "warning",
    },
    {
      id: "5",
      name: "Cross-Column Validation",
      tableName: "transactions",
      column: "amount",
      ruleType: "cross-column",
      parameters: {
        condition: "value > 100 ? row.notes !== null : true",
      },
      description: "Transactions over $100 must have notes",
      severity: "warning",
      additionalColumns: ["notes"],
    },
  ])

  const [validationResults, setValidationResults] = useState(() => validateMultiTableDataset(tables, rules))

  useEffect(() => {
    // Save rules to localStorage whenever they change
    localStorage.setItem("dataQualityRules", JSON.stringify(rules))
  }, [rules])

  useEffect(() => {
    // Load saved rules from localStorage on component mount
    const savedRules = localStorage.getItem("dataQualityRules")
    if (savedRules) {
      try {
        const parsedRules = JSON.parse(savedRules)
        setRules(parsedRules)
        // Also update validation results with the loaded rules
        setValidationResults(validateMultiTableDataset(tables, parsedRules))
      } catch (error) {
        console.error("Error loading saved rules:", error)
      }
    }
  }, [])

  const handleAddRule = (rule: DataQualityRule) => {
    const newRules = [...rules, rule]
    setRules(newRules)
    setValidationResults(validateMultiTableDataset(tables, newRules))
  }

  const handleDeleteRule = (ruleId: string) => {
    const newRules = rules.filter((rule) => rule.id !== ruleId)
    setRules(newRules)
    setValidationResults(validateMultiTableDataset(tables, newRules))
  }

  const handleUpdateRule = (updatedRule: DataQualityRule) => {
    const newRules = rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule))
    setRules(newRules)
    setValidationResults(validateMultiTableDataset(tables, newRules))
  }

  const handleRegenerateData = () => {
    const users = generateSyntheticData(100)
    const newTables = {
      users,
      transactions: generateTransactionsData(150, users),
    }
    setTables(newTables)
    setValidationResults(validateMultiTableDataset(newTables, rules))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dataset">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dataset">Datasets</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
        </TabsList>
        <TabsContent value="dataset" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Select value={selectedTable} onValueChange={(value) => setSelectedTable(value as TableName)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                </SelectContent>
              </Select>
              <h2 className="text-xl font-semibold">{selectedTable === "users" ? "Users" : "Transactions"} Table</h2>
            </div>
            <Button onClick={handleRegenerateData}>Regenerate Data</Button>
          </div>
          <DatasetViewer data={tables[selectedTable]} tableName={selectedTable} validationResults={validationResults} />
        </TabsContent>
        <TabsContent value="rules" className="pt-4">
          <EnhancedRuleManager
            rules={rules}
            tables={tables}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            onUpdateRule={handleUpdateRule}
          />
        </TabsContent>
        <TabsContent value="validation" className="pt-4">
          <MultiTableValidationResults results={validationResults} tables={tables} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
