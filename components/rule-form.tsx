"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type {
  DataQualityRule,
  RuleType,
  DataTables,
  ValueList,
  Condition,
  CrossTableCondition,
  ColumnCondition,
} from "@/lib/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MultiColumnConditionEditor } from "./multi-column-condition-editor"
import { JavaScriptExplainer } from "./javascript-explainer"

interface RuleFormProps {
  initialRule?: DataQualityRule
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onSubmit: (rule: DataQualityRule) => void
  onCancel: () => void
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
}

// Regex glossary for the regex rule type
const REGEX_GLOSSARY = [
  { pattern: "^", description: "Matches the start of a string" },
  { pattern: "$", description: "Matches the end of a string" },
  { pattern: ".", description: "Matches any single character except newlines" },
  { pattern: "\\d", description: "Matches any digit (0-9)" },
  { pattern: "\\D", description: "Matches any non-digit character" },
  { pattern: "\\w", description: "Matches any word character (alphanumeric + underscore)" },
  { pattern: "\\W", description: "Matches any non-word character" },
  { pattern: "\\s", description: "Matches any whitespace character (spaces, tabs, line breaks)" },
  { pattern: "\\S", description: "Matches any non-whitespace character" },
  { pattern: "[abc]", description: "Matches any character in the brackets" },
  { pattern: "[^abc]", description: "Matches any character not in the brackets" },
  { pattern: "[a-z]", description: "Matches any character in the range" },
  { pattern: "a|b", description: "Matches either 'a' or 'b'" },
  { pattern: "a?", description: "Matches zero or one of 'a'" },
  { pattern: "a*", description: "Matches zero or more of 'a'" },
  { pattern: "a+", description: "Matches one or more of 'a'" },
  { pattern: "a{3}", description: "Matches exactly 3 of 'a'" },
  { pattern: "a{3,}", description: "Matches 3 or more of 'a'" },
  { pattern: "a{3,6}", description: "Matches between 3 and 6 of 'a'" },
]

// Common regex examples
const REGEX_EXAMPLES = [
  {
    name: "Email",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    description: "Validates email addresses",
  },
  {
    name: "URL",
    pattern: "^(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*/?$",
    description: "Validates URLs",
  },
  { name: "Phone Number", pattern: "^\\+?[1-9]\\d{1,14}$", description: "Validates international phone numbers" },
  { name: "Date (YYYY-MM-DD)", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Validates dates in YYYY-MM-DD format" },
  {
    name: "Password",
    pattern: "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$",
    description: "At least 8 characters with at least one letter and one number",
  },
  { name: "Alphanumeric", pattern: "^[a-zA-Z0-9]+$", description: "Only letters and numbers" },
  { name: "ZIP Code", pattern: "^\\d{5}(-\\d{4})?$", description: "US ZIP code with optional 4-digit extension" },
]

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

export function RuleForm({ initialRule, tables, datasets, valueLists, onSubmit, onCancel }: RuleFormProps) {
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

  // Add this with the other state variables
  const [regexDialogOpen, setRegexDialogOpen] = useState(false)

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
      setRule(initialRule)
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
  }, [initialRule, tables])

  const handleChange = (field: keyof DataQualityRule, value: any) => {
    setRule((prev) => {
      return {
        ...prev,
        [field]: value,
      }
    })

    // If changing the rule type, update the first column condition
    if (field === "ruleType" && columnConditions.length > 0) {
      const updatedConditions = [...columnConditions]
      
      // For enum rule type, preserve the allowedValues parameter if it exists
      let newParameters = {};
      if (value === "enum" && updatedConditions[0].ruleType === "enum") {
        newParameters = {
          allowedValues: updatedConditions[0].parameters.allowedValues || []
        };
      }
      
      updatedConditions[0] = {
        ...updatedConditions[0],
        ruleType: value,
        parameters: newParameters, // Use preserved parameters or empty object
      }
      setColumnConditions(updatedConditions)

      // Initialize source columns for composite reference
      if (value === "composite-reference") {
        const initialSourceColumn = columnConditions[0].column || ""
        setSourceColumns(initialSourceColumn ? [initialSourceColumn] : [""])
        setReferenceColumns([""])

        // Also update the rule parameters
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            sourceColumns: initialSourceColumn ? [initialSourceColumn] : [""],
            referenceColumns: [""],
          },
        }))
      }

      // Initialize unique columns for unique rule type
      if (value === "unique") {
        const initialUniqueColumn = columnConditions[0].column || ""
        setUniqueColumns(initialUniqueColumn ? [initialUniqueColumn] : [""])

        // Also update the rule parameters
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            uniqueColumns: initialUniqueColumn ? [initialUniqueColumn] : [""],
          },
        }))
      }
    }

    // Reset conditions when changing rule type from multi-column
    if (field === "ruleType" && rule.ruleType === "multi-column" && value !== "multi-column") {
      setConditions([])
    }

    // If changing the column, update unique columns if this is a unique rule
    if (field === "column" && rule.ruleType === "unique") {
      // Replace the first column in uniqueColumns with the new column
      const updatedUniqueColumns = [...uniqueColumns]
      updatedUniqueColumns[0] = value
      setUniqueColumns(updatedUniqueColumns)

      // Also update the rule parameters
      setRule((prev) => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          uniqueColumns: updatedUniqueColumns,
        },
      }))
    }
  }

  const handleParameterChange = (key: string, value: any) => {
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }))

    // Also update the first column condition's parameters
    if (columnConditions.length > 0) {
      const updatedConditions = [...columnConditions]
      updatedConditions[0] = {
        ...updatedConditions[0],
        parameters: {
          ...updatedConditions[0].parameters,
          [key]: value,
        },
      }
      setColumnConditions(updatedConditions)
    }
  }

  const handleSecondaryColumnToggle = (column: string, checked: boolean) => {
    let updatedColumns: string[]

    if (checked) {
      updatedColumns = [...selectedSecondaryColumns, column]
    } else {
      updatedColumns = selectedSecondaryColumns.filter((col) => col !== column)
    }

    setSelectedSecondaryColumns(updatedColumns)
    setRule((prev) => ({
      ...prev,
      secondaryColumns: updatedColumns.length > 0 ? updatedColumns : undefined,
    }))
  }

  // In your RuleForm component, modify the handleConditionsChange function:
  const handleConditionsChange = (newConditions: Condition[]) => {
    // Ensure all conditions have logical operators set
    const updatedConditions = ensureLogicalOperators(newConditions)

    setRule({
      ...rule,
      conditions: updatedConditions,
    })
  }

  const handleAdditionalConditionsChange = (newConditions: Condition[]) => {
    setAdditionalConditions(newConditions)
  }

  const handleCrossTableConditionsChange = (newConditions: CrossTableCondition[]) => {
    setCrossTableConditions(newConditions)
  }

  // Handle column condition parameter change
  const handleColumnConditionParameterChange = (index: number, key: string, value: any) => {
    const updatedConditions = [...columnConditions]
    updatedConditions[index] = {
      ...updatedConditions[index],
      parameters: {
        ...updatedConditions[index].parameters,
        [key]: value,
      },
    }
    setColumnConditions(updatedConditions)

    // Also update the primary rule parameters if this is the first condition
    if (index === 0) {
      setRule((prev) => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [key]: value,
        },
      }))
    }
  }

  // Handle column condition field change
  const handleColumnConditionChange = (index: number, field: keyof ColumnCondition, value: any) => {
    const updatedConditions = [...columnConditions]
    
    // Special handling for rule type changes
    if (field === "ruleType") {
      // Preserve parameters for enum rule type
      let newParameters = {};
      if (value === "enum" && updatedConditions[index].ruleType === "enum") {
        newParameters = {
          allowedValues: updatedConditions[index].parameters.allowedValues || []
        };
      }
      
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value,
        parameters: newParameters,
      }
    } else {
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value,
      }
    }

    // If changing table, reset column
    if (field === "table") {
      updatedConditions[index].column = ""
    }

    setColumnConditions(updatedConditions)

    // Also update the primary rule if this is the first condition
    if (index === 0) {
      if (field === "column") {
        setRule((prev) => ({
          ...prev,
          column: value,
        }))

        // If this is a unique rule, update the first unique column
        if (rule.ruleType === "unique") {
          const updatedUniqueColumns = [...uniqueColumns]
          updatedUniqueColumns[0] = value
          setUniqueColumns(updatedUniqueColumns)

          // Also update the rule parameters
          setRule((prev) => ({
            ...prev,
            parameters: {
              ...prev.parameters,
              uniqueColumns: updatedUniqueColumns,
            },
          }))
        }
      } else if (field === "ruleType") {
        // Preserve parameters for enum rule type
        let newParameters = {};
        if (value === "enum" && rule.ruleType === "enum") {
          newParameters = {
            allowedValues: rule.parameters.allowedValues || []
          };
        }
        
        setRule((prev) => ({
          ...prev,
          ruleType: value,
          parameters: newParameters,
        }))
      } else if (field === "table") {
        setRule((prev) => ({
          ...prev,
          table: value,
          column: "", // Reset column when table changes
        }))
      }
    }
  }

  // Add a new column condition
  const addColumnCondition = () => {
    // Use the table from the first condition as default
    const defaultTable = columnConditions.length > 0 ? columnConditions[0].table : tables[0] || ""

    // Ensure the previous condition has a logical operator
    if (columnConditions.length > 0) {
      const updatedConditions = [...columnConditions]
      if (!updatedConditions[columnConditions.length - 1].logicalOperator) {
        updatedConditions[columnConditions.length - 1].logicalOperator = "AND"
        setColumnConditions(updatedConditions)
      }
    }

    setColumnConditions([
      ...columnConditions,
      {
        column: "",
        ruleType: "required",
        parameters: {},
        logicalOperator: "AND",
        table: defaultTable,
      },
    ])
  }

  // Remove a column condition
  const removeColumnCondition = (index: number) => {
    // Don't remove if it's the only condition
    if (columnConditions.length <= 1) return

    const updatedConditions = [...columnConditions]
    updatedConditions.splice(index, 1)
    setColumnConditions(updatedConditions)
  }

  // Add a source column for composite reference
  const addSourceColumn = () => {
    const newSourceColumns = [...sourceColumns, ""]
    setSourceColumns(newSourceColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        sourceColumns: newSourceColumns,
      },
    }))
  }

  // Remove a source column for composite reference
  const removeSourceColumn = (index: number) => {
    if (sourceColumns.length <= 1) return
    const newColumns = [...sourceColumns]
    newColumns.splice(index, 1)
    setSourceColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        sourceColumns: newColumns,
      },
    }))
  }

  // Update a source column for composite reference
  const updateSourceColumn = (index: number, value: string) => {
    // Check if this column is already selected elsewhere
    if (value && sourceColumns.findIndex((col, i) => col === value && i !== index) !== -1) {
      // If already selected, show a toast or alert
      alert(`Column "${value}" is already selected. Please choose a different column.`)
      return
    }

    const newColumns = [...sourceColumns]
    newColumns[index] = value
    setSourceColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        sourceColumns: newColumns,
      },
    }))
  }

  // Add a reference column for composite reference
  const addReferenceColumn = () => {
    const newReferenceColumns = [...referenceColumns, ""]
    setReferenceColumns(newReferenceColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        referenceColumns: newReferenceColumns,
      },
    }))
  }

  // Remove a reference column for composite reference
  const removeReferenceColumn = (index: number) => {
    if (referenceColumns.length <= 1) return
    const newColumns = [...referenceColumns]
    newColumns.splice(index, 1)
    setReferenceColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        referenceColumns: newColumns,
      },
    }))
  }

  // Update a reference column for composite reference
  const updateReferenceColumn = (index: number, value: string) => {
    // Check if this column is already selected elsewhere
    if (value && referenceColumns.findIndex((col, i) => col === value && i !== index) !== -1) {
      // If already selected, show a toast or alert
      alert(`Column "${value}" is already selected. Please choose a different column.`)
      return
    }

    const newColumns = [...referenceColumns]
    newColumns[index] = value
    setReferenceColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        referenceColumns: newColumns,
      },
    }))
  }

  // Add a unique column for unique values rule
  const addUniqueColumn = () => {
    const newUniqueColumns = [...uniqueColumns, ""]
    setUniqueColumns(newUniqueColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        uniqueColumns: newUniqueColumns,
      },
    }))
  }

  // Remove a unique column
  const removeUniqueColumn = (index: number) => {
    if (uniqueColumns.length <= 1) return
    const newColumns = [...uniqueColumns]
    newColumns.splice(index, 1)
    setUniqueColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        uniqueColumns: newColumns,
      },
    }))
  }

  // Update a unique column
  const updateUniqueColumn = (index: number, value: string) => {
    // Check if this column is already selected elsewhere
    if (value && uniqueColumns.findIndex((col, i) => col === value && i !== index) !== -1) {
      // If already selected, show a toast or alert
      alert(`Column "${value}" is already selected. Please choose a different column.`)
      return
    }

    const newColumns = [...uniqueColumns]
    newColumns[index] = value
    setUniqueColumns(newColumns)

    // Update rule parameters
    setRule((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        uniqueColumns: newColumns,
      },
    }))
  }

  // Get the primary table from the first column condition
  const getPrimaryTable = () => {
    return columnConditions.length > 0 ? columnConditions[0].table : ""
  }

  // Get available columns for a specific table
  const getColumnsForTable = (tableName: string) => {
    return tableColumns[tableName] || []
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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
    const primaryColumn = columnConditions.length > 0 ? columnConditions[0].column : ""

    const finalRule = {
      ...rule,
      table: primaryTable,
      column: primaryColumn,
      parameters: finalParameters,
      secondaryColumns: selectedSecondaryColumns.length > 0 ? selectedSecondaryColumns : undefined,
      conditions: rule.ruleType === "multi-column" ? conditions : undefined,
      additionalConditions: additionalConditions.length > 0 ? additionalConditions : undefined,
      crossTableConditions: finalCrossTableConditions.length > 0 ? finalCrossTableConditions : undefined,
      columnConditions: columnConditions.length > 1 ? columnConditions : undefined,
    }

    onSubmit(finalRule)
  }

  // Render parameters for a specific column condition
  const renderColumnConditionParameters = (condition: ColumnCondition, index: number) => {
    switch (condition.ruleType) {
      case "required":
        return <p className="text-sm text-gray-500">No parameters needed for required field check.</p>

      case "equals":
      case "not-equals":
      case "greater-than":
      case "greater-than-equals":
      case "less-than":
      case "less-than-equals":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-compareValue`}>Compare Value</Label>
            <Input
              id={`condition-${index}-compareValue`}
              value={condition.parameters.compareValue ?? ""}
              onChange={(e) => {
                // Try to convert to number if possible
                const value = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value
                handleColumnConditionParameterChange(index, "compareValue", value)
              }}
              placeholder="Value to compare against"
            />
          </div>
        )

      case "range":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-min`}>Minimum Value</Label>
              <Input
                id={`condition-${index}-min`}
                type="number"
                value={condition.parameters.min ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "min", Number.parseFloat(e.target.value))}
                placeholder="e.g., 0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-max`}>Maximum Value</Label>
              <Input
                id={`condition-${index}-max`}
                type="number"
                value={condition.parameters.max ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "max", Number.parseFloat(e.target.value))}
                placeholder="e.g., 100"
              />
            </div>
          </div>
        )

      case "regex":
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={`condition-${index}-pattern`}>Regex Pattern</Label>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()

                // Create a simple text representation of regex examples
                let helpText = "=== REGEX EXAMPLES ===\n\n"

                // Add common patterns
                helpText += "Email: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n"
                helpText += "URL: ^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*\\/?$\n"
                helpText += "Phone: ^\\+?[1-9]\\d{1,14}$\n"
                helpText += "Date (YYYY-MM-DD): ^\\d{4}-\\d{2}-\\d{2}$\n"
                helpText += "Password (min 8 chars, 1 letter, 1 number): ^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$\n"
                helpText += "Alphanumeric: ^[a-zA-Z0-9]+$\n"
                helpText += "ZIP Code: ^\\d{5}(-\\d{4})?$\n\n"

                // Add syntax reference
                helpText += "=== REGEX SYNTAX ===\n\n"
                helpText += "^ - Start of string\n"
                helpText += "$ - End of string\n"
                helpText += ". - Any single character\n"
                helpText += "\\d - Any digit (0-9)\n"
                helpText += "\\w - Any word character (a-z, A-Z, 0-9, _)\n"
                helpText += "\\s - Any whitespace character\n"
                helpText += "[abc] - Any character in the brackets\n"
                helpText += "[^abc] - Any character NOT in the brackets\n"
                helpText += "a? - Zero or one of 'a'\n"
                helpText += "a* - Zero or more of 'a'\n"
                helpText += "a+ - One or more of 'a'\n"

                alert(helpText)

                // Ask if user wants to use a specific pattern
                const usePattern = confirm("Would you like to use one of the example patterns?")
                if (usePattern) {
                  const pattern = prompt(
                    "Enter the pattern number to use:\n1. Email\n2. URL\n3. Phone\n4. Date\n5. Password\n6. Alphanumeric\n7. ZIP Code",
                  )

                  switch (pattern) {
                    case "1":
                      handleColumnConditionParameterChange(
                        index,
                        "pattern",
                        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                      )
                      break
                    case "2":
                      handleColumnConditionParameterChange(
                        index,
                        "pattern",
                        "^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*\\/?$",
                      )
                      break
                    case "3":
                      handleColumnConditionParameterChange(index, "pattern", "^\\+?[1-9]\\d{1,14}$")
                      break
                    case "4":
                      handleColumnConditionParameterChange(index, "pattern", "^\\d{4}-\\d{2}-\\d{2}$")
                      break
                    case "5":
                      handleColumnConditionParameterChange(index, "pattern", "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$")
                      break
                    case "6":
                      handleColumnConditionParameterChange(index, "pattern", "^[a-zA-Z0-9]+$")
                      break
                    case "7":
                      handleColumnConditionParameterChange(index, "pattern", "^\\d{5}(-\\d{4})?$")
                      break
                  }
                }
              }}
            >
              Regex Help
            </Button>
          </div>
        )

      case "type":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-dataType`}>Expected Data Type</Label>
            <Select
              value={condition.parameters.dataType ?? ""}
              onValueChange={(value) => handleColumnConditionParameterChange(index, "dataType", value)}
            >
              <SelectTrigger id={`condition-${index}-dataType`}>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="object">Object</SelectItem>
                <SelectItem value="array">Array</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case "enum":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-allowedValues`}>Allowed Values (comma separated)</Label>
            <Input
              id={`condition-${index}-allowedValues`}
              value={
                Array.isArray(condition.parameters.allowedValues) ? condition.parameters.allowedValues.join(", ") : ""
              }
              onChange={(e) => {
                // Improved parsing of allowed values that handles commas and spaces properly
                const inputValue = e.target.value;
                
                // Use regex to split by commas but handle quoted values
                const rawValues = [];
                let currentValue = "";
                let inQuotes = false;
                
                // Parse the input character by character
                for (let i = 0; i < inputValue.length; i++) {
                  const char = inputValue[i];
                  
                  // Handle quotes
                  if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                    currentValue += char;
                  } 
                  // Handle commas (only split if not in quotes)
                  else if (char === ',' && !inQuotes) {
                    rawValues.push(currentValue.trim());
                    currentValue = "";
                  } 
                  // Handle all other characters
                  else {
                    currentValue += char;
                  }
                }
                
                // Add the last value if there is one
                if (currentValue.trim()) {
                  rawValues.push(currentValue.trim());
                }
                
                // Process the values (remove quotes and convert to appropriate types)
                const processedValues = rawValues
                  .filter(val => val !== "")
                  .map(val => {
                    // Remove surrounding quotes if present
                    if ((val.startsWith('"') && val.endsWith('"')) || 
                        (val.startsWith("'") && val.endsWith("'"))) {
                      val = val.substring(1, val.length - 1);
                    }
                    
                    // Convert to number if it looks like one
                    const numVal = Number(val);
                    if (!isNaN(numVal) && String(numVal) === val) {
                      return numVal;
                    }
                    return val;
                  });
                
                handleColumnConditionParameterChange(index, "allowedValues", processedValues);
              }}
              placeholder="e.g., active, pending, inactive, 'option, with comma'"
            />
            <p className="text-xs text-gray-500">
              Use commas to separate values. Wrap values in quotes if they contain commas or leading/trailing spaces.
            </p>
            {Array.isArray(condition.parameters.allowedValues) && condition.parameters.allowedValues.length > 0 && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs font-medium mb-1">Current allowed values:</p>
                <div className="flex flex-wrap gap-1">
                  {condition.parameters.allowedValues.map((value, i) => (
                    <span
                      key={i}
                      className="inline-block px-2 py-1 bg-background rounded border text-xs"
                      title={`Type: ${typeof value}`}
                    >
                      {JSON.stringify(value)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({typeof value})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case "list":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-listId`}>Value List</Label>
            <Select
              value={condition.parameters.listId ?? ""}
              onValueChange={(value) => handleColumnConditionParameterChange(index, "listId", value)}
            >
              <SelectTrigger id={`condition-${index}-listId`}>
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
            {condition.parameters.listId && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <p className="text-xs font-medium mb-1">List Preview:</p>
                <div className="text-xs max-h-24 overflow-y-auto">
                  {valueLists
                    .find((list) => list.id === condition.parameters.listId)
                    ?.values.slice(0, 10)
                    .map((value, i) => (
                      <span
                        key={i}
                        className="inline-block mr-1 mb-1 px-1.5 py-0.5 bg-background rounded border text-xs"
                      >
                        {value}
                      </span>
                    ))}
                  {(valueLists.find((list) => list.id === condition.parameters.listId)?.values.length || 0) > 10 && (
                    <span className="text-xs text-muted-foreground">+ more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case "formula":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-formula`}>Math Formula</Label>
              <Input
                id={`condition-${index}-formula`}
                value={condition.parameters.formula ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "formula", e.target.value)}
                placeholder="e.g., columnA - columnB - columnC"
              />
              <p className="text-xs text-gray-500">
                Create a mathematical formula using column names. The formula will be evaluated for each row.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-operator`}>Comparison Operator</Label>
              <Select
                value={condition.parameters.operator ?? ">"}
                onValueChange={(value) => handleColumnConditionParameterChange(index, "operator", value)}
              >
                <SelectTrigger id={`condition-${index}-operator`}>
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

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-value`}>Comparison Value</Label>
              <Input
                id={`condition-${index}-value`}
                type="number"
                value={condition.parameters.value ?? 0}
                onChange={(e) => handleColumnConditionParameterChange(index, "value", Number(e.target.value))}
                placeholder="e.g., 0"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-md flex items-center gap-2 text-sm">
              <div>
                <span className="font-mono">{condition.parameters.formula || "[formula]"}</span>{" "}
                <span className="font-mono">{condition.parameters.operator || ">"}</span>{" "}
                <span className="font-mono">{condition.parameters.value ?? 0}</span>
              </div>
            </div>

            {condition.parameters.formula && (
              <JavaScriptExplainer
                code={`return (${condition.parameters.formula}) ${condition.parameters.operator || ">"} ${condition.parameters.value ?? 0};`}
                columnName={condition.column}
              />
            )}
          </div>
        )

      case "javascript-formula":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-formula`}>JavaScript Formula</Label>
            <Textarea
              id={`condition-${index}-formula`}
              value={condition.parameters.formula ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "formula", e.target.value)}
              placeholder="return row.amount - row.refundAmount - row.processingFee >= 0;"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Write a JavaScript formula that returns true if valid, false if invalid. The function has direct access to
              the 'row' object containing all columns.
            </p>

            {condition.parameters.formula && (
              <JavaScriptExplainer code={condition.parameters.formula} columnName={condition.column} />
            )}
          </div>
        )

      case "custom":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-functionBody`}>Custom Validation Function</Label>
            <Textarea
              id={`condition-${index}-functionBody`}
              value={condition.parameters.functionBody ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "functionBody", e.target.value)}
              placeholder="return value !== null && typeof value === 'string' && value.length > 0;"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Write a function body that returns true if valid, false if invalid. The function has access to 'value'
              (the cell value) and 'row' (the entire data row).
            </p>

            {condition.parameters.functionBody && (
              <JavaScriptExplainer code={condition.parameters.functionBody} columnName={condition.column} />
            )}
          </div>
        )

      case "javascript-formula":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-javascriptFormula`}>JavaScript Formula</Label>
            <Textarea
              id={`condition-${index}-javascriptFormula`}
              value={condition.parameters.javascriptFormula ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "javascriptFormula", e.target.value)}
              placeholder="return row.amount - row.refundAmount - row.processingFee >= 0;"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Write a JavaScript expression that returns true if valid, false if invalid. The expression has direct
              access to the 'row' object.
            </p>
            {condition.parameters.javascriptFormula && (
              <JavaScriptExplainer code={condition.parameters.javascriptFormula} columnName={condition.column} />
            )}
          </div>
        )

      case "column-comparison":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700" htmlFor={`condition-${index}-leftColumn`}>
                  Left Column
                </Label>
                <Select
                  value={condition.parameters.leftColumn || ""}
                  onValueChange={(value) => handleColumnConditionParameterChange(index, "leftColumn", value)}
                >
                  <SelectTrigger id={`condition-${index}-leftColumn`}>
                    <SelectValue placeholder="Select left column" />
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
                <Label className="block text-sm font-medium text-gray-700" htmlFor={`condition-${index}-rightColumn`}>
                  Right Column
                </Label>
                <Select
                  value={condition.parameters.rightColumn || ""}
                  onValueChange={(value) => handleColumnConditionParameterChange(index, "rightColumn", value)}
                >
                  <SelectTrigger id={`condition-${index}-rightColumn`}>
                    <SelectValue placeholder="Select right column" />
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
            </div>
            <div>
              <Label
                className="block text-sm font-medium text-gray-700"
                htmlFor={`condition-${index}-comparisonOperator`}
              >
                Comparison Operator
              </Label>
              <Select
                value={condition.parameters.comparisonOperator || ""}
                onValueChange={(value) => handleColumnConditionParameterChange(index, "comparisonOperator", value)}
              >
                <SelectTrigger id={`condition-${index}-comparisonOperator`}>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="==">Equal to (==)</SelectItem>
                  <SelectItem value="!=">Not equal to (!=)</SelectItem>
                  <SelectItem value="&gt;">Greater than (&gt;)</SelectItem>
                  <SelectItem value="&gt;=">Greater than or equal to (&gt;=)</SelectItem>
                  <SelectItem value="&lt;">Less than (&lt;)</SelectItem>
                  <SelectItem value="&lt;=">Less than or equal to (&lt;=)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "math-operation":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-700" htmlFor={`condition-${index}-operation`}>
                Operation Type
              </Label>
              <Select
                value={condition.parameters.operation || "add"}
                onValueChange={(value) => handleColumnConditionParameterChange(index, "operation", value)}
              >
                <SelectTrigger id={`condition-${index}-operation`}>
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Addition (+)</SelectItem>
                  <SelectItem value="subtract">Subtraction (-)</SelectItem>
                  <SelectItem value="multiply">Multiplication (×)</SelectItem>
                  <SelectItem value="divide">Division (÷)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label>Operands</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Add a new operand
                    const currentOperands = condition.parameters.operands || []
                    const newOperands = [...currentOperands, { type: "column", value: "" }]
                    handleColumnConditionParameterChange(index, "operands", newOperands)
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Operand
                </Button>
              </div>

              <div className="space-y-3">
                {(condition.parameters.operands || []).map((operand, opIndex) => (
                  <div key={`operand-${opIndex}`} className="flex items-center gap-2">
                    <Select
                      value={operand.type}
                      onValueChange={(value) => {
                        const newOperands = [...(condition.parameters.operands || [])]
                        newOperands[opIndex] = {
                          ...newOperands[opIndex],
                          type: value as "column" | "constant",
                          // Reset value when changing type
                          value: value === "column" ? "" : 0,
                        }
                        handleColumnConditionParameterChange(index, "operands", newOperands)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="column">Column</SelectItem>
                        <SelectItem value="constant">Constant</SelectItem>
                      </SelectContent>
                    </Select>

                    {operand.type === "column" ? (
                      <Select
                        value={String(operand.value)}
                        onValueChange={(value) => {
                          const newOperands = [...(condition.parameters.operands || [])]
                          newOperands[opIndex] = { ...newOperands[opIndex], value }
                          handleColumnConditionParameterChange(index, "operands", newOperands)
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {tableColumns[condition.table]?.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        value={operand.value as number}
                        onChange={(e) => {
                          const newOperands = [...(condition.parameters.operands || [])]
                          newOperands[opIndex] = {
                            ...newOperands[opIndex],
                            value: Number.parseFloat(e.target.value) || 0,
                          }
                          handleColumnConditionParameterChange(index, "operands", newOperands)
                        }}
                        className="flex-1"
                        placeholder="Enter a number"
                      />
                    )}

                    {(condition.parameters.operands || []).length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOperands = [...(condition.parameters.operands || [])]
                          newOperands.splice(opIndex, 1)
                          handleColumnConditionParameterChange(index, "operands", newOperands)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {!(condition.parameters.operands || []).length && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleColumnConditionParameterChange(index, "operands", [{ type: "column", value: "" }])
                  }}
                >
                  Add First Operand
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  className="block text-sm font-medium text-gray-700"
                  htmlFor={`condition-${index}-comparisonOperator`}
                >
                  Comparison Operator
                </Label>
                <Select
                  value={condition.parameters.comparisonOperator || "=="}
                  onValueChange={(value) => handleColumnConditionParameterChange(index, "comparisonOperator", value)}
                >
                  <SelectTrigger id={`condition-${index}-comparisonOperator`}>
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

              <div className="space-y-2">
                <Label
                  className="block text-sm font-medium text-gray-700"
                  htmlFor={`condition-${index}-comparisonValue`}
                >
                  Comparison Value
                </Label>
                <Input
                  id={`condition-${index}-comparisonValue`}
                  type="number"
                  value={condition.parameters.comparisonValue ?? 0}
                  onChange={(e) =>
                    handleColumnConditionParameterChange(index, "comparisonValue", Number(e.target.value))
                  }
                  placeholder="e.g., 0"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md text-sm">
              <p className="font-medium mb-1">Preview:</p>
              <div className="font-mono">{renderMathOperationPreview(condition.parameters)}</div>
            </div>
          </div>
        )

      case "contains":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-searchString`}>Search String</Label>
              <Input
                id={`condition-${index}-searchString`}
                value={condition.parameters.searchString || ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "searchString", e.target.value)}
                placeholder="Enter text to search for"
              />
              <p className="text-xs text-gray-500">
                The validation will check if the field value contains this string.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-caseSensitive`} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${index}-caseSensitive`}
                  checked={condition.parameters.caseSensitive || false}
                  onCheckedChange={(checked) =>
                    handleColumnConditionParameterChange(index, "caseSensitive", checked === true)
                  }
                />
                <span>Case Sensitive</span>
              </Label>
              <p className="text-xs text-gray-500">If checked, the search will be case sensitive.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-matchType`}>Match Type</Label>
              <Select
                value={condition.parameters.matchType || "contains"}
                onValueChange={(value) => handleColumnConditionParameterChange(index, "matchType", value)}
              >
                <SelectTrigger id={`condition-${index}-matchType`}>
                  <SelectValue placeholder="Select match type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="not-contains">Does Not Contain</SelectItem>
                  <SelectItem value="starts-with">Starts With</SelectItem>
                  <SelectItem value="ends-with">Ends With</SelectItem>
                  <SelectItem value="exact">Exact Match</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Determines how the string should be matched against the field value.
              </p>
            </div>
          </div>
        )

      case "date-before":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-compareDate`}>Before Date</Label>
              <Input
                id={`condition-${index}-compareDate`}
                type="date"
                value={condition.parameters.compareDate || ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "compareDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-gray-500">The date value must be before this date.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-inclusive`} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${index}-inclusive`}
                  checked={condition.parameters.inclusive || false}
                  onCheckedChange={(checked) =>
                    handleColumnConditionParameterChange(index, "inclusive", checked === true)
                  }
                />
                <span>Inclusive (include the specified date)</span>
              </Label>
              <p className="text-xs text-gray-500">If checked, the date can be equal to the specified date.</p>
            </div>
          </div>
        )

      case "date-after":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-compareDate`}>After Date</Label>
              <Input
                id={`condition-${index}-compareDate`}
                type="date"
                value={condition.parameters.compareDate || ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "compareDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-gray-500">The date value must be after this date.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-inclusive`} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${index}-inclusive`}
                  checked={condition.parameters.inclusive || false}
                  onCheckedChange={(checked) =>
                    handleColumnConditionParameterChange(index, "inclusive", checked === true)
                  }
                />
                <span>Inclusive (include the specified date)</span>
              </Label>
              <p className="text-xs text-gray-500">If checked, the date can be equal to the specified date.</p>
            </div>
          </div>
        )

      case "date-between":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-startDate`}>Start Date</Label>
              <Input
                id={`condition-${index}-startDate`}
                type="date"
                value={condition.parameters.startDate || ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "startDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-gray-500">The date value must be after this start date.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-endDate`}>End Date</Label>
              <Input
                id={`condition-${index}-endDate`}
                type="date"
                value={condition.parameters.endDate || ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "endDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
              <p className="text-xs text-gray-500">The date value must be before this end date.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-inclusive`} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${index}-inclusive`}
                  checked={condition.parameters.inclusive || false}
                  onCheckedChange={(checked) =>
                    handleColumnConditionParameterChange(index, "inclusive", checked === true)
                  }
                />
                <span>Inclusive (include the specified dates)</span>
              </Label>
              <p className="text-xs text-gray-500">If checked, the date can be equal to the start or end date.</p>
            </div>
          </div>
        )

      case "date-format":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-format`}>Date Format</Label>
              <Select
                value={condition.parameters.format || "iso"}
                onValueChange={(value) => handleColumnConditionParameterChange(index, "format", value)}
              >
                <SelectTrigger id={`condition-${index}-format`}>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                  <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="eu">European (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                </SelectContent>
                <p className="text-xs text-gray-500">
                  Select the expected format for date values.
                </p>
              </div>

              {condition.parameters.format === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor={`condition-${index}-customFormat`}>Custom Format Pattern</Label>
                  <Input
                    id={`condition-${index}-customFormat`}
                    value={condition.parameters.customFormat || ""}
                    onChange={(e) => handleColumnConditionParameterChange(index, "customFormat", e.target.value)}
                    placeholder="e.g., YYYY-MM-DD HH:mm:ss"
                  />
                  <p className="text-xs text-gray-500">
                    Use YYYY for year, MM for month, DD for day, HH for hour, mm for minute, ss for second.
                  </p>
                </div>
              )}
            </div>
          )

      default:
        return null
    }
  }

  const renderReferenceIntegrityParameters = () => {
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-md mb-4">
          <h4 className="text-sm font-mediummmm mb-2">About Cross-Table Key Integrity</h4>
          <p className="text-xs text-gray-700 mb-2">
            This rule validates that a value in one table exists in another table (foreign key check).
          </p>
          <div className="text-xs space-y-1">
            <p>
              <strong>Example:</strong> Validate that userId in the orders table exists in the id column of the users
              table.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceTable">Reference Table</Label>
          <Select
            value={rule.parameters.referenceTable || ""}
            onValueChange={(value) => handleParameterChange("referenceTable", value)}
          >
            <SelectTrigger id="referenceTable">
              <SelectValue placeholder="Select reference table" />
            </SelectTrigger>
            <SelectContent>
              {tables
                .filter((table) => table !== getPrimaryTable()) // Don't allow referencing the same table
                .map((table) => (
                  <SelectItem key={table} value={table}>
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {rule.parameters.referenceTable && (
          <div className="space-y-2">
            <Label htmlFor="referenceColumn">Reference Column</Label>
            <Select
              value={rule.parameters.referenceColumn || ""}
              onValueChange={(value) => handleParameterChange("referenceColumn", value)}
            >
              <SelectTrigger id="referenceColumn">
                <SelectValue placeholder="Select reference column" />
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

        <div className="space-y-2">
          <Label htmlFor="checkType">Check Type</Label>
          <Select
            value={rule.parameters.checkType || "exists"}
            onValueChange={(value) => handleParameterChange("checkType", value)}
          >
            <SelectTrigger id="checkType">
              <SelectValue placeholder="Select check type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exists">Must Exist</SelectItem>
              <SelectItem value="not-exists">Must Not Exist</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {rule.parameters.checkType === "not-exists"
              ? "Validates that the value does NOT exist in the reference table (exclusivity check)"
              : "Validates that the value exists in the reference table (foreign key check)"}
          </p>
        </div>
      </div>
    )
  }

  // Render parameters for the composite reference rule type
  const renderCompositeReferenceParameters = () => {
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-md mb-4">
          <h4 className="text-sm font-medium mb-2">About Cross-Table Composite Keys</h4>
          <p className="text-xs text-gray-700 mb-2">
            This rule validates that a combination of columns (source columns) in one table exists as a combination of
            columns (reference columns) in another table.
          </p>
          <div className="text-xs space-y-1">
            <p>
              <strong>Example:</strong> Validate that (firstName, lastName) in the source table exists as (firstName,
              lastName) in the reference table.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sourceTable">Source Table</Label>
            <Select
              value={rule.parameters.sourceTable || rule.table || ""}
              onValueChange={(value) => {
                handleParameterChange("sourceTable", value)
                // Also update the main rule table to keep them in sync
                handleChange("table", value)
                // Reset source columns when table changes
                setSourceColumns([""])
                setRule((prev) => ({
                  ...prev,
                  parameters: {
                    ...prev.parameters,
                    sourceColumns: [""],
                  },
                }))
              }}
            >
              <SelectTrigger id="sourceTable">
                <SelectValue placeholder="Select source table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceTable">Reference Table</Label>
            <Select
              value={rule.parameters.referenceTable || ""}
              onValueChange={(value) => handleParameterChange("referenceTable", value)}
            >
              <SelectTrigger id="referenceTable">
                <SelectValue placeholder="Select reference table" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((table) => table !== (rule.parameters.sourceTable || rule.table)) // Don't allow referencing the same table
                  .map((table) => (
                    <SelectItem key={table} value={table}>
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <Label>Source Columns</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.alert(
                    `These columns from the source table (${rule.parameters.sourceTable || rule.table}) will be checked against the reference columns. The order matters - each source column will be matched with the corresponding reference column.`,
                  )
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSourceColumn}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Column
            </Button>
          </div>

          <div className="space-y-2">
            {sourceColumns.map((column, index) => (
              <div key={`source-${index}`} className="flex items-center gap-2">
                <Select value={column} onValueChange={(value) => updateSourceColumn(index, value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {getColumnsForTable(rule.parameters.sourceTable || rule.table || "")
                      .filter((col) => !sourceColumns.includes(col) || col === column)
                      .map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {sourceColumns.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSourceColumn(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Select multiple columns that together form a composite key to check against the reference table. For single
            column references, use the "Cross-Table Key Integrity" rule type instead.
          </p>
        </div>

        {rule.parameters.referenceTable && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <Label>Reference Columns</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        These columns from the reference table ({rule.parameters.referenceTable}) will be matched with
                        the source columns. The order matters - each reference column will be matched with the
                        corresponding source column.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReferenceColumn}
                className="flex items-center gap-1"
                disabled={!rule.parameters.referenceTable}
              >
                <Plus className="h-4 w-4" /> Add Column
              </Button>
            </div>

            <div className="space-y-2">
              {referenceColumns.map((column, index) => (
                <div key={`reference-${index}`} className="flex items-center gap-2">
                  <Select value={column} onValueChange={(value) => updateReferenceColumn(index, value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {referenceTableColumns
                        .filter((col) => !referenceColumns.includes(col) || col === column)
                        .map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                  </SelectContent>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReferenceColumn(index)}
                    className="h-8 w-8 p-0"
                    disabled={referenceColumns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              The number of reference columns must match the number of source columns. The order of columns is
              important.
            </p>
            {!formDebug.hasColumnsMatch && (
              <p className="text-xs text-red-500">The number of source columns and reference columns must match.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              type="text"
              id="name"
              value={rule.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter rule name"
            />
            {!formDebug.hasName && <p className="text-xs text-red-500">Rule name is required.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={rule.severity} onValueChange={(value) => handleChange("severity", value)}>
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="ruleType">Rule Type</Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.alert("Select the type of validation rule to apply to this column.")
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </div>

            {columnConditions[0]?.ruleType && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.alert(
                      `${RULE_TYPES.find((t) => t.value === columnConditions[0]?.ruleType)?.label || "Rule Type"}

${RULE_TYPE_EXAMPLES[columnConditions[0]?.ruleType]?.explanation}

Example: ${RULE_TYPE_EXAMPLES[columnConditions[0]?.ruleType]?.example}`,
                    )
                  }}
                >
                  View Example
                </Button>
                {/* Keep a hidden dialog for future implementation */}
                <Dialog>
                  <DialogContent style={{ display: "none" }}></DialogContent>
                </Dialog>
              </>
            )}
          </div>

          <Select
            value={columnConditions[0]?.ruleType || ""}
            onValueChange={(value) => handleColumnConditionChange(0, "ruleType", value as RuleType)}
          >
            <SelectTrigger id="ruleType">
              <SelectValue placeholder="Select rule type" />
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

        {rule.ruleType !== "composite-reference" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="table">Table</Label>
              <Select value={rule.table} onValueChange={(value) => handleChange("table", value)}>
                <SelectTrigger id="table">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="column">Column</Label>
              <Select
                value={columnConditions[0]?.column || ""}
                onValueChange={(value) => handleColumnConditionChange(0, "column", value)}
              >
                <SelectTrigger id="column">
                  <SelectValue placeholder="Select column" />
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
          </div>
        )}

        {/* Render parameters based on rule type */}
        {columnConditions.map((condition, index) => (
          <div key={`condition-${index}`} className="space-y-4 border rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Condition #{index + 1}</h3>
              {columnConditions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColumnCondition(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {columnConditions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor={`condition-${index}-table`}>Table</Label>
                <Select
                  value={condition.table}
                  onValueChange={(value) => handleColumnConditionChange(index, "table", value)}
                >
                  <SelectTrigger id={`condition-${index}-table`}>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table.charAt(0).toUpperCase() + table.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {columnConditions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor={`condition-${index}-column`}>Column</Label>
                <Select
                  value={condition.column}
                  onValueChange={(value) => handleColumnConditionChange(index, "column", value)}
                >
                  <SelectTrigger id={`condition-${index}-column`}>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableColumns[condition.table]?.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {columnConditions.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor={`condition-${index}-ruleType`}>Rule Type</Label>
                <Select
                  value={condition.ruleType}
                  onValueChange={(value) => handleColumnConditionChange(index, "ruleType", value)}
                >
                  <SelectTrigger id={`condition-${index}-ruleType`}>
                    <SelectValue placeholder="Select rule type" />
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
            )}
            {index < columnConditions.length - 1 && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <Label htmlFor={`condition-${index}-logicalOperator`}>Connect with Next Condition Using</Label>
                <Select
                  value={condition.logicalOperator || "AND"}
                  onValueChange={(value) => handleColumnConditionChange(index, "logicalOperator", value)}
                >
                  <SelectTrigger id={`condition-${index}-logicalOperator`}>
                    <SelectValue placeholder="Select logical operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {condition.logicalOperator === "OR"
                    ? "This condition OR the next condition must be true"
                    : "This condition AND the next condition must be true"}
                </p>
              </div>
            )}

            {renderColumnConditionParameters(condition, index)}
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addColumnCondition}>
          <Plus className="h-4 w-4 mr-2" /> Add Condition
        </Button>

        {rule.ruleType === "reference-integrity" && renderReferenceIntegrityParameters()}
        {rule.ruleType === "composite-reference" && renderCompositeReferenceParameters()}
        {rule.ruleType === "unique" && (
          <div className="space-y-4 border rounded-md p-4">
            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-medium mb-2">About Unique Values</h4>
              <p className="text-xs text-gray-700">
                This rule validates that values in the selected column(s) are unique across all rows in the table. You
                can select multiple columns to check for composite uniqueness.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label>Columns to Check for Uniqueness</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addColumnCondition}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Column
                </Button>
              </div>

              <div className="space-y-2">
                {uniqueColumns.map((column, index) => (
                  <div key={`unique-${index}`} className="flex items-center gap-2">
                    <Select value={column} onValueChange={(value) => updateUniqueColumn(index, value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getColumnsForTable(getPrimaryTable())
                          .filter((col) => !uniqueColumns.includes(col) || col === column)
                          .map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {uniqueColumns.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUniqueColumn(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {uniqueColumns.length > 1 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    The combination of values across these columns must be unique. For example, if you select
                    "firstName" and "lastName", the combination (firstName + lastName) must be unique, but individual
                    first or last names can repeat.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {rule.table && tableColumns[rule.table] && tableColumns[rule.table].length > 0 && (
          <Accordion type="single" collapsible className="border rounded-md">
            <AccordionItem value="secondary-columns" className="border-none">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex flex-col items-start">
                  <span>Secondary Columns</span>
                  <span className="text-xs text-gray-500 font-normal">
                    {selectedSecondaryColumns.length > 0
                      ? `${selectedSecondaryColumns.length} column${selectedSecondaryColumns.length > 1 ? "s" : ""} selected`
                      : "Optionally select additional columns to include in the validation"}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-xs text-gray-500 mb-2">
                  Select additional columns that are referenced or involved in this rule.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {tableColumns[rule.table]
                    .filter((col) => col !== rule.column)
                    .map((column) => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={`col-${column}`}
                          checked={selectedSecondaryColumns.includes(column)}
                          onChange={(e) => handleChange("enabled", e.target.checked)}
                          onCheckedChange={(checked) => handleSecondaryColumnToggle(column, checked)}
                        />
                        <Label htmlFor={`col-${column}`} className="text-sm font-normal">
                          {column}
                        </Label>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {rule.ruleType === "multi-column" && (
          <MultiColumnConditionEditor
            columns={tableColumns[rule.table] || []}
            conditions={ensureLogicalOperators(rule.conditions || [])}
            onChange={handleConditionsChange}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={rule.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Enter rule description"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="enabled" checked={rule.enabled} onChange={(e) => handleChange("enabled", e.target.checked)} />
          <Label htmlFor="enabled" className="text-sm font-normal">
            Enabled
          </Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </TooltipProvider>
  )
}
