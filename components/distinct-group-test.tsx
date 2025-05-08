"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { validateFormula } from "@/lib/data-validator"

// Sample test data
const testData = [
  { id: 1, category: "A", region: "North", amount: 100 },
  { id: 2, category: "A", region: "South", amount: 150 },
  { id: 3, category: "A", region: "East", amount: 120 },
  { id: 4, category: "B", region: "North", amount: 80 },
  { id: 5, category: "B", region: "South", amount: 200 },
  { id: 6, category: "B", region: "East", amount: 180 },
  { id: 7, category: "C", region: "North", amount: 10 },
  { id: 8, category: "C", region: "South", amount: 30 },
  { id: 9, category: "C", region: "East", amount: 40 },
]

export function DistinctGroupTest() {
  const [formula, setFormula] = useState('DISTINCT_GROUP_SUM("amount", ["category"], "region") > 50')
  const [resultHandling, setResultHandling] = useState("ALL")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const runTest = () => {
    setLoading(true)
    setError("")

    try {
      // Parse the formula to extract the aggregation config
      const match = formula.match(/DISTINCT_GROUP_(\w+)$$"([^"]+)",\s*\[(.*?)\],\s*"([^"]+)"$$/)

      if (!match) {
        throw new Error(
          'Invalid formula format. Expected: DISTINCT_GROUP_FUNCTION("column", ["groupCol1","groupCol2"], "distinctColumn")',
        )
      }

      const [_, funcName, column, groupColumnsStr, distinctColumn] = match
      const groupColumns = groupColumnsStr.split(",").map((col) => col.trim().replace(/"/g, ""))

      // Create the aggregation config
      const aggregationConfig = {
        function: `DISTINCT_GROUP_${funcName}`,
        column,
        groupColumns,
        distinctColumn,
        resultHandling,
      }

      // Run the validation for each row
      const rowResults = testData.map((row) => {
        const result = validateFormula(row, formula, ">", 0, [aggregationConfig], testData)

        return {
          ...row,
          result: result.isValid,
          message: result.message,
        }
      })

      setResults(rowResults)
    } catch (err: any) {
      setError(err.message)
      console.error("Test error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distinct Group Aggregation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formula">Formula</Label>
            <Input
              id="formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder='DISTINCT_GROUP_SUM("amount", ["category"], "region") > 50'
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result-handling">Result Handling</Label>
            <Select value={resultHandling} onValueChange={setResultHandling}>
              <SelectTrigger id="result-handling">
                <SelectValue placeholder="Select result handling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL (all groups must pass)</SelectItem>
                <SelectItem value="ANY">ANY (at least one group must pass)</SelectItem>
                <SelectItem value="MAJORITY">MAJORITY (more than half must pass)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={runTest} disabled={loading}>
            {loading ? "Running..." : "Run Test"}
          </Button>

          {error && <div className="text-red-500 p-2 border border-red-300 rounded bg-red-50">{error}</div>}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ID</th>
                    <th className="border p-2 text-left">Category</th>
                    <th className="border p-2 text-left">Region</th>
                    <th className="border p-2 text-left">Amount</th>
                    <th className="border p-2 text-left">Result</th>
                    <th className="border p-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={row.id} className={row.result ? "bg-green-50" : "bg-red-50"}>
                      <td className="border p-2">{row.id}</td>
                      <td className="border p-2">{row.category}</td>
                      <td className="border p-2">{row.region}</td>
                      <td className="border p-2">{row.amount}</td>
                      <td className="border p-2 font-semibold">{row.result ? "✅ Pass" : "❌ Fail"}</td>
                      <td className="border p-2 text-sm">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Region</th>
                  <th className="border p-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {testData.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-2">{row.id}</td>
                    <td className="border p-2">{row.category}</td>
                    <td className="border p-2">{row.region}</td>
                    <td className="border p-2">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
