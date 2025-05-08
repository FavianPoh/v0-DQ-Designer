"use client"

import { useState } from "react"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Info } from "lucide-react"
import type { ValidationResult, DataTables } from "@/lib/types"

interface ValidationHeatmapProps {
  results: ValidationResult[]
  datasets: DataTables
  onViewRowData: (result: ValidationResult) => void
}

export function ValidationResultsHeatmap({ results, datasets, onViewRowData }: ValidationHeatmapProps) {
  const [activeTab, setActiveTab] = useState("heatmap")

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    // Get all tables and columns
    const tables = [...new Set(results.map((r) => r.table))]

    const columnsByTable: Record<string, string[]> = {}
    tables.forEach((table) => {
      if (datasets[table]?.length > 0) {
        columnsByTable[table] = Object.keys(datasets[table][0])
      } else {
        columnsByTable[table] = []
      }
    })

    // Create heatmap cells
    const heatmap: Record<
      string,
      Record<
        string,
        {
          failures: number
          warnings: number
          success: number
          total: number
        }
      >
    > = {}

    tables.forEach((table) => {
      heatmap[table] = {}

      columnsByTable[table].forEach((column) => {
        heatmap[table][column] = {
          failures: 0,
          warnings: 0,
          success: 0,
          total: 0,
        }
      })
    })

    // Fill in the data
    results.forEach((result) => {
      if (heatmap[result.table] && heatmap[result.table][result.column]) {
        heatmap[result.table][result.column][
          result.severity === "failure" ? "failures" : result.severity === "warning" ? "warnings" : "success"
        ] += 1

        heatmap[result.table][result.column].total += 1
      }
    })

    return {
      tables,
      columnsByTable,
      heatmap,
    }
  }, [results, datasets])

  // Get cell color based on validation results
  const getCellColor = (cell: { failures: number; warnings: number; success: number; total: number }) => {
    if (cell.total === 0) return "bg-gray-50"

    if (cell.failures > 0) {
      const intensity = Math.min(1, cell.failures / cell.total)
      return `bg-red-${Math.round(intensity * 500)}`
    }

    if (cell.warnings > 0) {
      const intensity = Math.min(1, cell.warnings / cell.total)
      return `bg-amber-${Math.round(intensity * 300)}`
    }

    return "bg-green-100"
  }

  // Get results for a specific table and column
  const getResultsForCell = (table: string, column: string) => {
    return results.filter((r) => r.table === table && r.column === column)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="heatmap">Heatmap View</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="pt-4">
          {heatmapData.tables.map((table) => (
            <Card key={table} className="mb-6">
              <CardHeader>
                <CardTitle>{table.charAt(0).toUpperCase() + table.slice(1)}</CardTitle>
                <CardDescription>Validation results by column</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-auto max-h-[400px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {heatmapData.columnsByTable[table].map((column) => {
                      const cell = heatmapData.heatmap[table][column]
                      const cellResults = getResultsForCell(table, column)

                      return (
                        <div
                          key={column}
                          className={`p-4 rounded-md border ${getCellColor(cell)} hover:shadow-md transition-shadow cursor-pointer`}
                          onClick={() => {
                            if (cellResults.length > 0) {
                              onViewRowData(cellResults[0])
                            }
                          }}
                        >
                          <div className="font-medium mb-1">{column}</div>
                          <div className="flex gap-2 flex-wrap">
                            {cell.failures > 0 && <Badge variant="destructive">{cell.failures} failures</Badge>}
                            {cell.warnings > 0 && (
                              <Badge className="bg-amber-100 text-amber-800">{cell.warnings} warnings</Badge>
                            )}
                            {cell.success > 0 && (
                              <Badge className="bg-green-100 text-green-800">{cell.success} passing</Badge>
                            )}
                            {cell.total === 0 && <Badge variant="outline">No validations</Badge>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="matrix" className="pt-4">
          {heatmapData.tables.map((table) => (
            <Card key={table} className="mb-6">
              <CardHeader>
                <CardTitle>{table.charAt(0).toUpperCase() + table.slice(1)}</CardTitle>
                <CardDescription>Validation matrix</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead>Failures</TableHead>
                        <TableHead>Warnings</TableHead>
                        <TableHead>Passing</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {heatmapData.columnsByTable[table].map((column) => {
                        const cell = heatmapData.heatmap[table][column]
                        const cellResults = getResultsForCell(table, column)

                        return (
                          <TableRow key={column}>
                            <TableCell className="font-medium">{column}</TableCell>
                            <TableCell className={cell.failures > 0 ? "text-red-600 font-semibold" : ""}>
                              {cell.failures}
                            </TableCell>
                            <TableCell className={cell.warnings > 0 ? "text-amber-600 font-semibold" : ""}>
                              {cell.warnings}
                            </TableCell>
                            <TableCell className={cell.success > 0 ? "text-green-600 font-semibold" : ""}>
                              {cell.success}
                            </TableCell>
                            <TableCell>
                              {cellResults.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewRowData(cellResults[0])}
                                  className="h-8 w-8 p-0"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
