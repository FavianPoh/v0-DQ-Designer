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

// Define validateDependency at the top level
function validateDependency(value: any, dependsOnValue: any, condition: any): { isValid: boolean; message: string } {
  let isValid = true
  let message = ""

  if (condition === "required") {
    isValid = dependsOnValue !== null && dependsOnValue !== undefined && dependsOnValue !== ""
    message = isValid ? "" : "This field is required because another field has a value"
  } else {
    isValid = true
  }

  return {
    isValid,
    message,
  }
}

// Define validateMultiColumn at the top level
function validateMultiColumn(
  row: DataRecord,
  conditions: any[],
  datasets: DataTables,
  valueLists: ValueList[],
): { isValid: boolean; message: string } {
  let isValid = true
  let message = ""

  for (const condition of conditions) {
    const columnValue = row[condition.column]
    const conditionResult = validateSingleColumnCondition(columnValue, row, condition, datasets, valueLists)

    if (!conditionResult.isValid) {
      isValid = false
      message = conditionResult.message
      break
    }
  }

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

  // SPECIAL CASE: Empty string, null, and undefined are considered equivalent
  if (compareValue === "") {
    // If we're checking for an empty string, then null and undefined should also pass
    const isValid = value === "" || value === null || value === undefined
    console.log(`Empty string comparison result: ${isValid}`)
    console.log(`Reason: compareValue is empty string, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal ""`,
    }
  }

  // SPECIAL CASE: Null comparison
  if (compareValue === null) {
    // Only null should match null
    const isValid = value === null
    console.log(`Null comparison result: ${isValid}`)
    console.log(`Reason: compareValue is null, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal null`,
    }
  }

  // SPECIAL CASE: Undefined comparison
  if (compareValue === undefined) {
    // Only undefined should match undefined
    const isValid = value === undefined
    console.log(`Undefined comparison result: ${isValid}`)
    console.log(`Reason: compareValue is undefined, value is ${valueStr}`)
    console.log("=== EQUALS VALIDATION END ===")
    return {
      isValid,
      message: isValid ? "" : `Value must equal undefined`,
    }
  }

  // For all other cases, use loose equality (==) to allow type coercion
  // This handles cases like comparing "5" with 5
  const isValid = value == compareValue
  console.log(`Standard comparison result: ${isValid}`)
  console.log(`Reason: Using loose equality, ${valueStr} == ${compareValueStr} is ${isValid}`)
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

    const tableData = datasets[rule.table]
    if (!tableData) {
      console.log(`Table ${rule.table} not found for rule ${rule.name}`)
      return
    }

    // Process each row in the table
    tableData.forEach((row, rowIndex) => {
      let validationResult: ValidationResult | null = null

      // Special handling for date rules
      if (rule.ruleType.startsWith("date-")) {
        validationResult = validateDateRuleWithSafeguards(row, rowIndex, rule)
        if (validationResult) {
          results.push(validationResult)
        }
        return // Skip the rest of the processing for date rules
      }

      // Process rule based on its type
      switch (rule.ruleType) {
        case "column-comparison":
          validationResult = validateColumnComparison(row, rowIndex, rule)
          break
        case "math-operation":
          validationResult = validateMathOperation(row, rowIndex, rule)
          break
        case "composite-reference":
          validationResult = validateCompositeReference(row, rowIndex, rule, datasets)
          break
        case "reference-integrity":
          validationResult = validateReferenceIntegrity(row, rowIndex, rule, datasets)
          break
        case "unique":
          validationResult = validateUnique(row, rowIndex, rule, datasets)
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
            const jsFormulaResult = validateJavaScriptFormula(row, formula)
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
            validationResult = validateColumnConditions(row, rowIndex, rule, datasets, valueLists)
          }
          // Check for cross-table conditions
          else if (rule.crossTableConditions && rule.crossTableConditions.length > 0) {
            const crossTableResult = validateCrossTableConditions(row, rule.crossTableConditions, datasets)
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
            const value = row[rule.column]
            let isValid = true
            let message = ""

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
                if (rule.parameters.caseInsensitive === true) {
                  const allowedValues = Array.isArray(rule.parameters.allowedValues)
                    ? rule.parameters.allowedValues
                    : typeof rule.parameters.allowedValues === "string"
                      ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
                      : rule.parameters.allowedValues
                        ? [rule.parameters.allowedValues]
                        : []
                  ;({ isValid, message } = validateEnumCaseInsensitive(value, allowedValues))
                } else {
                  const allowedValues = Array.isArray(rule.parameters.allowedValues)
                    ? rule.parameters.allowedValues
                    : typeof rule.parameters.allowedValues === "string"
                      ? rule.parameters.allowedValues.split(",").map((v) => v.trim())
                      : rule.parameters.allowedValues
                        ? [rule.parameters.allowedValues]
                        : []
                  ;({ isValid, message } = validateEnum(value, allowedValues))
                }
                break
              case "list":
                const listResult = validateList(value, rule.parameters.listId || rule.parameters.valueList, valueLists)
                isValid = listResult.isValid
                message = listResult.message
                break
              case "contains":
                const searchString = rule.parameters.searchString || rule.parameters.containsValue || ""
                const matchType = rule.parameters.matchType || "contains"
                const caseSensitive = rule.parameters.caseSensitive || false
                ;({ isValid, message } = validateContains(value, searchString, matchType, caseSensitive))
                break
              case "dependency":
                ;({ isValid, message } = validateDependency(
                  value,
                  row[rule.parameters.dependsOn],
                  rule.parameters.condition,
                ))
                break
              case "multi-column":
                ;({ isValid, message } = validateMultiColumn(row, rule.conditions || [], datasets, valueLists))
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
                if (rule.parameters.operator && rule.parameters.value !== undefined) {
                  ;({ isValid, message } = validateFormula(
                    row,
                    rule.parameters.formula,
                    rule.parameters.operator,
                    rule.parameters.value,
                  ))
                } else {
                  ;({ isValid, message } = validateFormula(row, rule.parameters.formula))
                }
                break
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

      // Add result to results array
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

// Enhanced function to validate column comparison rules\
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
      return validateEquals(value, condition.parameters.value)

    case "not-equals":
      return validateNotEquals(value, condition.parameters.compareValue)

    // In the validateSingleColumnCondition function, find the "greater-than" case and update it to use "value" instead of "compareValue"
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
      // Check if case-insensitive flag is enabled
      if (condition.parameters.caseInsensitive === true) {
        // Ensure allowedValues exists and is an array
        const allowedValues = Array.isArray(condition.parameters.allowedValues)
          ? condition.parameters.allowedValues
          : condition.parameters.allowedValues
            ? [condition.parameters.allowedValues]
            : []

        return validateEnumCaseInsensitive(value, allowedValues)
      } else {
        // Ensure allowedValues exists and is an array
        const allowedValues = Array.isArray(condition.parameters.allowedValues)
          ? condition.parameters.allowedValues
          : condition.parameters.allowedValues
            ? [condition.parameters.allowedValues]
            : []

        return validateEnum(value, allowedValues)
      }

    // Also update the validateSingleColumnCondition function to handle both parameter names
    // Find the "list" case in the switch statement and update it:
    case "list":
      return validateList(value, condition.parameters.listId || condition.parameters.valueList, valueLists)

    // Also update the validateSingleColumnCondition function's "contains" case
    // Find this section in the validateSingleColumnCondition function:
    case "contains":
      // Add debug logging
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

      // Create a set to store unique values
      const uniqueValues = new Set()

      // Iterate through the dataset and check for duplicates
      const tableData = datasets[rule.table]
      if (tableData) {
        for (const rowData of tableData) {
          // Build a composite key from the specified columns
          const compositeKey = uniqueColumns
            .map((col) => {
              const colValue = rowData[col]
              return colValue === null || colValue === undefined ? "" : colValue // Treat nulls as empty strings
            })
            .join("||") // Use a separator that's unlikely to appear in the data

          // If the value is already in the set, it's a duplicate
          if (uniqueValues.has(compositeKey)) {
            isValid = false
            message = `Duplicate value(s) found in column(s): ${uniqueColumns.join(", ")}`
            break // Exit the loop as soon as a duplicate is found
          } else {
            uniqueValues.add(compositeKey)
          }
        }
      }
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
      ;({ isValid, message } = validateDependency(value, row[rule.parameters.dependsOn], rule.parameters.condition))
      break

    case "multi-column":
      ;({ isValid, message } = validateMultiColumn(row, rule.conditions || [], datasets, valueLists))
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
        allParameters: rule.parameters,
      })

      // Check if we're using comparison or direct boolean evaluation
      if (rule.parameters.operator && rule.parameters.value !== undefined) {
        // Use comparison operator
        ;({ isValid, message } = validateFormula(
          row,
          rule.parameters.formula,
          rule.parameters.operator,
          rule.parameters.value,
        ))
      } else {
        // Direct boolean evaluation (like "score / age > 2")
        ;({ isValid, message } = validateFormula(row, rule.parameters.formula))
      }

      console.log("Formula rule validation result:", {
        ruleName: rule.name,
        isValid,
        message,
        rowData: {
          score: row.score,
          age: row.age,
          calculation:
            row.score !== undefined && row.age !== undefined
              ? `${row.score} / ${row.age} = ${row.score / row.age}`
              : "N/A",
        },
      })

      // CRITICAL: Do NOT return immediately - just set the validation result
      // This makes formula rules consistent with other rule types
      break

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
// Improved validateFormula function with better handling of all Math Formula rules
function validateFormula(
  row: DataRecord,
  formula?: string,
  operator?: string,
  value?: number,
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
      rowData: {
        score: row.score,
        age: row.age,
        scoreType: typeof row.score,
        ageType: typeof row.age,
        calculatedValue: row.score !== undefined && row.age !== undefined ? row.score / row.age : "N/A",
      },
    })

    // Create a function that has access to row properties as parameters
    const paramNames = Object.keys(row)
    const paramValues = paramNames.map((key) => row[key])

    // Check if the formula already contains a comparison operator

    const hasComparisonOperator = /[<>]=?|[!=]=/.test(formula)

    // SPECIAL CASE: Handle "score / age" formula specifically
    // This pattern matches any variation of score/age with optional whitespace
    if (formula.trim() === "score / age" || formula.trim() === "score/age" || formula.match(/score\s*\/\s*age/)) {
      console.log("Found 'score / age' formula pattern")

      // Get the score and age values
      const score = typeof row.score === "string" ? Number(row.score) : row.score
      const age = typeof row.age === "string" ? Number(row.age) : row.age

      // Check for null/undefined/zero values
      if (score === undefined || score === null || age === undefined || age === null || age === 0) {
        console.log("Invalid score or age values:", { score, age })
        return {
          isValid: false,
          message: `Cannot evaluate formula: Invalid values. score=${score}, age=${age}`,
        }
      }

      // Calculate the ratio
      const ratio = score / age

      // CRITICAL: Use the provided comparison operator and value from the UI
      // If they're not provided, we'll use the default > 0 (but this should not happen with proper UI)
      const comparisonOperator = operator || ">"
      const comparisonValue = value !== undefined ? value : 0

      console.log(`Using comparison: ${comparisonOperator} ${comparisonValue} (from UI parameters)`)

      // Perform the comparison
      let isValid = false
      switch (comparisonOperator) {
        case "==":
          isValid = ratio == comparisonValue
          break
        case "!=":
          isValid = ratio != comparisonValue
          break
        case ">":
          isValid = ratio > comparisonValue
          break
        case ">=":
          isValid = ratio >= comparisonValue
          break
        case "<":
          isValid = ratio < comparisonValue
          break
        case "<=":
          isValid = ratio <= comparisonValue
          break
        default:
          isValid = ratio > comparisonValue // Default to > if operator is unknown
      }

      console.log(
        `score/age evaluation: ${score} / ${age} = ${ratio} ${comparisonOperator} ${comparisonValue} = ${isValid}`,
      )

      return {
        isValid,
        message: isValid
          ? `Passed validation: ${ratio} ${comparisonOperator} ${comparisonValue}`
          : `Failed validation: ${ratio} is not ${comparisonOperator} ${comparisonValue}`,
      }
    }

    // Case 1: Formula contains its own comparison operator
    if (hasComparisonOperator) {
      console.log(`MATH FORMULA DEBUG: Formula contains comparison operator: ${formula}`)

      // Evaluate the entire expression including the comparison
      const evalFunc = new Function(
        ...paramNames,
        `"use strict";
          try {
            return Boolean(${formula});
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
      )

      try {
        // Execute the function with row values
        const result = evalFunc(...paramValues)
        const isValid = Boolean(result)

        console.log(
          `Formula with comparison: ${formula} evaluated to: ${result} (${typeof result}), isValid = ${isValid}`,
        )

        return {
          isValid,
          message: isValid ? `Passed validation: ${formula}` : `Failed validation: ${formula} evaluated to false`,
        }
      } catch (error) {
        console.error("Error executing formula with comparison:", error)
        return { isValid: false, message: `Error executing formula: ${error.message}` }
      }
    }
    // Case 2: Formula without comparison operator but with separate operator and value parameters
    else if (operator !== undefined && value !== undefined) {
      console.log(`MATH FORMULA DEBUG: Using provided operator and value: ${formula} ${operator} ${value}`)

      // First evaluate the formula to get a numeric result
      const evalFunc = new Function(
        ...paramNames,
        `"use strict";
          try {
            const result = ${formula};
            return result;
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
      )

      try {
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
          `MATH FORMULA RESULT: Formula "${formula}" = ${computedValue}, comparison: ${computedValue} ${operator} ${value} = ${isValid}`,
        )

        return {
          isValid,
          message: isValid
            ? `Passed validation: ${formula} ${operator} ${value}`
            : `Failed validation: ${computedValue} ${operator} ${value} is false`,
        }
      } catch (error) {
        console.error("Error computing formula value:", error)
        return { isValid: false, message: `Error computing formula value: ${error.message}` }
      }
    }
    // Case 3: Formula without comparison operator and without separate operator/value
    else {
      console.log(`MATH FORMULA DEBUG: Formula has no comparison: ${formula}`)

      // For other formulas without explicit comparison
      const evalFunc = new Function(
        ...paramNames,
        `"use strict";
          try {
            return ${formula};
          } catch(err) {
            console.error("Math Formula evaluation error:", err.message);
            throw new Error("Invalid formula: " + err.message);
          }`,
      )

      try {
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
              ? `Passed validation: ${formula} evaluated to ${result} (> 0)`
              : `Failed validation: ${formula} evaluated to ${result} (not > 0)`,
          }
        }
        // For boolean results, use directly
        else if (typeof result === "boolean") {
          console.log(`Using boolean result directly: ${result}`)

          return {
            isValid: result,
            message: result
              ? `Passed validation: ${formula} evaluated to true`
              : `Failed validation: ${formula} evaluated to false`,
          }
        }
        // For other types, convert to boolean but log a warning
        else {
          console.warn(
            `Formula "${formula}" returned non-numeric, non-boolean result: ${result}. Converting to boolean.`,
          )

          const isValid = Boolean(result)
          return {
            isValid,
            message: isValid
              ? `Passed validation: ${formula} evaluated to truthy value`
              : `Failed validation: ${formula} evaluated to falsy value`,
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

// Remove the evaluateSimpleFormula function as we're now using a more direct approach
const validateCrossTableConditions = (
  row: DataRecord,
  crossTableConditions: any[],
  datasets: DataTables,
): { isValid: boolean; message: string } => {
  let isValid = true
  let message = ""

  for (const condition of crossTableConditions) {
    const { table, column, operator, value } = condition

    // Check if the table exists
    if (!datasets[table]) {
      return { isValid: false, message: `Table "${table}" not found` }
    }

    // Find the first row in the table that matches the condition
    const matchingRow = datasets[table].find((tableRow) => {
      const tableValue = tableRow[column]

      switch (operator) {
        case "==":
          return tableValue == value
        case "!=":
          return tableValue != value
        case ">":
          return tableValue > value
        case ">=":
          return tableValue >= value
        case "<":
          return tableValue < value
        case "<=":
          return tableValue <= value
        default:
          return false
      }
    })

    // If no matching row is found, the condition is not valid
    if (!matchingRow) {
      isValid = false
      message = `No matching row found in table "${table}" for condition: ${column} ${operator} ${value}`
      break
    }
  }

  return { isValid, message }
}

// New function to validate unique rules
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

  // First, get the value(s) for the current row
  const currentRowValues = uniqueColumns.map((col) => row[col])
  const currentCompositeKey = currentRowValues
    .map((val) => (val === null || val === undefined ? null : String(val)))
    .join("||")

  console.log(`Checking uniqueness for row ${rowIndex}, values: ${currentCompositeKey}`)

  // Skip validation if all values are null/undefined and we want to ignore nulls
  if (rule.parameters.ignoreNulls === true && currentRowValues.every((val) => val === null || val === undefined)) {
    console.log(`Skipping null values in row ${rowIndex} because ignoreNulls is true`)
    return null
  }

  // Check if this value exists in any other row
  const tableData = datasets[rule.table]
  if (tableData) {
    for (let i = 0; i < tableData.length; i++) {
      // Skip the current row
      if (i === rowIndex) continue

      const otherRow = tableData[i]
      const otherRowValues = uniqueColumns.map((col) => otherRow[col])
      const otherCompositeKey = otherRowValues
        .map((val) => (val === null || val === undefined ? null : String(val)))
        .join("||")

      // If both are null composites and we're ignoring nulls, skip
      if (
        rule.parameters.ignoreNulls === true &&
        currentRowValues.every((val) => val === null || val === undefined) &&
        otherRowValues.every((val) => val === null || val === undefined)
      ) {
        continue
      }

      // Check if the values match
      if (currentCompositeKey === otherCompositeKey) {
        console.log(`Found duplicate in row ${i}: ${otherCompositeKey}`)
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
