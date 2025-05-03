"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type {
  DataQualityRule,
  RuleType,
  DataTables,
  ValueList,
  Condition,
  CrossTableCondition,
  ColumnCondition,
} from "@/lib/types"
import { JavaScriptExplainer } from "./javascript-explainer"
import { CrossColumnTestUtility } from "./cross-column-test-utility"

interface RuleFormProps {
  initialRule?: DataQualityRule
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onSubmit: (rule: DataQualityRule) => void
  onCancel: () => void
  onColumnChange?: (column: string) => void // Add this line
}

// Update the RULE_TYPES array to be sorted alphabetically by label
const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "column-comparison", label: "Column Comparison" },
  { value: "contains", label: "Contains String" },
  { value: "composite-reference", label: "Cross-Table Composite Key" },
  { value: "reference-integrity", label: "Cross-Table Key Integrity" },
  { value: "cross-column", label: "Cross-Column Validation" },
  { value: "custom", label: "Custom Function" },
  { value: "date-after", label: "Date After" },
  { value: "date-before", label: "Date Before" },
  { value: "date-between", label: "Date Between" },
  { value: "date-format", label: "Date Format" },
  { value: "dependency", label: "Conditional Dependency" },
  { value: "enum", label: "Enumeration" },
  { value: "equals", label: "Equals" },
  { value: "formula", label: "Math Formula" },
  { value: "javascript-formula", label: "JavaScript Formula" },
  { value: "greater-than", label: "Greater Than" },
  { value: "greater-than-equals", label: "Greater Than or Equal" },
  { value: "less-than", label: "Less Than" },
  { value: "less-than-equals", label: "Less Than or Equal" },
  { value: "list", label: "List Validation" },
  { value: "lookup", label: "Lookup Validation" },
  { value: "math-operation", label: "Math Operation" }, // New rule type
  { value: "multi-column", label: "Multi-Column Conditions" },
  { value: "not-equals", label: "Not Equals" },
  { value: "range", label: "Numeric Range" },
  { value: "regex", label: "Regex Pattern" },
  { value: "required", label: "Required Field" },
  { value: "type", label: "Type Validation" },
  { value: "unique", label: "Unique Values" },
].sort((a, b) => a.label.localeCompare(b.label))

// Add examples and explanations for each rule type
const RULE_TYPE_EXAMPLES: Record<RuleType, { example: string; explanation: string }> = {
  required: {
    example: "Field must not be empty or null",
    explanation: "Validates that a field has a value and is not empty, null, or undefined.",
  },
  equals: {
    example: "amount === 100",
    explanation: "Checks if the field value exactly matches the specified value.",
  },
  "not-equals": {
    example: "status !== 'cancelled'",
    explanation: "Checks if the field value does not match the specified value.",
  },
  "greater-than": {
    example: "age > 18",
    explanation: "Validates that the field value is greater than the specified value.",
  },
  "greater-than-equals": {
    example: "quantity >= 1",
    explanation: "Validates that the field value is greater than or equal to the specified value.",
  },
  "less-than": {
    example: "temperature < 100",
    explanation: "Validates that the field value is less than the specified value.",
  },
  "less-than-equals": {
    example: "discount <= 50",
    explanation: "Validates that the field value is less than or equal to the specified value.",
  },
  range: {
    example: "0 <= value <= 100",
    explanation: "Checks if the field value falls within the specified minimum and maximum values.",
  },
  regex: {
    example: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    explanation: "Validates that the field value matches the specified regular expression pattern.",
  },
  type: {
    example: "typeof value === 'number'",
    explanation: "Checks if the field value is of the specified data type.",
  },
  enum: {
    example: "status in ['active', 'pending', 'completed']",
    explanation: "Validates that the field value is one of the specified allowed values.",
  },
  list: {
    example: "country in CountryList",
    explanation: "Checks if the field value exists in a predefined list of values.",
  },
  contains: {
    example: "email.includes('@')",
    explanation: "Validates that the field value contains the specified substring.",
  },
  formula: {
    example: "value > 0 && value % 2 === 0",
    explanation: "Evaluates a custom JavaScript expression against the field value.",
  },
  "javascript-formula": {
    example: "return row.amount - row.refundAmount - row.processingFee >= 0;",
    explanation:
      "Evaluates a JavaScript expression with direct access to the row object. Must return true for valid rows, false for invalid rows.",
  },
  dependency: {
    example: "If status === 'completed', completedDate must be provided",
    explanation: "Validates that when a condition is met, another field must have a specific value.",
  },
  lookup: {
    example: "departmentId exists in departments.id",
    explanation: "Checks if the field value exists in another column of the same table.",
  },
  "reference-integrity": {
    example: "userId exists in users.id",
    explanation: "Validates that the field value exists in a column of another table (foreign key check).",
  },
  "composite-reference": {
    example: "(firstName, lastName) exists in contacts(firstName, lastName)",
    explanation:
      "Checks if a combination of columns exists in another table. Source columns are from the current table, reference columns are from the target table.",
  },
  custom: {
    example: "function(value, row) { return value.length >= 8; }",
    explanation: "Executes a custom validation function against the field value.",
  },
  unique: {
    example: "email must be unique across all rows",
    explanation:
      "Validates that the field value or combination of field values is unique across all rows in the table.",
  },
  "cross-column": {
    example: "endDate > startDate",
    explanation: "Compares values between different columns in the same row.",
  },
  "multi-column": {
    example: "(status === 'active' AND role === 'admin') OR isSpecialUser === true",
    explanation: "Combines multiple conditions across different columns with logical operators.",
  },
  "date-before": {
    example: "date < '2023-12-31'",
    explanation: "Checks if a date is before the specified date.",
  },
  "date-after": {
    example: "date > '2023-01-01'",
    explanation: "Checks if a date is after the specified date.",
  },
  "date-between": {
    example: "'2023-01-01' <= date <= '2023-12-31'",
    explanation: "Validates that a date falls within a specified range.",
  },
  "date-format": {
    example: "date in format 'YYYY-MM-DD'",
    explanation: "Checks if a date string follows the specified format.",
  },
  "math-operation": {
    example: "amount - refundAmount - processingFee > 0",
    explanation: "Performs a basic math operation on columns and/or constants, then compares the result to a value.",
  },
  "column-comparison": {
    example: "startDate < endDate",
    explanation:
      "Compares values between different columns in the same row. Validates the relationship between two columns in the same dataset.",
  },
}

// Add this helper function to ensure logical operators are set
function ensureLogicalOperators(conditions: Condition[]): Condition[] {
  if (!conditions || conditions.length === 0) return []

  return conditions.map((condition, index) => {
    // Make sure every condition except the last one has a logical operator
    if (index < conditions.length - 1) {
      return {
        ...condition,
        logicalOperator: condition.logicalOperator || "AND", // Default to AND if not set
      }
    }
    return condition
  })
}

// Helper function to render a human-readable preview of the math operation
function renderMathOperationPreview(parameters: any): string {
  const { operation, operands, comparisonOperator, comparisonValue } = parameters || {}

  if (!operation || !operands || !operands.length) {
    return "No operation configured yet"
  }

  let mathExpr = ""

  operands.forEach((operand, index) => {
    const opValue =
      operand.type === "column" ? (operand.value ? `[${operand.value}]` : "[select column]") : operand.value

    if (index === 0) {
      mathExpr += opValue
    } else {
      switch (operation) {
        case "add":
          mathExpr += ` + ${opValue}`
          break
        case "subtract":
          mathExpr += ` - ${opValue}`
          break
        case "multiply":
          mathExpr += ` × ${opValue}`
          break
        case "divide":
          mathExpr += ` ÷ ${opValue}`
          break
      }
    }
  })

  if (comparisonOperator && comparisonValue !== undefined) {
    mathExpr += ` ${comparisonOperator} ${comparisonValue}`
  } else {
    mathExpr += " [select comparison]"
  }

  return mathExpr
}

export function RuleForm(props: RuleFormProps) {
  const { initialRule, tables, datasets, valueLists, onSubmit, onCancel } = props
  const [rule, setRule] = useState<DataQualityRule>(
    initialRule || {
      id: crypto.randomUUID(),
      name: "",
      table: tables[0] || "",
      column: "",
      ruleType: "required",
      parameters: {},
      description: "",
      severity: "failure",
      conditions: [],
      enabled: true, // Add this line to ensure new rules are enabled by default
    },
  )

  // Track available columns for each table
  const [tableColumns, setTableColumns] = useState<Record<string, string[]>>({})
  const [selectedSecondaryColumns, setSelectedSecondaryColumns] = useState<string[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [showAdvancedConditions, setShowAdvancedConditions] = useState(false)
  const [additionalConditions, setAdditionalConditions] = useState<Condition[]>([])
  const [crossTableConditions, setCrossTableConditions] = useState<CrossTableCondition[]>([])
  const [advancedConditionsTab, setAdvancedConditionsTab] = useState<string>("same-table")

  // New state for reference integrity rule
  const [referenceTableColumns, setReferenceTableColumns] = useState<string[]>([])

  // New state for composite reference columns
  const [sourceColumns, setSourceColumns] = useState<string[]>(
    initialRule?.parameters?.sourceColumns || [initialRule?.column || ""],
  )
  const [referenceColumns, setReferenceColumns] = useState<string[]>(initialRule?.parameters?.referenceColumns || [])

  // New state for multiple column conditions
  const [columnConditions, setColumnConditions] = useState<ColumnCondition[]>(
    initialRule?.columnConditions || [
      {
        column: initialRule?.column || "",
        ruleType: initialRule?.ruleType || "required",
        parameters: initialRule?.parameters || {},
        logicalOperator: "AND",
        table: initialRule?.table || tables[0] || "", // Add table to column conditions
      },
    ],
  )

  // New state for unique columns
  const [uniqueColumns, setUniqueColumns] = useState<string[]>(
    initialRule?.parameters?.uniqueColumns || [initialRule?.column || ""],
  )

  // Debug state to track form validation
  const [formDebug, setFormDebug] = useState<{
    hasName: boolean
    hasSourceColumns: boolean
    hasReferenceColumns: boolean
    hasColumnsMatch: boolean
    hasReferenceTable: boolean
  }>({
    hasName: !!rule.name,
    hasSourceColumns: sourceColumns.filter(Boolean).length > 0,
    hasReferenceColumns: referenceColumns.filter(Boolean).length > 0,
    hasColumnsMatch: sourceColumns.filter(Boolean).length === referenceColumns.filter(Boolean).length,
    hasReferenceTable: !!rule.parameters.referenceTable,
  })

  const [showCrossColumnTester, setShowCrossColumnTester] = useState(false)

  // Initialize table columns for all tables
  useEffect(() => {
    const columnsMap: Record<string, string[]> = {}

    for (const tableName of tables) {
      if (datasets[tableName] && datasets[tableName].length > 0) {
        columnsMap[tableName] = Object.keys(datasets[tableName][0])
      } else {
        columnsMap[tableName] = []
      }
    }

    setTableColumns(columnsMap)
  }, [datasets, tables])

  // Update available columns when table changes
  useEffect(() => {
    if (rule.table && datasets[rule.table] && datasets[rule.table].length > 0) {
      const columns = Object.keys(datasets[rule.table][0])

      // Update secondary columns
      if (rule.secondaryColumns) {
        const validSecondaryColumns = rule.secondaryColumns.filter((col) => columns.includes(col))
        setSelectedSecondaryColumns(validSecondaryColumns)
        setRule((prev) => ({
          ...prev,
          secondaryColumns: validSecondaryColumns.length > 0 ? validSecondaryColumns : undefined,
        }))
      }

      // Update source columns for composite reference
      if (rule.parameters.sourceColumns) {
        const validSourceColumns = rule.parameters.sourceColumns.filter((col) => columns.includes(col))
        setSourceColumns(validSourceColumns.length > 0 ? validSourceColumns : [])
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            sourceColumns: validSourceColumns.length > 0 ? validSourceColumns : [],
          },
        }))
      }

      // Update unique columns
      if (rule.parameters.uniqueColumns) {
        const validUniqueColumns = rule.parameters.uniqueColumns.filter((col) => columns.includes(col))
        setUniqueColumns(validUniqueColumns.length > 0 ? validUniqueColumns : [rule.column || ""])
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            uniqueColumns: validUniqueColumns.length > 0 ? validUniqueColumns : [prev.column || ""],
          },
        }))
      }
    }
  }, [rule.table, datasets])

  // Update reference table columns when reference table changes
  useEffect(() => {
    if (rule.parameters.referenceTable && datasets[rule.parameters.referenceTable]?.length > 0) {
      const columns = Object.keys(datasets[rule.parameters.referenceTable][0])
      setReferenceTableColumns(columns)

      // Reset reference column if it's not in the new table
      if (rule.parameters.referenceColumn && !columns.includes(rule.parameters.referenceColumn)) {
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            referenceColumn: "",
          },
        }))
      }

      // Update reference columns for composite reference
      if (rule.parameters.referenceColumns) {
        const validReferenceColumns = rule.parameters.referenceColumns.filter((col) => columns.includes(col))
        setReferenceColumns(validReferenceColumns)
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            referenceColumns: validReferenceColumns,
          },
        }))
      }
    } else {
      setReferenceTableColumns([])
    }
  }, [rule.parameters.referenceTable, datasets])

  // Update debug state whenever relevant values change
  useEffect(() => {
    setFormDebug({
      hasName: !!rule.name,
      hasSourceColumns: sourceColumns.filter(Boolean).length > 0,
      hasReferenceColumns: referenceColumns.filter(Boolean).length > 0,
      hasColumnsMatch: sourceColumns.filter(Boolean).length === referenceColumns.filter(Boolean).length,
      hasReferenceTable: !!rule.parameters.referenceTable,
    })
  }, [rule.name, sourceColumns, referenceColumns, rule.parameters.referenceTable])

  useEffect(() => {
    if (initialRule) {
      console.log("Loading initial rule in RuleForm:", initialRule)

      // Create a deep copy to avoid reference issues
      const ruleCopy = JSON.parse(JSON.stringify(initialRule))

      // Special handling for date rules
      if (initialRule.ruleType?.startsWith("date-")) {
        console.log("Date rule detected in RuleForm, column =", initialRule.column)
      }

      setRule(ruleCopy)

      if (initialRule.secondaryColumns) {
        setSelectedSecondaryColumns(initialRule.secondaryColumns)
      }
      if (initialRule.conditions) {
        setConditions(initialRule.conditions)
      }
      if (initialRule.additionalConditions && initialRule.additionalConditions.length > 0) {
        setAdditionalConditions(initialRule.additionalConditions)
        setShowAdvancedConditions(true)
      }
      if (initialRule.crossTableConditions && initialRule.crossTableConditions.length > 0) {
        setCrossTableConditions(initialRule.crossTableConditions)
        setShowAdvancedConditions(true)
        setAdvancedConditionsTab("cross-table")
      }
      if (initialRule.columnConditions && initialRule.columnConditions.length > 0) {
        // Add table property to each column condition if not present
        const updatedConditions = initialRule.columnConditions.map((condition) => ({
          ...condition,
          table: condition.table || initialRule.table || tables[0] || "",
        }))
        setColumnConditions(updatedConditions)
      } else if (initialRule.column && initialRule.ruleType) {
        // Create a column condition from the primary rule
        setColumnConditions([
          {
            column: initialRule.column,
            ruleType: initialRule.ruleType,
            parameters: initialRule.parameters,
            logicalOperator: "AND",
            table: initialRule.table || tables[0] || "",
          },
        ])
      }

      // Initialize composite reference columns
      if (initialRule.ruleType === "composite-reference") {
        const sourceColumnsFromRule = initialRule.parameters.sourceColumns || [initialRule.column || ""]
        const referenceColumnsFromRule = initialRule.parameters.referenceColumns || []
        const sourceTableFromRule = initialRule.parameters.sourceTable || initialRule.table || ""

        setSourceColumns(sourceColumnsFromRule)
        setReferenceColumns(referenceColumnsFromRule)

        // Ensure these are also in the rule parameters
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            sourceTable: sourceTableFromRule,
            sourceColumns: sourceColumnsFromRule,
            referenceColumns: referenceColumnsFromRule,
          },
        }))
      }

      // Initialize unique columns
      if (initialRule.ruleType === "unique") {
        const uniqueColumnsFromRule = initialRule.parameters.uniqueColumns || [initialRule.column || ""]
        setUniqueColumns(uniqueColumnsFromRule)

        // Ensure these are also in the rule parameters
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            uniqueColumns: uniqueColumnsFromRule,
          },
        }))
      }
    }
  }, [initialRule, datasets, tables])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setRule((prev) => ({ ...prev, [name]: value }))

    // Update form debug state for name
    if (name === "name") {
      setFormDebug((prev) => ({ ...prev, hasName: !!value }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setRule((prev) => ({ ...prev, [name]: value }))

    if (name === "table") {
      setRule((prev) => ({ ...prev, column: "" })) // Reset column when table changes
    }
  }

  const handleRuleTypeChange = (value: RuleType) => {
    setRule((prev) => ({
      ...prev,
      ruleType: value,
      parameters: {}, // Reset parameters when rule type changes
    }))
    setConditions([]) // Reset conditions when rule type changes
    setAdditionalConditions([]) // Reset additional conditions when rule type changes
    setCrossTableConditions([]) // Reset cross-table conditions when rule type changes
    setColumnConditions([
      {
        column: rule.column,
        ruleType: value,
        parameters: {},
        logicalOperator: "AND",
        table: rule.table || tables[0] || "",
      },
    ]) // Reset column conditions when rule type changes
  }

  const handleParameterChange = (name: string, value: any) => {
    setRule((prev) => ({
      ...prev,
      parameters: { ...prev.parameters, [name]: value },
    }))
  }

  const handleSecondaryColumnChange = (column: string) => {
    setSelectedSecondaryColumns((prev) => {
      if (prev.includes(column)) {
        return prev.filter((col) => col !== column)
      } else {
        return [...prev, column]
      }
    })

    setRule((prev) => ({
      ...prev,
      secondaryColumns: selectedSecondaryColumns.includes(column)
        ? selectedSecondaryColumns.filter((col) => col !== column)
        : [...selectedSecondaryColumns, column],
    }))
  }

  const handleConditionChange = (index: number, field: string, value: any) => {
    const updatedConditions = [...conditions]
    updatedConditions[index][field] = value
    setConditions(updatedConditions)
    setRule((prev) => ({ ...prev, conditions: updatedConditions }))
  }

  const handleAddCondition = () => {
    setConditions((prev) => [...prev, { field: "", operator: "", value: "" }])
  }

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...conditions]
    updatedConditions.splice(index, 1)
    setConditions(updatedConditions)
    setRule((prev) => ({ ...prev, conditions: updatedConditions }))
  }

  const handleAdditionalConditionChange = (index: number, field: string, value: any) => {
    const updatedConditions = [...additionalConditions]
    updatedConditions[index][field] = value
    setAdditionalConditions(updatedConditions)
    setRule((prev) => ({ ...prev, additionalConditions: updatedConditions }))
  }

  const handleAddAdditionalCondition = () => {
    setAdditionalConditions((prev) => [...prev, { field: "", operator: "", value: "" }])
  }

  const handleRemoveAdditionalCondition = (index: number) => {
    const updatedConditions = [...additionalConditions]
    updatedConditions.splice(index, 1)
    setAdditionalConditions(updatedConditions)
    setRule((prev) => ({ ...prev, additionalConditions: updatedConditions }))
  }

  const handleCrossTableConditionChange = (index: number, field: string, value: any) => {
    const updatedConditions = [...crossTableConditions]
    updatedConditions[index][field] = value
    setCrossTableConditions(updatedConditions)
    setRule((prev) => ({ ...prev, crossTableConditions: updatedConditions }))
  }

  const handleAddCrossTableCondition = () => {
    setCrossTableConditions((prev) => [
      ...prev,
      { table: "", column: "", operator: "", value: "", logicalOperator: "AND" },
    ])
  }

  const handleRemoveCrossTableCondition = (index: number) => {
    const updatedConditions = [...crossTableConditions]
    updatedConditions.splice(index, 1)
    setCrossTableConditions(updatedConditions)
    setRule((prev) => ({ ...prev, crossTableConditions: updatedConditions }))
  }

  const handleColumnConditionChange = (index: number, field: string, value: any) => {
    const updatedConditions = [...columnConditions]
    updatedConditions[index][field] = value
    setColumnConditions(updatedConditions)
    setRule((prev) => ({ ...prev, columnConditions: updatedConditions }))
  }

  const handleAddColumnCondition = () => {
    setColumnConditions((prev) => [
      ...prev,
      {
        column: rule.column,
        ruleType: rule.ruleType,
        parameters: rule.parameters,
        logicalOperator: "AND",
        table: rule.table || tables[0] || "",
      },
    ])
  }

  const handleRemoveColumnCondition = (index: number) => {
    const updatedConditions = [...columnConditions]
    updatedConditions.splice(index, 1)
    setColumnConditions(updatedConditions)
    setRule((prev) => ({ ...prev, columnConditions: updatedConditions }))
  }

  const handleSourceColumnChange = (index: number, value: string) => {
    const updatedSourceColumns = [...sourceColumns]
    updatedSourceColumns[index] = value
    setSourceColumns(updatedSourceColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        sourceColumns: updatedSourceColumns,
      },
    }))

    // Update form debug state
    setFormDebug((prev) => ({ ...prev, hasSourceColumns: updatedSourceColumns.filter(Boolean).length > 0 }))
  }

  const handleAddSourceColumn = () => {
    setSourceColumns((prev) => [...prev, ""])
  }

  const handleRemoveSourceColumn = (index: number) => {
    const updatedSourceColumns = [...sourceColumns]
    updatedSourceColumns.splice(index, 1)
    setSourceColumns(updatedSourceColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        sourceColumns: updatedSourceColumns,
      },
    }))

    // Update form debug state
    setFormDebug((prev) => ({ ...prev, hasSourceColumns: updatedSourceColumns.filter(Boolean).length > 0 }))
  }

  const handleReferenceColumnChange = (index: number, value: string) => {
    const updatedReferenceColumns = [...referenceColumns]
    updatedReferenceColumns[index] = value
    setReferenceColumns(updatedReferenceColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        referenceColumns: updatedReferenceColumns,
      },
    }))

    // Update form debug state
    setFormDebug((prev) => ({ ...prev, hasReferenceColumns: updatedReferenceColumns.filter(Boolean).length > 0 }))
  }

  const handleAddReferenceColumn = () => {
    setReferenceColumns((prev) => [...prev, ""])
  }

  const handleRemoveReferenceColumn = (index: number) => {
    const updatedReferenceColumns = [...referenceColumns]
    updatedReferenceColumns.splice(index, 1)
    setReferenceColumns(updatedReferenceColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        referenceColumns: updatedReferenceColumns,
      },
    }))

    // Update form debug state
    setFormDebug((prev) => ({ ...prev, hasReferenceColumns: updatedReferenceColumns.filter(Boolean).length > 0 }))
  }

  const handleUniqueColumnChange = (index: number, value: string) => {
    const updatedUniqueColumns = [...uniqueColumns]
    updatedUniqueColumns[index] = value
    setUniqueColumns(updatedUniqueColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        uniqueColumns: updatedUniqueColumns,
      },
    }))
  }

  const handleAddUniqueColumn = () => {
    setUniqueColumns((prev) => [...prev, ""])
  }

  const handleRemoveUniqueColumn = (index: number) => {
    const updatedUniqueColumns = [...uniqueColumns]
    updatedUniqueColumns.splice(index, 1)
    setUniqueColumns(updatedUniqueColumns)

    // Update the rule parameters as well
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        uniqueColumns: updatedUniqueColumns,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure logical operators are set before submitting
    const validatedConditions = ensureLogicalOperators(rule.conditions)
    const validatedAdditionalConditions = ensureLogicalOperators(rule.additionalConditions)
    const validatedCrossTableConditions = ensureLogicalOperators(rule.crossTableConditions)

    const finalRule = {
      ...rule,
      conditions: validatedConditions,
      additionalConditions: validatedAdditionalConditions,
      crossTableConditions: validatedCrossTableConditions,
    }

    onSubmit(finalRule)
  }

  const handleToggleEnabled = () => {
    setRule((prev) => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleTestCrossColumn = () => {
    setShowCrossColumnTester(true)
  }

  const handleCloseCrossColumnTester = () => {
    setShowCrossColumnTester(false)
  }

  const renderRuleTypeSpecificFields = () => {
    switch (rule.ruleType) {
      case "required":
        return null // No specific parameters for required
      case "equals":
      case "not-equals":
      case "greater-than":
      case "greater-than-equals":
      case "less-than":
      case "less-than-equals":
        return (
          <div>
            <Label htmlFor="value">Value</Label>
            <Input
              type="text"
              id="value"
              value={rule.parameters.value || ""}
              onChange={(e) => handleParameterChange("value", e.target.value)}
            />
          </div>
        )
      case "range":
        return (
          <>
            <div>
              <Label htmlFor="minValue">Min Value</Label>
              <Input
                type="number"
                id="minValue"
                value={rule.parameters.minValue || ""}
                onChange={(e) => handleParameterChange("minValue", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxValue">Max Value</Label>
              <Input
                type="number"
                id="maxValue"
                value={rule.parameters.maxValue || ""}
                onChange={(e) => handleParameterChange("maxValue", e.target.value)}
              />
            </div>
          </>
        )
      case "regex":
        return (
          <div>
            <Label htmlFor="pattern">Regex Pattern</Label>
            <Input
              type="text"
              id="pattern"
              value={rule.parameters.pattern || ""}
              onChange={(e) => handleParameterChange("pattern", e.target.value)}
            />
          </div>
        )
      case "type":
        return (
          <div>
            <Label htmlFor="dataType">Data Type</Label>
            <Select onValueChange={(value) => handleParameterChange("dataType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      case "enum":
        return (
          <div>
            <Label htmlFor="allowedValues">Allowed Values (comma-separated)</Label>
            <Textarea
              id="allowedValues"
              value={rule.parameters.allowedValues || ""}
              onChange={(e) => handleParameterChange("allowedValues", e.target.value)}
            />
          </div>
        )
      case "list":
        return (
          <div>
            <Label htmlFor="valueList">Value List</Label>
            <Select onValueChange={(value) => handleParameterChange("valueList", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a value list" />
              </SelectTrigger>
              <SelectContent>
                {valueLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "contains":
        return (
          <div>
            <Label htmlFor="substring">Substring</Label>
            <Input
              type="text"
              id="substring"
              value={rule.parameters.substring || ""}
              onChange={(e) => handleParameterChange("substring", e.target.value)}
            />
          </div>
        )
      case "formula":
        return (
          <div>
            <Label htmlFor="expression">Expression</Label>
            <Input
              type="text"
              id="expression"
              value={rule.parameters.expression || ""}
              onChange={(e) => handleParameterChange("expression", e.target.value)}
            />
          </div>
        )
      case "javascript-formula":
        return (
          <div>
            <Label htmlFor="javascriptExpression">JavaScript Expression</Label>
            <Textarea
              id="javascriptExpression"
              value={rule.parameters.javascriptExpression || ""}
              onChange={(e) => handleParameterChange("javascriptExpression", e.target.value)}
            />
            <JavaScriptExplainer expression={rule.parameters.javascriptExpression || ""} />
          </div>
        )
      case "dependency":
        return (
          <>
            <div>
              <Label htmlFor="conditionField">Condition Field</Label>
              <Input
                type="text"
                id="conditionField"
                value={rule.parameters.conditionField || ""}
                onChange={(e) => handleParameterChange("conditionField", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="conditionValue">Condition Value</Label>
              <Input
                type="text"
                id="conditionValue"
                value={rule.parameters.conditionValue || ""}
                onChange={(e) => handleParameterChange("conditionValue", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dependentField">Dependent Field</Label>
              <Input
                type="text"
                id="dependentField"
                value={rule.parameters.dependentField || ""}
                onChange={(e) => handleParameterChange("dependentField", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dependentValue">Dependent Value</Label>
              <Input
                type="text"
                id="dependentValue"
                value={rule.parameters.dependentValue || ""}
                onChange={(e) => handleParameterChange("dependentValue", e.target.value)}
              />
            </div>
          </>
        )
      case "lookup":
        return (
          <div>
            <Label htmlFor="lookupColumn">Lookup Column</Label>
            <Input
              type="text"
              id="lookupColumn"
              value={rule.parameters.lookupColumn || ""}
              onChange={(e) => handleParameterChange("lookupColumn", e.target.value)}
            />
          </div>
        )
      case "reference-integrity":
        return (
          <>
            <div>
              <Label htmlFor="referenceTable">Reference Table</Label>
              <Select
                onValueChange={(value) => {
                  handleParameterChange("referenceTable", value)
                  setFormDebug((prev) => ({ ...prev, hasReferenceTable: !!value }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reference table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formDebug.hasReferenceTable && (
                <p className="text-red-500 text-sm">Reference Table is required for Reference Integrity rules.</p>
              )}
            </div>
            {rule.parameters.referenceTable && (
              <div>
                <Label htmlFor="referenceColumn">Reference Column</Label>
                <Select onValueChange={(value) => handleParameterChange("referenceColumn", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reference column" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceTableColumns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )
      case "composite-reference":
        return (
          <>
            <div>
              <Label htmlFor="sourceTable">Source Table</Label>
              <Select
                onValueChange={(value) => {
                  handleParameterChange("sourceTable", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source table" />
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
            <div>
              <Label>Source Columns</Label>
              {sourceColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    onValueChange={(value) => {
                      handleSourceColumnChange(index, value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source column" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableColumns[rule.table]?.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sourceColumns.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSourceColumn(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleAddSourceColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Source Column
              </Button>
              {!formDebug.hasSourceColumns && (
                <p className="text-red-500 text-sm">At least one Source Column is required.</p>
              )}
            </div>
            <div>
              <Label htmlFor="referenceTable">Reference Table</Label>
              <Select
                onValueChange={(value) => {
                  handleParameterChange("referenceTable", value)
                  setFormDebug((prev) => ({ ...prev, hasReferenceTable: !!value }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reference table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formDebug.hasReferenceTable && (
                <p className="text-red-500 text-sm">Reference Table is required for Reference Integrity rules.</p>
              )}
            </div>
            {rule.parameters.referenceTable && (
              <div>
                <Label>Reference Columns</Label>
                {referenceColumns.map((column, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Select
                      onValueChange={(value) => {
                        handleReferenceColumnChange(index, value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reference column" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceTableColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {referenceColumns.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveReferenceColumn(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={handleAddReferenceColumn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reference Column
                </Button>
                {!formDebug.hasReferenceColumns && (
                  <p className="text-red-500 text-sm">At least one Reference Column is required.</p>
                )}
                {!formDebug.hasColumnsMatch && (
                  <p className="text-red-500 text-sm">The number of Source Columns and Reference Columns must match.</p>
                )}
              </div>
            )}
          </>
        )
      case "unique":
        return (
          <>
            <div>
              <Label>Unique Columns</Label>
              {uniqueColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    onValueChange={(value) => {
                      handleUniqueColumnChange(index, value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableColumns[rule.table]?.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uniqueColumns.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveUniqueColumn(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleAddUniqueColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </div>
          </>
        )
      case "cross-column":
        return (
          <>
            <div>
              <Label htmlFor="secondaryColumn">Secondary Column</Label>
              <Select onValueChange={(value) => handleParameterChange("secondaryColumn", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a secondary column" />
                </SelectTrigger>
                <SelectContent>
                  {tableColumns[rule.table]?.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select onValueChange={(value) => handleParameterChange("operator", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestCrossColumn}>
              Test Cross-Column
            </Button>
            {showCrossColumnTester && (
              <CrossColumnTestUtility
                table={rule.table}
                column={rule.column}
                secondaryColumn={rule.parameters.secondaryColumn}
                operator={rule.parameters.operator}
                datasets={datasets}
                onClose={handleCloseCrossColumnTester}
              />
            )}
          </>
        )
      case "multi-column":
        return (
          <div>
            {columnConditions.map((condition, index) => (
              <div key={index} className="mb-4 border p-4 rounded">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`column-${index}`}>Column</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "column", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableColumns[condition.table]?.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`ruleType-${index}`}>Rule Type</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "ruleType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rule type" />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`logicalOperator-${index}`}>Logical Operator</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "logicalOperator", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {condition.ruleType && <div className="mt-4">{renderParameterFields(condition.ruleType, index)}</div>}
                {columnConditions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveColumnCondition(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={handleAddColumnCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>
        )
      case "date-before":
      case "date-after":
        return (
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              id="date"
              value={rule.parameters.date || ""}
              onChange={(e) => handleParameterChange("date", e.target.value)}
            />
          </div>
        )
      case "date-between":
        return (
          <>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={rule.parameters.startDate || ""}
                onChange={(e) => handleParameterChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={rule.parameters.endDate || ""}
                onChange={(e) => handleParameterChange("endDate", e.target.value)}
              />
            </div>
          </>
        )
      case "date-format":
        return (
          <div>
            <Label htmlFor="format">Format</Label>
            <Input
              type="text"
              id="format"
              value={rule.parameters.format || ""}
              onChange={(e) => handleParameterChange("format", e.target.value)}
            />
          </div>
        )
      case "math-operation":
        return (
          <>
            <div>
              <Label htmlFor="operation">Operation</Label>
              <Select onValueChange={(value) => handleParameterChange("operation", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="divide">Divide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operands</Label>
              {renderOperands()}
            </div>
            <div>
              <Label htmlFor="comparisonOperator">Comparison Operator</Label>
              <Select onValueChange={(value) => handleParameterChange("comparisonOperator", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a comparison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="comparisonValue">Comparison Value</Label>
              <Input
                type="number"
                id="comparisonValue"
                value={rule.parameters.comparisonValue || ""}
                onChange={(e) => handleParameterChange("comparisonValue", e.target.value)}
              />
            </div>
            <div>
              <Label>Preview</Label>
              <p>{renderMathOperationPreview(rule.parameters)}</p>
            </div>
          </>
        )
      case "column-comparison":
        return (
          <>
            <div>
              <Label htmlFor="secondaryColumn">Secondary Column</Label>
              <Select onValueChange={(value) => handleParameterChange("secondaryColumn", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a secondary column" />
                </SelectTrigger>
                <SelectContent>
                  {tableColumns[rule.table]?.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select onValueChange={(value) => handleParameterChange("operator", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      case "custom":
        return (
          <div>
            <Label htmlFor="customFunction">Custom Function</Label>
            <Textarea
              id="customFunction"
              value={rule.parameters.customFunction || ""}
              onChange={(e) => handleParameterChange("customFunction", e.target.value)}
            />
          </div>
        )
      default:
        return null
    }
  }

  const renderParameterFields = (ruleType: string, index: number) => {
    switch (ruleType) {
      case "required":
        return null // No specific parameters for required
      case "equals":
      case "not-equals":
      case "greater-than":
      case "greater-than-equals":
      case "less-than":
      case "less-than-equals":
        return (
          <div>
            <Label htmlFor={`value-${index}`}>Value</Label>
            <Input
              type="text"
              id={`value-${index}`}
              value={columnConditions[index]?.parameters?.value || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  value: e.target.value,
                })
              }
            />
          </div>
        )
      case "range":
        return (
          <>
            <div>
              <Label htmlFor={`minValue-${index}`}>Min Value</Label>
              <Input
                type="number"
                id={`minValue-${index}`}
                value={columnConditions[index]?.parameters?.minValue || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    minValue: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`maxValue-${index}`}>Max Value</Label>
              <Input
                type="number"
                id={`maxValue-${index}`}
                value={columnConditions[index]?.parameters?.maxValue || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    maxValue: e.target.value,
                  })
                }
              />
            </div>
          </>
        )
      case "regex":
        return (
          <div>
            <Label htmlFor={`pattern-${index}`}>Regex Pattern</Label>
            <Input
              type="text"
              id={`pattern-${index}`}
              value={columnConditions[index]?.parameters?.pattern || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  pattern: e.target.value,
                })
              }
            />
          </div>
        )
      case "type":
        return (
          <div>
            <Label htmlFor={`dataType-${index}`}>Data Type</Label>
            <Select
              onValueChange={(value) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  dataType: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      case "enum":
        return (
          <div>
            <Label htmlFor={`allowedValues-${index}`}>Allowed Values (comma-separated)</Label>
            <Textarea
              id={`allowedValues-${index}`}
              value={columnConditions[index]?.parameters?.allowedValues || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  allowedValues: e.target.value,
                })
              }
            />
          </div>
        )
      case "list":
        return (
          <div>
            <Label htmlFor={`valueList-${index}`}>Value List</Label>
            <Select
              onValueChange={(value) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  valueList: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a value list" />
              </SelectTrigger>
              <SelectContent>
                {valueLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "contains":
        return (
          <div>
            <Label htmlFor={`substring-${index}`}>Substring</Label>
            <Input
              type="text"
              id={`substring-${index}`}
              value={columnConditions[index]?.parameters?.substring || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  substring: e.target.value,
                })
              }
            />
          </div>
        )
      case "formula":
        return (
          <div>
            <Label htmlFor={`expression-${index}`}>Expression</Label>
            <Input
              type="text"
              id={`expression-${index}`}
              value={columnConditions[index]?.parameters?.expression || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  expression: e.target.value,
                })
              }
            />
          </div>
        )
      case "javascript-formula":
        return (
          <div>
            <Label htmlFor={`javascriptExpression-${index}`}>JavaScript Expression</Label>
            <Textarea
              id={`javascriptExpression-${index}`}
              value={columnConditions[index]?.parameters?.javascriptExpression || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  javascriptExpression: e.target.value,
                })
              }
            />
            <JavaScriptExplainer expression={columnConditions[index]?.parameters?.javascriptExpression || ""} />
          </div>
        )
      case "dependency":
        return (
          <>
            <div>
              <Label htmlFor={`conditionField-${index}`}>Condition Field</Label>
              <Input
                type="text"
                id={`conditionField-${index}`}
                value={columnConditions[index]?.parameters?.conditionField || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    conditionField: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`conditionValue-${index}`}>Condition Value</Label>
              <Input
                type="text"
                id={`conditionValue-${index}`}
                value={columnConditions[index]?.parameters?.conditionValue || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    conditionValue: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`dependentField-${index}`}>Dependent Field</Label>
              <Input
                type="text"
                id={`dependentField-${index}`}
                value={columnConditions[index]?.parameters?.dependentField || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    dependentField: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`dependentValue-${index}`}>Dependent Value</Label>
              <Input
                type="text"
                id={`dependentValue-${index}`}
                value={columnConditions[index]?.parameters?.dependentValue || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    dependentValue: e.target.value,
                  })
                }
              />
            </div>
          </>
        )
      case "lookup":
        return (
          <div>
            <Label htmlFor={`lookupColumn-${index}`}>Lookup Column</Label>
            <Input
              type="text"
              id={`lookupColumn-${index}`}
              value={columnConditions[index]?.parameters?.lookupColumn || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  lookupColumn: e.target.value,
                })
              }
            />
          </div>
        )
      case "reference-integrity":
        return (
          <>
            <div>
              <Label htmlFor={`referenceTable-${index}`}>Reference Table</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    referenceTable: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reference table" />
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
            {columnConditions[index]?.parameters?.referenceTable && (
              <div>
                <Label htmlFor={`referenceColumn-${index}`}>Reference Column</Label>
                <Select
                  onValueChange={(value) =>
                    handleColumnConditionChange(index, "parameters", {
                      ...columnConditions[index].parameters,
                      referenceColumn: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reference column" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableColumns[columnConditions[index].parameters.referenceTable]?.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )
      case "composite-reference":
        return (
          <>
            <div>
              <Label htmlFor={`sourceTable-${index}`}>Source Table</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    sourceTable: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source table" />
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
            <div>
              <Label>Source Columns</Label>
              {sourceColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    onValueChange={(value) => {
                      handleSourceColumnChange(index, value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source column" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableColumns[rule.table]?.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sourceColumns.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSourceColumn(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleAddSourceColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Source Column
              </Button>
            </div>
            <div>
              <Label htmlFor={`referenceTable-${index}`}>Reference Table</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    referenceTable: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reference table" />
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
            {columnConditions[index]?.parameters?.referenceTable && (
              <div>
                <Label>Reference Columns</Label>
                {referenceColumns.map((column, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Select
                      onValueChange={(value) => {
                        handleReferenceColumnChange(index, value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reference column" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableColumns[columnConditions[index].parameters.referenceTable]?.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {referenceColumns.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveReferenceColumn(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={handleAddReferenceColumn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reference Column
                </Button>
              </div>
            )}
          </>
        )
      case "unique":
        return (
          <>
            <div>
              <Label>Unique Columns</Label>
              {uniqueColumns.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    onValueChange={(value) => {
                      handleUniqueColumnChange(index, value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableColumns[rule.table]?.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uniqueColumns.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveUniqueColumn(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleAddUniqueColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </div>
          </>
        )
      case "cross-column":
        return (
          <>
            <div>
              <Label htmlFor={`secondaryColumn-${index}`}>Secondary Column</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    secondaryColumn: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a secondary column" />
                </SelectTrigger>
                <SelectContent>
                  {tableColumns[rule.table]?.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`operator-${index}`}>Operator</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    operator: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      case "multi-column":
        return (
          <div>
            {columnConditions.map((condition, index) => (
              <div key={index} className="mb-4 border p-4 rounded">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`column-${index}`}>Column</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "column", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableColumns[condition.table]?.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`ruleType-${index}`}>Rule Type</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "ruleType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rule type" />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`logicalOperator-${index}`}>Logical Operator</Label>
                    <Select onValueChange={(value) => handleColumnConditionChange(index, "logicalOperator", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {condition.ruleType && <div className="mt-4">{renderParameterFields(condition.ruleType, index)}</div>}
                {columnConditions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveColumnCondition(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={handleAddColumnCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>
        )
      case "date-before":
      case "date-after":
        return (
          <div>
            <Label htmlFor={`date-${index}`}>Date</Label>
            <Input
              type="date"
              id={`date-${index}`}
              value={columnConditions[index]?.parameters?.date || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  date: e.target.value,
                })
              }
            />
          </div>
        )
      case "date-between":
        return (
          <>
            <div>
              <Label htmlFor={`startDate-${index}`}>Start Date</Label>
              <Input
                type="date"
                id={`startDate-${index}`}
                value={columnConditions[index]?.parameters?.startDate || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    startDate: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor={`endDate-${index}`}>End Date</Label>
              <Input
                type="date"
                id={`endDate-${index}`}
                value={columnConditions[index]?.parameters?.endDate || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
          </>
        )
      case "date-format":
        return (
          <div>
            <Label htmlFor={`format-${index}`}>Format</Label>
            <Input
              type="text"
              id={`format-${index}`}
              value={columnConditions[index]?.parameters?.format || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  format: e.target.value,
                })
              }
            />
          </div>
        )
      case "math-operation":
        return (
          <>
            <div>
              <Label htmlFor={`operation-${index}`}>Operation</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    operation: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="subtract">Subtract</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="divide">Divide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operands</Label>
              {renderOperands()}
            </div>
            <div>
              <Label htmlFor={`comparisonOperator-${index}`}>Comparison Operator</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    comparisonOperator: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a comparison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`comparisonValue-${index}`}>Comparison Value</Label>
              <Input
                type="number"
                id={`comparisonValue-${index}`}
                value={columnConditions[index]?.parameters?.comparisonValue || ""}
                onChange={(e) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    comparisonValue: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Preview</Label>
              <p>{renderMathOperationPreview(columnConditions[index]?.parameters)}</p>
            </div>
          </>
        )
      case "column-comparison":
        return (
          <>
            <div>
              <Label htmlFor={`secondaryColumn-${index}`}>Secondary Column</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    secondaryColumn: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a secondary column" />
                </SelectTrigger>
                <SelectContent>
                  {tableColumns[rule.table]?.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`operator-${index}`}>Operator</Label>
              <Select
                onValueChange={(value) =>
                  handleColumnConditionChange(index, "parameters", {
                    ...columnConditions[index].parameters,
                    operator: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      case "custom":
        return (
          <div>
            <Label htmlFor={`customFunction-${index}`}>Custom Function</Label>
            <Textarea
              id={`customFunction-${index}`}
              value={columnConditions[index]?.parameters?.customFunction || ""}
              onChange={(e) =>
                handleColumnConditionChange(index, "parameters", {
                  ...columnConditions[index].parameters,
                  customFunction: e.target.value,
                })
              }
            />
          </div>
        )
      default:
        return null
    }
  }

  const renderOperands = () => {
    const { operation, operands } = rule.parameters || {}

    if (!operands || !operation) {
      return (
        <div>
          <p>Select an operation first.</p>
        </div>
      )
    }

    return operands.map((operand, index) => (
      <div key={index} className="mb-2 border p-2 rounded">
        <Label htmlFor={`operandType-${index}`}>Operand Type</Label>
        <Select
          onValueChange={(value) => {
            const updatedOperands = [...operands]
            updatedOperands[index].type = value
            handleParameterChange("operands", updatedOperands)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operand type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="column">Column</SelectItem>
            <SelectItem value="constant">Constant</SelectItem>
          </SelectContent>
        </Select>

        {operand.type === "column" && (
          <div>
            <Label htmlFor={`operandColumn-${index}`}>Column</Label>
            <Select
              onValueChange={(value) => {
                const updatedOperands = [...operands]
                updatedOperands[index].value = value
                handleParameterChange("operands", updatedOperands)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {tableColumns[rule.table]?.map((column) => (
                  <SelectItem key={column} value={column}>
                    {column}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {operand.type === "constant" && (
          <div>
            <Label htmlFor={`operandValue-${index}`}>Value</Label>
            <Input
              type="number"
              id={`operandValue-${index}`}
              value={operand.value || ""}
              onChange={(e) => {
                const updatedOperands = [...operands]
                updatedOperands[index].value = e.target.value
                handleParameterChange("operands", updatedOperands)
              }}
            />
          </div>
        )}

        {operands.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const updatedOperands = [...operands]
              updatedOperands.splice(index, 1)
              handleParameterChange("operands", updatedOperands)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    ))
  }

  const handleAddOperand = () => {
    const { operands } = rule.parameters || {}
    const updatedOperands = [...(operands || []), { type: "column", value: "" }]
    handleParameterChange("operands", updatedOperands)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input type="text" id="name" name="name" value={rule.name} onChange={handleInputChange} required />
        {!formDebug.hasName && <p className="text-red-500 text-sm">Rule Name is required.</p>}
      </div>
      <div>
        <Label htmlFor="table">Table</Label>
        <Select onValueChange={(value) => handleSelectChange("table", value)}>
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
      <div>
        <Label htmlFor="column">Column</Label>
        <Select
          onValueChange={(value) => {
            handleSelectChange("column", value)
            if (props.onColumnChange) {
              props.onColumnChange(value)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a column" />
          </SelectTrigger>
          <SelectContent>
            {tableColumns[rule.table]?.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ruleType">Rule Type</Label>
        <Select onValueChange={handleRuleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a rule type" />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rule.ruleType && RULE_TYPE_EXAMPLES[rule.ruleType] && (
          <div className="mt-2">
            <p className="text-sm font-medium">Example: {RULE_TYPE_EXAMPLES[rule.ruleType].example}</p>
            <p className="text-sm text-muted-foreground">
              Explanation: {RULE_TYPE_EXAMPLES[rule.ruleType].explanation}
            </p>
          </div>
        )}
      </div>

      {renderRuleTypeSpecificFields()}

      {rule.ruleType === "math-operation" && (
        <Button type="button" variant="ghost" size="sm" onClick={handleAddOperand}>
          <Plus className="h-4 w-4 mr-2" />
          Add Operand
        </Button>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" value={rule.description} onChange={handleInputChange} />
      </div>
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select onValueChange={(value) => handleSelectChange("severity", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rule.ruleType !== "multi-column" && (
        <div>
          <Label>Conditions</Label>
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Input
                type="text"
                placeholder="Field"
                value={condition.field || ""}
                onChange={(e) => handleConditionChange(index, "field", e.target.value)}
              />
              <Input
                type="text"
                placeholder="Operator"
                value={condition.operator || ""}
                onChange={(e) => handleConditionChange(index, "operator", e.target.value)}
              />
              <Input
                type="text"
                placeholder="Value"
                value={condition.value || ""}
                onChange={(e) => handleConditionChange(index, "value", e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => handleRemoveCondition(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={handleAddCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </div>
      )}

      <div>
        <Label>
          <Checkbox checked={rule.enabled} onCheckedChange={handleToggleEnabled} id="enabled" />
          <span className="ml-2">Enabled</span>
        </Label>
      </div>

      <div>
        <Button type="submit">Submit</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
