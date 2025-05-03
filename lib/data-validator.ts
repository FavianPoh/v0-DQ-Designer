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

// Add this function at the top of the file
function debugObject(obj: any, label = "Debug"): void {
  console.log(`--- ${label} ---`)
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      console.log(`${key}: ${JSON.stringify(obj[key])}`)
    }
  }
  console.log("---------------")
}

// Add this function right after the debugObject function at the top of the file
function debugRule(rule: DataQualityRule, label = "Rule Debug") {
  console.log(`=== ${label} ===`)
  console.log(`ID: ${rule.id}`)
  console.log(`Name: ${rule.name}`)
  console.log(`Type: ${rule.ruleType}`)
  console.log(`Table: ${rule.table || rule.tableName}`)
  console.log(`Column: ${rule.column}`)
  console.log(`Parameters:`, rule.parameters)
  console.log(`Enabled: ${rule.enabled}`)
  console.log("=================")
}

// Add this function to the data-validator.ts file, near the top with the other debug functions

function validateDateRuleWithSafeguards(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
): ValidationResult | null {
  console.log("=== Safe Date Rule Validation ===")
  console.log("Rule:", {
    id: rule.id,
    name: rule.name,
    table: rule.table,
    column: rule.column,
    ruleType: rule.ruleType,
    parameters: rule.parameters,
  })

  // CRITICAL: Check if column is defined
  if (!rule.column) {
    console.error(`CRITICAL ERROR: Missing column for date rule: ${rule.name} [ID: ${rule.id}]`)
    return {
      rowIndex,
      table: rule.table,
      column: "",
      ruleName: rule.name,
      message: `Configuration error: Missing column name for date rule`,
      severity: "failure",
      ruleId: rule.id,
    }
  }

  // Check if column exists in the row
  if (!(rule.column in row)) {
    console.error(`Column "${rule.column}" not found in row for rule: ${rule.name} [ID: ${rule.id}]`)
    console.log("Available columns:", Object.keys(row))
    return {
      rowIndex,
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message: `Column "${rule.column}" not found in data`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  const value = row[rule.column]
  console.log(`Date value for column ${rule.column}:`, value, typeof value)

  // If the value is undefined or null, we can't validate it as a date
  if (value === undefined || value === null || value === "") {
    // For required date fields, null/undefined/empty is invalid
    const isRequired = rule.parameters.required === true
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

  // Convert value to Date if it's not already
  let dateValue: Date | null = null

  if (value instanceof Date) {
    dateValue = new Date(value) // Create a copy to avoid modifying the original
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

  let isValid = true
  let message = ""

  switch (rule.ruleType) {
    case "date-before":
      if (!rule.parameters.compareDate) {
        isValid = true
        message = "No compare date specified"
      } else {
        const compareDate = new Date(rule.parameters.compareDate)

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const compareDateCopy = new Date(compareDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const compareDateTime = new Date(compareDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true
        isValid = inclusive ? dateValueTime <= compareDateTime : dateValueTime < compareDateTime

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

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const compareDateCopy = new Date(compareDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const compareDateTime = new Date(compareDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true
        isValid = inclusive ? dateValueTime >= compareDateTime : dateValueTime > compareDateTime

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

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const startDateCopy = new Date(startDate.getTime())
        const endDateCopy = new Date(endDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const startDateTime = new Date(startDateCopy.setHours(0, 0, 0, 0)).getTime()
        const endDateTime = new Date(endDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true

        isValid = inclusive
          ? dateValueTime >= startDateTime && dateValueTime <= endDateTime
          : dateValueTime > startDateTime && dateValueTime < endDateTime

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

  // If validation fails, return a validation result with the appropriate severity
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

  // For successful validations, return a success result
  return {
    rowIndex,
    table: rule.table,
    column: rule.column,
    ruleName: rule.name,
    message: "Passed date validation",
    severity: "success",
    ruleId: rule.id,
  }
}

export function validateDataset(
  datasets: DataTables,
  rules: DataQualityRule[],
  valueLists: ValueList[] = [],
): ValidationResult[] {
  const results: ValidationResult[] = []

  // Process each rule
  rules.forEach((rule) => {
    // Skip disabled rules
    if (rule.enabled === false) {
      return
    }

    // Add debug info for date rules
    if (rule.ruleType.startsWith("date-")) {
      debugObject(rule, `Date Rule: ${rule.name}`)
    }

    const tableData = datasets[rule.table]
    if (!tableData) {
      console.log(`Table ${rule.table} not found for rule ${rule.name}`)
      return
    }

    // Process each row in the table
    tableData.forEach((row, rowIndex) => {
      let validationResult: ValidationResult | null = null

      // Special handling for date rules - REPLACE THIS SECTION
      if (rule.ruleType.startsWith("date-")) {
        validationResult = validateDateRuleWithSafeguards(row, rowIndex, rule)
        if (validationResult) {
          results.push(validationResult)
        }
        return // Skip the rest of the processing for date rules
      }

      // Special handling for column comparison rules
      if (rule.ruleType === "column-comparison") {
        validationResult = validateColumnComparison(row, rowIndex, rule)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
      // Special handling for math operation rules
      else if (rule.ruleType === "math-operation") {
        validationResult = validateMathOperation(row, rowIndex, rule)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
      // Special handling for composite reference rules
      else if (rule.ruleType === "composite-reference") {
        validationResult = validateCompositeReference(row, rowIndex, rule, datasets)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
      // Special handling for reference integrity rules
      else if (rule.ruleType === "reference-integrity") {
        validationResult = validateReferenceIntegrity(row, rowIndex, rule, datasets)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
      // Check if we have column conditions
      else if (rule.columnConditions && rule.columnConditions.length > 0) {
        validationResult = validateColumnConditions(row, rowIndex, rule, datasets, valueLists)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
      // Special handling for rules with cross-table conditions
      else if (rule.crossTableConditions && rule.crossTableConditions.length > 0) {
        const crossTableResult = validateCrossTableConditions(row, rule.crossTableConditions, datasets)
        if (!crossTableResult.isValid) {
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: crossTableResult.message,
            severity: rule.severity,
            ruleId: rule.id,
          })
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed cross-table validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      } else {
        // Use the traditional validation approach
        validationResult = validateRule(row, rowIndex, rule, datasets, valueLists)
        if (validationResult) {
          results.push(validationResult)
        } else {
          // Add a passing result if validation passed
          results.push({
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message: "Passed validation",
            severity: "success",
            ruleId: rule.id,
          })
        }
      }
    })
  })

  return results
}

// Enhanced function to validate column comparison rules
function validateColumnComparison(row: DataRecord, rowIndex: number, rule: DataQualityRule): ValidationResult | null {
  const { parameters, table, column } = rule
  const { leftColumn, rightColumn, comparisonOperator, allowNull } = parameters

  // Ensure we have all required parameters
  if (!leftColumn || !rightColumn || !comparisonOperator) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: "Missing required parameters for column comparison",
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Get the values from the row
  const leftValue = row[leftColumn]
  const rightValue = row[rightColumn]

  // Handle null values if allowNull is true
  if (
    allowNull === true &&
    (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined)
  ) {
    // Skip validation if either value is null and allowNull is true
    return null
  }

  // Check for null values if allowNull is false
  if (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: `Cannot compare null values: ${leftColumn}=${leftValue} ${comparisonOperator} ${rightColumn}=${rightValue}`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Try to convert string values to numbers if both can be converted
  const canConvertLeft = typeof leftValue === "string" && !isNaN(Number(leftValue))
  const canConvertRight = typeof rightValue === "string" && !isNaN(Number(rightValue))

  // Values to use for comparison
  let leftCompare = leftValue
  let rightCompare = rightValue

  // If both values can be converted to numbers, convert them
  if (canConvertLeft && canConvertRight) {
    leftCompare = Number(leftValue)
    rightCompare = Number(rightValue)
  }
  // If we're comparing dates, convert to Date objects
  else if (
    (leftValue instanceof Date || (typeof leftValue === "string" && !isNaN(Date.parse(leftValue)))) &&
    (rightValue instanceof Date || (typeof rightValue === "string" && !isNaN(Date.parse(rightValue))))
  ) {
    leftCompare = leftValue instanceof Date ? leftValue : new Date(leftValue)
    rightCompare = rightValue instanceof Date ? rightValue : new Date(rightValue)

    // Convert to timestamps for comparison
    leftCompare = leftCompare.getTime()
    rightCompare = rightCompare.getTime()
  }

  // For string comparisons, ensure both values are strings
  else if (typeof leftValue === "string" || typeof rightValue === "string") {
    leftCompare = String(leftValue)
    rightCompare = String(rightValue)
  }

  // Perform the comparison
  let isValid = false
  switch (comparisonOperator) {
    case "==":
      isValid = leftCompare === rightCompare
      break
    case "!=":
      isValid = leftCompare !== rightCompare
      break
    case ">":
      isValid = leftCompare > rightCompare
      break
    case ">=":
      isValid = leftCompare >= rightCompare
      break
    case "<":
      isValid = leftCompare < rightCompare
      break
    case "<=":
      isValid = leftCompare <= rightCompare
      break
    default:
      isValid = false
  }

  // If the validation fails, return a result
  if (!isValid) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: `Column comparison failed: ${leftColumn} (${leftValue}) ${comparisonOperator} ${rightColumn} (${rightValue})`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Validation passed
  return null
}

// Function to validate math operation rules
function validateMathOperation(row: DataRecord, rowIndex: number, rule: DataQualityRule): ValidationResult | null {
  const { parameters, table, column } = rule
  const { operation, operands, comparisonOperator, comparisonValue } = parameters as any

  if (!operation || !operands || !comparisonOperator || comparisonValue === undefined) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: "Missing required parameters for math operation",
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Collect operand values
  const operandValues: number[] = []
  let invalidOperandFound = false
  let invalidOperandMessage = ""

  for (let i = 0; i < operands.length; i++) {
    const operand = operands[i]

    if (operand.type === "constant") {
      // For constants, just use the value directly
      operandValues.push(Number(operand.value))
    } else if (operand.type === "column") {
      // For columns, get the value from the row
      const columnName = operand.value as string
      const columnValue = row[columnName]

      // Convert to number
      const numValue = typeof columnValue === "string" ? Number.parseFloat(columnValue) : columnValue

      if (typeof numValue !== "number" || isNaN(numValue)) {
        invalidOperandFound = true
        invalidOperandMessage = `Invalid value for operand ${i + 1}: Column "${columnName}" has non-numeric value "${columnValue}"`
        break
      }

      operandValues.push(numValue)
    }
  }

  // If any operand is invalid, return error
  if (invalidOperandFound) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: invalidOperandMessage,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Perform the math operation
  let result: number

  switch (operation) {
    case "add":
      result = operandValues.reduce((sum, value) => sum + value, 0)
      break
    case "subtract":
      // Start with first value, then subtract the rest
      result = operandValues.reduce((diff, value, index) => (index === 0 ? value : diff - value), 0)
      break
    case "multiply":
      result = operandValues.reduce((product, value) => product * value, 1)
      break
    case "divide":
      // Check for division by zero
      if (operandValues.slice(1).some((value) => value === 0)) {
        return {
          rowIndex,
          table,
          column,
          ruleName: rule.name,
          message: "Division by zero error",
          severity: rule.severity,
          ruleId: rule.id,
        }
      }

      // Start with first value, then divide by the rest
      result = operandValues.reduce((quotient, value, index) => (index === 0 ? value : quotient / value), 0)
      break
    default:
      return {
        rowIndex,
        table,
        column,
        ruleName: rule.name,
        message: `Unknown operation: ${operation}`,
        severity: rule.severity,
        ruleId: rule.id,
      }
  }

  // Perform the comparison
  let isValid = false
  switch (comparisonOperator) {
    case "==":
      isValid = result === comparisonValue
      break
    case "!=":
      isValid = result !== comparisonValue
      break
    case ">":
      isValid = result > comparisonValue
      break
    case ">=":
      isValid = result >= comparisonValue
      break
    case "<":
      isValid = result < comparisonValue
      break
    case "<=":
      isValid = result <= comparisonValue
      break
    default:
      isValid = false
  }

  // Create a human-readable representation of the operation
  const operationString = operands
    .map((op, index) => {
      const opValue = op.type === "column" ? `${op.value}(${row[op.value as string]})` : op.value
      if (index === 0) return opValue

      switch (operation) {
        case "add":
          return `+ ${opValue}`
        case "subtract":
          return `- ${opValue}`
        case "multiply":
          return `× ${opValue}`
        case "divide":
          return `÷ ${opValue}`
        default:
          return opValue
      }
    })
    .join(" ")

  // If the validation fails, return a result
  if (!isValid) {
    return {
      rowIndex,
      table,
      column,
      ruleName: rule.name,
      message: `Math operation failed: (${operationString}) = ${result} ${comparisonOperator} ${comparisonValue}`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  // Validation passed
  return null
}

// New function specifically for date rule validation
function validateDateRule(row: DataRecord, rowIndex: number, rule: DataQualityRule): ValidationResult | null {
  // Check if column is defined
  if (!rule.column) {
    console.error(`Missing column for date rule: ${rule.name} [ID: ${rule.id}]`)
    return {
      rowIndex,
      table: rule.table,
      column: "",
      ruleName: rule.name,
      message: `Configuration error: Missing column name for date rule`,
      severity: "failure",
      ruleId: rule.id,
    }
  }
  // Enhanced debugging for date rules
  console.log("=== Date Rule Validation ===")
  console.log("Rule:", {
    id: rule.id,
    name: rule.name,
    table: rule.table,
    column: rule.column,
    ruleType: rule.ruleType,
    parameters: rule.parameters,
  })

  // Check if column exists in the row
  if (!(rule.column in row)) {
    console.error(`Column "${rule.column}" not found in row for rule: ${rule.name} [ID: ${rule.id}]`)
    console.log("Available columns:", Object.keys(row))
    return {
      rowIndex,
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message: `Column "${rule.column}" not found in data`,
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  const value = row[rule.column]
  console.log(
    `validateDateRule called for ${rule.ruleType}, column: ${rule.column}, value: ${value}, type: ${typeof value}`,
  )

  // If the value is undefined or null, we can't validate it as a date
  if (value === undefined || value === null || value === "") {
    // For required date fields, null/undefined/empty is invalid
    const isRequired = rule.parameters.required === true
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

  // Convert value to Date if it's not already
  let dateValue: Date | null = null

  if (value instanceof Date) {
    dateValue = new Date(value) // Create a copy to avoid modifying the original
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

  let isValid = true
  let message = ""

  switch (rule.ruleType) {
    case "date-before":
      if (!rule.parameters.compareDate) {
        isValid = true
        message = "No compare date specified"
      } else {
        const compareDate = new Date(rule.parameters.compareDate)

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const compareDateCopy = new Date(compareDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const compareDateTime = new Date(compareDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true
        isValid = inclusive ? dateValueTime <= compareDateTime : dateValueTime < compareDateTime

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

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const compareDateCopy = new Date(compareDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const compareDateTime = new Date(compareDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true
        isValid = inclusive ? dateValueTime >= compareDateTime : dateValueTime > compareDateTime

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

        // Create copies to avoid modifying the original dates
        const dateValueCopy = new Date(dateValue.getTime())
        const startDateCopy = new Date(startDate.getTime())
        const endDateCopy = new Date(endDate.getTime())

        // Normalize dates to remove time components for consistent comparison
        const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
        const startDateTime = new Date(startDateCopy.setHours(0, 0, 0, 0)).getTime()
        const endDateTime = new Date(endDateCopy.setHours(0, 0, 0, 0)).getTime()

        const inclusive = rule.parameters.inclusive === true

        isValid = inclusive
          ? dateValueTime >= startDateTime && dateValueTime <= endDateTime
          : dateValueTime > startDateTime && dateValueTime < endDateTime

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

  // If validation fails, return a validation result with the appropriate severity
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

  // For successful validations, return null to follow the pattern of other validation functions
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
      ruleId: rule.id,
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
      ruleId: rule.id,
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

  // Validate the first condition
  const result = validateSingleColumnCondition(firstValue, row, firstCondition, datasets, valueLists)

  // If there's only one condition, return its result
  if (rule.columnConditions.length === 1) {
    if (!result.isValid) {
      return {
        rowIndex,
        table: rule.table,
        column: firstCondition.column,
        ruleName: rule.name,
        message: result.message,
        severity: rule.severity,
        ruleId: rule.id,
      }
    }
    return null // Passed validation
  }

  // For multiple conditions, we need to evaluate them with their logical operators
  let isValid = result.isValid
  let failedColumn = isValid ? "" : firstCondition.column
  let failedMessage = isValid ? "" : result.message

  // Process subsequent conditions with their logical operators
  for (let i = 1; i < rule.columnConditions.length; i++) {
    const currentCondition = rule.columnConditions[i]
    const previousCondition = rule.columnConditions[i - 1]
    const logicalOp = previousCondition.logicalOperator || "AND"
    const currentValue = row[currentCondition.column]

    const conditionResult = validateSingleColumnCondition(currentValue, row, currentCondition, datasets, valueLists)

    if (logicalOp === "AND") {
      // With AND, both conditions must be true
      isValid = isValid && conditionResult.isValid
      if (!conditionResult.isValid && failedMessage === "") {
        failedColumn = currentCondition.column
        failedMessage = conditionResult.message
      }
    } else {
      // With OR, either condition can be true
      isValid = isValid || conditionResult.isValid
      if (isValid) {
        // If we've found a valid condition with OR, we can clear the failure
        failedColumn = ""
        failedMessage = ""
      } else if (failedMessage === "") {
        // Only update the failure message if we haven't set one yet
        failedColumn = currentCondition.column
        failedMessage = conditionResult.message
      }
    }
  }

  // If the combined conditions are not valid, return a validation result
  if (!isValid) {
    return {
      rowIndex,
      table: rule.table,
      column: failedColumn || rule.column,
      ruleName: rule.name,
      message: failedMessage || "Failed validation",
      severity: rule.severity,
      ruleId: rule.id,
    }
  }

  return null // Passed validation
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
        condition.parameters.searchString,
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

  console.log(`validateRule called for rule type: ${rule.ruleType}, column: ${rule.column}, value: ${value}`)

  // In the validateRule function, add specific debugging for the rule with ID 4bd3758a-7bd2-444f-9ea7-b7c126957ce0
  // Find this line in validateRule function:
  if (rule.id === "4bd3758a-7bd2-444f-9ea7-b7c126957ce0") {
    debugRule(rule, "Date Rule Debug - validateRule")
    console.log(`Row data for column ${rule.column}:`, row[rule.column])
    console.log(`All row data:`, row)
  }

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
      // Handle both parameter names for backward compatibility
      const searchString = rule.parameters.searchString || rule.parameters.containsValue
      const matchType = rule.parameters.matchType || "contains"
      const caseSensitive = rule.parameters.caseSensitive || false
      ;({ isValid, message } = validateContains(value, searchString, matchType, caseSensitive))
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

    case "javascript-formula":
      ;({ isValid, message } = validateJavaScriptFormula(row, rule.parameters.formula))
      break

    case "date-before":
    case "date-after":
    case "date-between":
    case "date-format":
      // Date rules are handled separately in validateDateRule
      console.log(`Processing date rule: ${rule.ruleType}, column: ${rule.column}, value: ${value}`)
      // Check if the column is defined
      if (!rule.column) {
        return {
          rowIndex,
          table: rule.table,
          column: "",
          ruleName: rule.name,
          message: `Invalid rule configuration: missing column name for date rule`,
          severity: rule.severity,
          ruleId: rule.id,
        }
      }

      // Make sure we're passing the correct column value to validateDateRule
      if (rule.column && row[rule.column] !== undefined) {
        return validateDateRule(row, rowIndex, rule)
      } else {
        console.error(`Missing column data for date rule: ${rule.name}, column: ${rule.column}`)
        return {
          rowIndex,
          table: rule.table,
          column: rule.column || "",
          ruleName: rule.name,
          message: `Cannot validate date: column "${rule.column}" not found in data`,
          severity: rule.severity,
          ruleId: rule.id,
        }
      }

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
      ruleId: rule.id,
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

// Add or modify the validateContains function to handle the new searchString parameter

function validateContains(
  value: any,
  searchString?: string,
  matchType: "contains" | "not-contains" | "starts-with" | "ends-with" | "exact" = "contains",
  caseSensitive = false,
): { isValid: boolean; message: string } {
  if (!searchString || value === null || value === undefined) {
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
  let searchTerm = searchString

  // Handle case sensitivity
  if (!caseSensitive) {
    valueToCheck = stringValue.toLowerCase()
    searchTerm = searchString.toLowerCase()
  }

  let isValid = false
  let message = ""

  switch (matchType) {
    case "contains":
      isValid = valueToCheck.includes(searchTerm)
      message = isValid ? "" : `Value must contain: "${searchString}"`
      break
    case "not-contains":
      isValid = !valueToCheck.includes(searchTerm)
      message = isValid ? "" : `Value must not contain: "${searchString}"`
      break
    case "starts-with":
      isValid = valueToCheck.startsWith(searchTerm)
      message = isValid ? "" : `Value must start with: "${searchString}"`
      break
    case "ends-with":
      isValid = valueToCheck.endsWith(searchTerm)
      message = isValid ? "" : `Value must end with: "${searchString}"`
      break
    case "exact":
      isValid = valueToCheck === searchTerm
      message = isValid ? "" : `Value must exactly match: "${searchString}"`
      break
    default:
      isValid = valueToCheck.includes(searchTerm)
      message = isValid ? "" : `Value must contain: "${searchString}"`
  }

  return { isValid, message }
}

// Simple and direct formula validation function
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
    console.log("Formula with comparison:", formula, operator, value)

    // Calculate the formula result by directly substituting values
    const result = evaluateSimpleFormula(formula, row)
    console.log("Formula evaluation result:", result)

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

    // Create a detailed message for failed validations
    let detailedMessage = ""
    if (!isValid) {
      detailedMessage = `Formula result ${result} ${operator} ${value} is false`
      detailedMessage += "\nColumn values:"
      Object.keys(row).forEach((col) => {
        if (formula.includes(col)) {
          detailedMessage += `\n  ${col} = ${JSON.stringify(row[col])}`
        }
      })
    }

    return {
      isValid,
      message: isValid ? "" : detailedMessage,
    }
  } catch (error) {
    console.error("Formula comparison evaluation error:", error)

    // Create a more helpful error message
    let errorMessage = `Error evaluating formula: ${error.message}`
    errorMessage += "\nFormula: " + formula
    errorMessage += "\nColumn values:"
    Object.keys(row).forEach((col) => {
      if (formula.includes(col)) {
        errorMessage += `\n  ${col} = ${JSON.stringify(row[col])}`
      }
    })

    return {
      isValid: false,
      message: errorMessage,
    }
  }
}

// Simple and direct boolean formula validation
function validateDirectFormula(row: DataRecord, formula?: string): { isValid: boolean; message: string } {
  if (!formula) {
    return { isValid: true, message: "" }
  }

  try {
    console.log("Direct formula:", formula)

    // For direct formulas, we evaluate the expression and convert to boolean
    const result = evaluateSimpleFormula(formula, row)
    console.log("Direct formula evaluation result:", result)

    // Convert the result to a boolean
    const boolResult = Boolean(result)

    // Create a detailed message for failed validations
    let detailedMessage = ""
    if (!boolResult) {
      detailedMessage = `Formula evaluated to false: ${formula} (Result: ${result})`
      detailedMessage += "\nColumn values:"
      Object.keys(row).forEach((col) => {
        if (formula.includes(col)) {
          detailedMessage += `\n  ${col} = ${JSON.stringify(row[col])}`
        }
      })
    }

    return {
      isValid: boolResult,
      message: boolResult ? "" : detailedMessage,
    }
  } catch (error) {
    console.error("Direct formula evaluation error:", error)

    // Create a more helpful error message
    let errorMessage = `Error evaluating formula: ${error.message}`
    errorMessage += "\nFormula: " + formula
    errorMessage += "\nColumn values:"
    Object.keys(row).forEach((col) => {
      if (formula.includes(col)) {
        errorMessage += `\n  ${col} = ${JSON.stringify(row[col])}`
      }
    })

    return {
      isValid: false,
      message: errorMessage,
    }
  }
}

// Completely re-implemented JavaScript formula validation with a safer approach
function validateJavaScriptFormula(row: DataRecord, formula?: string): { isValid: boolean; message: string } {
  if (!formula) {
    return { isValid: true, message: "" }
  }

  try {
    console.log("JavaScript formula:", formula)

    // Use the same safer approach with a context object
    const context: Record<string, any> = {}

    // Add all row values to the context
    for (const [key, val] of Object.entries(row)) {
      context[key] = val
    }

    // Log the context for debugging
    console.log("JavaScript formula evaluation context:", context)

    // Create a function that takes the context as a parameter
    // For JavaScript formulas, we need to handle the return statement differently
    const evalFunc = new Function(
      "context",
      `
      try {
        with(context) {
          ${formula}
        }
      } catch (error) {
        console.error("JavaScript formula inner evaluation error:", error);
        throw error;
      }
      `,
    )

    // Execute the function with our context
    const result = evalFunc(context)
    console.log("JavaScript formula evaluation result:", result)

    // Convert the result to a boolean
    const isValid = Boolean(result)

    return {
      isValid,
      message: isValid ? "" : `JavaScript formula evaluated to false: ${formula}`,
    }
  } catch (error) {
    console.error("JavaScript formula evaluation error:", error)

    // Create a more helpful error message
    let errorMessage = `Error evaluating JavaScript formula: ${error.message}`
    errorMessage += "\nFormula: " + formula
    errorMessage += "\nColumn values:"
    Object.keys(row).forEach((col) => {
      errorMessage += `\n  ${col} = ${JSON.stringify(row[col])}`
    })

    return {
      isValid: false,
      message: errorMessage,
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
    dateValue = new Date(value) // Create a copy to avoid modifying the original
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

  // Create copies to avoid modifying the original dates
  const dateValueCopy = new Date(dateValue.getTime())
  const targetDateCopy = new Date(targetDate.getTime())

  // Normalize dates to remove time components for consistent comparison
  const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
  const targetDateTime = new Date(targetDateCopy.setHours(0, 0, 0, 0)).getTime()

  const isValid = inclusive ? dateValueTime <= targetDateTime : dateValueTime < targetDateTime

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateBefore result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    targetDate: targetDate.toISOString(),
    comparison: `${dateValueTime} ${inclusive ? "<=" : "<"} ${targetDateTime}`,
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
    dateValue = new Date(value) // Create a copy to avoid modifying the original
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

  // Create copies to avoid modifying the original dates
  const dateValueCopy = new Date(dateValue.getTime())
  const targetDateCopy = new Date(targetDate.getTime())

  // Normalize dates to remove time components for consistent comparison
  const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
  const targetDateTime = new Date(targetDateCopy.setHours(0, 0, 0, 0)).getTime()

  const isValid = inclusive ? dateValueTime >= targetDateTime : dateValueTime > targetDateTime

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateAfter result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    targetDate: targetDate.toISOString(),
    comparison: `${dateValueTime} ${inclusive ? ">=" : ">"} ${targetDateTime}`,
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
    dateValue = new Date(value) // Create a copy to avoid modifying the original
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

  // Create copies to avoid modifying the original dates
  const dateValueCopy = new Date(dateValue.getTime())
  const startDateCopy = new Date(start.getTime())
  const endDateCopy = new Date(end.getTime())

  // Normalize dates to remove time components for consistent comparison
  const dateValueTime = new Date(dateValueCopy.setHours(0, 0, 0, 0)).getTime()
  const startDateTime = new Date(startDateCopy.setHours(0, 0, 0, 0)).getTime()
  const endDateTime = new Date(endDateCopy.setHours(0, 0, 0, 0)).getTime()

  const isValid = inclusive
    ? dateValueTime >= startDateTime && dateValueTime <= endDateTime
    : dateValueTime > startDateTime && dateValueTime < endDateTime

  const formattedDate = dateValue.toISOString().split("T")[0]

  console.log("validateDateBetween result:", {
    isValid,
    dateValue: dateValue.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    comparison: `${startDateTime} ${inclusive ? "<=" : "<"} ${dateValueTime} ${inclusive ? "<=" : "<"} ${endDateTime}`,
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

// Helper function to evaluate a formula by directly substituting values
function evaluateSimpleFormula(formula: string, row: DataRecord): any {
  // Create a copy of the formula that we'll modify
  let processedFormula = formula

  // Get all column names from the row
  const columnNames = Object.keys(row)

  // Sort column names by length (descending) to avoid partial replacements
  columnNames.sort((a, b) => b.length - a.length)

  // Replace each column name with its actual value from the row
  for (const columnName of columnNames) {
    // Use regex with word boundaries to avoid partial replacements
    const regex = new RegExp(`\\b${columnName}\\b`, "g")

    // Get the value for this column
    const value = row[columnName]

    // Replace the column name with its literal value
    if (typeof value === "string") {
      // For strings, wrap in quotes
      processedFormula = processedFormula.replace(regex, JSON.stringify(value))
    } else if (value === null || value === undefined) {
      // For null/undefined, use null
      processedFormula = processedFormula.replace(regex, "null")
    } else {
      // For numbers, booleans, etc. use the value directly
      processedFormula = processedFormula.replace(regex, String(value))
    }
  }

  console.log("Processed formula:", processedFormula)

  // Evaluate the processed formula
  // We use new Function to evaluate the expression in a safe context
  const evalFunc = new Function(`return (${processedFormula});`)
  return evalFunc()
}
