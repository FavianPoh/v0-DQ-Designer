"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { PlusCircle, Trash2, FilterIcon, Plus } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export interface AggregationConfig {
  function: string
  column: string
  alias?: string
  filter?: {
    conditions: Array<{
      column: string
      operator: string
      value: any
    }>
    type: "OR" | "AND"
  }
  groupColumns?: string[]
  distinctColumn?: string
  resultHandling?: "ALL" | "ANY" | "MAJORITY"
}

interface AggregationFunctionEditorProps {
  columns: string[]
  aggregations: AggregationConfig[]
  onAggregationsChange: (aggregations: AggregationConfig[]) => void
}

// Using default export instead of named export
export default function AggregationFunctionEditor({
  columns,
  aggregations,
  onAggregationsChange,
}: AggregationFunctionEditorProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Initialize filterEnabled and filterConditions states for each aggregation
  const [filterStates, setFilterStates] = useState(
    aggregations.map((agg) => ({
      filterEnabled: !!agg.filter,
      filterConditions: agg.filter
        ? agg.filter.conditions
        : [{ column: columns.length > 0 ? columns[0] : "", operator: "==", value: "" }],
      filterType: agg.filter?.type || "OR",
    })),
  )

  // Update filterStates when aggregations prop changes
  useEffect(() => {
    setFilterStates(
      aggregations.map((agg) => ({
        filterEnabled: !!agg.filter,
        filterConditions: agg.filter
          ? agg.filter.conditions
          : [{ column: columns.length > 0 ? columns[0] : "", operator: "==", value: "" }],
        filterType: agg.filter?.type || "OR",
      })),
    )
  }, [aggregations, columns])

  const addAggregation = () => {
    const newAggregations = [
      ...aggregations,
      {
        function: "sum",
        column: columns.length > 0 ? columns[0] : "",
      },
    ]
    onAggregationsChange(newAggregations)

    // Expand the newly added item
    const newIndex = newAggregations.length - 1
    setExpandedItems([...expandedItems, `item-${newIndex}`])
  }

  const removeAggregation = (index: number) => {
    const newAggregations = [...aggregations]
    newAggregations.splice(index, 1)
    onAggregationsChange(newAggregations)

    // Remove from expanded items
    setExpandedItems(expandedItems.filter((item) => item !== `item-${index}`))
  }

  const updateAggregation = (index: number, updatedConfig: Partial<AggregationConfig>) => {
    const newAggregations = [...aggregations]
    newAggregations[index] = {
      ...newAggregations[index],
      ...updatedConfig,
    }
    onAggregationsChange(newAggregations)
  }

  const toggleFilter = (index: number) => {
    const agg = aggregations[index]
    const currentFilterType = filterStates[index]?.filterType || "OR"

    if (agg.filter) {
      // Remove filter
      const { filter, ...rest } = agg
      updateAggregation(index, rest)
    } else {
      // Add default filter
      updateAggregation(index, {
        filter: {
          conditions: [
            {
              column: columns.length > 0 ? columns[0] : "",
              operator: "==",
              value: "",
            },
          ],
          type: currentFilterType,
        },
      })
    }

    // Update filterEnabled state
    setFilterStates((prevFilterStates) => {
      const newFilterStates = [...prevFilterStates]
      newFilterStates[index] = {
        ...newFilterStates[index],
        filterEnabled: !newFilterStates[index].filterEnabled,
      }
      return newFilterStates
    })
  }

  const updateFilter = (index: number, filterUpdate: Partial<AggregationConfig["filter"]>) => {
    const agg = aggregations[index]
    if (!agg.filter) return

    updateAggregation(index, {
      filter: {
        ...agg.filter,
        ...filterUpdate,
      },
    })
  }

  const getFunctionName = (func: string): string => {
    switch (func) {
      case "sum":
        return "Sum"
      case "avg":
        return "Average"
      case "count":
        return "Count"
      case "min":
        return "Minimum"
      case "max":
        return "Maximum"
      case "distinct-count":
        return "Distinct Count"
      default:
        return func[0].toUpperCase() + func.slice(1)
    }
  }

  const updateFilterType = (index: number, filterType: "AND" | "OR") => {
    setFilterStates((prevFilterStates) => {
      const newFilterStates = [...prevFilterStates]
      if (newFilterStates[index]) {
        newFilterStates[index] = {
          ...newFilterStates[index],
          filterType,
        }
      }
      return newFilterStates
    })

    const agg = aggregations[index]
    if (agg.filter) {
      updateFilter(index, { type: filterType })
    }
  }

  const addFilterCondition = (index: number) => {
    setFilterStates((prevFilterStates) => {
      const newFilterStates = [...prevFilterStates]
      if (newFilterStates[index]) {
        const newConditions = [
          ...newFilterStates[index].filterConditions,
          { column: columns.length > 0 ? columns[0] : "", operator: "==", value: "" },
        ]

        newFilterStates[index] = {
          ...newFilterStates[index],
          filterConditions: newConditions,
        }

        // Update the actual aggregation with the new conditions
        const currentFilterType = newFilterStates[index].filterType || "OR"
        updateAggregation(index, {
          filter: {
            conditions: newConditions,
            type: currentFilterType,
          },
        })
      }
      return newFilterStates
    })
  }

  const removeFilterCondition = (index: number, conditionIndex: number) => {
    setFilterStates((prevFilterStates) => {
      const newFilterStates = [...prevFilterStates]
      if (newFilterStates[index] && newFilterStates[index].filterConditions.length > 1) {
        const newConditions = [...newFilterStates[index].filterConditions]
        newConditions.splice(conditionIndex, 1)

        newFilterStates[index] = {
          ...newFilterStates[index],
          filterConditions: newConditions,
        }

        // Update the actual aggregation with the new conditions
        const currentFilterType = newFilterStates[index].filterType || "OR"
        updateAggregation(index, {
          filter: {
            conditions: newConditions,
            type: currentFilterType,
          },
        })
      }
      return newFilterStates
    })
  }

  const updateFilterCondition = (index: number, conditionIndex: number, field: string, value: any) => {
    setFilterStates((prevFilterStates) => {
      const newFilterStates = [...prevFilterStates]
      if (newFilterStates[index] && newFilterStates[index].filterConditions[conditionIndex]) {
        const newConditions = [...newFilterStates[index].filterConditions]
        newConditions[conditionIndex] = { ...newConditions[conditionIndex], [field]: value }

        newFilterStates[index] = {
          ...newFilterStates[index],
          filterConditions: newConditions,
        }

        // Update the actual aggregation with the new conditions
        const currentFilterType = newFilterStates[index].filterType || "OR"
        updateAggregation(index, {
          filter: {
            conditions: newConditions,
            type: currentFilterType,
          },
        })
      }
      return newFilterStates
    })
  }

  // Add support for distinct group aggregations in the AggregationFunctionEditor

  // Add the new function options to the select dropdown
  const functionOptions = [
    { value: "sum", label: "SUM" },
    { value: "avg", label: "AVG" },
    { value: "count", label: "COUNT" },
    { value: "min", label: "MIN" },
    { value: "max", label: "MAX" },
    { value: "distinct-count", label: "DISTINCT_COUNT" },
    { value: "distinct-group-sum", label: "DISTINCT_GROUP_SUM" },
    { value: "distinct-group-avg", label: "DISTINCT_GROUP_AVG" },
    { value: "distinct-group-count", label: "DISTINCT_GROUP_COUNT" },
    { value: "distinct-group-min", label: "DISTINCT_GROUP_MIN" },
    { value: "distinct-group-max", label: "DISTINCT_GROUP_MAX" },
  ]

  // Add a function to check if an aggregation is a distinct group type
  function isDistinctGroupAggregation(functionName: string): boolean {
    return functionName.startsWith("distinct-group-")
  }

  const handleAggregationChange = (index: number, updatedAggregation: AggregationConfig) => {
    const newAggregations = [...aggregations]
    newAggregations[index] = updatedAggregation
    onAggregationsChange(newAggregations)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Aggregation Functions</h3>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            addAggregation()
          }}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Function
        </Button>
      </div>

      {aggregations.length === 0 ? (
        <div className="border border-dashed rounded-md p-6 text-center text-gray-500">
          No aggregation functions defined. Click "Add Function" to create one.
        </div>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems}>
          {aggregations.map((agg, index) => {
            const filterEnabled = filterStates[index]?.filterEnabled
            const filterConditions = filterStates[index]?.filterConditions || []

            return (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-md mb-3 overflow-hidden">
                <AccordionTrigger className="px-4 py-2 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="font-medium">
                      {getFunctionName(agg.function)}({agg.column}){agg.alias ? ` as ${agg.alias}` : ""}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAggregation(index)
                      }}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`function-${index}`}>Function</Label>
                        <Select
                          value={agg.function}
                          onValueChange={(value) => updateAggregation(index, { function: value })}
                        >
                          <SelectTrigger id={`function-${index}`}>
                            <SelectValue placeholder="Select function" />
                          </SelectTrigger>
                          <SelectContent>
                            {functionOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`column-${index}`}>Column</Label>
                        <Select
                          value={agg.column}
                          onValueChange={(value) => updateAggregation(index, { column: value })}
                        >
                          <SelectTrigger id={`column-${index}`}>
                            <SelectValue placeholder="Select column" />
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

                    <div className="space-y-2">
                      <Label htmlFor={`alias-${index}`}>Alias (optional)</Label>
                      <Input
                        id={`alias-${index}`}
                        value={agg.alias || ""}
                        onChange={(e) => updateAggregation(index, { alias: e.target.value })}
                        placeholder="Optional name for this aggregation"
                      />
                    </div>

                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FilterIcon className="h-4 w-4 mr-2 text-gray-500" />
                          <Label htmlFor={`filter-switch-${index}`} className="text-sm font-medium cursor-pointer">
                            Filter rows
                          </Label>
                        </div>
                        <Switch
                          id={`filter-switch-${index}`}
                          checked={filterEnabled}
                          onCheckedChange={() => {
                            toggleFilter(index)
                          }}
                        />
                      </div>

                      {filterEnabled && (
                        <div className="space-y-2 mt-2">
                          {filterConditions.map((condition, conditionIndex) => (
                            <div key={conditionIndex} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md">
                              <Select
                                value={condition.column}
                                onValueChange={(value) => updateFilterCondition(index, conditionIndex, "column", value)}
                              >
                                <SelectTrigger className="w-[30%]">
                                  <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateFilterCondition(index, conditionIndex, "operator", value)
                                }
                              >
                                <SelectTrigger className="w-[30%]">
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="==">Equal (==)</SelectItem>
                                  <SelectItem value="!=">Not Equal (!=)</SelectItem>
                                  <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                                  <SelectItem value=">=">Greater or Equal (&gt;=)</SelectItem>
                                  <SelectItem value="<">Less Than (&lt;)</SelectItem>
                                  <SelectItem value="<=">Less or Equal (&lt;=)</SelectItem>
                                </SelectContent>
                              </Select>

                              <Input
                                className="w-[30%]"
                                placeholder="Value"
                                value={condition.value}
                                onChange={(e) => updateFilterCondition(index, conditionIndex, "value", e.target.value)}
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFilterCondition(index, conditionIndex)}
                                disabled={filterConditions.length === 1}
                                title="Remove condition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <div className="mt-4 border-t pt-2">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium">Condition Type</Label>
                                <RadioGroup
                                  value={filterStates[index]?.filterType || "OR"}
                                  onValueChange={(value) => updateFilterType(index, value as "AND" | "OR")}
                                  className="flex space-x-3"
                                >
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="AND" id={`and-${index}`} />
                                    <Label htmlFor={`and-${index}`} className="text-xs">
                                      AND
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="OR" id={`or-${index}`} />
                                    <Label htmlFor={`or-${index}`} className="text-xs">
                                      OR
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addFilterCondition(index)}
                                title="Add another condition"
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Condition
                              </Button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-500">
                              Filter conditions are combined with {filterStates[index]?.filterType || "OR"} logic
                            </p>
                          </div>
                        </div>
                      )}
                    </Card>
                    {isDistinctGroupAggregation(agg.function) && (
                      <div className="mt-4 p-3 border rounded-md border-blue-200 bg-blue-50">
                        <h3 className="text-sm font-medium mb-2">Distinct Group Configuration</h3>

                        <div className="mb-3">
                          <Label className="mb-1 block text-xs">Group By Columns</Label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {columns.map((column) => (
                              <Button
                                key={column}
                                type="button"
                                variant={agg.groupColumns?.includes(column) ? "secondary" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const newAggregation = { ...agg }
                                  if (!newAggregation.groupColumns) {
                                    newAggregation.groupColumns = []
                                  }

                                  if (newAggregation.groupColumns.includes(column)) {
                                    newAggregation.groupColumns = newAggregation.groupColumns.filter(
                                      (c) => c !== column,
                                    )
                                  } else {
                                    newAggregation.groupColumns.push(column)
                                  }

                                  handleAggregationChange(index, newAggregation)
                                }}
                                className="text-xs"
                              >
                                {column}
                              </Button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            Select columns that form the composite key for grouping.
                          </p>
                        </div>

                        <div className="mb-3">
                          <Label className="mb-1 block text-xs">Distinct Values Column (optional)</Label>
                          <Select
                            value={agg.distinctColumn || ""}
                            onValueChange={(value) => {
                              const newAggregation = { ...agg }
                              // If "none" is selected, set distinctColumn to null
                              newAggregation.distinctColumn = value === "none" ? null : value
                              handleAggregationChange(index, newAggregation)
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select column (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None (Optional)</SelectItem>
                              {columns.map((column) => (
                                <SelectItem key={column} value={column}>
                                  {column}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Select the column whose distinct values you want to aggregate by, or choose "None" if not
                            needed.
                          </p>
                        </div>

                        <div>
                          <Label className="mb-1 block text-xs">Result Handling</Label>
                          <Select
                            value={agg.resultHandling || "ALL"}
                            onValueChange={(value) => {
                              const newAggregation = { ...agg }
                              newAggregation.resultHandling = value as "ALL" | "ANY" | "MAJORITY"
                              handleAggregationChange(index, newAggregation)
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="How to handle results" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">ALL must pass</SelectItem>
                              <SelectItem value="ANY">ANY must pass</SelectItem>
                              <SelectItem value="MAJORITY">MAJORITY must pass</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Specify how to handle multiple results from distinct values:
                            <br />
                            <strong>ALL</strong>: Every distinct value must pass the validation
                            <br />
                            <strong>ANY</strong>: At least one distinct value must pass
                            <br />
                            <strong>MAJORITY</strong>: More than half of distinct values must pass
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      <div className="text-xs text-gray-500 mt-2">
        <p>Aggregation functions calculate values across multiple rows in your dataset.</p>
        <p>Use these functions in your formula to compare individual values against aggregated results.</p>
      </div>
    </div>
  )
}

// Add this line to provide both default and named exports
export { AggregationFunctionEditor }
