"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"
import type { DataRecord } from "@/lib/types"

interface FormulaResultVisualizerProps {
  formula: string
  operator: string
  value: number
  data: DataRecord[]
}

export function FormulaResultVisualizer({ formula, operator, value, data }: FormulaResultVisualizerProps) {
  const [results, setResults] = useState<Array<{ row: DataRecord; result: number; passes: boolean }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!formula) return

    try {
      // Take a sample of up to 5 rows for visualization
      const sampleData = data.slice(0, 5)

      const newResults = sampleData.map((row) => {
        // Replace column references with actual values
        let evalFormula = formula
        const columnNames = Object.keys(row).sort((a, b) => b.length - a.length) // Sort by length descending

        for (const columnName of columnNames) {
          const columnRegex = new RegExp(`\\b${columnName}\\b`, "g")
          evalFormula = evalFormula.replace(
            columnRegex,
            String(row[columnName] === null || row[columnName] === undefined ? "null" : row[columnName]),
          )
        }

        // Evaluate the formula
        const result = new Function(`return ${evalFormula};`)()

        // Check if the result passes the comparison
        let passes = false
        switch (operator) {
          case "==":
            passes = result === value
            break
          case "!=":
            passes = result !== value
            break
          case ">":
            passes = result > value
            break
          case ">=":
            passes = result >= value
            break
          case "<":
            passes = result < value
            break
          case "<=":
            passes = result <= value
            break
          default:
            passes = false
        }

        return { row, result, passes }
      })

      setResults(newResults)
      setError(null)
    } catch (err) {
      setError(`Error evaluating formula: ${err instanceof Error ? err.message : String(err)}`)
      setResults([])
    }
  }, [formula, operator, value, data])

  if (error) {
    return <div className="bg-red-50 p-4 rounded-md text-red-600 text-sm">{error}</div>
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Formula Preview</h4>
      <div className="space-y-2">
        {results.map((item, index) => (
          <Card key={index} className="p-3">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Row {index + 1}</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(item.row)
                    .filter(([key]) => formula.includes(key))
                    .map(([key, val]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {String(val)}
                      </Badge>
                    ))}
                </div>
                <div className="font-mono text-sm">
                  Result: {item.result} {operator} {value} = {String(item.passes)}
                </div>
              </div>
              <div>
                {item.passes ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Showing formula evaluation for {results.length} sample rows. The rule passes when the formula result {operator}{" "}
        {value} is true.
      </p>
    </div>
  )
}
