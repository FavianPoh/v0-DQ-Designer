"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { PlusCircle, Trash2, FilterIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"

interface AggregationConfig {
  function: string
  column: string
  alias?: string
  filter?: {
    column: string
    operator: string
    value: string
  }
}

interface AggregationFunctionEditorProps {
  columns: string[]
  aggregations: AggregationConfig[]
  onAggregationsChange: (aggregations: AggregationConfig[]) => void
}

export function AggregationFunctionEditor({
  columns,
  aggregations,
  onAggregationsChange,
}: AggregationFunctionEditorProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

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

    if (agg.filter) {
      // Remove filter
      const { filter, ...rest } = agg
      updateAggregation(index, rest)
    } else {
      // Add default filter
      updateAggregation(index, {
        filter: {
          column: columns.length > 0 ? columns[0] : "",
          operator: "==",
          value: "",
        },
      })
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Aggregation Functions</h3>
        <Button onClick={addAggregation} size="sm" variant="outline">
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
          {aggregations.map((agg, index) => (
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
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="min">Minimum</SelectItem>
                          <SelectItem value="max">Maximum</SelectItem>
                          <SelectItem value="distinct-count">Distinct Count</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`column-${index}`}>Column</Label>
                      <Select value={agg.column} onValueChange={(value) => updateAggregation(index, { column: value })}>
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
                        checked={!!agg.filter}
                        onCheckedChange={() => toggleFilter(index)}
                      />
                    </div>

                    {agg.filter && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div>
                          <Select
                            value={agg.filter.column}
                            onValueChange={(value) => updateFilter(index, { column: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Column" />
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
                          <Select
                            value={agg.filter.operator}
                            onValueChange={(value) => updateFilter(index, { operator: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="==">Equal (==)</SelectItem>
                              <SelectItem value="!=">Not equal (!=)</SelectItem>
                              <SelectItem value=">">Greater than (&gt;)</SelectItem>
                              <SelectItem value=">=">Greater than or equal (&gt;=)</SelectItem>
                              <SelectItem value="<">Less than (&lt;)</SelectItem>
                              <SelectItem value="<=">Less than or equal (&lt;=)</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="starts-with">Starts with</SelectItem>
                              <SelectItem value="ends-with">Ends with</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Input
                            value={agg.filter.value}
                            onChange={(e) => updateFilter(index, { value: e.target.value })}
                            placeholder="Value"
                            className="h-9"
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="text-xs text-gray-500 mt-2">
        <p>Aggregation functions calculate values across multiple rows in your dataset.</p>
        <p>Use these functions in your formula to compare individual values against aggregated results.</p>
      </div>
    </div>
  )
}
