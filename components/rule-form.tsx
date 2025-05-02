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

interface RuleFormProps {
  initialRule?: DataQualityRule
  tables: string[]
  datasets: DataTables
  valueLists: ValueList[]
  onSubmit: (rule: DataQualityRule) => void
  onCancel: () => void
}

// Update the RULE_TYPES array to rename "Reference Integrity" to "Cross Integrity"
// and "Composite Reference" to "Composite Integrity"
const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "required", label: "Required Field" },
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not Equals" },
  { value: "greater-than", label: "Greater Than" },
  { value: "greater-than-equals", label: "Greater Than or Equal" },
  { value: "less-than", label: "Less Than" },
  { value: "less-than-equals", label: "Less Than or Equal" },
  { value: "range", label: "Numeric Range" },
  { value: "regex", label: "Regex Pattern" },
  { value: "type", label: "Type Validation" },
  { value: "enum", label: "Enumeration" },
  { value: "list", label: "List Validation" },
  { value: "contains", label: "Contains String" },
  { value: "formula", label: "Math Formula" },
  { value: "dependency", label: "Conditional Dependency" },
  { value: "lookup", label: "Lookup Validation" },
  { value: "reference-integrity", label: "Cross-Table Key Integrity" },
  { value: "composite-reference", label: "Cross-Table Composite Key" },
  { value: "custom", label: "Custom Function" },
  { value: "unique", label: "Unique Values" },
  { value: "cross-column", label: "Cross-Column Validation" },
  { value: "multi-column", label: "Multi-Column Conditions" },
  { value: "date-before", label: "Date Before" },
  { value: "date-after", label: "Date After" },
  { value: "date-between", label: "Date Between" },
  { value: "date-format", label: "Date Format" },
]

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
    explanation: "Validates that the field value is unique across all rows in the table.",
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
    pattern: "^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*\\/?$",
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

        setSourceColumns(sourceColumnsFromRule)
        setReferenceColumns(referenceColumnsFromRule)

        // Ensure these are also in the rule parameters
        setRule((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            sourceColumns: sourceColumnsFromRule,
            referenceColumns: referenceColumnsFromRule,
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
      updatedConditions[0] = {
        ...updatedConditions[0],
        ruleType: value,
        parameters: {}, // Reset parameters when rule type changes
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
    }

    // Reset conditions when changing rule type from multi-column
    if (field === "ruleType" && rule.ruleType === "multi-column" && value !== "multi-column") {
      setConditions([])
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

  const handleConditionsChange = (newConditions: Condition[]) => {
    setConditions(newConditions)
    setRule((prev) => ({
      ...prev,
      conditions: newConditions,
    }))
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
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value,
    }

    // If changing rule type, reset parameters
    if (field === "ruleType") {
      updatedConditions[index].parameters = {}
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
      } else if (field === "ruleType") {
        setRule((prev) => ({
          ...prev,
          ruleType: value,
          parameters: {},
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
        sourceColumns: sourceColumns.filter(Boolean),
        referenceColumns: referenceColumns.filter(Boolean),
        orderIndependent: true, // Always set this flag for composite references
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
              onChange={(e) =>
                handleColumnConditionParameterChange(
                  index,
                  "allowedValues",
                  e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0),
                )
              }
              placeholder="e.g., active, pending, inactive"
            />
          </div>
        )

      case "formula":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-formula`}>Formula (JavaScript expression)</Label>
            <Input
              id={`condition-${index}-formula`}
              value={condition.parameters.formula ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "formula", e.target.value)}
              placeholder="e.g., value > 0 && value < 100"
            />
            <p className="text-xs text-gray-500">
              Write a formula that returns true if valid, false if invalid. Use 'value' to refer to the column value.
            </p>
          </div>
        )

      case "contains":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-substring`}>Substring to Check</Label>
            <Input
              id={`condition-${index}-substring`}
              value={condition.parameters.substring ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "substring", e.target.value)}
              placeholder="e.g., @"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id={`condition-${index}-caseSensitive`}
                checked={condition.parameters.caseSensitive === true}
                onCheckedChange={(checked) =>
                  handleColumnConditionParameterChange(index, "caseSensitive", checked === true)
                }
              />
              <Label htmlFor={`condition-${index}-caseSensitive`} className="text-sm font-normal">
                Case sensitive
              </Label>
            </div>
          </div>
        )

      case "date-before":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-compareDate`}>Before Date</Label>
            <Input
              id={`condition-${index}-compareDate`}
              type="date"
              value={condition.parameters.compareDate ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "compareDate", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id={`condition-${index}-inclusive`}
                checked={condition.parameters.inclusive === true}
                onCheckedChange={(checked) =>
                  handleColumnConditionParameterChange(index, "inclusive", checked === true)
                }
              />
              <Label htmlFor={`condition-${index}-inclusive`} className="text-sm font-normal">
                Include the specified date
              </Label>
            </div>
          </div>
        )

      case "date-after":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-compareDate`}>After Date</Label>
            <Input
              id={`condition-${index}-compareDate`}
              type="date"
              value={condition.parameters.compareDate ?? ""}
              onChange={(e) => handleColumnConditionParameterChange(index, "compareDate", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id={`condition-${index}-inclusive`}
                checked={condition.parameters.inclusive === true}
                onCheckedChange={(checked) =>
                  handleColumnConditionParameterChange(index, "inclusive", checked === true)
                }
              />
              <Label htmlFor={`condition-${index}-inclusive`} className="text-sm font-normal">
                Include the specified date
              </Label>
            </div>
          </div>
        )

      case "date-between":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-startDate`}>Start Date</Label>
              <Input
                id={`condition-${index}-startDate`}
                type="date"
                value={condition.parameters.startDate ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "startDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`condition-${index}-endDate`}>End Date</Label>
              <Input
                id={`condition-${index}-endDate`}
                type="date"
                value={condition.parameters.endDate ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "endDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="col-span-2 flex items-center space-x-2 mt-2">
              <Checkbox
                id={`condition-${index}-inclusive`}
                checked={condition.parameters.inclusive === true}
                onCheckedChange={(checked) =>
                  handleColumnConditionParameterChange(index, "inclusive", checked === true)
                }
              />
              <Label htmlFor={`condition-${index}-inclusive`} className="text-sm font-normal">
                Include the start and end dates
              </Label>
            </div>
          </div>
        )

      case "date-format":
        return (
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}-format`}>Expected Format</Label>
            <Select
              value={condition.parameters.format ?? "iso"}
              onValueChange={(value) => handleColumnConditionParameterChange(index, "format", value)}
            >
              <SelectTrigger id={`condition-${index}-format`}>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                <SelectItem value="eu">European (DD/MM/YYYY)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {condition.parameters.format === "custom" && (
              <div className="mt-2">
                <Label htmlFor={`condition-${index}-customFormat`}>Custom Format Pattern</Label>
                <Input
                  id={`condition-${index}-customFormat`}
                  value={condition.parameters.customFormat ?? ""}
                  onChange={(e) => handleColumnConditionParameterChange(index, "customFormat", e.target.value)}
                  placeholder="e.g., YYYY-MM-DD"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use YYYY for year, MM for month, DD for day, HH for hour, mm for minute, ss for second
                </p>
              </div>
            )}
          </div>
        )

      case "cross-column":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`condition-${index}-formula`}>Formula (JavaScript expression)</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.alert(
                      "Write a formula that returns true if valid, false if invalid. Use 'value' to refer to the primary column value and 'row' to access any column in the record.\n\n" +
                        "Example: row.email ? true : row.phone && row.phone.length >= 10",
                    )
                  }}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                id={`condition-${index}-formula`}
                value={condition.parameters.condition ?? ""}
                onChange={(e) => handleColumnConditionParameterChange(index, "condition", e.target.value)}
                placeholder="e.g., row.email ? true : row.phone && row.phone.length >= 10"
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Use 'value' to refer to the primary column value and 'row' to access any column in the record
              </p>
            </div>

            <div className="space-y-2 border-t pt-4 mt-4">
              <Label className="block mb-2">Referenced Columns</Label>
              <p className="text-xs text-gray-500 mb-2">
                Select columns that are referenced in your formula. This helps with documentation and understanding.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {getColumnsForTable(condition.table)
                  .filter((col) => col !== condition.column)
                  .map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${index}-${column}`}
                        checked={condition.parameters.referencedColumns?.includes(column) || false}
                        onCheckedChange={(checked) => {
                          const currentRefs = condition.parameters.referencedColumns || []
                          const newRefs = checked ? [...currentRefs, column] : currentRefs.filter((c) => c !== column)
                          handleColumnConditionParameterChange(index, "referencedColumns", newRefs)
                        }}
                      />
                      <Label htmlFor={`col-${index}-${column}`} className="text-sm font-normal">
                        {column}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md mt-4">
              <h4 className="text-sm font-medium mb-2">Examples of Cross-Column Validation</h4>
              <div className="space-y-2 text-xs">
                <p>
                  <strong>If email is blank, phone is required:</strong>
                </p>
                <pre className="bg-gray-100 p-1 rounded">
                  row.email ? true : row.phone &amp;&amp; row.phone.length &gt; 0
                </pre>

                <p>
                  <strong>Either email or phone must be provided:</strong>
                </p>
                <pre className="bg-gray-100 p-1 rounded">row.email || row.phone</pre>

                <p>
                  <strong>End date must be after start date:</strong>
                </p>
                <pre className="bg-gray-100 p-1 rounded">new Date(row.endDate) &gt; new Date(row.startDate)</pre>

                <p>
                  <strong>If status is "completed", completedDate must be provided:</strong>
                </p>
                <pre className="bg-gray-100 p-1 rounded">row.status !== "completed" || row.completedDate</pre>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Render parameters for the reference integrity rule type
  const renderReferenceIntegrityParameters = () => {
    return (
      <div className="space-y-4">
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
            This rule validates that a combination of columns (source columns) in the current table exists as a
            combination of columns (reference columns) in another table.
          </p>
          <div className="text-xs space-y-1">
            <p>
              <strong>Example:</strong> Validate that (firstName, lastName) in the current table exists as (firstName,
              lastName) in a contacts table.
            </p>
            <p>
              <strong>Source Columns:</strong> Columns from the current table that form the composite key.
            </p>
            <p>
              <strong>Reference Columns:</strong> Matching columns in the reference table that should contain the same
              combination of values.
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
                    `These columns from the source table (${getPrimaryTable()}) will be checked against the reference columns. The order matters - each source column will be matched with the corresponding reference column.`,
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
                    {getColumnsForTable(getPrimaryTable())
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
                  </Select>
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
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

            {renderColumnConditionParameters(condition, index)}
          </div>
        ))}

        {columnConditions.length < 3 && (
          <Button type="button" variant="outline" size="sm" onClick={addColumnCondition}>
            <Plus className="h-4 w-4 mr-2" /> Add Condition
          </Button>
        )}

        {rule.ruleType === "reference-integrity" && renderReferenceIntegrityParameters()}
        {rule.ruleType === "composite-reference" && renderCompositeReferenceParameters()}

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
          <Checkbox
            id="enabled"
            checked={rule.enabled}
            onCheckedChange={(checked) => handleChange("enabled", checked)}
          />
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
