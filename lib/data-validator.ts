import type { DataRecord, DataQualityRule, ValidationResult, DataTables, ValueList, ColumnCondition } from "./types"

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

// Add this function near the top of the file with the other debug functions
function debugDateBetweenRule(rule: DataQualityRule, value: any, result: { isValid: boolean; message: string }) {
  console.log("=== Date Between Rule Debug ===")
  console.log("Rule:", {
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    parameters: rule.parameters,
  })
  console.log("Value:", value)
  console.log("Parsed dates:", {
    startDate: rule.parameters.startDate ? new Date(rule.parameters.startDate) : null,
    endDate: rule.parameters.endDate ? new Date(rule.parameters.endDate) : null,
    valueDate: value instanceof Date ? value : new Date(value),
  })
  console.log("Validation result:", result)
  console.log("==============================")
}

// Add this function to the data-validator.ts file, near the top with the other debug functions
function debugListValidation(value: any, listId: string, list: ValueList | undefined, isValid: boolean) {
  console.log("=== List Validation Debug ===")
  console.log(`Value to validate: ${value} (${typeof value})`)
  console.log(`List ID: ${listId}`)
  console.log(`List found: ${list ? "Yes" : "No"}`)
  if (list) {
    console.log(`List name: ${list.name}`)
    console.log(`List values: ${list.values.join(", ")}`)
    console.log(`Value converted to string: "${String(value)}"`)
    console.log(`Is value in list: ${isValid}`)
  }
  console.log("============================")
}

// Add this logging function at the top of the file, after the existing debug functions
function debugConditions(
  rule: DataQualityRule,
  conditions: Condition[],
  result: { isValid: boolean; message: string },
) {
  console.log("=== Conditions Validation Debug ===")
  console.log("Rule:", {
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    conditions: conditions,
  })
  console.log("Conditions count:", conditions?.length || 0)

  if (conditions && conditions.length > 0) {
    conditions.forEach((condition, index) => {
      console.log(`Condition ${index}:`, {
        column: condition.column,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        logicalOperator: condition.logicalOperator,
      })
    })
  } else {
    console.log("No conditions found for this rule")
  }

  console.log("Validation result:", result)
  console.log("===============================")
}

// Add this near the top of the file with the other helper functions
function computeAggregation(dataset: DataRecord[], config: AggregationConfig): number {
  // Apply filter if it exists
  let filteredData = dataset
  if (config.filter) {
    filteredData = dataset.filter((row) => {
      const columnValue = row[config.filter!.column]
      const filterValue = config.filter!.value

      switch (config.filter!.operator) {
        case "==":
          return columnValue == filterValue
        case "!=":
          return columnValue != filterValue
        case ">":
          return columnValue > filterValue
        case ">=":
          return columnValue >= filterValue
        case "<":
          return columnValue < filterValue
        case "<=":
          return columnValue <= filterValue
        default:
          return true
      }
    })
  }

  // Get the values from the specified column
  const values = filteredData
    .map((row) => {
      const val = row[config.column]
      return typeof val === "string" ? Number(val) : val
    })
    .filter((val) => typeof val === "number" && !isNaN(val))

  if (values.length === 0) {
    return 0 // Default for empty datasets
  }

  // Apply the aggregation function
  switch (config.function) {
    case "sum":
      return values.reduce((sum, val) => sum + val, 0)
    case "avg":
      return values.reduce((sum, val) => sum + val, 0) / values.length
    case "count":
      return values.length
    case "min":
      return Math.min(...values)
    case "max":
      return Math.max(...values)
    case "distinct-count":
      return new Set(values).size
    default:
      console.error(`Unknown aggregation function: ${config.function}`)
      return 0
  }
}

// Define all validation functions at the top level, before they're used

// Define validateList at the top level so it's available to all functions
function validateList(value: any, listId: any, valueLists: ValueList[]): { isValid: boolean; message: string } {
  if (!listId) {
    return { isValid: false, message: "Missing listId parameter" }
  }

  const list = valueLists.find((l) => l.id === listId)

  if (!list) {
    return { isValid: false, message: `List with ID "${listId}" not found` }
  }

  const stringValue = String(value)
  const isValid = list.values.includes(stringValue)

  return {
    isValid,
    message: isValid ? "" : `Value must be one of the values in the "${list.name}" list`,
  }
}

// Define validateEnum at the top level
function validateEnum(value: any, allowedValues: any): { isValid: boolean; message: string } {
  // Ensure allowedValues is an array
  if (!Array.isArray(allowedValues)) {
    console.error("validateEnum received non-array allowedValues:", allowedValues)
    // Convert to array if possible, or use empty array
    allowedValues = allowedValues ? [allowedValues] : []
  }

  // Add detailed logging to help diagnose issues
  console.log("Enum validation:", {
    value: value,
    valueType: typeof value,
    allowedValues: allowedValues,
    stringifiedValue: String(value),
  })

  // Try both direct comparison and string comparison
  const isDirectMatch = allowedValues.includes(value)
  const isStringMatch = allowedValues.some((v) => String(v) === String(value))
  const isValid = isDirectMatch || isStringMatch

  console.log("Enum validation result:", {
    isDirectMatch,
    isStringMatch,
    isValid,
  })

  return {
    isValid,
    message: isValid ? "" : `Value "${value}" must be one of: ${allowedValues.join(", ")}`,
  }
}

// Define validateEnumCaseInsensitive at the top level
function validateEnumCaseInsensitive(value: any, allowedValues: any): { isValid: boolean; message: string } {
  // Ensure allowedValues is an array
  if (!Array.isArray(allowedValues)) {
    console.error("validateEnumCaseInsensitive received non-array allowedValues:", allowedValues)
    // Convert to array if possible, or use empty array
    allowedValues = allowedValues ? [allowedValues] : []
  }

  // Add detailed logging
  console.log("Case-insensitive enum validation:", {
    value: value,
    valueType: typeof value,
    allowedValues: allowedValues,
  })

  // Handle non-string values by converting them to strings
  const stringValue = String(value).trim()
  const lowerCaseValue = stringValue.toLowerCase()

  // Convert all allowed values to lowercase strings for comparison
  const lowerCaseAllowedValues = allowedValues.map((v) => String(v).toLowerCase().trim())

  const isValid = lowerCaseAllowedValues.includes(lowerCaseValue)

  console.log("Case-insensitive enum validation details:", {
    stringValue,
    lowerCaseValue,
    lowerCaseAllowedValues,
    isValid,
  })

  return {
    isValid,
    message: isValid ? "" : `Value "${value}" must be one of: ${allowedValues.join(", ")} (case-insensitive)`,
  }
}

// Find the validateContains function and replace it with this improved version:
function validateContains(
  value: any,
  searchString: any,
  matchType: any,
  caseSensitive: any,
): { isValid: boolean; message: string } {
  // Add detailed logging to diagnose the issue
  console.log("Contains validation inputs:", {
    value,
    valueType: typeof value,
    searchString,
    searchStringType: typeof searchString,
    matchType,
    caseSensitive,
  })

  // Handle null/undefined value
  if (value === null || value === undefined) {
    console.log("Contains validation: value is null or undefined")
    return { isValid: false, message: "Value cannot be null or undefined" }
  }

  // Convert value to string if it's not already a string
  const stringValue = typeof value === "string" ? value : String(value)

  // Handle null/undefined searchString - consider it a pass if no search string is provided
  if (searchString === null || searchString === undefined || searchString === "") {
    console.log("Contains validation: searchString is null, undefined or empty - considering as valid")
    return { isValid: true, message: "" }
  }

  // Convert searchString to string if it's not already a string
  const stringSearchString = typeof searchString === "string" ? searchString : String(searchString)

  console.log("Contains validation after conversion:", {
    stringValue,
    stringSearchString,
    matchType,
    caseSensitive,
  })

  let isValid = false
  let message = ""

  if (caseSensitive === true) {
    if (matchType === "starts-with") {
      isValid = stringValue.startsWith(stringSearchString)
    } else if (matchType === "ends-with") {
      isValid = stringValue.endsWith(stringSearchString)
    } else {
      isValid = stringValue.includes(stringSearchString)
    }
  } else {
    const lowerCaseValue = stringValue.toLowerCase()
    const lowerCaseSearchString = stringSearchString.toLowerCase()

    if (matchType === "starts-with") {
      isValid = lowerCaseValue.startsWith(lowerCaseSearchString)
    } else if (matchType === "ends-with") {
      isValid = lowerCaseValue.endsWith(lowerCaseSearchString)
    } else {
      isValid = lowerCaseValue.includes(lowerCaseSearchString)
    }
  }

  console.log("Contains validation result:", { isValid })

  message = isValid ? "" : `Value must contain "${stringSearchString}"`

  return {
    isValid,
    message,
  }
}

// Find the validateDependency function and replace it with this enhanced version:
function validateDependency(
  value: any,
  dependsOnValue: any,
  condition: any,
  operator = "==",
): { isValid: boolean; message: string } {
  console.log("Dependency validation:", {
    value,
    dependsOnValue,
    condition,
    operator,
  })

  let conditionMet = false

  // Evaluate if the condition is met based on the operator
  switch (operator) {
    case "==":
      conditionMet = dependsOnValue == condition
      break
    case "!=":
      conditionMet = dependsOnValue != condition
      break
    case ">":
      conditionMet = dependsOnValue > condition
      break
    case ">=":
      conditionMet = dependsOnValue >= condition
      break
    case "<":
      conditionMet = dependsOnValue < condition
      break
    case "<=":
      conditionMet = dependsOnValue <= condition
      break
    case "contains":
      conditionMet = String(dependsOnValue).includes(String(condition))
      break
    case "starts-with":
      conditionMet = String(dependsOnValue).startsWith(String(condition))
      break
    case "ends-with":
      conditionMet = String(dependsOnValue).endsWith(String(condition))
      break
    case "is-empty":
      conditionMet = dependsOnValue === "" || dependsOnValue === null || dependsOnValue === undefined
      break
    case "is-not-empty":
      conditionMet = dependsOnValue !== "" && dependsOnValue !== null && dependsOnValue !== undefined
      break
    default:
      conditionMet = dependsOnValue == condition
  }

  let isValid = true
  let message = ""

  if (conditionMet) {
    // If the condition is met, check if the dependent value meets its requirements
    // For now, we're just checking if it's required (not null/empty)
    isValid = value !== null && value !== undefined && value !== ""
    message = isValid ? "" : "This field is required when the condition is met"
  }

  return {
    isValid,
    message,
  }
}

// Define validateMultiColumn at the top level
// Find the `validateMultiColumn` function and replace it with this improved version that correctly handles logical operators between conditions:

function validateMultiColumn(
  row: DataRecord,
  conditions: any[],
  datasets: DataTables,
  valueLists: ValueList[],
): { isValid: boolean; message: string } {
  console.log("validateMultiColumn called with:", {
    rowKeys: Object.keys(row),
    conditionsCount: conditions?.length || 0,
    conditions,
  })

  // If no conditions, validation passes
  if (!conditions || conditions.length === 0) {
    console.log("No conditions to validate")
    return { isValid: true, message: "" }
  }

  // Start with the first condition
  const firstCondition = conditions[0]

  // Determine which field to use (column or field)
  const firstFieldName = firstCondition.column || firstCondition.field

  if (!firstFieldName || !(firstFieldName in row)) {
    console.warn(`First field ${firstFieldName} not found in row. Available fields:`, Object.keys(row))
    return { isValid: false, message: `Column ${firstFieldName} not found in data` }
  }

  const firstColumnValue = row[firstFieldName]

  // Validate the first condition
  const result = validateSingleColumnCondition(firstColumnValue, row, firstCondition, datasets, valueLists)
  let isValid = result.isValid
  let message = result.message

  console.log(`First condition (${firstFieldName}) validation result:`, result)

  // Process subsequent conditions with their logical operators
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const prevCondition = conditions[i - 1]
    const logicalOp = prevCondition.logicalOperator || "AND"

    // Determine which field to use (column or field)
    const fieldName = condition.column || condition.field

    if (!fieldName || !(fieldName in row)) {
      console.warn(`Field ${fieldName} not found in row. Available fields:`, Object.keys(row))
      continue
    }

    const columnValue = row[fieldName]

    // Validate this condition
    const conditionResult = validateSingleColumnCondition(columnValue, row, condition, datasets, valueLists)

    console.log(`Condition ${i} (${fieldName}) validation result:`, {
      result: conditionResult,
      logicalOperator: logicalOp,
    })

    // Apply logical operator
    if (logicalOp === "AND") {
      isValid = isValid && conditionResult.isValid
      if (!conditionResult.isValid) {
        message = conditionResult.message
      }
    } else if (logicalOp === "OR") {
      isValid = isValid || conditionResult.isValid
      if (isValid && conditionResult.isValid) {
        message = "" // Clear error message if OR condition passes
      }
    }

    console.log(`After condition ${i}, combined result:`, { isValid, message })
  }

  console.log(`Final multi-column validation result: ${isValid}`)
  return {
    isValid,
    message,
  }
}

// Define validateLookup at the top level
function validateLookup(
  row: DataRecord,
  column: any,
  lookupTable: any,
  lookupColumn: any,
  validation: any,
  datasets: DataTables,
): { isValid: boolean; message: string } {
  if (!lookupTable || !lookupColumn || !validation) {
    return { isValid: false, message: "Missing lookup parameters" }
  }

  const tableData = datasets[lookupTable]

  if (!tableData) {
    return { isValid: false, message: `Lookup table "${lookupTable}" not found` }
  }

  const value = row[column]
  const found = tableData.some((item) => item[lookupColumn] == value)

  let isValid = false
  let message = ""

  if (validation === "must-exist") {
    isValid = found
    message = isValid ? "" : `Value must exist in lookup table "${lookupTable}" column "${lookupColumn}"`
  } else {
    isValid = !found
    message = isValid ? "" : `Value must not exist in lookup table "${lookupTable}" column "${lookupColumn}"`
  }

  return {
    isValid,
    message,
  }
}

// Define validateCustom at the top level
function validateCustom(
  value: any,
  row: DataRecord,
  functionBody: any,
  datasets: DataTables,
): { isValid: boolean; message: string } {
  try {
    // Create a function that has access to row properties as parameters
    const paramNames = Object.keys(row)
    const paramValues = paramNames.map((key) => row[key])

    // Create a function that evaluates the custom logic with the row data
    const evalFunc = new Function(
      ...paramNames,
      `"use strict"; 
       try { 
         return Boolean(${functionBody}); 
       } catch(err) { 
         console.error("Custom function evaluation error:", err.message); 
         throw new Error("Invalid custom function: " + err.message); 
       }`,
    )

    // Execute the function with the row values
    const result = evalFunc(...paramValues)

    return {
      isValid: result,
      message: result ? "" : "Custom validation failed",
    }
  } catch (error) {
    console.error("Custom function evaluation error:", error)
    return {
      isValid: false,
      message: `Error evaluating custom function: ${error.message}\nFunction: ${functionBody}`,
    }
  }
}

// Add this helper function
function getFunctionFromName(name: string): string {
  switch (name.toLowerCase()) {
    case "sum":
      return "sum"
    case "avg":
      return "avg"
    case "count":
      return "count"
    case "min":
      return "min"
    case "max":
      return "max"
    case "distinct_count":
      return "distinct-count"
    default:
      return name.toLowerCase()
  }
}

// Define validateDirectFormula at the top level
function validateDirectFormula(row: DataRecord, formula: string): { isValid: boolean; message: string } {
  try {
    // Create a function that has access to row properties as parameters
    const paramNames = Object.keys(row)
    const paramValues = paramNames.map((key) => row[key])

    // Create a function that evaluates the formula with the row data
    const evalFunc = new Function(
      ...paramNames,
      `"use strict"; 
       try { 
         return Boolean(${formula}); 
       } catch(err) { 
         console.error("Formula evaluation error:", err.message); 
         throw new Error("Invalid formula: " + err.message); 
       }`,
    )

    // Execute the function with the row values
    const result = evalFunc(...paramValues)

    return {
      isValid: result,
      message: result ? "" : `Formula evaluated to false: ${formula}`,
    }
  } catch (error) {
    console.error("Formula evaluation error:", error)
    return {
      isValid: false,
      message: `Error evaluating formula: ${error.message}\nFormula: ${formula}`,
    }
  }
}

// Define validateRequired at the top level
function validateRequired(value: any): { isValid: boolean; message: string } {
  const isValid = value !== null && value !== undefined && value !== ""
  return {
    isValid,
    message: isValid ? "" : "Value is required",
  }
}

// Find the validateNotEquals function and update it to properly handle the validation logic
// The current implementation is returning isValid=true when the values are equal, which is incorrect for a "not equals" check

// Replace the validateNotEquals function with this corrected version:
function validateNotEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Add debug logging to help diagnose the issue
  console.log("Not Equals validation:", {
    value,
    compareValue,
    areEqual: value == compareValue,
    valueType: typeof value,
    compareValueType: typeof compareValue,
  })

  // For not-equals, isValid should be true when the values are NOT equal
  const isValid = value != compareValue

  return {
    isValid,
    message: isValid ? "" : `Value must not equal ${compareValue}`,
  }
}

// Define validateEquals at the top level
// Find the validateEquals function and update it to properly handle empty strings, null, and undefined values
// Replace the current validateEquals function with this improved version:

function validateEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Add extremely detailed logging to diagnose the issue
  console.log("=== EQUALS VALIDATION START ===")
  console.log("Value:", value)
  console.log("Value type:", typeof value)
  console.log("Value is null:", value === null)
  console.log("Value is undefined:", value === undefined)
  console.log("Value is empty string:", value === "")
  console.log("Compare value:", compareValue)
  console.log("Compare value type:", typeof compareValue)
  console.log("Compare value is null:", compareValue === null)
  console.log("Compare value is undefined:", compareValue === undefined)
  console.log("Compare value is empty string:", compareValue === "")

  // Convert both values to strings for logging
  const valueStr = value === null ? "null" : value === undefined ? "undefined" : String(value)
  const compareValueStr =
    compareValue === null ? "null" : compareValue === undefined ? "undefined" : String(compareValue)
  console.log(`String representation - value: "${valueStr}", compareValue: "${compareValueStr}"`)

  // CRITICAL FIX: Normalize empty strings for comparison
  // This ensures that any string representation of an empty string is treated as an empty string
  const normalizedValue = value === "" ? "" : value
  const normalizedCompareValue = compareValue === "" ? "" : compareValue

  // Check if both are empty strings after normalization
  if (normalizedValue === "" && normalizedCompareValue === "") {
    console.log("Both values are empty strings after normalization - they are equal")
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid: true,
      message: "",
    }
  }

  // SPECIAL CASE: Empty string comparison
  if (normalizedCompareValue === "") {
    // If we're checking for an empty string, then null and undefined should also pass
    const isValid = normalizedValue === "" || normalizedValue === null || normalizedValue === undefined
    console.log(`Empty string comparison result: ${isValid}`)
    console.log(`Reason: compareValue is empty string, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal ""`,
    }
  }

  // SPECIAL CASE: Null comparison
  if (normalizedCompareValue === null) {
    // Only null should match null
    const isValid = normalizedValue === null
    console.log(`Null comparison result: ${isValid}`)
    console.log(`Reason: compareValue is null, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal null`,
    }
  }

  // SPECIAL CASE: Undefined comparison
  if (normalizedCompareValue === undefined) {
    // Only undefined should match undefined
    const isValid = normalizedValue === undefined
    console.log(`Undefined comparison result: ${isValid}`)
    console.log(`Reason: compareValue is undefined, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal undefined`,
    }
  }

  // For all other cases, use loose equality (==) to allow type coercion
  const isValid = normalizedValue == normalizedCompareValue
  console.log(`Standard comparison result: ${isValid}`)
  console.log(`Reason: Using loose equality, ${valueStr} == "${compareValueStr}" is ${isValid}`)
  console.log("=== EQUALS VALIDATION END ===")

  return {
    isValid,
    message: isValid ? "" : `Value must equal ${compareValue}`,
  }
}

// Define validateGreaterThan at the top level
function validateGreaterThan(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Convert string values to numbers if possible
  const numValue = typeof value === "string" ? Number(value) : value
  const numCompareValue = typeof compareValue === "string" ? Number(compareValue) : compareValue

  // Check if both values are valid numbers after conversion
  if (isNaN(numValue) || isNaN(numCompareValue)) {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} > ${compareValue}`,
    }
  }

  const isValid = numValue > numCompareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be greater than ${compareValue}`,
  }
}

// Define validateGreaterThanEquals at the top level
function validateGreaterThanEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Convert string values to numbers if possible
  const numValue = typeof value === "string" ? Number(value) : value
  const numCompareValue = typeof compareValue === "string" ? Number(compareValue) : compareValue

  // Check if both values are valid numbers after conversion
  if (isNaN(numValue) || isNaN(numCompareValue)) {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} >= ${compareValue}`,
    }
  }

  const isValid = numValue >= numCompareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be greater than or equal to ${compareValue}`,
  }
}

// Define validateLessThan at the top level
function validateLessThan(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Convert string values to numbers if possible
  const numValue = typeof value === "string" ? Number(value) : value
  const numCompareValue = typeof compareValue === "string" ? Number(compareValue) : compareValue

  // Check if all values are valid numbers after conversion
  if (isNaN(numValue) || isNaN(numCompareValue)) {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} < ${compareValue}`,
    }
  }

  const isValid = numValue < numCompareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be less than ${compareValue}`,
  }
}

// Define validateLessThanEquals at the top level
function validateLessThanEquals(value: any, compareValue: any): { isValid: boolean; message: string } {
  // Convert string values to numbers if possible
  const numValue = typeof value === "string" ? Number(value) : value
  const numCompareValue = typeof compareValue === "string" ? Number(compareValue) : compareValue

  // Check if all values are valid numbers after conversion
  if (isNaN(numValue) || isNaN(numCompareValue)) {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} <= ${compareValue}`,
    }
  }

  const isValid = numValue <= numCompareValue
  return {
    isValid,
    message: isValid ? "" : `Value must be less than or equal to ${compareValue}`,
  }
}

// Find the validateRange function and update it to handle undefined min/max values better
// Replace the existing validateRange function with this improved version:

function validateRange(value: any, min: any, max: any): { isValid: boolean; message: string } {
  // Add debug logging to help diagnose the issue
  console.log("Range validation inputs:", {
    value,
    min,
    max,
    valueType: typeof value,
    minType: typeof min,
    maxType: typeof max,
  })

  // Handle undefined or empty string parameters
  if (min === undefined || min === "" || max === undefined || max === "") {
    return {
      isValid: false,
      message: `Invalid range parameters: min=${min}, max=${max}. Both min and max must be specified.`,
    }
  }

  // Convert string values to numbers if possible
  const numValue = typeof value === "string" ? Number(value) : value
  const numMin = typeof min === "string" ? Number(min) : min
  const numMax = typeof max === "string" ? Number(max) : max

  // Check if all values are valid numbers after conversion
  if (isNaN(numValue) || isNaN(numMin) || isNaN(numMax)) {
    return {
      isValid: false,
      message: `Cannot compare non-numeric values: ${value} between ${min} and ${max}`,
    }
  }

  const isValid = numValue >= numMin && numValue <= numMax

  console.log("Range validation result:", {
    numValue,
    numMin,
    numMax,
    isValid,
  })

  return {
    isValid,
    message: isValid ? "" : `Value must be between ${min} and ${max}`,
  }
}

// Define validateRegex at the top level
function validateRegex(value: any, pattern: any): { isValid: boolean; message: string } {
  try {
    const regex = new RegExp(pattern)
    const isValid = regex.test(value)
    return {
      isValid,
      message: isValid ? "" : `Value must match regex pattern: ${pattern}`,
    }
  } catch (e) {
    return {
      isValid: false,
      message: `Invalid regex pattern: ${pattern}`,
    }
  }
}

// Define validateType at the top level
function validateType(value: any, dataType: any): { isValid: boolean; message: string } {
  let isValid = false
  let message = ""

  switch (dataType) {
    case "string":
      isValid = typeof value === "string"
      message = isValid ? "" : "Value must be a string"
      break
    case "number":
      isValid = typeof value === "number" && !isNaN(value)
      message = isValid ? "" : "Value must be a number"
      break
    case "boolean":
      isValid = typeof value === "boolean"
      message = isValid ? "" : "Value must be a boolean"
      break
    case "date":
      isValid = value instanceof Date && !isNaN(value.getTime())
      message = isValid ? "" : "Value must be a date"
      break
    default:
      isValid = false
      message = `Unknown data type: ${dataType}`
  }

  return {
    isValid,
    message,
  }
}

// Replace the validateDateBefore function with this simpler version
function validateDateBefore(
  value: any,
  compareDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("FIXED validateDateBefore called with:", {
    value: value instanceof Date ? value.toISOString() : value,
    compareDate,
    inclusive,
  })

  // Skip validation for empty values
  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Skip validation if no compare date
  if (!compareDate) {
    return { isValid: true, message: "" }
  }

  try {
    // Parse dates
    const valueDate = new Date(value)
    const compareDateObj = new Date(compareDate)

    // Check if dates are valid
    if (isNaN(valueDate.getTime()) || isNaN(compareDateObj.getTime())) {
      console.log("Invalid date(s):", { value, compareDate })
      return {
        isValid: false,
        message: `Invalid date(s): value=${value}, compareDate=${compareDate}`,
      }
    }

    // Get date-only strings (YYYY-MM-DD)
    const valueDateStr = valueDate.toISOString().split("T")[0]
    const compareDateStr = compareDateObj.toISOString().split("T")[0]

    // Create new Date objects from strings to remove time component
    const valueOnlyDate = new Date(valueDateStr)
    const compareOnlyDate = new Date(compareDateStr)

    // Simple comparison
    const valueTime = valueOnlyDate.getTime()
    const compareTime = compareOnlyDate.getTime()

    // Determine if valid based on inclusive flag
    let isValid = inclusive ? valueTime <= compareTime : valueTime < compareTime

    console.log("Date comparison (before):", {
      valueDate: valueDateStr,
      compareDate: compareDateStr,
      valueTime,
      compareTime,
      inclusive,
      isValid,
    })

    // IMPORTANT: Force a failure for testing if dates are in wrong order
    if (valueTime > compareTime) {
      console.log("FORCING FAILURE: Date is after compare date")
      isValid = false
    }

    return {
      isValid,
      message: isValid ? "" : `Date ${valueDateStr} must be ${inclusive ? "on or " : ""}before ${compareDateStr}`,
    }
  } catch (e) {
    console.error("Error in validateDateBefore:", e)
    return {
      isValid: false,
      message: `Error comparing dates: ${e.message}`,
    }
  }
}

// Replace the validateDateAfter function with this simpler version
function validateDateAfter(
  value: any,
  compareDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("FIXED validateDateAfter called with:", {
    value: value instanceof Date ? value.toISOString() : value,
    compareDate,
    inclusive,
  })

  // Skip validation for empty values
  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Skip validation if no compare date
  if (!compareDate) {
    return { isValid: true, message: "" }
  }

  try {
    // Parse dates
    const valueDate = new Date(value)
    const compareDateObj = new Date(compareDate)

    // Check if dates are valid
    if (isNaN(valueDate.getTime()) || isNaN(compareDateObj.getTime())) {
      console.log("Invalid date(s):", { value, compareDate })
      return {
        isValid: false,
        message: `Invalid date(s): value=${value}, compareDate=${compareDate}`,
      }
    }

    // Get date-only strings (YYYY-MM-DD)
    const valueDateStr = valueDate.toISOString().split("T")[0]
    const compareDateStr = compareDateObj.toISOString().split("T")[0]

    // Create new Date objects from strings to remove time component
    const valueOnlyDate = new Date(valueDateStr)
    const compareOnlyDate = new Date(compareDateStr)

    // Simple comparison
    const valueTime = valueOnlyDate.getTime()
    const compareTime = compareOnlyDate.getTime()

    // Determine if valid based on inclusive flag
    let isValid = inclusive ? valueTime >= compareTime : valueTime > compareTime

    console.log("Date comparison (after):", {
      valueDate: valueDateStr,
      compareDate: compareDateStr,
      valueTime,
      compareTime,
      inclusive,
      isValid,
    })

    // IMPORTANT: Force a failure for testing if dates are in wrong order
    if (valueTime < compareTime) {
      console.log("FORCING FAILURE: Date is before compare date")
      isValid = false
    }

    return {
      isValid,
      message: isValid ? "" : `Date ${valueDateStr} must be ${inclusive ? "on or " : ""}after ${compareDateStr}`,
    }
  } catch (e) {
    console.error("Error in validateDateAfter:", e)
    return {
      isValid: false,
      message: `Error comparing dates: ${e.message}`,
    }
  }
}

// Replace the validateDateBetween function with this simpler version
function validateDateBetween(
  value: any,
  startDate?: string,
  endDate?: string,
  inclusive?: boolean,
): { isValid: boolean; message: string } {
  console.log("FIXED validateDateBetween called with:", {
    value: value instanceof Date ? value.toISOString() : value,
    startDate,
    endDate,
    inclusive,
  })

  // Skip validation for empty values
  if (value === null || value === undefined || value === "") {
    return { isValid: true, message: "" }
  }

  // Skip validation if no start or end date
  if (!startDate || !endDate) {
    return { isValid: true, message: "" }
  }

  try {
    // Parse dates
    const valueDate = new Date(value)
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    // Check if dates are valid
    if (isNaN(valueDate.getTime()) || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.log("Invalid date(s):", { value, startDate, endDate })
      return {
        isValid: false,
        message: `Invalid date(s): value=${value}, startDate=${startDate}, endDate=${endDate}`,
      }
    }

    // Get date-only strings (YYYY-MM-DD)
    const valueDateStr = valueDate.toISOString().split("T")[0]
    const startDateStr = startDateObj.toISOString().split("T")[0]
    const endDateStr = endDateObj.toISOString().split("T")[0]

    // Create new Date objects from strings to remove time component
    const valueOnlyDate = new Date(valueDateStr)
    const startOnlyDate = new Date(startDateStr)
    const endOnlyDate = new Date(endDateStr)

    // Simple comparison
    const valueTime = valueOnlyDate.getTime()
    const startTime = startOnlyDate.getTime()
    const endTime = endOnlyDate.getTime()

    // Determine if valid based on inclusive flag
    let isValid = inclusive
      ? valueTime >= startTime && valueTime <= endTime
      : valueTime > startTime && valueTime < endTime

    console.log("Date comparison (between):", {
      valueDate: valueDateStr,
      startDate: startDateStr,
      endDate: endDateStr,
      valueTime,
      startTime,
      endTime,
      inclusive,
      isValid,
    })

    // IMPORTANT: Force a failure for testing if dates are outside range
    if (valueTime < startTime || valueTime > endTime) {
      console.log("FORCING FAILURE: Date is outside range")
      isValid = false
    }

    return {
      isValid,
      message: isValid
        ? ""
        : `Date ${valueDateStr} must be ${inclusive ? "on or " : ""}between ${startDateStr} and ${endDateStr}`,
    }
  } catch (e) {
    console.error("Error in validateDateBetween:", e)
    return {
      isValid: false,
      message: `Error comparing dates: ${e.message}`,
    }
  }
}

// Define validateDateFormat at the top level
function validateDateFormat(
  value: any,
  format: any,
  customFormat: any,
  required?: boolean,
): { isValid: boolean; message: string } {
  if (!value) {
    return { isValid: !required, message: required ? "Date is required" : "" }
  }

  if (value instanceof Date) {
    return { isValid: true, message: "" }
  }

  if (typeof value !== "string") {
    return { isValid: false, message: "Value must be a string" }
  }

  // Implement date format validation logic here
  // This is a placeholder, replace with actual validation
  return { isValid: true, message: "" }
}

// Update the validateDateRuleWithSafeguards function to ensure it's correctly handling the validation results
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
    severity: rule.severity,
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
      severity: rule.severity || "warning",
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
        severity: rule.severity || "warning",
        ruleId: rule.id,
      }
    } else {
      // If date is null/undefined/empty and not required, skip validation
      return null
    }
  }

  let validationResult: { isValid: boolean; message: string } = { isValid: true, message: "" }

  switch (rule.ruleType) {
    case "date-before":
      console.log("Validating date-before rule:", {
        value,
        compareDate: rule.parameters.date,
        inclusive: rule.parameters.inclusive,
      })
      validationResult = validateDateBefore(value, rule.parameters.date, rule.parameters.inclusive)
      break

    case "date-after":
      console.log("Validating date-after rule:", {
        value,
        compareDate: rule.parameters.date,
        inclusive: rule.parameters.inclusive,
      })
      validationResult = validateDateAfter(value, rule.parameters.date, rule.parameters.inclusive)
      break

    case "date-between":
      validationResult = validateDateBetween(
        value,
        rule.parameters.startDate,
        rule.parameters.endDate,
        rule.parameters.inclusive,
      )
      break

    case "date-format":
      validationResult = validateDateFormat(
        value,
        rule.parameters.format,
        rule.parameters.customFormat,
        rule.parameters.required,
      )
      break

    default:
      validationResult = { isValid: true, message: "" }
  }

  console.log(`Date rule validation result:`, validationResult)

  // CRITICAL: Make sure we're properly handling the validation result
  if (!validationResult.isValid) {
    console.log("VALIDATION FAILED - Returning failure result")
    return {
      rowIndex,
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message: validationResult.message || `Date validation failed for ${rule.ruleType}`,
      severity: rule.severity || "warning",
      ruleId: rule.id,
    }
  }

  // For successful validations, return a success result
  console.log("VALIDATION PASSED - Returning success result")
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
  // Add this code at the beginning of the validateDataset function, right after the function signature:
  console.log("==========================================")
  console.log(
    "VALIDATION STARTED WITH RULES:",
    rules.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.ruleType,
      table: r.table,
      enabled: r.enabled,
    })),
  )
  console.log("==========================================")
  const results: ValidationResult[] = []

  // Check if we have rules to process
  if (!rules || rules.length === 0) {
    console.warn("No rules to validate - validateDataset was called with empty rules array")
    return results
  }

  console.log(
    "Processing validation with rules:",
    rules.length,
    rules.map((r) => r.name),
  )

  // Process each rule
  rules.forEach((rule) => {
    // Skip disabled rules
    if (rule.enabled === false) {
      return
    }
    // Inside the rules.forEach loop, right after checking if the rule is enabled:
    if (rule.ruleType === "column-comparison" || rule.ruleType === "cross-column") {
      console.log("!!!!! PROCESSING COLUMN COMPARISON RULE !!!!!")
      console.log({
        id: rule.id,
        name: rule.name,
        table: rule.table,
        column: rule.column,
        parameters: rule.parameters,
        enabled: rule.enabled,
      })

      // Check if the table exists in the datasets
      if (!datasets[rule.table]) {
        console.error(`Table ${rule.table} NOT FOUND for column comparison rule ${rule.name}`)
      } else {
        console.log(`Table ${rule.table} FOUND with ${datasets[rule.table].length} rows`)

        // Log the first row to see what columns are available
        if (datasets[rule.table].length > 0) {
          console.log("First row columns:", Object.keys(datasets[rule.table][0]))
        }
      }
    }

    // Add enhanced logging for column-comparison rules
    if (rule.ruleType === "column-comparison" || rule.ruleType === "cross-column") {
      console.log("PROCESSING COLUMN COMPARISON RULE:", {
        ruleId: rule.id,
        ruleName: rule.name,
        table: rule.table,
        column: rule.column,
        secondaryColumn: rule.parameters.secondaryColumn || rule.parameters.rightColumn,
        operator: rule.parameters.operator || rule.parameters.comparisonOperator,
        allowNull: rule.parameters.allowNull,
        enabled: rule.enabled,
      })
    }

    // Add debug info for date rules
    if (rule.ruleType.startsWith("date-")) {
      debugObject(rule, `Date Rule: ${rule.name}`)
    }

    // Add debug info for list rules
    if (rule.ruleType === "list") {
      debugObject(rule, `List Rule: ${rule.name}`)
      console.log(`List rule parameters:`, rule.parameters)

      // Check if the list exists
      const listId = rule.parameters.listId
      const list = valueLists.find((l) => l.id === listId)
      console.log(
        `List found: ${list ? "Yes" : "No"}, List name: ${list?.name || "N/A"}, Values count: ${list?.values?.length || 0}`,
      )
    }

    // CRITICAL FIX: Log the rule table to help with debugging
    console.log(`Processing rule: ${rule.name}, Table: ${rule.table}, Type: ${rule.ruleType}`)

    const tableData = datasets[rule.table]
    if (!tableData) {
      console.log(`Table ${rule.table} not found for rule ${rule.name}`)
      return
    }

    // Process each row in the table
    tableData.forEach((row, rowIndex) => {
      // CRITICAL FIX: Add table name to row for validation functions to check
      // This ensures each row knows which table it belongs to
      const rowWithTable = { ...row, _table: rule.table }

      let validationResult: ValidationResult | null = null

      // Special handling for date rules
      if (rule.ruleType.startsWith("date-")) {
        validationResult = validateDateRuleWithSafeguards(rowWithTable, rowIndex, rule)
        if (validationResult) {
          results.push(validationResult)
        }
        return // Skip the rest of the processing for date rules
      }

      // Inside the main rule processing loop in validateDataset, add this before checking conditions:
      if (rule.conditions && rule.conditions.length > 0) {
        console.log(`Processing rule ${rule.name} with ${rule.conditions.length} conditions:`, rule.conditions)
      }

      // Process rule based on its type
      switch (rule.ruleType) {
        // Find the validateColumnComparison function and completely replace it with this new implementation
        // that forces failures to be properly detected and reported

        case "column-comparison":
        case "cross-column": // Handle both rule types
          validationResult = validateColumnComparison(rowWithTable, rowIndex, rule)
          // Add the result to the results array and set a flag to prevent duplicate results
          results.push(validationResult)
          console.log("ADDED COLUMN COMPARISON RESULT:", {
            ruleName: rule.name,
            isValid: validationResult.severity === "success",
            message: validationResult.message,
            severity: validationResult.severity,
          })
          // Skip the default success result that gets added after the switch statement
          return // Use return to exit the forEach callback instead of continue
        case "math-operation":
          validationResult = validateMathOperation(rowWithTable, rowIndex, rule)
          break
        case "composite-reference":
          validationResult = validateCompositeReference(rowWithTable, rowIndex, rule, datasets)
          break
        case "reference-integrity":
          validationResult = validateReferenceIntegrity(rowWithTable, rowIndex, rule, datasets)
          break
        case "unique":
          validationResult = validateUnique(rowWithTable, rowIndex, rule, datasets)
          break
        case "javascript-formula":
          // Handle JavaScript formula rule
          const formula = rule.parameters.formula || rule.parameters.javascriptExpression
          if (!formula) {
            validationResult = {
              rowIndex,
              table: rule.table,
              column: rule.column,
              ruleName: rule.name,
              message: "JavaScript formula rule is missing a formula expression",
              severity: rule.severity,
              ruleId: rule.id,
            }
          } else {
            const jsFormulaResult = validateJavaScriptFormula(rowWithTable, formula)
            validationResult = {
              rowIndex,
              table: rule.table,
              column: rule.column,
              ruleName: rule.name,
              message: jsFormulaResult.isValid
                ? "Passed JavaScript formula validation"
                : jsFormulaResult.message || `JavaScript formula evaluated to false: ${formula}`,
              severity: jsFormulaResult.isValid ? "success" : rule.severity,
              ruleId: rule.id,
            }
          }
          break
        default:
          // Check for column conditions
          if (rule.columnConditions && rule.columnConditions.length > 0) {
            validationResult = validateColumnConditions(rowWithTable, rowIndex, rule, datasets, valueLists)
          }
          // Check for cross-table conditions
          else if (rule.crossTableConditions && rule.crossTableConditions.length > 0) {
            const crossTableResult = validateCrossTableConditions(rowWithTable, rule.crossTableConditions, datasets)
            if (!crossTableResult.isValid) {
              validationResult = {
                rowIndex,
                table: rule.table,
                column: rule.column,
                ruleName: rule.name,
                message: crossTableResult.message,
                severity: rule.severity,
                ruleId: rule.id,
              }
            }
          }
          // Default case: use individual rule validation
          else {
            // Use standard rule validation for other rule types
            const value = rowWithTable[rule.column]
            let isValid = true
            let message = ""

            // Add this logging for conditions
            if (rule.conditions && rule.conditions.length > 0) {
              console.log(`Validating ${rule.conditions.length} conditions for rule ${rule.name}:`, rule.conditions)
            }

            // Validate based on rule type
            switch (rule.ruleType) {
              case "required":
                ;({ isValid, message } = validateRequired(value))
                break
              case "equals":
                ;({ isValid, message } = validateEquals(value, rule.parameters.value))
                break
              case "not-equals":
                ;({ isValid, message } = validateNotEquals(value, rule.parameters.value))
                console.log(`Not equals validation result for ${rule.name}:`, {
                  value,
                  compareValue: rule.parameters.value,
                  isValid,
                })
                break
              case "greater-than":
                ;({ isValid, message } = validateGreaterThan(value, rule.parameters.value))
                break
              case "greater-than-equals":
                ;({ isValid, message } = validateGreaterThanEquals(value, rule.parameters.value))
                break
              case "less-than":
                ;({ isValid, message } = validateLessThan(value, rule.parameters.value))
                break
              case "less-than-equals":
                ;({ isValid, message } = validateLessThanEquals(value, rule.parameters.value))
                break
              case "range":
                // Add debug logging for range rule
                console.log("Processing range rule:", {
                  ruleName: rule.name,
                  value,
                  min: rule.parameters.min,
                  max: rule.parameters.max,
                  allParameters: rule.parameters,
                })
                // Make sure we're passing the correct parameters
                ;({ isValid, message } = validateRange(
                  value,
                  rule.parameters.min !== undefined ? rule.parameters.min : rule.parameters.minValue,
                  rule.parameters.max !== undefined ? rule.parameters.max : rule.parameters.maxValue,
                ))
                break
              case "regex":
                ;({ isValid, message } = validateRegex(value, rule.parameters.pattern))
                break
              case "type":
                ;({ isValid, message } = validateType(value, rule.parameters.dataType))
                break
              case "enum":
                // Add debug logging for enum rule
                console.log("Processing enum rule:", {
                  ruleName: rule.name,
                  value,
                  allowedValues: rule.parameters.allowedValues,
                  caseInsensitive: rule.parameters.caseInsensitive,
                })

                if (rule.parameters.caseInsensitive === true) {
                  // Ensure allowedValues exists and is an array
                  const allowedValues = Array.isArray(rule.parameters.allowedValues)
                    ? rule.parameters.allowedValues
                    : typeof rule.parameters.allowedValues === "string"
                      ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
                      : rule.parameters.allowedValues
                        ? [rule.parameters.allowedValues]
                        : []

                  console.log("Enum validation with values:", allowedValues)
                  ;({ isValid, message } = validateEnumCaseInsensitive(value, allowedValues))
                } else {
                  // Ensure allowedValues exists and is an array
                  const allowedValues = Array.isArray(rule.parameters.allowedValues)
                    ? rule.parameters.allowedValues
                    : typeof rule.parameters.allowedValues === "string"
                      ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
                      : rule.parameters.allowedValues
                        ? [rule.parameters.allowedValues]
                        : []

                  console.log("Enum validation with values:", allowedValues)
                  ;({ isValid, message } = validateEnum(value, allowedValues))
                }
                break
              case "list":
                const listResult = validateList(value, rule.parameters.listId || rule.parameters.valueList, valueLists)
                isValid = listResult.isValid
                message = listResult.message

                // Log the list validation result
                console.log(`List rule validation (${rule.name}): ${isValid ? "PASS" : "FAIL"}`, {
                  value,
                  listId: rule.parameters.listId || rule.parameters.valueList,
                  message,
                })
                break
              case "contains":
                const searchString = rule.parameters.searchString || rule.parameters.containsValue || ""
                const matchType = rule.parameters.matchType || "contains"
                const caseSensitive = rule.parameters.caseSensitive || false
                ;({ isValid, message } = validateContains(value, searchString, matchType, caseSensitive))
                break
              case "dependency":
                // Pass the operator parameter (defaulting to "==" for backward compatibility)
                ;({ isValid, message } = validateDependency(
                  value,
                  rowWithTable[rule.parameters.dependsOn],
                  rule.parameters.condition,
                  rule.parameters.operator || "==",
                ))
                break
              case "multi-column":
                const multiColumnResult = validateMultiColumn(rowWithTable, rule.conditions || [], datasets, valueLists)
                console.log(`Multi-column rule "${rule.name}" validation result:`, {
                  isValid: multiColumnResult.isValid,
                  message: multiColumnResult.message,
                  conditions: rule.conditions,
                })
                isValid = multiColumnResult.isValid
                message = multiColumnResult.message
                break
              case "lookup":
                ;({ isValid, message } = validateLookup(
                  rowWithTable,
                  rule.column,
                  rule.parameters.lookupTable,
                  rule.parameters.lookupColumn,
                  rule.parameters.validation,
                  datasets,
                ))
                break
              case "custom":
                ;({ isValid, message } = validateCustom(value, rowWithTable, rule.parameters.functionBody, datasets))
                break
              // Add or modify the validateFormula function to handle the new searchString parameter
              // Find the validateFormula function and update it to properly handle direct boolean expressions
              // Replace the existing validateFormula function with this improved version:
              case "formula":
                // Log formula rule details
                console.log("Processing formula rule:", {
                  ruleName: rule.name,
                  formula: rule.parameters.formula,
                  operator: rule.parameters.operator,
                  value: rule.parameters.value,
                  aggregations: rule.parameters.aggregations,
                  allParameters: rule.parameters,
                })

                // Check if we're using comparison or direct boolean evaluation
                if (rule.parameters.operator && rule.parameters.value !== undefined) {
                  // Use comparison operator
                  ;({ isValid, message } = validateFormula(
                    rowWithTable,
                    rule.parameters.formula,
                    rule.parameters.operator,
                    rule.parameters.value,
                    rule.parameters.aggregations,
                    datasets[rule.table],
                  ))
                } else {
                  // Direct boolean evaluation (like "score / age > 2")
                  ;({ isValid, message } = validateFormula(
                    rowWithTable,
                    rule.parameters.formula,
                    undefined,
                    undefined,
                    rule.parameters.aggregations,
                    datasets[rule.table],
                  ))
                }

                console.log("Formula rule validation result:", {
                  ruleName: rule.name,
                  isValid,
                  message,
                  rowData: {
                    score: rowWithTable.score,
                    age: rowWithTable.age,
                    scoreType: typeof rowWithTable.score,
                    ageType: typeof rowWithTable.age,
                    calculatedValue:
                      rowWithTable.score !== undefined && rowWithTable.age !== undefined
                        ? rowWithTable.score / rowWithTable.age
                        : "N/A",
                  },
                })
                break

              // CRITICAL: Do NOT return immediately - just set the validation result
              // This makes formula rules consistent with other rule types
              // Also update the validateRule function to check both formula and javascriptExpression:

              // Find this case in the switch statement in validateRule:
              //case "javascript-formula":
              //  ;({ isValid, message } = validateJavaScriptFormula(row, rule.parameters.formula))
              //  break
              case "javascript-formula":
                ;({ isValid, message } = validateJavaScriptFormula(
                  row,
                  rule.parameters.formula || rule.parameters.javascriptExpression,
                ))
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
            if (isValid && rule.conditions && rule.conditions.length > 0) {
              console.log(
                `Primary rule passed, checking ${rule.conditions.length} additional conditions for rule ${rule.name}`,
              )
              const conditionsResult = validateMultiColumn(row, rule.conditions, datasets, valueLists)
              console.log(`Conditions validation result:`, conditionsResult)
              isValid = conditionsResult.isValid
              if (!isValid) {
                message = conditionsResult.message
              }
            }

            if (!isValid) {
              validationResult = {
                rowIndex,
                table: rule.table,
                column: rule.column,
                ruleName: rule.name,
                message,
                severity: rule.severity,
                ruleId: rule.id,
              }
            }
          }
      }

      // Add result to results array if we haven't already added one via continue
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

      // Special handling for list rules
      if (rule.ruleType === "list") {
        // This is already handled in the switch statement above
      }
    })
  })

  return results
}

// Find the validateColumnComparison function and replace it with this updated version
// that ensures the rule is only applied to the correct table

function validateColumnComparison(row: DataRecord, rowIndex: number, rule: DataQualityRule): ValidationResult {
  // Add extensive logging to track execution
  console.log("CROSS-COLUMN VALIDATION STARTED:", {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.ruleType,
    table: rule.table,
    rowIndex: rowIndex,
  })

  try {
    const { parameters, table, column } = rule

    // Extract parameters with uniform naming to prevent inconsistencies
    const leftColumn = parameters.leftColumn || column || parameters.column
    const rightColumn = parameters.rightColumn || parameters.secondaryColumn
    const comparisonOperator = parameters.comparisonOperator || parameters.operator || "=="
    const allowNull = parameters.allowNull

    console.log("CROSS-COLUMN PARAMETERS:", {
      leftColumn,
      rightColumn,
      comparisonOperator,
      allowNull,
    })

    // Defensive check for required parameters
    if (!leftColumn || !rightColumn) {
      console.error("CROSS-COLUMN ERROR: Missing column names", {
        leftColumn,
        rightColumn,
        parameters,
      })

      return {
        rowIndex,
        table: table || "",
        column: column || "",
        ruleName: rule.name,
        message: "Rule configuration error: Missing column names",
        severity: rule.severity || "failure",
        ruleId: rule.id,
      }
    }

    // Safely get values from the row
    const leftValue = row.hasOwnProperty(leftColumn) ? row[leftColumn] : undefined
    const rightValue = row.hasOwnProperty(rightColumn) ? row[rightColumn] : undefined

    console.log("CROSS-COLUMN VALUES:", {
      leftColumn,
      leftValue,
      leftValueType: typeof leftValue,
      rightColumn,
      rightValue,
      rightValueType: typeof rightValue,
    })

    // Check if either column is missing from the row
    if (!row.hasOwnProperty(leftColumn) || !row.hasOwnProperty(rightColumn)) {
      console.error("CROSS-COLUMN ERROR: Missing columns", {
        availableColumns: Object.keys(row),
      })

      return {
        rowIndex,
        table: table || "",
        column: leftColumn,
        ruleName: rule.name,
        message: `Column comparison failed: One or both columns (${leftColumn}, ${rightColumn}) not found in data`,
        severity: rule.severity || "failure",
        ruleId: rule.id,
      }
    }

    // Handle null values if allowNull is true
    if (
      allowNull &&
      (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined)
    ) {
      console.log("CROSS-COLUMN: Skipping null values with allowNull=true")

      return {
        rowIndex,
        table: table || "",
        column: leftColumn,
        ruleName: rule.name,
        message: `Skipped validation: One or both values are null/undefined and allowNull is true`,
        severity: "success",
        ruleId: rule.id,
      }
    }

    // If either value is null/undefined and allowNull is false, the validation should fail
    if (
      !allowNull &&
      (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined)
    ) {
      console.log("CROSS-COLUMN FAILURE: Null values with allowNull=false")

      return {
        rowIndex,
        table: table || "",
        column: leftColumn,
        ruleName: rule.name,
        message: `Column comparison failed: One or both values are null/undefined (${leftColumn}=${leftValue}, ${rightColumn}=${rightValue})`,
        severity: rule.severity || "failure",
        ruleId: rule.id,
      }
    }

    // Convert values for comparison if needed
    let compareLeftValue = leftValue
    let compareRightValue = rightValue

    // For numeric comparisons, always convert to numbers
    if (
      (typeof leftValue === "number" || !isNaN(Number(leftValue))) &&
      (typeof rightValue === "number" || !isNaN(Number(rightValue))) &&
      (comparisonOperator === ">" ||
        comparisonOperator === ">=" ||
        comparisonOperator === "<" ||
        comparisonOperator === "<=" ||
        comparisonOperator === "==" ||
        comparisonOperator === "!=")
    ) {
      compareLeftValue = Number(leftValue)
      compareRightValue = Number(rightValue)
      console.log("CROSS-COLUMN: Converting to numbers for comparison", {
        original: { leftValue, rightValue },
        converted: { compareLeftValue, compareRightValue },
      })
    }

    // Perform the comparison
    let isValid = false
    switch (comparisonOperator) {
      case "==":
        isValid = compareLeftValue == compareRightValue
        break
      case "!=":
        isValid = compareLeftValue != compareRightValue
        break
      case ">":
        isValid = compareLeftValue > compareRightValue
        break
      case ">=":
        isValid = compareLeftValue >= compareRightValue
        break
      case "<":
        isValid = compareLeftValue < compareRightValue
        break
      case "<=":
        isValid = compareLeftValue <= compareRightValue
        break
      default:
        console.error("CROSS-COLUMN ERROR: Unknown operator", comparisonOperator)
        isValid = false
    }

    console.log("CROSS-COLUMN COMPARISON RESULT:", {
      comparison: `${leftColumn}(${leftValue}) ${comparisonOperator} ${rightColumn}(${rightValue})`,
      isValid: isValid,
    })

    // Create the validation result
    const result = {
      rowIndex,
      table: table || "",
      column: leftColumn,
      ruleName: rule.name,
      message: isValid
        ? `Passed validation: ${leftColumn} (${leftValue}) ${comparisonOperator} ${rightColumn} (${rightValue})`
        : `Column comparison failed: ${leftColumn} (${leftValue}) ${comparisonOperator} ${rightColumn} (${rightValue})`,
      severity: isValid ? "success" : rule.severity || "failure",
      ruleId: rule.id,
    }

    console.log("CROSS-COLUMN RETURNING:", result)
    return result
  } catch (error) {
    console.error("CROSS-COLUMN UNEXPECTED ERROR:", error)
    return {
      rowIndex,
      table: rule.table || "",
      column: rule.column || "",
      ruleName: rule.name || "Unknown rule",
      message: `Unexpected error during validation: ${error.message || "Unknown error"}`,
      severity: rule.severity || "failure",
      ruleId: rule.id || "unknown",
    }
  }
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
    severity: rule.severity,
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
        const result = validateDateBefore(value, rule.parameters.compareDate, rule.parameters.inclusive)
        isValid = result.isValid
        message = result.message
      }
      break

    case "date-after":
      if (!rule.parameters.compareDate) {
        isValid = true
        message = "No compare date specified"
      } else {
        const result = validateDateAfter(value, rule.parameters.compareDate, rule.parameters.inclusive)
        isValid = result.isValid
        message = result.message
      }
      break

    case "date-between":
      if (!rule.parameters.startDate || !rule.parameters.endDate) {
        isValid = true
        message = "Start or end date not specified"
      } else {
        // Debug logging
        const result = validateDateBetween(
          value,
          rule.parameters.startDate,
          rule.parameters.endDate,
          rule.parameters.inclusive,
        )
        isValid = result.isValid
        message = result.message
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

// Update the validateSingleColumnCondition function to use the correct parameter name
// Also update the `validateSingleColumnCondition` function to better handle blank/non-blank checks:

function validateSingleColumnCondition(
  value: any,
  row: DataRecord,
  condition: ColumnCondition,
  datasets: DataTables,
  valueLists: ValueList[],
): { isValid: boolean; message: string } {
  console.log("validateSingleColumnCondition called with:", {
    value,
    condition,
    availableColumns: Object.keys(row),
  })

  // Special handling for blank/non-blank checks
  if (condition.operator === "is-blank" || condition.operator === "is-not-blank") {
    const isBlank = value === null || value === undefined || value === ""
    const isValid = condition.operator === "is-blank" ? isBlank : !isBlank

    console.log(
      `Blank check for ${condition.column || condition.field}: value="${value}", isBlank=${isBlank}, isValid=${isValid}`,
    )

    return {
      isValid,
      message: isValid ? "" : condition.operator === "is-blank" ? `Value must be blank` : `Value must not be blank`,
    }
  }

  switch (condition.ruleType) {
    case "required":
      return validateRequired(value)

    case "equals":
      return validateEquals(value, condition.parameters.value)

    case "not-equals":
      return validateNotEquals(value, condition.parameters.value)

    case "greater-than":
      return validateGreaterThan(value, condition.parameters.value)

    case "greater-than-equals":
      return validateGreaterThanEquals(value, condition.parameters.value)

    case "less-than":
      return validateLessThan(value, condition.parameters.value)

    case "less-than-equals":
      return validateLessThanEquals(value, condition.parameters.value)

    case "range":
      return validateRange(value, condition.parameters.min, condition.parameters.max)

    case "regex":
      return validateRegex(value, condition.parameters.pattern)

    case "type":
      return validateType(value, condition.parameters.dataType)

    case "enum":
      if (condition.parameters.caseInsensitive === true) {
        const allowedValues = Array.isArray(condition.parameters.allowedValues)
          ? condition.parameters.allowedValues
          : condition.parameters.allowedValues
            ? [condition.parameters.allowedValues]
            : []

        return validateEnumCaseInsensitive(value, allowedValues)
      } else {
        const allowedValues = Array.isArray(condition.parameters.allowedValues)
          ? condition.parameters.allowedValues
          : condition.parameters.allowedValues
            ? [condition.parameters.allowedValues]
            : []

        return validateEnum(value, allowedValues)
      }

    case "list":
      return validateList(value, condition.parameters.listId || condition.parameters.valueList, valueLists)

    case "contains":
      console.log("Contains condition parameters:", {
        column: condition.column,
        value,
        searchString: condition.parameters.searchString || condition.parameters.containsValue || "",
        matchType: condition.parameters.matchType || "contains",
        caseSensitive: condition.parameters.caseSensitive || false,
        allParameters: condition.parameters,
      })

      return validateContains(
        value,
        condition.parameters.searchString || condition.parameters.containsValue || "",
        condition.parameters.matchType || "contains",
        condition.parameters.caseSensitive || false,
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

    case "dependency":
      return validateDependency(
        value,
        row[condition.parameters.dependsOn],
        condition.parameters.condition,
        condition.parameters.operator || "==",
      )

    default:
      // Handle direct operator-based conditions (from the UI)
      if (condition.operator) {
        switch (condition.operator) {
          case "==":
            return validateEquals(value, condition.value)
          case "!=":
            return validateNotEquals(value, condition.value)
          case ">":
            return validateGreaterThan(value, condition.value)
          case ">=":
            return validateGreaterThanEquals(value, condition.value)
          case "<":
            return validateLessThan(value, condition.value)
          case "<=":
            return validateLessThanEquals(value, condition.value)
          case "contains":
            return validateContains(value, condition.value, "contains", false)
          case "not-contains":
            const containsResult = validateContains(value, condition.value, "contains", false)
            return {
              isValid: !containsResult.isValid,
              message: containsResult.isValid ? "Value should not contain the specified text" : "",
            }
          case "starts-with":
            return validateContains(value, condition.value, "starts-with", false)
          case "ends-with":
            return validateContains(value, condition.value, "ends-with", false)
          case "matches":
            return validateRegex(value, condition.value)
          // is-blank and is-not-blank are handled at the beginning of the function
        }
      }

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

  // Add specific debugging for list rules
  if (rule.ruleType === "list") {
    debugRule(rule, "List Rule Debug - validateRule")
    console.log(`Row data for column ${rule.column}:`, row[rule.column])

    // Check if the list exists
    const listId = rule.parameters.listId
    if (listId) {
      const list = valueLists.find((l) => l.id === listId)
      if (list) {
        console.log(`List found: ${list.name}, Values: ${list.values.join(", ")}`)
      } else {
        console.log(`List with ID ${listId} not found!`)
      }
    } else {
      console.log(`No listId parameter found in rule!`)
    }
  }

  let isValid = true
  let message = ""

  // First validate the primary rule
  switch (rule.ruleType) {
    case "required":
      ;({ isValid, message } = validateRequired(value))
      break

    // In the validateRule function, find the "equals" case and update it to use "value" instead of "compareValue"
    case "equals":
      ;({ isValid, message } = validateEquals(value, rule.parameters.value))
      break

    // In the validateRule function, find the "not-equals" case and update it to use the correct parameter name:
    // Replace:
    // case "not-equals":
    //   ;({ isValid, message } = validateNotEquals(value, rule.parameters.compareValue))
    //   break

    // With:
    case "not-equals":
      ;({ isValid, message } = validateNotEquals(value, rule.parameters.value))
      console.log(`Not equals validation result for ${rule.name}:`, {
        value,
        compareValue: rule.parameters.value,
        isValid,
      })
      break

    // In the validateRule function, find the "greater-than" case and update it to use "value" instead of "compareValue"
    case "greater-than":
      ;({ isValid, message } = validateGreaterThan(value, rule.parameters.value))
      break

    case "greater-than-equals":
      ;({ isValid, message } = validateGreaterThanEquals(value, rule.parameters.value))
      break

    case "less-than":
      ;({ isValid, message } = validateLessThan(value, rule.parameters.value))
      break

    case "less-than-equals":
      ;({ isValid, message } = validateLessThanEquals(value, rule.parameters.value))
      break

    // Find the validateRule function and update it to handle undefined min/max values better
    // Also update the validateRule function's "range" case to ensure parameters are correctly passed
    // Find this section in the validateRule function:

    case "range":
      // Add debug logging for range rule
      console.log("Processing range rule:", {
        ruleName: rule.name,
        value,
        min: rule.parameters.min,
        max: rule.parameters.max,
        allParameters: rule.parameters,
      })
      // Make sure we're passing the correct parameters
      ;({ isValid, message } = validateRange(
        value,
        rule.parameters.min !== undefined ? rule.parameters.min : rule.parameters.minValue,
        rule.parameters.max !== undefined ? rule.parameters.max : rule.parameters.maxValue,
      ))
      break

    case "regex":
      ;({ isValid, message } = validateRegex(value, rule.parameters.pattern))
      break

    case "unique":
      // Add debug logging for unique rule
      console.log("Processing unique rule:", {
        ruleName: rule.name,
        column: rule.column,
        allParameters: rule.parameters,
      })

      // Get the unique columns from the parameters
      const uniqueColumns = rule.parameters.uniqueColumns || [rule.column]

      // Check if the current row has null values in any of the unique columns
      // If so, skip validation (allow null values to be duplicated)
      const hasNullValue = uniqueColumns.some((col) => row[col] === null || row[col] === undefined)
      if (hasNullValue) {
        console.log("Unique validation: Skipping row with null value in key columns", {
          rowIndex,
          uniqueColumns,
          values: uniqueColumns.map((col) => row[col]),
        })
        return null // Skip validation for rows with null values
      }

      // For non-null values, check for duplicates
      const tableData = datasets[rule.table]
      if (tableData) {
        // Build the current row's composite key
        const currentRowKey = uniqueColumns.map((col) => String(row[col])).join("||")

        // Check against all other rows (excluding the current row)
        for (let i = 0; i < tableData.length; i++) {
          // Skip comparing the row with itself
          if (i === rowIndex) continue

          const otherRow = tableData[i]

          // Skip rows that have null values in any of the unique columns
          const otherRowHasNullValue = uniqueColumns.some(
            (col) => otherRow[col] === null || otherRow[col] === undefined,
          )

          if (otherRowHasNullValue) continue

          // Build composite key for the other row
          const otherRowKey = uniqueColumns.map((col) => String(otherRow[col])).join("||")

          // If the keys match, we found a duplicate
          if (currentRowKey === otherRowKey) {
            console.log("Unique validation: Found duplicate", {
              rowIndex,
              otherRowIndex: i,
              key: currentRowKey,
            })

            return {
              rowIndex,
              table: rule.table,
              column: rule.column,
              ruleName: rule.name,
              message: `Duplicate value(s) found in column(s): ${uniqueColumns.join(", ")}`,
              severity: rule.severity,
              ruleId: rule.id,
            }
          }
        }
      }

      // No duplicates found
      return null

    case "type":
      ;({ isValid, message } = validateType(value, rule.parameters.dataType))
      break

    case "enum":
      // Add debug logging for enum rule
      console.log("Processing enum rule:", {
        ruleName: rule.name,
        value,
        allowedValues: rule.parameters.allowedValues,
        caseInsensitive: rule.parameters.caseInsensitive,
      })

      if (rule.parameters.caseInsensitive === true) {
        // Ensure allowedValues exists and is an array
        const allowedValues = Array.isArray(rule.parameters.allowedValues)
          ? rule.parameters.allowedValues
          : typeof rule.parameters.allowedValues === "string"
            ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
            : rule.parameters.allowedValues
              ? [rule.parameters.allowedValues]
              : []

        console.log("Enum validation with values:", allowedValues)
        ;({ isValid, message } = validateEnumCaseInsensitive(value, allowedValues))
      } else {
        // Ensure allowedValues exists and is an array
        const allowedValues = Array.isArray(rule.parameters.allowedValues)
          ? rule.parameters.allowedValues
          : typeof rule.parameters.allowedValues === "string"
            ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
            : rule.parameters.allowedValues
              ? [rule.parameters.allowedValues]
              : []

        console.log("Enum validation with values:", allowedValues)
        ;({ isValid, message } = validateEnum(value, allowedValues))
      }
      break

    // Finally, update the validateRule function to handle both parameter names
    // Find the "list" case in the switch statement and update it:
    case "list":
      const listResult = validateList(value, rule.parameters.listId || rule.parameters.valueList, valueLists)
      isValid = listResult.isValid
      message = listResult.message

      // Log the list validation result
      console.log(`List rule validation (${rule.name}): ${isValid ? "PASS" : "FAIL"}`, {
        value,
        listId: rule.parameters.listId || rule.parameters.valueList,
        message,
      })
      break

    // Also update the validateRule function's "contains" case to ensure parameters are correctly handled
    // Find this section in the validateRule function:
    case "contains":
      // Handle both parameter names for backward compatibility
      const searchString = rule.parameters.searchString || rule.parameters.containsValue || ""
      const matchType = rule.parameters.matchType || "contains"
      const caseSensitive = rule.parameters.caseSensitive || false

      // Add debug logging
      console.log("Contains rule parameters:", {
        ruleName: rule.name,
        column: rule.column,
        value,
        searchString,
        matchType,
        caseSensitive,
        allParameters: rule.parameters,
      })
      ;({ isValid, message } = validateContains(value, searchString, matchType, caseSensitive))
      break

    case "dependency":
      // Pass the operator parameter (defaulting to "==" for backward compatibility)
      ;({ isValid, message } = validateDependency(
        value,
        row[rule.parameters.dependsOn],
        rule.parameters.condition,
        rule.parameters.operator || "==",
      ))
      break

    case "multi-column":
      const multiColumnResult = validateMultiColumn(row, rule.conditions || [], datasets, valueLists)
      console.log(`Multi-column rule "${rule.name}" validation result:`, {
        isValid: multiColumnResult.isValid,
        message: multiColumnResult.message,
        conditions: rule.conditions,
      })
      isValid = multiColumnResult.isValid
      message = multiColumnResult.message
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

    // Add or modify the validateFormula function to handle the new searchString parameter
    // Find the validateFormula function and update it to properly handle direct boolean expressions
    // Replace the existing validateFormula function with this improved version:
    case "formula":
      // Log formula rule details
      console.log("Processing formula rule:", {
        ruleName: rule.name,
        formula: rule.parameters.formula,
        operator: rule.parameters.operator,
        value: rule.parameters.value,
        aggregations: rule.parameters.aggregations,
        allParameters: rule.parameters,
      })

      // Check if we're using comparison or direct boolean evaluation
      if (rule.parameters.operator && rule.parameters.value !== undefined) {
        // Use comparison operator
        ;({ isValid, message } = validateFormula(
          rowWithTable,
          rule.parameters.formula,
          rule.parameters.operator,
          rule.parameters.value,
          rule.parameters.aggregations,
          datasets[rule.table],
        ))
      } else {
        // Direct boolean evaluation (like "score / age > 2")
        ;({ isValid, message } = validateFormula(
          rowWithTable,
          rule.parameters.formula,
          undefined,
          undefined,
          rule.parameters.aggregations,
          datasets[rule.table],
        ))
      }

      console.log("Formula rule validation result:", {
        ruleName: rule.name,
        isValid,
        message,
        rowData: {
          score: rowWithTable.score,
          age: rowWithTable.age,
          scoreType: typeof rowWithTable.score,
          ageType: typeof rowWithTable.age,
          calculatedValue:
            rowWithTable.score !== undefined && rowWithTable.age !== undefined
              ? rowWithTable.score / rowWithTable.age
              : "N/A",
        },
      })
      break

    // CRITICAL: Do NOT return immediately - just set the validation result
    // This makes formula rules consistent with other rule types
    // Also update the validateRule function to check both formula and javascriptExpression:

    // Find this case in the switch statement in validateRule:
    //case "javascript-formula":
    //  ;({ isValid, message } = validateJavaScriptFormula(row, rule.parameters.formula))
    //  break
    case "javascript-formula":
      ;({ isValid, message } = validateJavaScriptFormula(
        row,
        rule.parameters.formula || rule.parameters.javascriptExpression,
      ))
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
    const additionalResult = validateMultiColumn(row, rule.additionalConditions, datasets, valueLists)
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

  if (rule.ruleType === "formula") {
    console.log(`Final formula validation result for ${rule.name}:`, {
      isValid,
      message,
      willReturnFailure: !isValid,
      failureObject: !isValid
        ? {
            rowIndex,
            table: rule.table,
            column: rule.column,
            ruleName: rule.name,
            message,
            severity: rule.severity,
            ruleId: rule.id,
          }
        : null,
    })
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

// Completely re-implemented JavaScript formula validation with a safer approach
function validateJavaScriptFormula(row: DataRecord, formula?: string): { isValid: boolean; message: string } {
  if (!formula) {
    console.warn("No formula provided for JavaScript formula validation")
    return { isValid: true, message: "" }
  }

  // Extract the specific values we need for common formulas
  const amount = row.amount !== undefined ? Number(row.amount) : undefined
  const refundAmount = row.refundAmount !== undefined ? Number(row.refundAmount) : undefined
  const processingFee = row.processingFee !== undefined ? Number(row.processingFee) : undefined
  const age = row.age !== undefined ? Number(row.age) : undefined

  // Log input data for debugging
  console.log("JavaScript Formula Validation:", {
    formula,
    rowData: {
      amount,
      refundAmount,
      processingFee,
      age,
      rawAmount: row.amount,
      rawRefundAmount: row.refundAmount,
      rawProcessingFee: row.processingFee,
      rawAge: row.age,
    },
  })

  try {
    // Check for common syntax errors - replace single equals with double equals
    // This helps catch the common mistake of using = instead of == in conditions
    let safeFormula = formula

    // Only replace standalone = not part of ==, >=, <= or !=
    safeFormula = safeFormula.replace(/([^=!<>])=([^=])/g, "$1==$2")

    // For common formula patterns, use direct evaluation
    if (
      safeFormula.includes("amount") &&
      safeFormula.includes("refundAmount") &&
      safeFormula.includes("processingFee")
    ) {
      // Check if we have all the required values
      if (amount === undefined || refundAmount === undefined || processingFee === undefined) {
        console.warn("Missing required values for formula evaluation:", { amount, refundAmount, processingFee })
        return {
          isValid: false,
          message: `Cannot evaluate formula: missing required values. Found: amount=${amount}, refundAmount=${refundAmount}, processingFee=${processingFee}`,
        }
      }

      // Calculate the result directly
      let result: boolean
      let calculation: number
      let comparison: boolean

      // Evaluate the formula directly based on common patterns
      if (safeFormula.match(/amount\s*-\s*refundAmount\s*-\s*processingFee\s*>\s*0/)) {
        calculation = amount - refundAmount - processingFee
        comparison = calculation > 0
        result = comparison

        console.log("Direct evaluation:", {
          calculation: `${amount} - ${refundAmount} - ${processingFee} = ${calculation}`,
          comparison: `${calculation} > 0`,
          result,
        })

        // Return the actual result of the comparison
        return {
          isValid: result,
          message: result
            ? "Passed JavaScript formula validation"
            : `JavaScript formula evaluated to false: ${formula} (calculation: ${amount} - ${refundAmount} - ${processingFee} = ${calculation} is NOT > 0)`,
        }
      } else if (safeFormula.match(/amount\s*-\s*refundAmount\s*-\s*processingFee\s*<\s*0/)) {
        calculation = amount - refundAmount - processingFee
        comparison = calculation < 0
        result = comparison

        console.log("Direct evaluation:", {
          calculation: `${amount} - ${refundAmount} - ${processingFee} = ${calculation}`,
          comparison: `${calculation} < 0`,
          result,
        })

        // Return the actual result of the comparison
        return {
          isValid: result,
          message: result
            ? "Passed JavaScript formula validation"
            : `JavaScript formula evaluated to false: ${formula} (calculation: ${amount} - ${refundAmount} - ${processingFee} = ${calculation} is NOT < 0)`,
        }
      } else if (safeFormula.match(/amount\s*-\s*refundAmount\s*-\s*processingFee\s*>=\s*0/)) {
        calculation = amount - refundAmount - processingFee
        comparison = calculation >= 0
        result = comparison

        console.log("Direct evaluation:", {
          calculation: `${amount} - ${refundAmount} - ${processingFee} = ${calculation}`,
          comparison: `${calculation} >= 0`,
          result,
        })

        // Return the actual result of the comparison
        return {
          isValid: result,
          message: result
            ? "Passed JavaScript formula validation"
            : `JavaScript formula evaluated to false: ${formula} (calculation: ${amount} - ${refundAmount} - ${processingFee} = ${calculation} is NOT >= 0)`,
        }
      } else if (safeFormula.match(/amount\s*-\s*refundAmount\s*-\s*processingFee\s*<=\s*0/)) {
        calculation = amount - refundAmount - processingFee
        comparison = calculation <= 0
        result = comparison

        console.log("Direct evaluation:", {
          calculation: `${amount} - ${refundAmount} - ${processingFee} = ${calculation}`,
          comparison: `${calculation} <= 0`,
          result,
        })

        // Return the actual result of the comparison
        return {
          isValid: result,
          message: result
            ? "Passed JavaScript formula validation"
            : `JavaScript formula evaluated to false: ${formula} (calculation: ${amount} - ${refundAmount} - ${processingFee} = ${calculation} is NOT <= 0)`,
        }
      }
    }

    // Simple age check pattern
    if (safeFormula.includes("age") && !safeFormula.includes("score")) {
      if (age === undefined) {
        console.warn("Missing required value for age formula evaluation:", { age })
        return {
          isValid: false,
          message: `Cannot evaluate formula: missing required value. Found: age=${age}`,
        }
      }

      // Handle simple age > 0 pattern
      if (safeFormula.match(/age\s*>\s*0/)) {
        const result = age > 0
        console.log("Direct age evaluation:", {
          comparison: `${age} > 0`,
          result,
        })

        return {
          isValid: result,
          message: result
            ? "Passed JavaScript formula validation"
            : `JavaScript formula evaluated to false: ${formula} (${age} is NOT > 0)`,
        }
      }
    }

    // Use Function constructor to create a function that returns the result of evaluating the formula
    // This is safer than using eval and provides proper error messages
    try {
      // Create a function that has access to row properties as parameters
      const paramNames = Object.keys(row)
      const paramValues = paramNames.map((key) => row[key])

      // Create a function that evaluates the formula with the row data
      const evalFunc = new Function(
        ...paramNames,
        `"use strict"; 
           try { 
             return Boolean(${safeFormula}); 
           } catch(err) { 
             console.error("Formula evaluation error:", err.message); 
             throw new Error("Invalid formula: " + err.message); 
           }`,
      )

      // Execute the function with the row values
      const result = evalFunc(...paramValues)

      console.log("Formula evaluation result:", result)

      return {
        isValid: result,
        message: result ? "Passed JavaScript formula validation" : `JavaScript formula evaluated to false: ${formula}`,
      }
    } catch (error) {
      console.error("JavaScript formula compilation error:", error)
      return {
        isValid: false,
        message: `Error in JavaScript formula syntax: ${error.message}
Formula: ${formula}`,
      }
    }
  } catch (error) {
    console.error("JavaScript formula evaluation error:", error)
    return {
      isValid: false,
      message: `Error evaluating JavaScript formula: ${error.message}
Formula: ${formula}
Row data: ${JSON.stringify(row)}`,
    }
  }
}

// Also add the missing validateFormula function
// Find the validateFormula function and completely replace it with this version that fixes the SUM function issue:

// Improved validateFormula function with better handling of all Math Formula rules
function validateFormula(
  row: DataRecord,
  formula?: string,
  operator?: string,
  value?: number,
  aggregations?: AggregationConfig[],
  dataset?: DataRecord[],
): { isValid: boolean; message: string } {
  if (!formula || formula.trim() === "") {
    console.warn("Empty formula provided to validateFormula")
    return { isValid: false, message: "Empty formula provided" }
  }

  try {
    // Add these debug logs
    console.log("FORMULA DEBUG - Raw inputs:", {
      formula,
      operator,
      value,
      hasOperator: operator !== undefined,
      hasValue: value !== undefined,
      aggregationsCount: aggregations?.length || 0,
      datasetRowCount: dataset?.length || 0,
      rowData: row,
    })

    // CRITICAL FIX: Create a lookup table for aggregation functions to replace them with concrete values
    const aggregationValues: Record<string, number> = {}

    if (aggregations?.length && dataset?.length) {
      // Pre-compute all aggregation values and store them in the lookup table
      aggregations.forEach((agg) => {
        const funcName = getFunctionName(agg.function).toUpperCase()
        const columnName = agg.column.replace(/"/g, "") // Remove any quotes

        // Compute the aggregation
        const value = computeAggregation(dataset, agg)

        // Store with both quoted and unquoted versions to handle all cases
        const key1 = `${funcName}("${columnName}")`
        const key2 = `${funcName}(${columnName})`

        aggregationValues[key1] = value
        aggregationValues[key2] = value

        console.log(`Pre-computed aggregation: ${key1} = ${value}`)
      })
    }

    // Modified approach: Replace aggregation functions in the formula with their values
    let processedFormula = formula

    // Replace aggregation function patterns with their pre-computed values
    if (Object.keys(aggregationValues).length > 0) {
      // Start with the longer keys (with quotes) to avoid partial replacements
      const sortedKeys = Object.keys(aggregationValues).sort((a, b) => b.length - a.length)

      for (const key of sortedKeys) {
        // Replace all occurrences of this aggregation function with its numerical value
        processedFormula = processedFormula.replace(
          new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          aggregationValues[key].toString(),
        )
      }

      console.log(`Preprocessed formula: ${formula} -> ${processedFormula}`)
    }

    // Check if the formula already contains a comparison operator
    const hasComparisonOperator = /[<>]=?|[!=]=/.test(processedFormula)

    // Case 1: Formula contains its own comparison operator
    if (hasComparisonOperator) {
      console.log(`MATH FORMULA DEBUG: Formula contains comparison operator: ${processedFormula}`)

      // Evaluate the entire expression including the comparison
      try {
        // Define a sandbox with only the row properties and math functions
        const sandbox: Record<string, any> = { ...row }
        // Add Math functions that might be used
        sandbox.Math = Math

        // Create parameter list and values array
        const paramNames = Object.keys(sandbox)
        const paramValues = paramNames.map((key) => sandbox[key])

        // Create a function that safely evaluates the formula
        const evalFunc = new Function(
          ...paramNames,
          `"use strict";
          try {
            return Boolean(${processedFormula});
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
        )

        // Execute the function with sandbox values
        const result = evalFunc(...paramValues)
        const isValid = Boolean(result)

        console.log(
          `Formula with comparison: ${processedFormula} evaluated to: ${result} (${typeof result}), isValid = ${isValid}`,
        )

        return {
          isValid,
          message: isValid
            ? `Passed validation: ${processedFormula}`
            : `Failed validation: ${processedFormula} evaluated to false`,
        }
      } catch (error) {
        console.error("Error executing formula with comparison:", error)
        return { isValid: false, message: `Error executing formula: ${error.message}` }
      }
    }
    // Case 2: Formula without comparison operator but with separate operator and value parameters
    else if (operator !== undefined && value !== undefined) {
      console.log(`MATH FORMULA DEBUG: Using provided operator and value: ${processedFormula} ${operator} ${value}`)

      // First evaluate the formula to get a numeric result
      try {
        // Define a sandbox with only the row properties and math functions
        const sandbox: Record<string, any> = { ...row }
        // Add Math functions that might be used
        sandbox.Math = Math

        // Create parameter list and values array
        const paramNames = Object.keys(sandbox)
        const paramValues = paramNames.map((key) => sandbox[key])

        // Create a function that safely evaluates the formula
        const evalFunc = new Function(
          ...paramNames,
          `"use strict";
          try {
            return ${processedFormula};
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
        )

        // Get the computed value
        let computedValue = evalFunc(...paramValues)

        console.log("Formula computed value:", computedValue, typeof computedValue)

        // Ensure we're working with numbers for comparison
        if (typeof computedValue === "string") {
          const numValue = Number(computedValue)
          if (!isNaN(numValue)) {
            computedValue = numValue
            console.log(`Converted string value to number: ${computedValue}`)
          }
        }

        // Now compare with the expected value
        let isValid = false
        switch (operator) {
          case "==":
            isValid = computedValue == value
            break
          case "!=":
            isValid = computedValue != value
            break
          case ">":
            isValid = computedValue > value
            break
          case ">=":
            isValid = computedValue >= value
            break
          case "<":
            isValid = computedValue < value
            break
          case "<=":
            isValid = computedValue <= value
            break
          default:
            isValid = false
            console.error(`Unknown operator: ${operator}`)
        }

        console.log(
          `MATH FORMULA RESULT: Formula "${processedFormula}" = ${computedValue}, comparison: ${computedValue} ${operator} ${value} = ${isValid}`,
        )

        return {
          isValid,
          message: isValid
            ? `Passed validation: ${processedFormula} ${operator} ${value}`
            : `Failed validation: ${computedValue} ${operator} ${value} is false`,
        }
      } catch (error) {
        console.error("Error computing formula value:", error)
        return { isValid: false, message: `Error computing formula value: ${error.message}` }
      }
    }
    // Case 3: Formula without comparison operator and without separate operator/value
    else {
      console.log(`MATH FORMULA DEBUG: Formula has no comparison: ${processedFormula}`)

      // For other formulas without explicit comparison
      try {
        // Define a sandbox with only the row properties and math functions
        const sandbox: Record<string, any> = { ...row }
        // Add Math functions that might be used
        sandbox.Math = Math

        // Create parameter list and values array
        const paramNames = Object.keys(sandbox)
        const paramValues = paramNames.map((key) => sandbox[key])

        // Create a function that safely evaluates the formula
        const evalFunc = new Function(
          ...paramNames,
          `"use strict";
          try {
            return ${processedFormula};
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
        )

        const result = evalFunc(...paramValues)
        console.log(`Formula without comparison evaluated to: ${result} (${typeof result})`)

        // For numeric results, apply a default comparison
        if (typeof result === "number") {
          // Default comparison: is the number positive?
          const isValid = result > 0

          console.log(`Applied default comparison for numeric result: ${result} > 0 = ${isValid}`)

          return {
            isValid,
            message: isValid
              ? `Passed validation: ${processedFormula} evaluated to ${result} (> 0)`
              : `Failed validation: ${processedFormula} evaluated to ${result} (not > 0)`,
          }
        }
        // For boolean results, use directly
        else if (typeof result === "boolean") {
          console.log(`Using boolean result directly: ${result}`)

          return {
            isValid: result,
            message: result
              ? `Passed validation: ${processedFormula} evaluated to true`
              : `Failed validation: ${processedFormula} evaluated to false`,
          }
        }
        // For other types, convert to boolean but log a warning
        else {
          console.warn(
            `Formula "${processedFormula}" returned non-numeric, non-boolean result: ${result}. Converting to boolean.`,
          )

          const isValid = Boolean(result)
          return {
            isValid,
            message: isValid
              ? `Passed validation: ${processedFormula} evaluated to truthy value`
              : `Failed validation: ${processedFormula} evaluated to falsy value`,
          }
        }
      } catch (error) {
        console.error("Error evaluating formula:", error)
        return { isValid: false, message: `Error evaluating formula: ${error.message}` }
      }
    }
  } catch (error) {
    console.error("Math Formula validation error:", error)
    return {
      isValid: false,
      message: `Error in math formula: ${error.message}
Formula: ${formula}`,
    }
  }
}

// Helper function to extract the function name from a string
function getFunctionName(name: string): string {
  switch (name.toLowerCase()) {
    case "sum":
      return "sum"
    case "avg":
      return "avg"
    case "count":
      return "count"
    case "min":
      return "min"
    case "max":
      return "max"
    case "distinct_count":
      return "distinct-count"
    default:
      return name.toLowerCase()
  }
}

// Remove the evaluateSimpleFormula function as we're now using a more direct approach
const validateCrossTableConditions = (row: DataRecord, crossTableConditions: any[], datasets: DataTables) => {
  if (!crossTableConditions || crossTableConditions.length === 0) {
    return { isValid: true, message: "" }
  }

  for (const condition of crossTableConditions) {
    const { table, column, conditionTable, conditionColumn, operator } = condition

    // Get the value from the current row
    const value = row[column]

    // Check if the condition table exists
    if (!datasets[conditionTable]) {
      return { isValid: false, message: `Condition table ${conditionTable} not found` }
    }

    // Check if the condition column exists in the condition table
    const conditionData = datasets[conditionTable]
    if (!conditionData || conditionData.length === 0 || !conditionData[0][conditionColumn]) {
      return { isValid: false, message: `Condition column ${conditionColumn} not found in table ${conditionTable}` }
    }

    let isValid = false
    switch (operator) {
      case "exists":
        isValid = conditionData.some((item) => item[conditionColumn] == value)
        break
      case "not-exists":
        isValid = !conditionData.some((item) => item[conditionColumn] == value)
        break
      default:
        return { isValid: false, message: `Unknown operator: ${operator}` }
    }

    if (!isValid) {
      return {
        isValid: false,
        message: `Cross-table condition failed: value ${value} in ${column} ${operator} in ${conditionTable}.${conditionColumn}`,
      }
    }
  }

  return { isValid: true, message: "" }
}

// Replace the `validateUnique` function with this improved version:

function validateUnique(
  row: DataRecord,
  rowIndex: number,
  rule: DataQualityRule,
  datasets: DataTables,
): ValidationResult | null {
  // Add debug logging for unique rule
  console.log("Processing unique rule:", {
    ruleName: rule.name,
    column: rule.column,
    allParameters: rule.parameters,
  })

  // Get the unique columns from the parameters
  const uniqueColumns = rule.parameters.uniqueColumns || [rule.column]

  // Check if the current row has null values in any of the unique columns
  // If so, skip validation (allow null values to be duplicated)
  const hasNullValue = uniqueColumns.some((col) => row[col] === null || row[col] === undefined)
  if (hasNullValue) {
    console.log("Unique validation: Skipping row with null value in key columns", {
      rowIndex,
      uniqueColumns,
      values: uniqueColumns.map((col) => row[col]),
    })
    return null // Skip validation for rows with null values
  }

  // For non-null values, check for duplicates
  const tableData = datasets[rule.table]
  if (tableData) {
    // Build the current row's composite key
    const currentRowKey = uniqueColumns.map((col) => String(row[col])).join("||")

    // Check against all other rows (excluding the current row)
    for (let i = 0; i < tableData.length; i++) {
      // Skip comparing the row with itself
      if (i === rowIndex) continue

      const otherRow = tableData[i]

      // Skip rows that have null values in any of the unique columns
      const otherRowHasNullValue = uniqueColumns.some((col) => otherRow[col] === null || otherRow[col] === undefined)

      if (otherRowHasNullValue) continue

      // Build composite key for the other row
      const otherRowKey = uniqueColumns.map((col) => String(otherRow[col])).join("||")

      // If the keys match, we found a duplicate
      if (currentRowKey === otherRowKey) {
        console.log("Unique validation: Found duplicate", {
          rowIndex,
          otherRowIndex: i,
          key: currentRowKey,
        })

        return {
          rowIndex,
          table: rule.table,
          column: rule.column,
          ruleName: rule.name,
          message: `Duplicate value(s) found in column(s): ${uniqueColumns.join(", ")}`,
          severity: rule.severity,
          ruleId: rule.id,
        }
      }
    }
  }

  // No duplicates found
  return null
}

// Define AggregationConfig interface
interface AggregationConfig {
  column: string
  function: string
  filter?: {
    column: string
    operator: string
    value: any
  }
}

interface Condition {
  column: string
  field: string
  operator: string
  value: any
  logicalOperator: string
}
