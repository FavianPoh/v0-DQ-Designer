"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown, ChevronRight, AlertTriangle, AlertOctagon, CheckCircle, Info } from "lucide-react"
import type { ValidationResult } from "@/lib/types"

interface ValidationResultsGroupingProps {
  results: ValidationResult[]
  onViewResult: (result: ValidationResult) => void
}

export function ValidationResultsGrouping({ results, onViewResult }: ValidationResultsGroupingProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [groupBy, setGroupBy] = useState<"table" | "rule" | "severity">("table")

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Group validation results
  const groupedResults = useMemo(() => {
    if (groupBy === "table") {
      // Group by table
      return results.reduce(
        (groups, result) => {
          const key = result.table
          groups[key] = groups[key] || {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            results: [],
            failures: 0,
            warnings: 0,
            success: 0,
          }

          groups[key].results.push(result)

          if (result.severity === "failure") groups[key].failures++
          else if (result.severity === "warning") groups[key].warnings++
          else groups[key].success++

          return groups
        },
        {} as Record<string, any>,
      )
    } else if (groupBy === "rule") {
      // Group by rule
      return results.reduce(
        (groups, result) => {
          // Extract rule name without ID
          const ruleName = result.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")
          const key = ruleName

          groups[key] = groups[key] || {
            name: ruleName,
            results: [],
            failures: 0,
            warnings: 0,
            success: 0,
          }

          groups[key].results.push(result)

          if (result.severity === "failure") groups[key].failures++
          else if (result.severity === "warning") groups[key].warnings++
          else groups[key].success++

          return groups
        },
        {} as Record<string, any>,
      )
    } else {
      // Group by severity
      return results.reduce(
        (groups, result) => {
          const key = result.severity

          groups[key] = groups[key] || {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            results: [],
            count: 0,
          }

          groups[key].results.push(result)
          groups[key].count++

          return groups
        },
        {} as Record<string, any>,
      )
    }
  }, [results, groupBy])

  // Sort groups by severity (failures first, then warnings, then success)
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedResults).sort((a, b) => {
      const [, groupA] = a
      const [, groupB] = b

      if (groupA.failures !== groupB.failures) {
        return groupB.failures - groupA.failures
      }

      if (groupA.warnings !== groupB.warnings) {
        return groupB.warnings - groupA.warnings
      }

      return 0
    })
  }, [groupedResults])

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "failure":
        return <AlertOctagon className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <Button variant={groupBy === "table" ? "default" : "outline"} onClick={() => setGroupBy("table")}>
          Group by Table
        </Button>
        <Button variant={groupBy === "rule" ? "default" : "outline"} onClick={() => setGroupBy("rule")}>
          Group by Rule
        </Button>
        <Button variant={groupBy === "severity" ? "default" : "outline"} onClick={() => setGroupBy("severity")}>
          Group by Severity
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {sortedGroups.map(([groupId, group]) => (
            <Card key={groupId} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleGroup(groupId)}
              >
                <div className="flex items-center gap-2">
                  {expandedGroups[groupId] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <span className="font-medium">{group.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {group.failures > 0 && <Badge variant="destructive">{group.failures} failures</Badge>}
                  {group.warnings > 0 && (
                    <Badge className="bg-amber-100 text-amber-800">{group.warnings} warnings</Badge>
                  )}
                  {group.success > 0 && <Badge className="bg-green-100 text-green-800">{group.success} passing</Badge>}
                  {group.count > 0 && groupBy === "severity" && (
                    <Badge
                      className={
                        groupId === "failure"
                          ? "bg-red-100 text-red-800"
                          : groupId === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                      }
                    >
                      {group.count} results
                    </Badge>
                  )}
                </div>
              </div>

              {expandedGroups[groupId] && (
                <CardContent className="pt-0 pb-2">
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      {group.results.map((result: ValidationResult, index: number) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(result.severity)}
                            <div>
                              {groupBy !== "table" && (
                                <div className="text-sm text-gray-500">
                                  {result.table}.{result.column} (Row {result.rowIndex})
                                </div>
                              )}
                              {groupBy !== "rule" && (
                                <div className="font-medium">
                                  {result.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")}
                                </div>
                              )}
                              <div className={groupBy !== "rule" ? "text-sm text-gray-600" : "font-medium"}>
                                {result.message}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewResult(result)}
                            className="h-8 w-8 p-0"
                            title="View details"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
