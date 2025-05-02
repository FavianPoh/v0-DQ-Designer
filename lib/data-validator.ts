import type {
  DataRecord,
  DataQualityRule,
  ValidationResult,
  DataTables,
  ValueList,
  Condition,
  CrossTableCondition,
  ColumnCondition,
} from "./types"

export function validateDataset(
  datasets: DataTables,
  rules: DataQualityRule[],
  valueLists: ValueList[] = [],
): ValidationResult[] {
  const results: ValidationResult[] = []

  // Log all date rules for debugging
  const dateRules = rules.filter(
    (r) =>
      r.ruleType === "date-before" ||
      r.ruleType === "date-after" ||
      r.ruleType === "date-between" ||
      r.ruleType === "date-format",
  )

  console.log(
    "Date rules to validate:",
    dateRules.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.ruleType,
      table: r.table,
      column: r.column,
      parameters: r.parameters,
    })),
  )

  // Process each rule
  rules.forEach((rule) => {
    // Skip disabled rules
    if (rule.enabled === false) {
      return
    }

    // Generate passing validations for all enabled rules and all rows
    // This ensures we have a complete set of validation results
    Object.entries(datasets).forEach(([tableName, tableData]) => {
      // Get all rules that apply to this table
      const tableRules = rules.filter((r) => r.table === tableName && r.enabled !== false)

      // For each row in the table
      tableData.forEach((row, rowIndex) => {
        // For each applicable rule
        tableRules.forEach((rule) => {
          // Check if we already have a validation result for this rule and row
          const hasResult = results.some(
            (r) =>
              r.table === tableName &&
              r.rowIndex === rowIndex &&
              (r.ruleName === rule.name || r.ruleName.includes(`[ID: ${rule.id}]`) || r.ruleId === rule.id),
          )

          // If we don't have a result, it means the validation passed
          if (!hasResult) {
            // Add a passing validation result
            results.push({
              rowIndex,
              table: tableName,
              column: rule.column,
              ruleName: rule.name,
              message: "Passed validation",
              severity: "success",
              ruleId: rule.id,
            })
          }
        })
      })
    })

    const tableData = datasets[rule.table]
    if (!tableData) {
      console.log(`Table ${rule.table} not found for rule ${rule.name}`)
      return
    }

    // For date rules, add special handling
    const isDateRule = rule.ruleType.startsWith("date-")
    if (isDateRule) {
      console.log(`Processing date rule: ${rule.name} (${rule.ruleType}) on table ${rule.table}, column ${rule.column}`)

      // Check if the column exists in the table
      if (tableData.length > 0 && !(rule.column in tableData[0])) {
        console.log(`Column ${rule.column} not found in table ${rule.table} for rule ${rule.name}`)
        return
      }
    }

    // Process each row in the table
    tableData.forEach((row, rowIndex) => {
      let validationResult: ValidationResult | null = null

      // Special handling for date rules to ensure they're processed
      if (isDateRule) {
        const value = row[rule.column]
        console.log(`Validating date rule ${rule.name} for row ${rowIndex}, value: ${value}, type: ${typeof value}`)

        // Force validation for date rules
        validationResult = validateDateRule(row, rowIndex, rule)

        if (validationResult) {
          console.log(`Date rule validation failed: ${validationResult.message}`)
          results.push(validationResult)
        } else {
          // For passing date rules, add a passing result
          console.log(`Date rule validation passed for row ${rowIndex}`)

          // Always add passing results for date rules so they can be filtered/displayed as needed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed date validation",
            severity: "success", // Always use "success" for passing rules
            ruleId: rule.id, // Include the rule ID for reference
          })
        }
      }
      // Special handling for composite reference rules
      else if (rule.ruleType === "composite-reference") {
        validationResult = validateCompositeReference(row, rowIndex, rule, datasets)
        if (validationResult) {
          results.push(validationResult)
        }
      }
      // Special handling for reference integrity rules
      else if (rule.ruleType === "reference-integrity") {
        validationResult = validateReferenceIntegrity(row, rowIndex, rule, datasets)
        if (validationResult) {
          results.push(validationResult)
        }
      }
      // Check if we have column conditions
      else if (rule.columnConditions && rule.columnConditions.length > 0) {
        validationResult = validateColumnConditions(row, rowIndex, rule, datasets, valueLists)
        if (validationResult) {
          results.push(validationResult)
        }
      } else {
        // Use the traditional validation approach
        validationResult = validateRule(row, rowIndex, rule, datasets, valueLists)
        if (validationResult) {
          results.push(validationResult)
        }
      }
    })
  })

  // Log validation results for debugging
  const dateResults = results.filter((r) => r.ruleName.includes("date") || r.message.toLowerCase().includes("date"))
  console.log(`Date validation results: ${dateResults.length}`, dateResults)

  return results
}

// New function specifically for date rule validation
function validateDateRule(row: DataRecord, rowIndex: number, rule: DataQualityRule): ValidationResult | null {
  const value = row[rule.column]
  console.log(`validateDateRule called for ${rule.ruleType}, value: ${value}, type: ${typeof value}`)

  let isValid = true
  let message = ""

  // Convert value to Date if it's not already
  let dateValue: Date | null = null

  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string" && value.trim() !== "") {
    try {
      dateValue = new Date(value)
      if (isNaN(dateValue.getTime())) {
        dateValue = null
      }
    } catch (e) {
      dateValue = null
    }
  }

  // For required date fields, null/undefined/empty is invalid
  const isRequired = rule.parameters.required === true

  if (!dateValue) {
    if (isRequired) {
      return {
        rowIndex,
        table: rule.table,
        column: rule.column,
        ruleName: rule.name,
        message: "Date is required and must be valid",
        severity: rule.severity,
        ruleId: rule.id,
      }
    } else {
      // If date is null/undefined/empty and not required, skip validation
      return null
    }
  }

  switch (rule.ruleType) {
    case "date-before":
      if (!rule.parameters.compareDate) {
        isValid = true
        message = "No compare date specified"
      } else {
        const compareDate = new Date(rule.parameters.compareDate)
        const inclusive = rule.parameters.inclusive === true

        isValid = inclusive ? dateValue.getTime() <= compareDate.getTime() : dateValue.getTime() < compareDate.getTime()

        if (!isValid) {
          message = `Date must be ${inclusive ? "on or " : ""}before ${rule.parameters.compareDate}`
        }
      }
      break

    case "date-after":
      if (!rule.parameters.compareDate) {
        isValid = true
        message = "No compare date specified"
      } else {
        const compareDate = new Date(rule.parameters.compareDate)
        const inclusive = rule.parameters.inclusive === true

        isValid = inclusive ? dateValue.getTime() >= compareDate.getTime() : dateValue.getTime() > compareDate.getTime()

        if (!isValid) {
          message = `Date must be ${inclusive ? "on or " : ""}after ${rule.parameters.compareDate}`
        }
      }
      break

    case "date-between":
      if (!rule.parameters.startDate || !rule.parameters.endDate) {
        isValid = true
        message = "Start or end date not specified"
      } else {
        const startDate = new Date(rule.parameters.startDate)
        const endDate = new Date(rule.parameters.endDate)
        const inclusive = rule.parameters.inclusive === true

        isValid = inclusive
          ? dateValue.getTime() >= startDate.getTime() && dateValue.getTime() <= endDate.getTime()
          : dateValue.getTime() > startDate.getTime() && dateValue.getTime() < endDate.getTime()

        if (!isValid) {
          message = `Date must be ${inclusive ? "on or " : ""}between ${rule.parameters.startDate} and ${rule.parameters.endDate}`
        }
      }
      break

    case "date-format":
      // For date objects, format is always valid
      isValid = true
      break

    default:
      isValid = true
  }

  console.log(`Date rule validation result: ${isValid ? "PASS" : "FAIL"}, message: ${message}`)

  if (!isValid) {
    return {
      rowIndex,
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  return null
}

// New function to validate composite reference rules
function validateCompositeReference(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
  datasets: DataTables,
): ValidationResult | null {
  const { parameters, table } = rule
  const { referenceTable, sourceColumns = [], referenceColumns = [], checkType = "exists" } = parameters

  // Skip validation if source columns or reference columns are not defined
  if (!sourceColumns.length || !referenceColumns.length || sourceColumns.length !== referenceColumns.length) {
    return {
      rowIndex,
      table,
      column: sourceColumns[0] || "",
      ruleName: rule.name,
      message: `Invalid composite reference configuration: source and reference columns must be defined and have the same length`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Check if reference table exists
  if (!datasets[referenceTable]) {
    return {
      rowIndex,
      table,
      column: sourceColumns[0],
      ruleName: rule.name,
      message: `Reference table ${referenceTable} not found`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Extract source values from the current row
  const sourceValues = sourceColumns.map((col) => row[col])

  // Skip validation if any source value is null/undefined
  if (sourceValues.some((val) => val === null || val === undefined)) {
    return null
  }

  // Create a map of source column values for easier matching
  const sourceValueMap = new Map()
  sourceColumns.forEach((col, index) => {
    sourceValueMap.set(col, row[col])
  })

  // Check if the combination of values exists in the reference table
  const referenceData = datasets[referenceTable]

  // New approach: Check if any row in the reference table has matching values
  // regardless of column order
  const exists = referenceData.some((refRow) => {
    // For each reference column, check if its value matches the corresponding source column value
    // This is order-independent because we're checking if each reference column has a matching source column
    return (
      referenceColumns.every((refCol) => {
        const refValue = refRow[refCol]

        // Find if any source column has this value
        return sourceColumns.some((sourceCol) => {
          return row[sourceCol] === refValue
        })
      }) &&
      // Also check that we have the same number of unique values
      // This prevents false positives when there are duplicate values
      new Set(sourceValues).size === new Set(referenceColumns.map((col) => refRow[col])).size
    )
  })

  // Determine if the validation passes based on the check type
  const isValid = checkType === "exists" ? exists : !exists

  if (!isValid) {
    // Create a readable representation of the composite key
    const sourceKeyStr = sourceColumns.map((col) => `${col}=${row[col]}`).join(", ")
    const refKeyStr = referenceColumns.map((col) => col).join(", ")

    const message =
      checkType === "exists"
        ? `Composite key (${sourceKeyStr}) does not exist in ${referenceTable} columns (${refKeyStr})`
        : `Composite key (${sourceKeyStr}) should not exist in ${referenceTable} columns (${refKeyStr})`

    return {
      rowIndex,
      table,
      column: sourceColumns[0], // Use the first source column for reporting
      ruleName: rule.name,
      message,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  return null
}

// Function to validate reference integrity rules
function validateReferenceIntegrity(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
  datasets: DataTables,
): ValidationResult | null {
  const { column, parameters, table } = rule
  const { referenceTable, referenceColumn, checkType = "exists" } = parameters

  // Skip validation if source value is null/undefined
  const sourceValue = row[column]
  if (sourceValue === null || sourceValue === undefined) {
    return null
  }

  // Check if reference table exists
  if (!datasets[referenceTable] || !referenceColumn) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: `Reference table ${referenceTable} or column ${referenceColumn} not found`,
      severity: rule.severity,
    }
  }

  // Check if the value exists in the reference table
  const referenceData = datasets[referenceTable]
  const exists = referenceData.some((refRow) => refRow[referenceColumn] === sourceValue)

  // Determine if the validation passes based on the check type
  const isValid = checkType === "exists" ? exists : !exists

  if (!isValid) {
    const message =
      checkType === "exists"
        ? `Value ${sourceValue} in ${column} does not exist in ${referenceTable}.${referenceColumn}`
        : `Value ${sourceValue} in ${column} should not exist in ${referenceTable}.${referenceColumn}`

    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message,
      severity: rule.severity,
    }
  }

  return null
}

// Function to validate multiple column conditions
function validateColumnConditions(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
  datasets: DataTables,
  valueLists: ValueList[],
): ValidationResult | null {
  if (!rule.columnConditions || rule.columnConditions.length === 0) {
    return null
  }

  // Start with the first condition
  const firstCondition = rule.columnConditions[0]
  const firstValue = row[firstCondition.column]

  let isValid = true
  let message = ""
  let failedColumn = firstCondition.column

  // Validate the first condition
  const result = validateSingleColumnCondition(firstValue, row, firstCondition, datasets, valueLists)
  isValid = result.isValid
  message = result.message

  // Process subsequent conditions with their logical operators
  for (let i = 1; i < rule.columnConditions.length; i++) {
    const currentCondition = rule.columnConditions[i]
    const logicalOp = currentCondition.logicalOperator
    const currentValue = row[currentCondition.column]

    const conditionResult = validateSingleColumnCondition(currentValue, row, currentCondition, datasets, valueLists)

    if (logicalOp === "AND") {
      isValid = isValid && conditionResult.isValid
      if (!conditionResult.isValid) {
        message = conditionResult.message
        failedColumn = currentCondition.column
      }
    } else {
      // OR
      isValid = isValid || conditionResult.isValid
      if (isValid) {
        message = ""
      } else {
        message = conditionResult.message
        failedColumn = currentCondition.column
      }
    }
  }

  // If the combined conditions are not valid, return a validation result
  if (!isValid) {
    return {
      rowIndex,
      table: rule.table,
      column: failedColumn, // Use the column that actually failed
      ruleName: rule.name,
      message,
      severity: rule.severity,
    }
  }

  return null
}

// Helper function to validate a single column condition
function validateSingleColumnCondition(
  value: any,
  row: DataRecord,
  condition: ColumnCondition,
  datasets: DataTables,
  valueLists: ValueList[],
): { isValid: boolean; message: string } {
  switch (condition.ruleType) {
    case "required":
      return validateRequired(value)

    case "equals":
      return validateEquals(value, condition.parameters.compareValue)

    case "not-equals":
      return validateNotEquals(value, condition.parameters.compareValue)

    case "greater-than":
      return validateGreaterThan(value, condition.parameters.compareValue)

    case "greater-than-equals":
      return validateGreaterThanEquals(value, condition.parameters.compareValue)

    case "less-than":
      return validateLessThan(value, condition.parameters.compareValue)

    case "less-than-equals":
      return validateLessThanEquals(value, condition.parameters.compareValue)

    case "range":
      return validateRange(value, condition.parameters.min, condition.parameters.max)

    case "regex":
      return validateRegex(value, condition.parameters.pattern)

    case "type":
      return validateType(value, condition.parameters.dataType)

    case "enum":
      return validateEnum(value, condition.parameters.allowedValues)

    case "list":
      return validateList(value, condition.parameters.listId, valueLists)

    case "contains":
      return validateContains(
        value,
        condition.parameters.searchStrings,
        condition.parameters.matchType,
        condition.parameters.caseSensitive,
      )

    case "formula":
      if (condition.parameters.formula) {
        return validateDirectFormula(row, condition.parameters.formula)
      }
      return { isValid: true, message: "" }

    case "date-before":
      return validateDateBefore(value, condition.parameters.compareDate, condition.parameters.inclusive)

    case "date-after":
      return validateDateAfter(value, condition.parameters.compareDate, condition.parameters.inclusive)

    case "date-between":
      return validateDateBetween(
        value,
        condition.parameters.startDate,
        condition.parameters.endDate,
        condition.parameters.inclusive,
      )

    case "date-format":
      return validateDateFormat(value, condition.parameters.format, condition.parameters.customFormat)

    default:
      return { isValid: true, message: "" }
  }
}

function validateRule(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
  datasets: DataTables,
  valueLists: ValueList[],
): ValidationResult | null {
  const value = row[rule.column]

  let isValid = true
  let message = ""

  // First validate the primary rule
  switch (rule.ruleType) {
    case "required":
      ;({ isValid, message } = validateRequired(value))
      break

    case "equals":
      ;({ isValid, message } = validateEquals(value, rule.parameters.compareValue))
      break

    case "not-equals":
      ;({ isValid, message } = validateNotEquals(value, rule.parameters.compareValue))
      break

    case "greater-than":
      ;({ isValid, message } = validateGreaterThan(value, rule.parameters.compareValue))
      break

    case "greater-than-equals":
      ;({ isValid, message } = validateGreaterThanEquals(value, rule.parameters.compareValue))
      break

    case "less-than":
      ;({ isValid, message } = validateLessThan(value, rule.parameters.compareValue))
      break

    case "less-than-equals":
      ;({ isValid, message } = validateLessThanEquals(value, rule.parameters.compareValue))
      break

    case "range":
      ;({ isValid, message } = validateRange(value, rule.parameters.min, rule.parameters.max))
      break

    case "regex":
      ;({ isValid, message } = validateRegex(value, rule.parameters.pattern))
      break

    case "unique":
      // Note: This would need the full dataset to validate uniqueness
      isValid = true
      break

    case "type":
      ;({ isValid, message } = validateType(value, rule.parameters.dataType))
      break

    case "enum":
      ;({ isValid, message } = validateEnum(value, rule.parameters.allowedValues))
      break

    case "list":
      ;({ isValid, message } = validateList(value, rule.parameters.listId, valueLists))
      break

    case "contains":
      ;({ isValid, message } = validateContains(
        value,
        rule.parameters.searchStrings,
        rule.parameters.matchType,
        rule.parameters.caseSensitive,
      ))
      break

    case "dependency":
      ;({ isValid, message } = validateDependency(value, row[rule.parameters.dependsOn], rule.parameters.condition))
      break

    case "multi-column":
      ;({ isValid, message } = validateMultiColumn(row, rule.conditions || []))
      break

    case "lookup":
      ;({ isValid, message } = validateLookup(
        row,
        rule.column,
        rule.parameters.lookupTable,
        rule.parameters.lookupColumn,
        rule.parameters.validation,
        datasets,
      ))
      break

    case "custom":
      ;({ isValid, message } = validateCustom(value, row, rule.parameters.functionBody, datasets))
      break

    case "formula":
      // Check if we're using comparison or direct boolean evaluation
      if (rule.parameters.useComparison === true && rule.parameters.operator && rule.parameters.value !== undefined) {
        // Use comparison operator
        ;({ isValid, message } = validateFormula(
          row,
          rule.parameters.formula,
          rule.parameters.operator,
          rule.parameters.value,
        ))
      } else {
        // Direct boolean evaluation
        ;({ isValid, message } = validateDirectFormula(row, rule.parameters.formula))
      }
      break

    case "date-before":
    case "date-after":
    case "date-between":
    case "date-format":
      // Date rules are handled separately in validateDateRule
      return null

    default:
      isValid = true
  }

  // If the primary rule passes, check additional conditions if they exist
  if (isValid && rule.additionalConditions && rule.additionalConditions.length > 0) {
    const additionalResult = validateMultiColumn(row, rule.additionalConditions)
    isValid = additionalResult.isValid
    if (!isValid) {
      message = additionalResult.message
    }
  }

  // If still valid, check cross-table conditions if they exist
  if (isValid && rule.crossTableConditions && rule.crossTableConditions.length > 0) {
    const crossTableResult = validateCrossTableConditions(row, rule.crossTableConditions, datasets)
    isValid = crossTableResult.isValid
    if (!isValid) {
      message = crossTableResult.message
    }
  }

  if (!isValid) {
    return {
      rowIndex,
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message,
      severity: rule.severity,
    }
  }

  return null
}

// New validation functions for the comparison rule types
function validateEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof compareValue === "number" && typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }

  const isValid = value == compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must equal ${compareValue}`,
  }
}

function validateNotEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof compareValue === "number" && typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }

  const isValid = value != compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must not equal ${compareValue}`,
  }
}

function validateGreaterThan(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }
  if (typeof compareValue === "string") {
    const numValue = Number(compareValue)
    if (!isNaN(numValue)) {
      compareValue = numValue
    }
  }

  if (typeof value !== "number" || typeof compareValue !== "number") {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} > ${compareValue}`,
    }
  }

  const isValid = value > compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be greater than ${compareValue}`,
  }
}

function validateGreaterThanEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }
  if (typeof compareValue === "string") {
    const numValue = Number(compareValue)
    if (!isNaN(numValue)) {
      compareValue = numValue
    }
  }

  if (typeof value !== "number" || typeof compareValue !== "number") {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} >= ${compareValue}`,
    }
  }

  const isValid = value >= compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be greater than or equal to ${compareValue}`,
  }
}

function validateLessThan(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }
  if (typeof compareValue === "string") {
    const numValue = Number(compareValue)
    if (!isNaN(numValue)) {
      compareValue = numValue
    }
  }

  if (typeof value !== "number" || typeof compareValue !== "number") {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} < ${compareValue}`,
    }
  }

  const isValid = value < compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be less than ${compareValue}`,
  }
}

function validateLessThanEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Handle type conversion for numeric comparisons
  if (typeof value === "string") {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      value = numValue
    }
  }
  if (typeof compareValue === "string") {
    const numValue = Number(compareValue)
    if (!isNaN(numValue)) {
      compareValue = numValue
    }
  }

  if (typeof value !== "number" || typeof compareValue !== "number") {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} <= ${compareValue}`,
    }
  }

  const isValid = value <= compareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be less than or equal to ${compareValue}`,
  }
}

// Function for validating cross-table conditions
function validateCrossTableConditions(
  row: DataRecord,
  conditions: CrossTableCondition[],
  datasets: DataTables,
): { isValid: boolean; message: string } {
  if (!conditions || conditions.length === 0) {
    return { isValid: true, message: "" }
  }

  // Start with the first condition
  const firstCondition = conditions[0]
  let result: { isValid: boolean; message: string }

  // Check if the referenced table exists
  if (!datasets[firstCondition.table]) {
    return { isValid: false, message: `Referenced table ${firstCondition.table} not found` }
  }

  // For cross-table conditions, we need to check if ANY row in the referenced table meets the condition
  // This is a common pattern for cross-table validation
  const tableData = datasets[firstCondition.table]

  // Evaluate the first condition against all rows in the referenced table
  let foundMatch = false
  for (const targetRow of tableData) {
    result = evaluateCondition(targetRow[firstCondition.column], firstCondition)
    if (result.isValid) {
      foundMatch = true
      break
    }
  }

  let isValid = foundMatch
  let message = foundMatch
    ? ""
    : `No matching record found in ${firstCondition.table} for condition on ${firstCondition.column}`

  // Process subsequent conditions with their logical operators
  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1]
    const currentCondition = conditions[i]
    const logicalOp = prevCondition.logicalOperator || "AND"

    // Check if the referenced table exists
    if (!datasets[currentCondition.table]) {
      return { isValid: false, message: `Referenced table ${currentCondition.table} not found` }
    }

    // Evaluate the current condition against all rows in its referenced table
    const tableData = datasets[currentCondition.table]
    foundMatch = false

    for (const targetRow of tableData) {
      result = evaluateCondition(targetRow[currentCondition.column], currentCondition)
      if (result.isValid) {
        foundMatch = true
        break
      }
    }

    if (logicalOp === "AND") {
      isValid = isValid && foundMatch
      if (!foundMatch) {
        message = `No matching record found in ${currentCondition.table} for condition on ${currentCondition.column}`
      }
    } else {
      // OR
      isValid = isValid || foundMatch
      if (isValid) {
        message = ""
      } else {
        message = `No matching record found in ${currentCondition.table} for condition on ${currentCondition.column}`
      }
    }
  }

  return { isValid, message }
}

// Function for validating multi-column rules with AND/OR logic
function validateMultiColumn(row: DataRecord, conditions: Condition[]): { isValid: boolean; message: string } {
  if (!conditions || conditions.length === 0) {
    return { isValid: true, message: "" }
  }

  // Start with the first condition
  let result = evaluateCondition(row[conditions[0].column], conditions[0])
  let isValid = result.isValid
  let message = result.message

  // Process subsequent conditions with their logical operators
  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1]
    const currentCondition = conditions[i]
    const logicalOp = prevCondition.logicalOperator || "AND"

    result = evaluateCondition(row[currentCondition.column], currentCondition)

    if (logicalOp === "AND") {
      isValid = isValid && result.isValid
      if (!result.isValid) {
        message = result.message
      }
    } else {
      // OR
      isValid = isValid || result.isValid
      if (isValid) {
        message = ""
      } else {
        message = result.message
      }
    }
  }

  return { isValid, message }
}

// Helper function to evaluate a single condition
function evaluateCondition(value: any, condition: Condition): { isValid: boolean; message: string } {
  const { operator, value: expectedValue, column } = condition

  // Special handling for blank checks
  if (operator === "is-blank") {
    const isBlank = value === null || value === undefined || value === ""
    return {
      isValid: isBlank,
      message: isBlank ? "" : `${column} should be blank`,
    }
  }

  if (operator === "is-not-blank") {
    const isNotBlank = value !== null && value !== undefined && value !== ""
    return {
      isValid: isNotBlank,
      message: isNotBlank ? "" : `${column} should not be blank`,
    }
  }

  switch (operator) {
    case "==":
      return {
        isValid: value == expectedValue,
        message: value == expectedValue ? "" : `${column} should equal ${expectedValue}`,
      }
    case "!=":
      return {
        isValid: value != expectedValue,
        message: value != expectedValue ? "" : `${column} should not equal ${expectedValue}`,
      }
    case ">":
      return {
        isValid: value > expectedValue,
        message: value > expectedValue ? "" : `${column} should be greater than ${expectedValue}`,
      }
    case ">=":
      return {
        isValid: value >= expectedValue,
        message: value >= expectedValue ? "" : `${column} should be greater than or equal to ${expectedValue}`,
      }
    case "<":
      return {
        isValid: value < expectedValue,
        message: value < expectedValue ? "" : `${column} should be less than ${expectedValue}`,
      }
    case "<=":
      return {
        isValid: value <= expectedValue,
        message: value <= expectedValue ? "" : `${column} should be less than or equal to ${expectedValue}`,
      }
    case "contains":
      return {
        isValid: typeof value === "string" && value.includes(String(expectedValue)),
        message:
          typeof value === "string" && value.includes(String(expectedValue))
            ? ""
            : `${column} should contain ${expectedValue}`,
      }
    case "not-contains":
      return {
        isValid: typeof value === "string" && !value.includes(String(expectedValue)),
        message:
          typeof value === "string" && !value.includes(String(expectedValue))
            ? ""
            : `${column} should not contain ${expectedValue}`,
      }
    case "starts-with":
      return {
        isValid: typeof value === "string" && value.startsWith(String(expectedValue)),
        message:
          typeof value === "string" && value.startsWith(String(expectedValue))
            ? ""
            : `${column} should start with ${expectedValue}`,
      }
    case "ends-with":
      return {
        isValid: typeof value === "string" && value.endsWith(String(expectedValue)),
        message:
          typeof value === "string" && value.endsWith(String(expectedValue))
            ? ""
            : `${column} should end with ${expectedValue}`,
      }
    case "matches":
      try {
        const regex = new RegExp(String(expectedValue))
        const matches = typeof value === "string" && regex.test(value)
        return {
          isValid: matches,
          message: matches ? "" : `${column} should match pattern ${expectedValue}`,
        }
      } catch (error) {
        return { isValid: false, message: `Invalid regex pattern: ${error}` }
      }
    default:
      return { isValid: true, message: "" }
  }
}

function validateRequired(value: any): { isValid: boolean; message: string } {
  const isValid = value !== null && value !== undefined && value !== ""
  return {
    isValid,
    message: isValid ? "" : "Field is required",
  }
}

function validateRange(value: any, min?: number, max?: number): { isValid: boolean; message: string } {
  if (value === null || value === undefined) {
    return { isValid: true, message: "" }
  }

  if (typeof value !== "number") {
    return {
      isValid: false,
      message: `Value must be a number, got ${typeof value}`,
    }
  }

  let isValid = true
  let message = ""

  if (min !== undefined && value < min) {
    isValid = false
    message = `Value ${value} is less than minimum ${min}`
  } else if (max !== undefined && value > max) {
    isValid = false
    message = `Value ${value} is greater than maximum ${max}`
  }

  return { isValid, message }
}

function validateRegex(value: any, pattern?: string): { isValid: boolean; message: string } {
  if (!pattern || value === null || value === undefined) {
    return { isValid: true, message: "" }
  }

  if (typeof value !== "string") {
    return {
      isValid: false,
      message: `Value must be a string for regex validation, got ${typeof value}`,
    }
  }

  try {
    const regex = new RegExp(pattern)
    const isValid = regex.test(value)
    return {
      isValid,
      message: isValid ? "" : `Value does not match pattern ${pattern}`,
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Invalid regex pattern: ${error}`,
    }
  }
}

function validateType(value: any, expectedType?: string): { isValid: boolean; message: string } {
  if (!expectedType || value === null || value === undefined) {
    return { isValid: true, message: "" }
  }

  let isValid = false

  switch (expectedType) {
    case "string":
      isValid = typeof value === "string"
      break
    case "number":
      isValid = typeof value === "number"
      break
    case "boolean":
      isValid = typeof value === "boolean"
      break
    case "date":
      isValid = value instanceof Date
      break
    case "object":
      isValid = typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value)
      break
    case "array":
      isValid = Array.isArray(value)
      break
    default:
      isValid = true
  }

  return {
    isValid,
    message: isValid ? "" : `Expected type ${expectedType}, got ${typeof value}`,
  }
}

function validateEnum(value: any, allowedValues?: any[]): { isValid: boolean; message: string } {
  if (!allowedValues || value === null || value === undefined) {
    return { isValid: true, message: "" }
  }

  const isValid = allowedValues.includes(value)
  return {
    isValid,
    message: isValid ? "" : `Value must be one of: ${allowedValues.join(", ")}`,
  }
}

function validateList(
  value: any,
  listId?: string,
  valueLists: ValueList[] = [],
): { isValid: boolean; message: string } {
  if (!listId || value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  const list = valueLists.find((l) => l.id === listId)
  if (!list) {
    return { isValid: false, message: `List with ID ${listId} not found` }
  }

  const isValid = list.values.includes(String(value))
  return {
    isValid,
    message: isValid ? "" : `Value must be one of the values in the "${list.name}" list`,
  }
}

function validateDependency(
  value: any,
  dependsOnValue: any,
  condition?: string,
): { isValid: boolean; message: string } {
  if (!condition) {
    return { isValid: true, message: "" }
  }

  try {
    // Create a function from the condition string
    const evalFunc = new Function("value", "dependsOnValue", `return ${condition};`)

    const isValid = evalFunc(value, dependsOnValue)
    return {
      isValid,
      message: isValid ? "" : `Dependency condition not met: ${condition}`,
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Invalid dependency condition: ${error}`,
    }
  }
}

function validateLookup(
  row: any,
  column: string,
  lookupTable?: string,
  lookupColumn?: string,
  validation?: string,
  datasets?: DataTables,
): { isValid: boolean; message: string } {
  if (!lookupTable || !lookupColumn || !datasets) {
    return { isValid: true, message: "" }
  }

  const lookupData = datasets[lookupTable]
  if (!lookupData || lookupData.length === 0) {
    return { isValid: false, message: `Lookup table ${lookupTable} not found or empty` }
  }

  // Extract all values from the lookup column
  const lookupValues = lookupData.map((r) => r[lookupColumn])

  if (validation) {
    try {
      // Create a function from the validation string
      const validationFunc = new Function("value", "lookupValues", "column", `return ${validation};`)

      // Validate
      const isValid = validationFunc(row, lookupValues, column)
      return {
        isValid,
        message: isValid ? "" : `Lookup validation failed: ${validation}`,
      }
    } catch (error) {
      return {
        isValid: false,
        message: `Invalid lookup validation: ${error}`,
      }
    }
  } else {
    // Default validation: check if the value exists in the lookup values
    const isValid = lookupValues.includes(row[column])
    return {
      isValid,
      message: isValid ? "" : `Value not found in lookup table ${lookupTable}, column ${lookupColumn}`,
    }
  }
}

function validateCustom(
  value: any,
  row: any,
  functionBody?: string,
  datasets?: DataTables,
): { isValid: boolean; message: string } {
  if (!functionBody) {
    return { isValid: true, message: "" }
  }

  try {
    // Create a function from the function body
    const customFunc = new Function("value", "row", "datasets", functionBody)

    // Execute the custom validation function
    const result = customFunc(value, row, datasets)

    // Handle different return types
    if (typeof result === "boolean") {
      return {
        isValid: result,
        message: result ? "" : "Custom validation failed",
      }
    } else if (typeof result === "object" && result !== null) {
      return {
        isValid: result.isValid !== undefined ? result.isValid : true,
        message: result.message || (result.isValid ? "" : "Custom validation failed"),
      }
    } else {
      return {
        isValid: Boolean(result),
        message: Boolean(result) ? "" : "Custom validation failed",
      }
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Error in custom validation: ${error}`,
    }
  }
}

function validateContains(
  value: any,
  searchStrings?: string[],
  matchType: "any" | "all" = "any",
  caseSensitive = false,
): { isValid: boolean; message: string } {
  if (!searchStrings || searchStrings.length === 0 || value === null || value === undefined) {
    return { isValid: true, message: "" }
  }

  if (typeof value !== "string") {
    return {
      isValid: false,
      message: `Value must be a string for contains validation, got ${typeof value}`,
    }
  }

  const stringValue = String(value)
  let valueToCheck = stringValue
  let searchTerms = [...searchStrings]

  // Handle case sensitivity
  if (!caseSensitive) {
    valueToCheck = stringValue.toLowerCase()
    searchTerms = searchTerms.map((term) => term.toLowerCase())
  }

  if (matchType === "all") {
    // Check if ALL search strings are present
    const isValid = searchTerms.every((term) => valueToCheck.includes(term))
    return {
      isValid,
      message: isValid ? "" : `Value must contain all of: ${searchStrings.join(", ")}`,
    }
  } else {
    // Check if ANY search string is present (default)
    const isValid = searchTerms.some((term) => valueToCheck.includes(term))
    return {
      isValid,
      message: isValid ? "" : `Value must contain at least one of: ${searchStrings.join(", ")}`,
    }
  }
}

// Add the validateFormula function
function validateFormula(
  row: DataRecord,
  formula?: string,
  operator?: string,
  value?: number,
): { isValid: boolean; message: string } {
  if (!formula || operator === undefined || value === undefined) {
    return { isValid: true, message: "" }
  }

  try {
    // Replace column references with actual values
    let evalFormula = formula
    const columnNames = Object.keys(row).sort((a, b) => b.length - a.length) // Sort by length descending to avoid partial replacements

    for (const columnName of columnNames) {
      const columnRegex = new RegExp(`\\b${columnName}\\b`, "g")
      evalFormula = evalFormula.replace(
        columnRegex,
        String(row[columnName] === null || row[columnName] === undefined ? "null" : row[columnName]),
      )
    }

    // Evaluate the formula
    const result = new Function(`return ${evalFormula};`)()

    if (typeof result !== "number") {
      return {
        isValid: false,
        message: `Formula result is not a number: ${result}`,
      }
    }

    // Compare the result with the expected value using the specified operator
    let isValid = false
    switch (operator) {
      case "==":
        isValid = result === value
        break
      case "!=":
        isValid = result !== value
        break
      case ">":
        isValid = result > value
        break
      case ">=":
        isValid = result >= value
        break
      case "<":
        isValid = result < value
        break
      case "<=":
        isValid = result <= value
        break
      default:
        isValid = false
    }

    return {
      isValid,
      message: isValid ? "" : `Formula result ${result} ${operator} ${value} is false`,
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Error evaluating formula: ${error}`,
    }
  }
}

// Add a new function for direct formula evaluation (without comparison)
function validateDirectFormula(row: DataRecord, formula?: string): { isValid: boolean; message: string } {
  if (!formula) {
    return { isValid: true, message: "" }
  }

  try {
    // Replace column references with actual values
    let evalFormula = formula
    const columnNames = Object.keys(row).sort((a, b) => b.length - a.length) // Sort by length descending

    for (const columnName of columnNames) {
      const columnRegex = new RegExp(`\\b${columnName}\\b`, "g")
      evalFormula = evalFormula.replace(
        columnRegex,
        String(row[columnName] === null || row[columnName] === undefined ? "null" : row[columnName]),
      )
    }

    // Evaluate the formula
    const result = new Function(`return ${evalFormula};`)()

    // Convert the result to a boolean if it's not already
    const boolResult = Boolean(result)

    // Create a detailed message that includes the formula and the calculated values
    let detailedMessage = ""
    if (!boolResult) {
      // For formulas with comparisons, try to extract the left and right sides
      const comparisonOperators = [">=", "<=", ">", "<", "==", "!=", "===", "!=="]
      let comparisonFound = false

      for (const op of comparisonOperators) {
        if (formula.includes(op)) {
          const parts = formula.split(op)
          if (parts.length === 2) {
            // Create a more detailed message with the calculation
            let leftSide = parts[0].trim()
            let rightSide = parts[1].trim()

            // Try to evaluate each side separately
            try {
              const leftEval = ""
              const rightEval = ""

              // Replace column references with values for display
              for (const columnName of columnNames) {
                const columnRegex = new RegExp(`\\b${columnName}\\b`, "g")
                leftSide = leftSide.replace(columnRegex, `${columnName}(${row[columnName]})`)
                rightSide = rightSide.replace(columnRegex, `${columnName}(${row[columnName]})`)
              }

              detailedMessage =
                `Formula evaluated to false: ${formula} (Result: ${result})\n` +
                `Calculation: ${leftSide} ${op} ${rightSide}`
              comparisonFound = true
              break
            } catch (evalError) {
              // If evaluation fails, use the default message
            }
          }
        }
      }

      if (!comparisonFound) {
        detailedMessage = `Formula evaluated to false: ${formula} (Result: ${result})`
      }
    }

    return {
      isValid: boolResult,
      message: boolResult ? "" : detailedMessage,
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Error evaluating formula: ${error}`,
    }
  }
}

// Add these functions to handle date validation
function validateDateBefore(
  value: any,
  compareDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("validateDateBefore called with:", { value, compareDate, inclusive })

  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Convert value to Date if it's not already
  let dateValue: Date
  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string") {
    // Try to parse the date string
    dateValue = new Date(value)
  } else {
    return {
      isValid: false,
      message: `Value must be a valid date, got ${typeof value}: ${value}`,
    }
  }

  if (isNaN(dateValue.getTime())) {
    return {
      isValid: false,
      message: `Value must be a valid date, got invalid date: ${value}`,
    }
  }

  if (!compareDate) {
    return { isValid: true, message: "" }
  }

  const targetDate = new Date(compareDate)

  if (isNaN(targetDate.getTime())) {
    return {
      isValid: false,
      message: `Compare date is invalid: ${compareDate}`,
    }
  }

  const isValid = inclusive ? dateValue.getTime() <= targetDate.getTime() : dateValue.getTime() < targetDate.getTime()

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateBefore result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    targetDate: targetDate.toISOString(),
    comparison: `${dateValue.getTime()} ${inclusive ? "<=" : "<"} ${targetDate.getTime()}`,
  })

  return {
    isValid,
    message: isValid ? "" : `Date ${formattedDate} must be ${inclusive ? "on or " : ""}before ${compareDate}`,
  }
}

function validateDateAfter(
  value: any,
  compareDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("validateDateAfter called with:", { value, compareDate, inclusive })

  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Convert value to Date if it's not already
  let dateValue: Date
  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string") {
    // Try to parse the date string
    dateValue = new Date(value)
  } else {
    return {
      isValid: false,
      message: `Value must be a valid date, got ${typeof value}: ${value}`,
    }
  }

  if (isNaN(dateValue.getTime())) {
    return {
      isValid: false,
      message: `Value must be a valid date, got invalid date: ${value}`,
    }
  }

  if (!compareDate) {
    return { isValid: true, message: "" }
  }

  const targetDate = new Date(compareDate)

  if (isNaN(targetDate.getTime())) {
    return {
      isValid: false,
      message: `Compare date is invalid: ${compareDate}`,
    }
  }

  const isValid = inclusive ? dateValue.getTime() >= targetDate.getTime() : dateValue.getTime() > targetDate.getTime()

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateAfter result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    targetDate: targetDate.toISOString(),
    comparison: `${dateValue.getTime()} ${inclusive ? ">=" : ">"} ${targetDate.getTime()}`,
  })

  return {
    isValid,
    message: isValid ? "" : `Date ${formattedDate} must be ${inclusive ? "on or " : ""}after ${compareDate}`,
  }
}

function validateDateBetween(
  value: any,
  startDate?: string,
  endDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("validateDateBetween called with:", { value, startDate, endDate, inclusive })

  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Convert value to Date if it's not already
  let dateValue: Date
  if (value instanceof Date) {
    dateValue = value
  } else if (typeof value === "string") {
    // Try to parse the date string
    dateValue = new Date(value)
  } else {
    return {
      isValid: false,
      message: `Value must be a valid date, got ${typeof value}: ${value}`,
    }
  }

  if (isNaN(dateValue.getTime())) {
    return {
      isValid: false,
      message: `Value must be a valid date, got invalid date: ${value}`,
    }
  }

  if (!startDate || !endDate) {
    return { isValid: true, message: "" }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      message: `One of the comparison dates is invalid: ${startDate} - ${endDate}`,
    }
  }

  const valueTime = dateValue.getTime()
  const isValid = inclusive
    ? valueTime >= start.getTime() && valueTime <= end.getTime()
    : valueTime > start.getTime() && valueTime < end.getTime()

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateBetween result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    comparison: `${start.getTime()} ${inclusive ? "<=" : "<"} ${valueTime} ${inclusive ? "<=" : "<"} ${end.getTime()}`,
  })

  return {
    isValid,
    message: isValid
      ? ""
      : `Date ${formattedDate} must be ${inclusive ? "on or " : ""}between ${startDate} and ${endDate}`,
  }
}

function validateDateFormat(value: any, format?: string, customFormat?: string): { isValid: boolean; message: string } {
  console.log("validateDateFormat called with:", { value, format, customFormat })

  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // For Date objects, we're checking if they would format correctly
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return {
        isValid: false,
        message: "Date is invalid",
      }
    }

    // Date objects are always valid for format checking
    return { isValid: true, message: "" }
  }

  // If it's not a Date object, check if it's a string in the right format
  if (typeof value !== "string") {
    return {
      isValid: false,
      message: `Value must be a string for format validation, got ${typeof value}: ${value}`,
    }
  }

  let regex: RegExp
  let formatDescription: string

  switch (format) {
    case "iso":
      regex = /^\d{4}-\d{2}-\d{2}$/
      formatDescription = "YYYY-MM-DD"
      break
    case "us":
      regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/
      formatDescription = "MM/DD/YYYY"
      break
    case "eu":
      regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/
      formatDescription = "DD/MM/YYYY"
      break
    case "custom":
      if (!customFormat) {
        return {
          isValid: false,
          message: "Custom format not specified",
        }
      }
      // Convert the custom format to a regex
      // This is a simplified version - a real implementation would be more complex
      const regexStr = customFormat
        .replace(/YYYY/g, "\\d{4}")
        .replace(/MM/g, "\\d{2}")
        .replace(/DD/g, "\\d{2}")
        .replace(/HH/g, "\\d{2}")
        .replace(/mm/g, "\\d{2}")
        .replace(/ss/g, "\\d{2}")
      regex = new RegExp(`^${regexStr}$`)
      formatDescription = customFormat
      break
    default:
      return {
        isValid: false,
        message: `Unknown format: ${format}`,
      }
  }

  const isValid = regex.test(value)

  console.log("validateDateFormat result:", { isValid, regex: regex.toString(), value })

  return {
    isValid,
    message: isValid ? "" : `Date must be in ${formatDescription} format`,
  }
}
