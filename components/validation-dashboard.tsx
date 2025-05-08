"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ValidationResult, DataQualityRule } from "@/lib/types"

interface ValidationDashboardProps {
  results: ValidationResult[]
  rules: DataQualityRule[]
  onExport: () => void
  onFilterChange: (filters: any) => void
}

export function ValidationDashboard({ results, rules, onExport, onFilterChange }: ValidationDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate statistics
  const stats = useMemo(() => {
    const totalIssues = results.filter((r) => r.severity !== "success").length
    const totalFailures = results.filter((r) => r.severity === "failure").length
    const totalWarnings = results.filter((r) => r.severity === "warning").length
    const totalSuccess = results.filter((r) => r.severity === "success").length

    // Group by table
    const byTable = results.reduce(
      (acc, result) => {
        acc[result.table] = acc[result.table] || {
          table: result.table,
          failures: 0,
          warnings: 0,
          success: 0,
          total: 0,
        }

        acc[result.table][
          result.severity === "failure" ? "failures" : result.severity === "warning" ? "warnings" : "success"
        ] += 1
        acc[result.table].total += 1

        return acc
      },
      {} as Record<string, any>,
    )

    // Group by rule type
    const byRuleType = results.reduce(
      (acc, result) => {
        // Find rule type from rule ID
        const ruleId = result.ruleId || result.ruleName.match(/\[ID: ([a-zA-Z0-9-]+)\]$/)?.[1]
        const rule = rules.find((r) => r.id === ruleId)
        const ruleType = rule?.ruleType || "unknown"

        acc[ruleType] = acc[ruleType] || {
          type: ruleType,
          failures: 0,
          warnings: 0,
          success: 0,
          total: 0,
        }

        acc[ruleType][
          result.severity === "failure" ? "failures" : result.severity === "warning" ? "warnings" : "success"
        ] += 1
        acc[ruleType].total += 1

        return acc
      },
      {} as Record<string, any>,
    )

    // Convert object values to arrays for rendering in charts
    const byTableArray = Object.values(byTable)
    const byRuleTypeArray = Object.values(byRuleType)

    return {
      totalIssues,
      totalFailures,
      totalWarnings,
      totalSuccess,
      byTable: byTableArray,
      byRuleType: byRuleTypeArray,
    }
  }, [results, rules])

  // Colors for charts
  const COLORS = {
    failure: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
  }

  // Prepare data for pie chart
  const pieData = [
    { name: "Failures", value: stats.totalFailures, color: COLORS.failure },
    { name: "Warnings", value: stats.totalWarnings, color: COLORS.warning },
    { name: "Success", value: stats.totalSuccess, color: COLORS.success },
  ].filter((item) => item.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Validation Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Results
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-table">By Table</TabsTrigger>
          <TabsTrigger value="by-rule-type">By Rule Type</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Validation Results Distribution</CardTitle>
                <CardDescription>Breakdown of validation outcomes</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} validations`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Issues</CardTitle>
                <CardDescription>Most common validation failures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.values(
                    results
                      .filter((r) => r.severity !== "success")
                      .reduce(
                        (acc, result) => {
                          const key = `${result.ruleName}-${result.message}`
                          acc[key] = acc[key] || { ...result, count: 0 }
                          acc[key].count += 1
                          return acc
                        },
                        {} as Record<string, any>,
                      ),
                  )
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 5)
                    .map((issue, index) => (
                      <div key={index} className="flex justify-between items-start border-b pb-2">
                        <div>
                          <div className="font-medium">{issue.ruleName.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")}</div>
                          <div className="text-sm text-muted-foreground">{issue.message}</div>
                        </div>
                        <Badge
                          className={
                            issue.severity === "failure"
                              ? "bg-red-100 text-red-800 hover:bg-red-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }
                        >
                          {issue.count} occurrences
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-table" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues by Table</CardTitle>
              <CardDescription>Validation results grouped by data table</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byTable} layout="vertical" margin={{ top: 20, right: 30, left: 70, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="table" type="category" width={60} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="failures" stackId="a" fill={COLORS.failure} name="Failures" />
                  <Bar dataKey="warnings" stackId="a" fill={COLORS.warning} name="Warnings" />
                  <Bar dataKey="success" stackId="a" fill={COLORS.success} name="Success" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-rule-type" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues by Rule Type</CardTitle>
              <CardDescription>Validation results grouped by rule type</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.byRuleType}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={110}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ")}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="failures" stackId="a" fill={COLORS.failure} name="Failures" />
                  <Bar dataKey="warnings" stackId="a" fill={COLORS.warning} name="Warnings" />
                  <Bar dataKey="success" stackId="a" fill={COLORS.success} name="Success" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
