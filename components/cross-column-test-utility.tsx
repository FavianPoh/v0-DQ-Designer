"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface CrossColumnTestProps {
  onClose: () => void
  table?: string
  column?: string
  secondaryColumn?: string
  operator?: string
  datasets?: any
}

export function CrossColumnTestUtility({
  onClose,
  table,
  column,
  secondaryColumn,
  operator: initialOperator,
  datasets,
}: CrossColumnTestProps) {
  const [leftValue, setLeftValue] = useState<string>("")
  const [rightValue, setRightValue] = useState<string>("")
  const [leftType, setLeftType] = useState<string>("string")
  const [rightType, setRightType] = useState<string>("string")
  const [operator, setOperator] = useState<string>(initialOperator || "==")
  const [result, setResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [allowNull, setAllowNull] = useState(false)

  // Debug logging to verify props are passed correctly
  useEffect(() => {
    console.log("CrossColumnTestUtility initialized with:", {
      table,
      column,
      secondaryColumn,
      operator: initialOperator,
    })
  }, [table, column, secondaryColumn, initialOperator])

  const runTest = () => {
    // Convert values based on selected types
    const leftTyped = convertValue(leftValue, leftType)
    const rightTyped = convertValue(rightValue, rightType)

    // Handle null values if either is null and allowNull is true
    if (allowNull && (leftTyped === null || rightTyped === null)) {
      setResult({
        valid: true,
        message: "Validation skipped - null values allowed",
      })
      return
    }

    // If either value is null and allowNull is false, fail validation
    if (leftTyped === null || rightTyped === null) {
      setResult({
        valid: false,
        message: "Cannot compare null values",
      })
      return
    }

    // Perform the comparison
    let isValid = false
    switch (operator) {
      case "==":
        isValid = leftTyped === rightTyped
        break
      case "!=":
        isValid = leftTyped !== rightTyped
        break
      case ">":
        isValid = leftTyped > rightTyped
        break
      case ">=":
        isValid = leftTyped >= rightTyped
        break
      case "<":
        isValid = leftTyped < rightTyped
        break
      case "<=":
        isValid = leftTyped <= rightTyped
        break
    }

    setResult({
      valid: isValid,
      message: isValid
        ? `Validation passed: ${leftTyped} ${operator} ${rightTyped} is true`
        : `Validation failed: ${leftTyped} ${operator} ${rightTyped} is false`,
    })
  }

  // Helper function to convert string values to the appropriate type
  const convertValue = (value: string, type: string): any => {
    if (value === "" || value.toLowerCase() === "null") return null

    switch (type) {
      case "number":
        return Number(value)
      case "boolean":
        return value.toLowerCase() === "true"
      case "date":
        return new Date(value)
      default:
        return value
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Cross-Column Validation Test</CardTitle>
        <CardDescription>Test how cross-column validation will work with different values and types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Left Column Type</Label>
            <Select value={leftType} onValueChange={setLeftType}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Right Column Type</Label>
            <Select value={rightType} onValueChange={setRightType}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Left Column Value</Label>
            <Input
              value={leftValue}
              onChange={(e) => setLeftValue(e.target.value)}
              placeholder={getPlaceholder(leftType)}
            />
          </div>

          <div className="space-y-2">
            <Label>Right Column Value</Label>
            <Input
              value={rightValue}
              onChange={(e) => setRightValue(e.target.value)}
              placeholder={getPlaceholder(rightType)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Comparison Operator</Label>
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="==">Equal to (==)</SelectItem>
              <SelectItem value="!=">Not equal to (!=)</SelectItem>
              <SelectItem value=">">Greater than (&gt;)</SelectItem>
              <SelectItem value=">=">Greater than or equal to (&gt;=)</SelectItem>
              <SelectItem value="<">Less than (&lt;)</SelectItem>
              <SelectItem value="<=">Less than or equal to (&lt;=)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="allowNull" checked={allowNull} onCheckedChange={(checked) => setAllowNull(checked === true)} />
          <Label htmlFor="allowNull" className="text-sm font-medium">
            Skip validation if either value is null
          </Label>
        </div>

        {result && (
          <div
            className={`p-4 rounded-md flex items-start gap-3 ${
              result.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {result.valid ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 text-red-500" />
            )}
            <div>
              <p className="font-medium">{result.valid ? "Validation Passed" : "Validation Failed"}</p>
              <p className="text-sm">{result.message}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={runTest}>Run Test</Button>
      </CardFooter>
    </Card>
  )
}

// Helper function to provide placeholders based on type
function getPlaceholder(type: string): string {
  switch (type) {
    case "number":
      return "Enter a number"
    case "boolean":
      return "true or false"
    case "date":
      return "YYYY-MM-DD"
    default:
      return "Enter a value"
  }
}
