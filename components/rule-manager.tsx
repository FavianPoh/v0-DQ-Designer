"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Pencil, Trash2, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RuleForm } from "@/components/rule-form"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface RuleManagerProps {
  rules: DataQualityRule[]
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onAddRule: (rule: DataQualityRule) => void
  onDeleteRule: (ruleId: string) => void
  onUpdateRule: (rule: DataQualityRule) => void
  highlightedRuleId?: string | null
  editingRuleId?: string | null
  onRuleHighlighted?: () => void
  onEditingChange?: (ruleId: string | null) => void
  isSaving?: boolean
}

export function RuleManager({
  rules,
  tables,
  datasets,
  valueLists: initialValueLists,
  onAddRule,
  onDeleteRule,
  onUpdateRule,
  highlightedRuleId,
  editingRuleId,
  onRuleHighlighted,
  onEditingChange,
  isSaving = false,
}: RuleManagerProps) {
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [localEditingRuleId, setLocalEditingRuleId] = useState<string | null>(null)
  const [filterTable, setFilterTable] = useState<string>("")
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [valueLists, setValueLists] = useState<ValueList[]>(initialValueLists || [])

  // Sync external editing state with local state
  useEffect(() => {
    if (editingRuleId !== undefined) {
      setLocalEditingRuleId(editingRuleId)
    }
  }, [editingRuleId])

  // Handle highlighted rule
  useEffect(() => {
    if (highlightedRuleId) {
      // Scroll to the highlighted rule
      const ruleElement = document.getElementById(`rule-${highlightedRuleId}`)
      if (ruleElement) {
        ruleElement.scrollIntoView({ behavior: "smooth", block: "center" })

        // Add a temporary highlight effect
        ruleElement.classList.add("border-blue-500", "border-2", "bg-blue-50")

        // Remove the highlight after a delay
        setTimeout(() => {
          ruleElement.classList.remove("border-blue-500", "border-2", "bg-blue-50")
          if (onRuleHighlighted) {
            onRuleHighlighted()
          }
        }, 3000)
      }
    }
  }, [highlightedRuleId, onRuleHighlighted])

  const handleAddRule = (rule: DataQualityRule) => {
    onAddRule(rule)
    setIsAddingRule(false)
  }

  const handleUpdateRule = (rule: DataQualityRule) => {
    onUpdateRule(rule)
    setLocalEditingRuleId(null)
    if (onEditingChange) {
      onEditingChange(null)
    }
  }

  const handleCancelEdit = () => {
    setIsAddingRule(false)
    setLocalEditingRuleId(null)
    if (onEditingChange) {
      onEditingChange(null)
    }
  }

  const handleEditClick = (ruleId: string) => {
    console.log("Edit clicked for rule:", ruleId)

    // Force scroll to top to ensure the edit form is visible
    window.scrollTo(0, 0)

    // Set both local and parent state
    setLocalEditingRuleId(ruleId)
    if (onEditingChange) {
      onEditingChange(ruleId)
    }

    // Add a visual indicator that the rule is being edited
    const ruleElement = document.getElementById(`rule-${ruleId}`)
    if (ruleElement) {
      ruleElement.classList.add("border-blue-500", "border-2", "bg-blue-50")
      setTimeout(() => {
        ruleElement.classList.remove("bg-blue-50")
      }, 1000)
    }
  }

  const handleDeleteClick = (ruleId: string) => {
    setRuleToDelete(ruleId)
  }

  const confirmDelete = () => {
    if (ruleToDelete) {
      onDeleteRule(ruleToDelete)
      setRuleToDelete(null)
    }
  }

  const toggleExpandRule = (ruleId: string) => {
    setExpandedRuleId(expandedRuleId === ruleId ? null : ruleId)
  }

  const filteredRules = filterTable ? rules.filter((rule) => rule.table === filterTable) : rules

  // Function to display rule name without the ID part
  const displayRuleName = (name: string) => {
    return name.replace(/ \[ID: [a-zA-Z0-9-]+\]$/, "")
  }

  const actualEditingRuleId = localEditingRuleId !== null ? localEditingRuleId : editingRuleId

  // Add this function before the return statement
  const groupRulesByType = (rules: DataQualityRule[]) => {
    const groups: Record<string, DataQualityRule[]> = {}

    rules.forEach((rule) => {
      if (!groups[rule.ruleType]) {
        groups[rule.ruleType] = []
      }
      groups[rule.ruleType].push(rule)
    })

    // Sort groups by name
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }

  // Get rule type display name
  const getRuleTypeDisplayName = (ruleType: string): string => {
    switch (ruleType) {
      case "required":
        return "Required Fields"
      case "range":
        return "Range Validations"
      case "regex":
        return "Pattern Validations"
      case "unique":
        return "Uniqueness Checks"
      case "type":
        return "Type Validations"
      case "enum":
        return "Enumeration Checks"
      case "dependency":
        return "Dependency Rules"
      case "cross-column":
        return "Cross-Column Rules"
      case "lookup":
        return "Lookup Validations"
      case "custom":
        return "Custom Functions"
      case "list":
        return "List Validations"
      case "formula":
        return "Formula Validations"
      default:
        return ruleType.charAt(0).toUpperCase() + ruleType.slice(1)
    }
  }

  // Add this useEffect to fetch value lists if it doesn't exist
  useEffect(() => {
    // Fetch value lists from API
    fetch("/api/lists")
      .then((response) => response.json())
      .then((data) => {
        setValueLists(data)
      })
      .catch((error) => {
        console.error("Error fetching value lists:", error)
      })
  }, [])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold">Data Quality Rules</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-table" className="whitespace-nowrap">
                Filter by table:
              </Label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger id="filter-table" className="w-[150px]">
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isAddingRule && !actualEditingRuleId && (
              <Button onClick={() => setIsAddingRule(true)} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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
              <RuleForm
                onSubmit={handleAddRule}
                onCancel={handleCancelEdit}
                tables={tables}
                datasets={datasets}
                valueLists={valueLists}
              />
            </CardContent>
          </Card>
        )}

        {actualEditingRuleId && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Rule</CardTitle>
            </CardHeader>
            <CardContent>
              {console.log(
                "Editing rule in RuleManager:",
                rules.find((r) => r.id === actualEditingRuleId),
              )}
              <RuleForm
                initialRule={rules.find((r) => r.id === actualEditingRuleId)}
                onSubmit={handleUpdateRule}
                onCancel={handleCancelEdit}
                tables={tables}
                datasets={datasets}
                valueLists={valueLists}
              />
            </CardContent>
          </Card>
        )}

        {/* Replace the existing rule cards grid with this grouped version */}
        {groupRulesByType(filteredRules).map(([ruleType, rulesInGroup]) => (
          <div key={ruleType} className="mb-6">
            <h3 className="text-lg font-medium mb-3 border-b pb-2">
              {getRuleTypeDisplayName(ruleType)} ({rulesInGroup.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rulesInGroup.map((rule) => (
                <Card
                  key={rule.id}
                  id={`rule-${rule.id}`}
                  className={`transition-all duration-300 cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50/30 group ${
                    actualEditingRuleId === rule.id ? "border-blue-500 border-2" : ""
                  } ${rule.enabled === false ? "border-dashed bg-gray-50" : ""}`}
                  onClick={() => toggleExpandRule(rule.id)}
                >
                  {/* Disabled rule banner */}
                  {rule.enabled === false && (
                    <div className="bg-gray-200 text-gray-600 text-xs py-1 px-2 flex items-center justify-center">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Rule disabled - will not be evaluated
                    </div>
                  )}

                  <CardHeader className="pb-1 pt-3 px-4 relative">
                    <div className="flex justify-between items-start">
                      <CardTitle
                        className={`text-base font-medium ${rule.enabled === false ? "text-gray-500" : ""} group-hover:text-blue-600`}
                      >
                        {displayRuleName(rule.name)}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const updatedRule = { ...rules.find((r) => r.id === rule.id)!, enabled: !rule.enabled }
                                onUpdateRule(updatedRule)
                              }}
                              disabled={isSaving}
                              title={rule.enabled === false ? "Enable rule" : "Disable rule"}
                            >
                              {rule.enabled === false ? (
                                <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{rule.enabled === false ? "Enable rule" : "Disable rule"}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditClick(rule.id)
                              }}
                              disabled={isSaving}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit rule</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteClick(rule.id)
                              }}
                              disabled={isSaving}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete rule</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-muted-foreground ${rule.enabled === false ? "text-gray-400" : ""}`}>
                          {rule.table.charAt(0).toUpperCase() + rule.table.slice(1)} / {rule.column}
                        </span>
                        <span>
                          {rule.severity === "failure" ? (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              Failure
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-yellow-100 px-1.5 py-0">
                              Warning
                            </Badge>
                          )}
                        </span>
                      </div>

                      {/* Show more details when expanded */}
                      {(expandedRuleId === rule.id ||
                        rule.secondaryColumns?.length > 0 ||
                        (rule.ruleType === "list" && rule.parameters.listId) ||
                        (Object.keys(rule.parameters).length > 0 && rule.ruleType !== "list") ||
                        rule.description) && (
                        <div className={`mt-2 space-y-1 ${rule.enabled === false ? "text-gray-400" : ""}`}>
                          {rule.secondaryColumns && rule.secondaryColumns.length > 0 && (
                            <div className="text-muted-foreground">
                              <span className="font-medium">Also uses:</span> {rule.secondaryColumns.join(", ")}
                            </div>
                          )}

                          {rule.ruleType === "list" && rule.parameters.listId && (
                            <div className="text-muted-foreground">
                              <span className="font-medium">List:</span>{" "}
                              {valueLists.find((list) => list.id === rule.parameters.listId)?.name || "Unknown list"}
                            </div>
                          )}

                          {Object.keys(rule.parameters).length > 0 && rule.ruleType !== "list" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-muted-foreground cursor-help">
                                  <span className="font-medium">Parameters:</span>{" "}
                                  <span className="truncate inline-block max-w-[200px] align-bottom">
                                    {formatParameters(rule.parameters)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="text-xs">
                                  {Object.entries(rule.parameters).map(([key, value]) => (
                                    <div key={key} className="mb-1">
                                      <span className="font-medium">{key}:</span>{" "}
                                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {rule.description && (
                            <div className="text-muted-foreground">
                              <span className="font-medium">Description:</span> {rule.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredRules.length === 0 && !isAddingRule && (
          <div className="col-span-2 text-center py-8 border rounded-md bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {filterTable ? `No rules defined for the ${filterTable} table yet.` : "No rules defined yet."}
              Click "Add Rule" to create your first data quality rule.
            </p>
          </div>
        )}

        <AlertDialog open={ruleToDelete !== null} onOpenChange={(open) => !open && setRuleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this rule. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

function formatParameters(params: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return "None"
  }

  return Object.entries(params)
    .map(([key, value]) => {
      // Skip complex objects or empty values
      if (typeof value === "object" && value !== null) {
        return `${key}: [Object]`
      }
      if (value === "" || value === null || value === undefined) {
        return null
      }
      // Format the value based on type
      if (typeof value === "string" && value.length > 20) {
        return `${key}: ${value.substring(0, 20)}...`
      }
      return `${key}: ${value}`
    })
    .filter(Boolean) // Remove null entries
    .join(", ")
}
