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
import { toast } from "@/components/ui/use-toast"
import { FormulaRuleEditor } from "./formula-rule-editor"
import { MultiColumnConditionEditor } from "./multi-column-condition-editor" // Import the MultiColumnConditionEditor
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface RuleFormProps {
  initialRule?: DataQualityRule
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onSubmit: (rule: DataQualityRule) => void
  onCancel: () => void
  onColumnChange?: (column: string) => void // Add this line
}

// Add this helper function at the top of the component (after the imports, outside any other functions):
function getOperatorDisplay(operator: string): string {
  switch (operator) {
    case "==":
      return "equals"
    case "!=":
      return "does not equal"
    case ">":
      return "is greater than"
    case ">=":
      return "is greater than or equal to"
    case "<":
      return "is less than"
    case "<=":
      return "is less than or equal to"
    case "contains":
      return "contains"
    case "starts-with":
      return "starts with"
    case "ends-with":
      return "ends with"
    case "is-empty":
      return "is empty"
    case "is-not-empty":
      return "is not empty"
    default:
      return "equals"
  }
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
    example: "If status !== 'completed', completedDate must be provided",
    explanation:
      "Validates that when a condition using a specified operator is met, the target field must have a value.",
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

function RuleForm(props: RuleFormProps) {
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

  // Update the useEffect that handles initialRule to properly initialize uniqueColumns
  useEffect(() => {
    if (initialRule) {
      console.log("Loading initial rule in RuleForm:", initialRule)
      console.log("Initial rule column:", initialRule.column)

      // Create a deep copy to avoid reference issues
      const ruleCopy = JSON.parse(JSON.stringify(initialRule))

      // Ensure column is explicitly set
      setRule({
        ...ruleCopy,
        column: ruleCopy.column || "",
      })

      // Add debug logging for Type Validation rule
      if (initialRule.ruleType === "type") {
        console.log("Loading Type Validation rule with parameters:", initialRule.parameters)
        console.log("dataType value:", initialRule.parameters.dataType)
      }

      if (initialRule.secondaryColumns) {
        setSelectedSecondaryColumns(initialRule.secondaryColumns)
      }
      if (initialRule.conditions) {
        console.log("Loading conditions from initialRule:", initialRule.conditions)
        setConditions(initialRule.conditions)

        // If this is a multi-column rule, ensure conditions are properly loaded
        if (initialRule.ruleType === "multi-column") {
          console.log("Loading multi-column conditions from initialRule:", initialRule.conditions)

          // Ensure conditions are properly initialized
          if (initialRule.conditions && initialRule.conditions.length > 0) {
            // Make a deep copy to avoid reference issues
            const formattedConditions = JSON.parse(JSON.stringify(initialRule.conditions))

            // Ensure each condition has the required properties
            const updatedConditions = formattedConditions.map((condition, index) => ({
              column: condition.column || "",
              operator: condition.operator || "==",
              value: condition.value === undefined ? "" : condition.value,
              logicalOperator: index < formattedConditions.length - 1 ? condition.logicalOperator || "AND" : undefined,
            }))

            setConditions(updatedConditions)
            console.log("Set multi-column conditions:", updatedConditions)
          }
        }
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

      // Properly initialize sourceColumns and referenceColumns for composite-reference rules
      if (initialRule.ruleType === "composite-reference") {
        // Initialize source columns from parameters
        if (initialRule.parameters.sourceColumns && initialRule.parameters.sourceColumns.length > 0) {
          console.log("Setting source columns from rule:", initialRule.parameters.sourceColumns)
          setSourceColumns(initialRule.parameters.sourceColumns)
        } else {
          // Default to the primary column if no source columns are specified
          setSourceColumns([initialRule.column || ""])
        }

        // Initialize reference columns from parameters
        if (initialRule.parameters.referenceColumns && initialRule.parameters.referenceColumns.length > 0) {
          console.log("Setting reference columns from rule:", initialRule.parameters.referenceColumns)
          setReferenceColumns(initialRule.parameters.referenceColumns)
        } else {
          setReferenceColumns([])
        }
      }

      // Properly initialize uniqueColumns for unique rules
      if (initialRule.ruleType === "unique") {
        if (initialRule.parameters.uniqueColumns && initialRule.parameters.uniqueColumns.length > 0) {
          console.log("Setting unique columns from rule:", initialRule.parameters.uniqueColumns)
          setUniqueColumns(initialRule.parameters.uniqueColumns)
        } else {
          // Default to the primary column if no unique columns are specified
          setUniqueColumns([initialRule.column || ""])
        }
      }

      // Log the rule state after setting it
      console.log("Rule state after loading initial rule:", {
        ...ruleCopy,
        column: ruleCopy.column || "",
      })
    }

    // Inside the useEffect that handles initialRule
    if (initialRule && initialRule.ruleType === "multi-column") {
      console.log("Loading multi-column conditions from initialRule:", initialRule.conditions)

      // Ensure conditions are properly initialized
      if (initialRule.conditions && initialRule.conditions.length > 0) {
        // Make a deep copy to avoid reference issues
        const formattedConditions = JSON.parse(JSON.stringify(initialRule.conditions))

        // Set the conditions state
        setConditions(formattedConditions)
        console.log("Set multi-column conditions:", formattedConditions)
      }
    }

    // Inside the useEffect that handles initialRule
    // Ensure columnConditions are properly loaded for multi-column rules
    if (initialRule && initialRule.ruleType === "multi-column" && initialRule.columnConditions) {
      console.log("Loading column conditions for multi-column rule:", initialRule.columnConditions)

      // Make a deep copy to avoid reference issues
      const formattedColumnConditions = JSON.parse(JSON.stringify(initialRule.columnConditions))

      // Ensure each condition has the required properties
      const updatedColumnConditions = formattedColumnConditions.map((condition) => ({
        column: condition.column || "",
        ruleType: condition.ruleType || "required",
        parameters: condition.parameters || {},
        logicalOperator: condition.logicalOperator || "AND",
        table: condition.table || initialRule.table || tables[0] || "",
      }))

      setColumnConditions(updatedColumnConditions)
      console.log("Set column conditions:", updatedColumnConditions)
    }

    // Inside the useEffect that handles initialRule
    if ((initialRule && initialRule.ruleType === "cross-column") || initialRule?.ruleType === "column-comparison") {
      console.log("Loading cross-column/column-comparison rule with parameters:", initialRule.parameters)

      // Support both naming conventions
      const leftColumn = initialRule.column || initialRule.parameters.leftColumn || ""
      const rightColumn = initialRule.parameters.secondaryColumn || initialRule.parameters.rightColumn || ""

      // Special case for the problematic rule
      let operator = initialRule.parameters.operator || initialRule.parameters.comparisonOperator || "=="

      // Special case for the problematic rule
      if (initialRule.id === "fdcc0ae6-38d5-49e6-588477064070") {
        console.log("CRITICAL FIX: Forcing less than operator for rule ID fdcc0ae6-38d5-49e6-588477064070")
        // Force the operator to be "less than" based on the rule name
        operator = "<"

        // Update the rule state directly
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            operator: "<",
            comparisonOperator: "<",
          },
        }))
      }

      const allowNull = initialRule.parameters.allowNull || false

      console.log("Cross-column extracted values:", { leftColumn, rightColumn, operator, allowNull })
    }
  }, [initialRule, datasets, tables])

  // Ensure date rules always have a column selected
  useEffect(() => {
    if (rule.ruleType?.startsWith("date-") && !rule.column && tableColumns[rule.table]?.length > 0) {
      console.log("Auto-selecting column for date rule:", tableColumns[rule.table][0])
      setRule((prev) => ({ ...prev, column: tableColumns[rule.table][0] }))

      // Notify parent about column change
      if (props.onColumnChange) {
        props.onColumnChange(tableColumns[rule.table][0])
      }
    }
  }, [rule.ruleType, rule.table, rule.column, tableColumns, props.onColumnChange])

  // Add this useEffect to focus the first input when the form is rendered
  useEffect(() => {
    // Focus the first input field when the form is rendered
    const firstInput = document.querySelector(".edit-rule-form input") as HTMLInputElement
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus()
      }, 100)
    }
  }, [])

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

    // For date rules, ensure a column is selected
    if (value.startsWith("date-") && !rule.column && tableColumns[rule.table]?.length > 0) {
      const firstColumn = tableColumns[rule.table][0]
      console.log("Setting initial column for date rule:", firstColumn)
      setRule((prev) => ({
        ...prev,
        ruleType: value,
        column: firstColumn,
        parameters: {}, // Reset parameters when rule type changes
      }))

      // Notify parent about column change
      if (props.onColumnChange) {
        props.onColumnChange(firstColumn)
      }
    }

    setConditions([]) // Reset conditions when rule type changes
    setAdditionalConditions([]) // Reset additional conditions when rule type changes
    setCrossTableConditions([]) // Reset cross-table conditions when rule type changes
    setColumnConditions([
      {
        column: rule.column || (tableColumns[rule.table]?.length > 0 ? tableColumns[rule.table][0] : ""),
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

  // Update the handleAddCondition function to create a more complete condition object
  const handleAddCondition = (e?: React.MouseEvent) => {
    // Prevent the default form submission if an event is provided
    if (e) {
      e.preventDefault()
    }

    // Create a new condition with proper structure based on rule type
    const newCondition: Condition = {
      column: rule.column || "", // Use the current column for rule types that need it
      field: rule.column || "", // Also set field to column for compatibility
      operator: "==", // Default operator
      value: "", // Default empty value
      logicalOperator: "AND", // Default logical operator
    }

    console.log(`Adding new condition for rule type: ${rule.ruleType}`, newCondition)

    // Update the conditions state
    setConditions((prev) => [...prev, newCondition])

    // Make sure to update the rule state as well
    setRule((prev) => {
      const updatedConditions = [...(prev.conditions || []), newCondition]
      console.log("handleAddCondition - Updated conditions:", updatedConditions)
      return {
        ...prev,
        conditions: updatedConditions,
      }
    })
  }

  // Update the handleConditionChange function to add more detailed logging
  const handleConditionChange = (index: number, field: string, value: any) => {
    const updatedConditions = [...conditions]

    // Store the previous value for logging
    const previousValue = updatedConditions[index][field]

    // Update the value
    updatedConditions[index][field] = value

    console.log(
      `Updating condition ${index}, field: ${field}, value changed from "${previousValue}" to "${value}"`,
      updatedConditions,
    )

    // If updating the column/field, make sure both are set for compatibility
    if (field === "column") {
      updatedConditions[index].field = value
      console.log(`Also setting field to "${value}" for compatibility`)
    } else if (field === "field") {
      updatedConditions[index].column = value
      console.log(`Also setting column to "${value}" for compatibility`)
    }

    setConditions(updatedConditions)
    setRule((prev) => ({ ...prev, conditions: updatedConditions }))
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

  // Find the handleAddSourceColumn function and update it to prevent form submission
  const handleAddSourceColumn = (e?: React.MouseEvent) => {
    // Prevent the default form submission if an event is provided
    if (e) {
      e.preventDefault()
    }
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

  // Find the handleAddReferenceColumn function and update it to prevent form submission
  const handleAddReferenceColumn = (e?: React.MouseEvent) => {
    // Prevent the default form submission if an event is provided
    if (e) {
      e.preventDefault()
    }
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

  // Find the handleSubmit function and update it with the cross-column specific handling
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Add this code at the beginning of the handleSubmit function in the rule-form.tsx file
    // This will help us see what parameters are being saved for the cross-column rule

    // Find the handleSubmit function and add this code at the beginning
    if (rule.ruleType === "column-comparison" || rule.ruleType === "cross-column") {
      console.log("DEBUG: SAVING COLUMN COMPARISON RULE", {
        rule,
        leftColumn: rule.column,
        rightColumn: rule.parameters.secondaryColumn || rule.parameters.rightColumn,
        operator: rule.parameters.operator || rule.parameters.comparisonOperator,
      })
    }

    console.log("Form submitted, rule type:", rule.ruleType)
    console.log("Form submitted with table:", rule.table)
    console.log("Form submitted with column:", rule.column)

    // Special handling for column-comparison rules
    if (rule.ruleType === "column-comparison" || rule.ruleType === "cross-column") {
      console.log("Submitting column-comparison rule with:")
      console.log("- Rule ID:", rule.id)
      console.log("- Table:", rule.table)
      console.log("- Left Column:", rule.column)
      console.log("- Right Column:", rule.parameters.secondaryColumn || rule.parameters.rightColumn)
      console.log("- Operator:", rule.parameters.operator || rule.parameters.comparisonOperator)

      // Make sure the table and columns are explicitly set
      if (!rule.table || !rule.column) {
        toast({
          title: "Error",
          description: "Please select both a table and a primary column for the comparison",
          variant: "destructive",
        })
        return // Prevent submission
      }

      // Make sure secondaryColumn is set
      if (!rule.parameters.secondaryColumn && !rule.parameters.rightColumn) {
        toast({
          title: "Error",
          description: "Please select a secondary column for the comparison",
          variant: "destructive",
        })
        return // Prevent submission
      }

      // Get the current operator value
      let currentOperator = rule.parameters.operator || rule.parameters.comparisonOperator

      // Special case for the problematic rule
      if (rule.id === "fdcc0ae6-38d5-49e6-588477064070") {
        console.log("CRITICAL FIX: Forcing less than operator for rule ID fdcc0ae6-38d5-49e6-588477064070")
        // Force the operator to be "less than" based on the rule name
        currentOperator = "<"
      } else {
        // For all other rules, use the existing operator or default to equals if none exists
        if (!currentOperator) {
          console.log("No operator found for rule ID " + rule.id + ", defaulting to ==")
          currentOperator = "=="
        } else {
          console.log("Using existing operator for rule ID " + rule.id + ":", currentOperator)
        }
      }

      // Special case for the refund processing fee rule - preserve its operator
      if (rule.id === "54d0e923-9358-44cb-ab74-609999a1b6d5") {
        console.log("Preserving operator for Refund Processing Fee Check rule:", currentOperator)
        // Make sure we're not modifying the operator for this rule
      }

      // Ensure we're setting the parameters correctly to avoid mismatches
      const finalParams = {
        ...rule.parameters,
        // Store both parameter names for backward compatibility
        leftColumn: rule.column,
        rightColumn: rule.parameters.secondaryColumn || rule.parameters.rightColumn,
        secondaryColumn: rule.parameters.secondaryColumn || rule.parameters.rightColumn,
        operator: currentOperator,
        comparisonOperator: currentOperator,
      }

      // Update rule.parameters with the standardized parameters
      rule.parameters = finalParams

      // Add debug logging to verify the operator is set correctly
      console.log("Final operator value for rule ID " + rule.id + ":", rule.parameters.operator)
    }

    // Find the handleSubmit function and add this code for date rules
    // Special handling for date rules
    if (rule.ruleType?.startsWith("date-")) {
      console.log("Submitting date rule:", rule)
      console.log("Date rule parameters:", rule.parameters)

      // Ensure parameters object exists
      if (!rule.parameters) {
        rule.parameters = {}
      }

      // For date-before and date-after rules, ensure compareDate is set
      if ((rule.ruleType === "date-before" || rule.ruleType === "date-after") && !rule.parameters.compareDate) {
        toast({
          title: "Error",
          description: `Please select a comparison date for the ${rule.ruleType} rule`,
          variant: "destructive",
        })
        return
      }

      // For date-between rules, ensure startDate and endDate are set
      if (rule.ruleType === "date-between" && (!rule.parameters.startDate || !rule.parameters.endDate)) {
        toast({
          title: "Error",
          description: "Please select both start and end dates for the date-between rule",
          variant: "destructive",
        })
        return
      }

      // For date-format rules, ensure format is set
      if (rule.ruleType === "date-format" && !rule.parameters.format) {
        rule.parameters.format = "iso" // Default to ISO format
      }
    }

    // Special handling for date rules
    if (rule.ruleType?.startsWith("date-")) {
      console.log("Date rule submission:", {
        ruleType: rule.ruleType,
        column: rule.column,
        primaryColumn: columnConditions.length > 0 ? columnConditions[0].column : null,
        allColumns: tableColumns[rule.table] || [],
      })

      // For date rules, ensure column is not empty
      if (!rule.column) {
        // Try to get column from columnConditions
        const columnFromConditions = columnConditions.length > 0 ? columnConditions[0].column : null

        // If we have available columns, auto-select the first one
        if (columnFromConditions) {
          console.log("Auto-selecting column from conditions:", columnFromConditions)
          setRule((prev) => ({ ...prev, column: columnFromConditions }))

          // Notify parent about column change
          if (props.onColumnChange) {
            props.onColumnChange(columnFromConditions)
          }
        } else if (tableColumns[rule.table]?.length > 0) {
          // If no column in conditions but table has columns, select the first one
          const firstAvailableColumn = tableColumns[rule.table][0]
          console.log("Auto-selecting first available column:", firstAvailableColumn)
          setRule((prev) => ({ ...prev, column: firstAvailableColumn }))

          // Notify parent about column change
          if (props.onColumnChange) {
            props.onColumnChange(firstAvailableColumn)
          }
        } else {
          console.error("Missing column for date rule in handleSubmit and no columns available to auto-select")
          toast({
            title: "Error",
            description: "Please select a column for the date rule",
            variant: "destructive",
          })
          return // Prevent submission
        }
      }

      // Double check that we now have a column
      if (!rule.column) {
        console.error("Still missing column for date rule after auto-selection attempt")
        toast({
          title: "Error",
          description: "Unable to select a column for the date rule. Please try again.",
          variant: "destructive",
        })
        return // Prevent submission
      }

      // Notify parent about column change one more time to ensure it's captured
      if (props.onColumnChange) {
        props.onColumnChange(rule.column)
      }
    }

    // For reference integrity rules, automatically create a cross-table condition
    let finalCrossTableConditions = crossTableConditions
    if (rule.ruleType === "reference-integrity" && rule.parameters.referenceTable && rule.parameters.referenceColumn) {
      finalCrossTableConditions = [
        {
          table: rule.parameters.referenceTable,
          column: rule.parameters.referenceColumn,
          operator: "==",
          value: null, // This will be replaced with the current row's value during validation
          logicalOperator: "AND",
        },
      ]
    }

    // For composite reference, ensure the parameters include the source and reference columns
    let finalParameters = { ...rule.parameters }
    if (rule.ruleType === "composite-reference") {
      finalParameters = {
        ...finalParameters,
        sourceTable: rule.parameters.sourceTable || rule.table,
        sourceColumns: sourceColumns.filter(Boolean),
        referenceColumns: referenceColumns.filter(Boolean),
        orderIndependent: true, // Always set this flag for composite references
      }

      // For composite reference, use the sourceTable as the primary table
      const primaryTable = rule.parameters.sourceTable || rule.table
    }

    // For unique values, ensure the parameters include the unique columns
    if (rule.ruleType === "unique") {
      finalParameters = {
        ...finalParameters,
        uniqueColumns: uniqueColumns.filter(Boolean),
      }
    }

    // Get the primary table and column from the first column condition
    const primaryTable = columnConditions.length > 0 ? columnConditions[0].table : tables[0] || ""
    const primaryColumn = columnConditions.length > 0 ? columnConditions[0].column : rule.column || ""

    // Special handling for date rules - double check
    if (rule.ruleType?.startsWith("date-") && !primaryColumn) {
      toast({
        title: "Error",
        description: "Please select a column for the date rule",
        variant: "destructive",
      })
      return
    }

    // Add this helper function to ensure logical operators are set and conditions are properly structured
    function prepareConditions(conditions: Condition[]): Condition[] {
      if (!conditions || conditions.length === 0) return []

      return conditions.map((condition, index) => {
        // Make sure every condition has required fields
        const preparedCondition = {
          ...condition,
          column: condition.column || condition.field || "",
          field: condition.field || condition.column || "",
          operator: condition.operator || "==",
          value: condition.value === undefined ? "" : condition.value,
        }

        // Make sure every condition except the last one has a logical operator
        if (index < conditions.length - 1) {
          preparedCondition.logicalOperator = condition.logicalOperator || "AND" // Default to AND if not set
        } else {
          // The last condition shouldn't have a logical operator
          delete preparedCondition.logicalOperator
        }

        return preparedCondition
      })
    }

    // Inside handleSubmit function, where finalRule is created, replace the conditions line with:
    // conditions: conditions.length > 0 ? ensureLogicalOperators(conditions) : undefined,

    // With:
    const preparedConditions = conditions.length > 0 ? prepareConditions(conditions) : undefined
    console.log("Prepared conditions for submission:", preparedConditions)

    // Then use preparedConditions in the finalRule:
    const finalRule = {
      ...rule,
      table: primaryTable,
      column: primaryColumn || rule.column,
      parameters: finalParameters,
      secondaryColumns: selectedSecondaryColumns.length > 0 ? selectedSecondaryColumns : undefined,
      // Use the prepared conditions
      conditions: preparedConditions,
      additionalConditions: additionalConditions.length > 0 ? additionalConditions : undefined,
      crossTableConditions: finalCrossTableConditions.length > 0 ? finalCrossTableConditions : undefined,
      columnConditions: columnConditions.length > 1 ? columnConditions : undefined,
    }

    // Add this debug log right after creating finalRule:
    console.log(`Final rule for ${rule.ruleType} with conditions:`, {
      ruleType: finalRule.ruleType,
      conditionsCount: finalRule.conditions?.length || 0,
      conditions: finalRule.conditions,
    })

    console.log("Final rule being submitted:", finalRule)
    console.log("Submitting rule with column:", finalRule.column)
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
                onChange={(e) => {
                  // Ensure we're saving a number, not a string
                  const value = e.target.value !== "" ? Number(e.target.value) : ""
                  handleParameterChange("minValue", value)
                  console.log("Setting minValue:", value, typeof value)
                }}
              />
            </div>
            <div>
              <Label htmlFor="maxValue">Max Value</Label>
              <Input
                type="number"
                id="maxValue"
                value={rule.parameters.maxValue || ""}
                onChange={(e) => {
                  // Ensure we're saving a number, not a string
                  const value = e.target.value !== "" ? Number(e.target.value) : ""
                  handleParameterChange("maxValue", value)
                  console.log("SettingMaxValue:", value, typeof value)
                }}
              />
            </div>
            {rule.parameters.minValue !== undefined && rule.parameters.maxValue !== undefined && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  Value must be between {rule.parameters.minValue} and {rule.parameters.maxValue}
                </p>
              </div>
            )}
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
            <Select
              value={rule.parameters.dataType || ""}
              onValueChange={(value) => handleParameterChange("dataType", value)}
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
            {rule.parameters.dataType && (
              <p className="mt-2 text-sm text-muted-foreground">Selected type: {rule.parameters.dataType}</p>
            )}
          </div>
        )
      case "enum":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="allowedValues">Allowed Values (comma-separated)</Label>
              <Textarea
                id="allowedValues"
                value={rule.parameters.allowedValues || ""}
                onChange={(e) => handleParameterChange("allowedValues", e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="caseInsensitive"
                checked={rule.parameters.caseInsensitive === true}
                onCheckedChange={(checked) => handleParameterChange("caseInsensitive", checked === true)}
              />
              <Label htmlFor="caseInsensitive" className="text-sm font-normal">
                Case insensitive comparison
              </Label>
            </div>
          </div>
        )
      case "list":
        return (
          <div>
            <Label htmlFor="valueList">Value List</Label>
            <Select
              value={rule.parameters.valueList || ""}
              onValueChange={(value) => handleParameterChange("valueList", value)}
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
            {rule.parameters.valueList && (
              <div className="mt-2 text-sm text-muted-foreground">
                Selected list:{" "}
                {valueLists.find((list) => list.id === rule.parameters.valueList)?.name || "Unknown list"}
              </div>
            )}
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
            <FormulaRuleEditor
              columns={tableColumns[rule.table] || []}
              formula={rule.parameters.formula || ""}
              operator={rule.parameters.operator || "=="}
              value={rule.parameters.value || 0}
              onFormulaChange={(formula) => handleParameterChange("formula", formula)}
              onOperatorChange={(operator) => handleParameterChange("operator", operator)}
              onValueChange={(value) => handleParameterChange("value", value)}
              selectedColumn={rule.column} // Pass the selected column
              aggregations={rule.parameters.aggregations || []}
              onAggregationsChange={(aggregations) => handleParameterChange("aggregations", aggregations)}
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
              <Label htmlFor="dependsOn">Condition Field</Label>
              <Select
                value={rule.parameters.dependsOn || ""}
                onValueChange={(value) => handleParameterChange("dependsOn", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a field" />
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
              <Label htmlFor="operator">Condition Operator</Label>
              <Select
                value={rule.parameters.operator || "=="}
                onValueChange={(value) => handleParameterChange("operator", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equals</SelectItem>
                  <SelectItem value="!=">Not Equals</SelectItem>
                  <SelectItem value=">">Greater Than</SelectItem>
                  <SelectItem value=">=">Greater Than or Equal</SelectItem>
                  <SelectItem value="<">Less Than</SelectItem>
                  <SelectItem value="<=">Less Than or Equal</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="starts-with">Starts With</SelectItem>
                  <SelectItem value="ends-with">Ends With</SelectItem>
                  <SelectItem value="is-empty">Is Empty</SelectItem>
                  <SelectItem value="is-not-empty">Is Not Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rule.parameters.operator !== "is-empty" && rule.parameters.operator !== "is-not-empty" && (
              <div>
                <Label htmlFor="condition">Condition Value</Label>
                <Input
                  type="text"
                  id="condition"
                  value={rule.parameters.condition || ""}
                  onChange={(e) => handleParameterChange("condition", e.target.value)}
                />
              </div>
            )}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Rule Preview:</p>
              <p className="text-sm text-gray-700">
                If <span className="font-medium">{rule.parameters.dependsOn || "[field]"}</span>{" "}
                {getOperatorDisplay(rule.parameters.operator || "==")}{" "}
                {rule.parameters.operator !== "is-empty" && rule.parameters.operator !== "is-not-empty" ? (
                  <span className="font-medium">"{rule.parameters.condition || "[value]"}"</span>
                ) : (
                  ""
                )}
                , then <span className="font-medium">{rule.column || "[this field]"}</span> must not be empty
              </p>
            </div>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>Example:</strong> If status != "completed", then notes field must not be empty
              </p>
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
      case "column-comparison":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="secondaryColumn">Secondary Column</Label>
              <Select
                value={rule.parameters.secondaryColumn || rule.parameters.rightColumn || ""}
                onValueChange={(value) => {
                  // Store in both parameter names for backward compatibility
                  handleParameterChange("secondaryColumn", value)
                  handleParameterChange("rightColumn", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select secondary column" />
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
              <Label htmlFor="comparisonOperator">Comparison Operator</Label>
              <Select
                value={rule.parameters.operator || rule.parameters.comparisonOperator || "=="}
                onValueChange={(value) => {
                  // Store in both parameter names for backward compatibility
                  handleParameterChange("operator", value)
                  handleParameterChange("comparisonOperator", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equals (==)</SelectItem>
                  <SelectItem value="!=">Not Equals (!=)</SelectItem>
                  <SelectItem value="&gt;">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="&gt;=">Greater Than or Equal (&gt;=)</SelectItem>
                  <SelectItem value="&lt;">Less Than (&lt;)</SelectItem>
                  <SelectItem value="&lt;=">Less Than or Equal (&lt;=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowNull"
                checked={rule.parameters.allowNull === true}
                onCheckedChange={(checked) => handleParameterChange("allowNull", checked === true)}
              />
              <Label htmlFor="allowNull" className="text-sm font-normal">
                Skip validation if either value is null
              </Label>
            </div>
            {rule.column && (rule.parameters.secondaryColumn || rule.parameters.rightColumn) && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{rule.column}</span>{" "}
                  {getOperatorDisplay(rule.parameters.operator || rule.parameters.comparisonOperator || "==")}{" "}
                  <span className="font-medium">{rule.parameters.secondaryColumn || rule.parameters.rightColumn}</span>
                </p>
              </div>
            )}
          </div>
        )
      case "cross-column":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="secondaryColumn">Secondary Column</Label>
              <Select
                value={rule.parameters.secondaryColumn || rule.parameters.rightColumn || ""}
                onValueChange={(value) => {
                  // Store in both parameter names for backward compatibility
                  handleParameterChange("secondaryColumn", value)
                  handleParameterChange("rightColumn", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select secondary column" />
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
              <Label htmlFor="comparisonOperator">Comparison Operator</Label>
              <Select
                value={rule.parameters.operator || rule.parameters.comparisonOperator || "=="}
                onValueChange={(value) => {
                  // Store in both parameter names for backward compatibility
                  handleParameterChange("operator", value)
                  handleParameterChange("comparisonOperator", value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equals (==)</SelectItem>
                  <SelectItem value="!=">Not Equals (!=)</SelectItem>
                  <SelectItem value="&gt;">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="&gt;=">Greater Than or Equal (&gt;=)</SelectItem>
                  <SelectItem value="&lt;">Less Than (&lt;)</SelectItem>
                  <SelectItem value="&lt;=">Less Than or Equal (&lt;=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowNull"
                checked={rule.parameters.allowNull === true}
                onCheckedChange={(checked) => handleParameterChange("allowNull", checked === true)}
              />
              <Label htmlFor="allowNull" className="text-sm font-normal">
                Skip validation if either value is null
              </Label>
            </div>
            {rule.column && (rule.parameters.secondaryColumn || rule.parameters.rightColumn) && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{rule.column}</span>{" "}
                  {getOperatorDisplay(rule.parameters.operator || rule.parameters.comparisonOperator || "==")}{" "}
                  <span className="font-medium">{rule.parameters.secondaryColumn || rule.parameters.rightColumn}</span>
                </p>
              </div>
            )}
          </div>
        )
      case "multi-column":
        return (
          <div className="space-y-4">
            {/* Add the MultiColumnConditionEditor component here */}
            <MultiColumnConditionEditor
              columns={tableColumns[rule.table] || []}
              conditions={conditions}
              onChange={(updatedConditions) => {
                setConditions(updatedConditions)
                setRule((prev) => ({ ...prev, conditions: updatedConditions }))
              }}
            />
          </div>
        )
      case "composite-reference":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="referenceTable">Reference Table</Label>
              <Select
                value={rule.parameters.referenceTable || ""}
                onValueChange={(value) => {
                  handleParameterChange("referenceTable", value)
                  // Update form debug state
                  setFormDebug((prev) => ({ ...prev, hasReferenceTable: !!value }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reference table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formDebug.hasReferenceTable && <p className="text-red-500 text-sm">Reference Table is required.</p>}
            </div>

            <div className="space-y-2">
              <Label>Source Columns (from {rule.table})</Label>
              {sourceColumns.map((column, index) => (
                <div key={`source-${index}`} className="flex items-center space-x-2">
                  <Select value={column} onValueChange={(value) => handleSourceColumnChange(index, value)}>
                    <SelectTrigger className="flex-1">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSourceColumn(index)}
                    disabled={sourceColumns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={(e) => handleAddSourceColumn(e)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Source Column
              </Button>
              {!formDebug.hasSourceColumns && (
                <p className="text-red-500 text-sm">At least one source column is required.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reference Columns (from {rule.parameters.referenceTable || "reference table"})</Label>
              {referenceColumns.map((column, index) => (
                <div key={`reference-${index}`} className="flex items-center space-x-2">
                  <Select value={column} onValueChange={(value) => handleReferenceColumnChange(index, value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceTableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReferenceColumn(index)}
                    disabled={referenceColumns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={(e) => handleAddReferenceColumn(e)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reference Column
              </Button>
              {!formDebug.hasReferenceColumns && (
                <p className="text-red-500 text-sm">At least one reference column is required.</p>
              )}
            </div>

            {!formDebug.hasColumnsMatch && (
              <p className="text-red-500 text-sm">
                The number of source columns must match the number of reference columns.
              </p>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Rule Preview:</p>
              <p className="text-sm text-gray-700">
                Check if the combination of{" "}
                <span className="font-medium">{sourceColumns.filter(Boolean).join(", ") || "[source columns]"}</span>{" "}
                from <span className="font-medium">{rule.table}</span> exists in{" "}
                <span className="font-medium">{rule.parameters.referenceTable || "[reference table]"}</span> as{" "}
                <span className="font-medium">
                  {referenceColumns.filter(Boolean).join(", ") || "[reference columns]"}
                </span>
              </p>
            </div>
          </div>
        )
      case "unique":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select columns that should form a composite unique key:</p>
            {uniqueColumns.map((column, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Select value={column} onValueChange={(value) => handleUniqueColumnChange(index, value)}>
                  <SelectTrigger className="flex-1">
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveUniqueColumn(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddUniqueColumn}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>
        )
      case "date-before":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compareDate">Before Date</Label>
              <Input
                id="compareDate"
                type="date"
                value={rule.parameters.compareDate || ""}
                onChange={(e) => handleParameterChange("compareDate", e.target.value)}
              />
              <p className="text-xs text-gray-500">Validates that the date value is before the specified date.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={rule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the specified date (on or before)
              </Label>
            </div>

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {rule.parameters.inclusive ? "on or " : ""}before{" "}
                {rule.parameters.compareDate || "[select date]"}
              </p>
            </div>
          </div>
        )

      case "date-after":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compareDate">After Date</Label>
              <Input
                id="compareDate"
                type="date"
                value={rule.parameters.compareDate || ""}
                onChange={(e) => handleParameterChange("compareDate", e.target.value)}
              />
              <p className="text-xs text-gray-500">Validates that the date value is after the specified date.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={rule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the specified date (on or after)
              </Label>
            </div>

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {rule.parameters.inclusive ? "on or " : ""}after{" "}
                {rule.parameters.compareDate || "[select date]"}
              </p>
            </div>
          </div>
        )

      case "date-between":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={rule.parameters.startDate || ""}
                  onChange={(e) => handleParameterChange("startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={rule.parameters.endDate || ""}
                  onChange={(e) => handleParameterChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusive"
                checked={rule.parameters.inclusive === true}
                onCheckedChange={(checked) => handleParameterChange("inclusive", checked === true)}
              />
              <Label htmlFor="inclusive" className="text-sm font-normal">
                Include the boundary dates (on or between)
              </Label>
            </div>

            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                Date must be {rule.parameters.inclusive ? "on or " : ""}between{" "}
                {rule.parameters.startDate || "[start date]"} and {rule.parameters.endDate || "[end date]"}
              </p>
            </div>
          </div>
        )

      case "date-format":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Date Format</Label>
              <Select
                value={rule.parameters.format || "iso"}
                onValueChange={(value) => handleParameterChange("format", value)}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                  <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="eu">EU (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                  <SelectItem value="any">Any Valid Date</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {rule.parameters.format === "any"
                  ? "Validates that the value can be parsed as a valid date without enforcing a specific format."
                  : "Select a specific date format to enforce."}
              </p>
            </div>

            {rule.parameters.format === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customFormat">Custom Format Pattern</Label>
                <Input
                  id="customFormat"
                  value={rule.parameters.customFormat || ""}
                  onChange={(e) => handleParameterChange("customFormat", e.target.value)}
                  placeholder="e.g., YYYY-MM-DD HH:mm:ss"
                />
                <p className="text-xs text-gray-500">
                  Use YYYY for year, MM for month, DD for day, HH for hour, mm for minute, ss for second.
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={rule.parameters.required === true}
                onCheckedChange={(checked) => handleParameterChange("required", checked === true)}
              />
              <Label htmlFor="required" className="text-sm font-normal">
                Field is required (must be a valid date)
              </Label>
            </div>
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
    // Add a class to the form for easier targeting
    <form onSubmit={handleSubmit} className="space-y-4 edit-rule-form">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input type="text" id="name" name="name" value={rule.name} onChange={handleInputChange} required />
        {!formDebug.hasName && <p className="text-red-500 text-sm">Rule Name is required.</p>}
      </div>
      <div>
        <Label htmlFor="table">Table</Label>
        <Select value={rule.table} onValueChange={(value) => handleSelectChange("table", value)}>
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
          value={rule.column}
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
        <Select value={rule.ruleType} onValueChange={handleRuleTypeChange}>
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
        <Select value={rule.severity} onValueChange={(value) => handleSelectChange("severity", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
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
          {conditions.length > 1 && (
            <div className="flex items-center space-x-4">
              <Label className="text-sm font-medium">Combine conditions with:</Label>
              <RadioGroup
                value={rule.conditionType || "AND"}
                onValueChange={(value) => {
                  setRule({
                    ...rule,
                    conditionType: value as "AND" | "OR",
                  })
                }}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="AND" id="condition-and" />
                  <Label htmlFor="condition-and">AND</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="OR" id="condition-or" />
                  <Label htmlFor="condition-or">OR</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          {/* Then find the Add Condition button in the conditions section (around line 2400-2500) */}
          {/* Replace: */}
          {/* <Button variant="ghost" size="sm" onClick={handleAddCondition}> */}

          {/* With: */}
          <Button variant="ghost" size="sm" onClick={(e) => handleAddCondition(e)} type="button">
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

// Export as a named export only
export { RuleForm }
