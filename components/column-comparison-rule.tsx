"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { DataQualityRule, DataTables } from "@/lib/types"

interface ColumnComparisonRuleProps {
  rule?: DataQualityRule
  tables: string[]
  datasets: DataTables
  onSave: (rule: DataQualityRule) => void
  onCancel: () => void
}

export function ColumnComparisonRule({ rule, tables, datasets, onSave, onCancel }: ColumnComparisonRuleProps) {
  const [selectedTable, setSelectedTable] = useState<string>(rule?.table || tables[0] || "")
  const [columns, setColumns] = useState<string[]>([])
  const [leftColumn, setLeftColumn] = useState<string>(rule?.column || rule?.parameters?.leftColumn || "")
  const [rightColumn, setRightColumn] = useState<string>(
    rule?.parameters?.secondaryColumn || rule?.parameters?.rightColumn || ""
  )
  const [operator, setOperator] = useState<string>(rule?.parameters?.operator || rule?.parameters?.comparisonOperator || "==")
  const [allowNull, setAllowNull] = useState<boolean>(rule?.parameters?.allowNull || false)
  const [ruleName, setRuleName] = useState<string>(rule?.name || "")
  const [description, setDescription] = useState<string>(rule?.description || "")

  // Update columns when table changes
  useEffect(() => {
    if (selectedTable && datasets[selectedTable]?.length > 0) {
      const tableColumns = Object.keys(datasets[selectedTable][0])
      setColumns(tableColumns)
    } else {
      setColumns([])
    }
  }, [selectedTable, datasets])

  // Handle save
  const handleSave = () => {
    if (!selectedTable || !leftColumn || !rightColumn || !operator || !ruleName) {
      alert("Please fill in all required fields")
      return
    }

    const updatedRule: DataQualityRule = {
      id: rule?.id || crypto.randomUUID(),
      name: ruleName,
      table: selectedTable,
      column: leftColumn,
      ruleType: "column-comparison",
      parameters: {
        leftColumn,
        rightColumn,
        secondaryColumn: rightColumn, // For backward compatibility
        operator,
        comparisonOperator: operator, // For backward compatibility
        allowNull,
      },
      description,
      severity: rule?.severity || "failure",
      enabled: rule?.enabled !== false, // Default to true if not specified
    }

    onSave(updatedRule)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Column Comparison Rule</CardTitle>
        <CardDescription>
          Compare values between two columns in the same row. For example, check if startDate is before endDate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ruleName">Rule Name</Label>
          <Input id="ruleName" value={ruleName} onChange={(e) => setRuleName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="table">Table</Label>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="leftColumn">Left Column</Label>
            <Select value={leftColumn} onValueChange={setLeftColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select left column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rightColumn">Right Column</Label>
            <Select value={rightColumn} onValueChange={setRightColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select right column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="operator">Comparison Operator</Label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="==">Equals (==)</SelectItem>
              <SelectItem value="!=">Not Equals (!=)</SelectItem>
              <SelectItem value=">">Greater Than (>)</SelectItem>
              <SelectItem value=">=">Greater Than or Equal (>=)</SelectItem>
              <SelectItem value="<">Less Than (<)</SelectItem>
              <SelectItem value="<=">Less Than or Equal (<=)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="allowNull" checked={allowNull} onCheckedChange={(checked) => setAllowNull(checked === true)} />
          <Label htmlFor="allowNull" className="text-sm font-normal">
            Skip validation if either value is null
          </Label>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Rule</Button>
      </CardFooter>
    </Card>
  )
}
