import type { DataQualityRule, DataRecord, ValueList, Condition } from "./types"

export function validateDataset(
  datasets: { [key: string]: DataRecord[] },
  rules: DataQualityRule[],
  valueLists: ValueList[],
): any[] {
  const results: any[] = []

  // Process each table in the dataset
  for (const tableName in datasets) {
    const tableData = datasets[tableName]
    const tableRules = rules.filter((rule) => rule.table === tableName && rule.enabled !== false)

    // First, process unique rules at the dataset level
    const uniqueRules = tableRules.filter((rule) => rule.ruleType === "unique")

    console.log(`Processing ${uniqueRules.length} unique rules for table ${tableName}`)

    for (const uniqueRule of uniqueRules) {
      try {
        // Get the columns to check for uniqueness
        const uniqueColumns = uniqueRule.parameters?.uniqueColumns || [uniqueRule.column]

        console.log(`Validating unique rule: ${uniqueRule.name} for columns: ${uniqueColumns.join(", ")}`)

        // Create a map to track composite values and their row indices
        const valueMap = new Map<string, number[]>()

        // Track which rows have duplicates
        const duplicateRows = new Set<number>()

        // Check each row for uniqueness
        tableData.forEach((row, rowIndex) => {
          // Create a composite key from all specified columns
          const compositeValues = uniqueColumns.map((column) => {
            const value = row[column]
            // Convert to string for consistent comparison, handle null/undefined
            return value === null || value === undefined ? "NULL" : String(value)
          })

          // Join the values to create a composite key
          const compositeKey = compositeValues.join("|")

          console.log(`Row ${rowIndex}, Composite key: ${compositeKey}`)

          if (valueMap.has(compositeKey)) {
            // This is a duplicate composite key
            const existingRows = valueMap.get(compositeKey) || []

            // Mark all rows with this composite key as duplicates
            duplicateRows.add(rowIndex)
            existingRows.forEach((idx) => duplicateRows.add(idx))

            // Add this row to the list of rows with this composite key
            valueMap.set(compositeKey, [...existingRows, rowIndex])
          } else {
            // This is the first occurrence of this composite key
            valueMap.set(compositeKey, [rowIndex])
          }
        })

        console.log(`Found ${duplicateRows.size} rows with duplicate composite values`)

        // Generate results for each row
        tableData.forEach((row, rowIndex) => {
          if (duplicateRows.has(rowIndex)) {
            // Create a composite key to find other rows with the same values
            const compositeValues = uniqueColumns.map((column) => {
              const value = row[column]
              return value === null || value === undefined ? "NULL" : String(value)
            })

            const compositeKey = compositeValues.join("|")
            const duplicateRowIndices = valueMap.get(compositeKey) || []

            // Create a failure result
            results.push({
              table: tableName,
              rowIndex,
              column: uniqueColumns.join(", "),
              ruleName: uniqueRule.name,
              message:
                uniqueColumns.length > 1
                  ? `Duplicate combination of values found in rows: ${duplicateRowIndices.map((i) => i + 1).join(", ")}`
                  : `Duplicate value '${row[uniqueRule.column]}' found in rows: ${duplicateRowIndices.map((i) => i + 1).join(", ")}`,
              severity: uniqueRule.severity || "failure",
            })
          } else {
            // This row has a unique composite value
            results.push({
              table: tableName,
              rowIndex,
              column: uniqueColumns.join(", "),
              ruleName: uniqueRule.name,
              message:
                uniqueColumns.length > 1
                  ? `Unique validation passed for combination of columns: ${uniqueColumns.join(", ")}`
                  : `Unique validation passed for column: ${uniqueRule.column}`,
              severity: "success",
            })
          }
        })
      } catch (error) {
        console.error(`Error validating unique rule ${uniqueRule.name}:`, error)
        results.push({
          table: tableName,
          rowIndex: -1, // No specific row for this error
          column: uniqueRule.column,
          ruleName: uniqueRule.name,
          message: `Unique validation error: ${error.message}`,
          severity: "failure",
        })
      }
    }

    // Then process other rules at the row level
    const nonUniqueRules = tableRules.filter((rule) => rule.ruleType !== "unique")
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const row = tableData[rowIndex]

      for (const rule of nonUniqueRules) {
        try {
          const validationResult = validateRow(row, rule, valueLists, datasets)
          if (validationResult) {
            // Always include the result, regardless of success or failure
            results.push({
              ...validationResult,
              table: tableName,
              rowIndex,
            })
          }
        } catch (error) {
          console.error(`Error validating rule ${rule.name} on row ${rowIndex}:`, error)
          results.push({
            table: tableName,
            rowIndex,
            column: rule.column,
            ruleName: rule.name,
            message: `Validation error: ${error.message}`,
            severity: "failure",
          })
        }
      }
    }
  }

  return results
}

function validateRow(
  row: DataRecord,
  rule: DataQualityRule,
  valueLists: ValueList[],
  datasets: { [key: string]: DataRecord[] },
): any {
  let isValid = true
  let message = `Validation passed for rule "${rule.name}"`

  try {
    // Skip validation if the column doesn't exist in the row (unless it's a multi-column rule)
    if (
      !row.hasOwnProperty(rule.column) &&
      rule.ruleType !== "multi-column" &&
      rule.ruleType !== "formula" &&
      rule.ruleType !== "composite-reference" && // Add exception for composite-reference
      !rule.ruleType.startsWith("date-")
    ) {
      return {
        table: rule.table,
        column: rule.column,
        ruleName: rule.name,
        message: `Column "${rule.column}" not found in row`,
        severity: "warning",
      }
    }

    // Get the column value
    const value = row[rule.column]

    // Log for debugging
    console.log(`Validating rule: ${rule.name}, type: ${rule.ruleType}, column: ${rule.column}, value:`, value)

    switch (rule.ruleType) {
      case "required":
        if (value === undefined || value === null || String(value).trim() === "") {
          isValid = false
          message = `${rule.column} is required but was empty or null`
        }
        break

      case "equals":
        if (String(value) !== String(rule.parameters.value)) {
          isValid = false
          message = `${rule.column} should equal "${rule.parameters.value}" but was "${value}"`
        }
        break

      case "not-equals":
        if (String(value) === String(rule.parameters.value)) {
          isValid = false
          message = `${rule.column} should not equal "${rule.parameters.value}"`
        }
        break

      case "greater-than":
        if (!(Number(value) > Number(rule.parameters.value))) {
          isValid = false
          message = `${rule.column} should be greater than ${rule.parameters.value} but was ${value}`
        }
        break

      case "greater-than-equals":
        if (!(Number(value) >= Number(rule.parameters.value))) {
          isValid = false
          message = `${rule.column} should be greater than or equal to ${rule.parameters.value} but was ${value}`
        }
        break

      case "less-than":
        if (!(Number(value) < Number(rule.parameters.value))) {
          isValid = false
          message = `${rule.column} should be less than ${rule.parameters.value} but was ${value}`
        }
        break

      case "less-than-equals":
        if (!(Number(value) <= Number(rule.parameters.value))) {
          isValid = false
          message = `${rule.column} should be less than or equal to ${rule.parameters.value} but was ${value}`
        }
        break

      case "range":
        const min = Number(rule.parameters.minValue)
        const max = Number(rule.parameters.maxValue)
        const numValue = Number(value)

        if (isNaN(numValue) || numValue < min || numValue > max) {
          isValid = false
          message = `${rule.column} should be between ${min} and ${max} but was ${value}`
        }
        break

      case "formula":
        // Add debug logging for rule parameters
        console.log("Formula rule parameters:", JSON.stringify(rule.parameters, null, 2))

        // TARGETED FIX: For formula rules, we need to handle the case where the value is not in the parameters
        // but is stored in the rule object directly
        let comparisonValue = rule.parameters.value

        // If the value is not in the parameters, check if it's in the rule object directly
        if (comparisonValue === undefined) {
          console.log("Value not found in parameters, checking rule object")

          // Check if the value is in the rule object directly
          if (rule.value !== undefined) {
            comparisonValue = rule.value
            console.log("Found value in rule object:", comparisonValue)
          } else {
            // If we still don't have a value, default to 0 for Math Formula rules
            comparisonValue = 0
            console.log("No value found, defaulting to 0 for Math Formula rule")
          }
        }

        // Use the validateFormula function for formula rules
        const tableData = datasets[rule.table] || []
        const result = validateFormula(
          row,
          rule.parameters.formula,
          rule.parameters.operator,
          comparisonValue, // Use our resolved comparison value
          rule.parameters.aggregations,
          tableData,
        )

        isValid = result.isValid
        message = result.message
        break

      case "regex":
        try {
          const regex = new RegExp(rule.parameters.pattern)
          if (!regex.test(String(value))) {
            isValid = false
            message = `${rule.column} does not match pattern "${rule.parameters.pattern}"`
          }
        } catch (error) {
          isValid = false
          message = `Invalid regex pattern: ${error.message}`
        }
        break

      case "enum":
        if (rule.parameters.allowedValues) {
          const allowedValues = String(rule.parameters.allowedValues)
            .split(",")
            .map((v) => v.trim())

          const valueStr = String(value).trim()
          const caseInsensitive = rule.parameters.caseInsensitive === true

          let found = false
          for (const allowedValue of allowedValues) {
            if (caseInsensitive) {
              if (valueStr.toLowerCase() === allowedValue.toLowerCase()) {
                found = true
                break
              }
            } else if (valueStr === allowedValue) {
              found = true
              break
            }
          }

          if (!found) {
            isValid = false
            message = `${rule.column} should be one of [${allowedValues.join(", ")}] but was "${value}"`
          }
        }
        break

      case "list":
        if (rule.parameters.valueList) {
          const valueList = valueLists.find((list) => list.id === rule.parameters.valueList)
          if (valueList) {
            if (!valueList.values.includes(String(value))) {
              isValid = false
              message = `${rule.column} is not in the allowed list "${valueList.name}"`
            }
          } else {
            isValid = false
            message = `Value list "${rule.parameters.valueList}" not found`
          }
        }
        break

      case "contains":
        if (!String(value).includes(rule.parameters.substring)) {
          isValid = false
          message = `${rule.column} should contain "${rule.parameters.substring}" but was "${value}"`
        }
        break

      case "type":
        let typeValid = false
        switch (rule.parameters.dataType) {
          case "string":
            typeValid = typeof value === "string"
            break
          case "number":
            typeValid = typeof value === "number" && !isNaN(value)
            break
          case "boolean":
            typeValid = typeof value === "boolean"
            break
          case "date":
            typeValid = value instanceof Date && !isNaN(value.getTime())
            break
        }

        if (!typeValid) {
          isValid = false
          message = `${rule.column} should be of type ${rule.parameters.dataType} but was ${typeof value}`
        }
        break

      case "column-comparison":
      case "cross-column":
        const leftColumn = rule.column
        const rightColumn = rule.parameters.rightColumn || rule.parameters.secondaryColumn
        const operator = rule.parameters.operator || rule.parameters.comparisonOperator || "=="
        const leftValue = row[leftColumn]
        const rightValue = row[rightColumn]

        let comparisonValid = false
        switch (operator) {
          case "==":
            comparisonValid = leftValue == rightValue
            break
          case "!=":
            comparisonValid = leftValue != rightValue
            break
          case ">":
            comparisonValid = Number(leftValue) > Number(rightValue)
            break
          case ">=":
            comparisonValid = Number(leftValue) >= Number(rightValue)
            break
          case "<":
            comparisonValid = Number(leftValue) < Number(rightValue)
            break
          case "<=":
            comparisonValid = Number(leftValue) <= Number(rightValue)
            break
        }

        if (!comparisonValid) {
          isValid = false
          message = `${leftColumn} (${leftValue}) ${operator} ${rightColumn} (${rightValue}) is false`
        }
        break

      case "javascript-formula":
        try {
          // Create a function that evaluates the expression with the row data
          const paramNames = Object.keys(row)
          const paramValues = paramNames.map((key) => row[key])

          const evalFunc = new Function(
            ...paramNames,
            `"use strict"; 
             try { 
               return Boolean(${rule.parameters.javascriptExpression}); 
             } catch(err) { 
               console.error("JavaScript formula evaluation error:", err.message); 
               throw new Error("Invalid JavaScript formula: " + err.message); 
             }`,
          )

          const result = evalFunc(...paramValues)

          if (typeof result !== "boolean") {
            isValid = false
            message = `JavaScript formula did not return a boolean value`
          } else {
            isValid = result
            if (!isValid) {
              message = `JavaScript formula validation failed`
            }
          }
        } catch (error) {
          isValid = false
          message = `JavaScript formula error: ${error.message}`
        }
        break

      // Add support for multi-column rule type
      case "multi-column":
        console.log("Validating multi-column rule:", rule.name)
        console.log("Rule conditions:", JSON.stringify(rule.conditions, null, 2))

        if (!rule.conditions || rule.conditions.length === 0) {
          isValid = false
          message = "No conditions defined for multi-column rule"
          break
        }

        // Evaluate each condition
        const conditionResults = rule.conditions.map((condition) => {
          return evaluateCondition(row, condition)
        })

        console.log("Condition results:", conditionResults)

        // Combine results based on logical operators
        let finalResult = conditionResults[0]
        for (let i = 1; i < conditionResults.length; i++) {
          const logicalOp = rule.conditions[i - 1].logicalOperator || "AND"
          if (logicalOp === "AND") {
            finalResult = finalResult && conditionResults[i]
          } else if (logicalOp === "OR") {
            finalResult = finalResult || conditionResults[i]
          }
        }

        isValid = finalResult
        if (!isValid) {
          message = `Multi-column condition validation failed`
        }
        break

      // Add support for composite-reference rule type
      case "composite-reference":
        console.log("Validating composite-reference rule:", rule.name)
        console.log("Rule parameters:", JSON.stringify(rule.parameters, null, 2))

        // Get the reference table and columns
        const referenceTable = rule.parameters.referenceTable
        const sourceColumns = rule.parameters.sourceColumns || []
        const referenceColumns = rule.parameters.referenceColumns || []

        // Validate that we have the necessary parameters
        if (!referenceTable) {
          isValid = false
          message = `Missing reference table in composite-reference rule`
          break
        }

        if (!sourceColumns.length || !referenceColumns.length) {
          isValid = false
          message = `Missing source or reference columns in composite-reference rule`
          break
        }

        if (sourceColumns.length !== referenceColumns.length) {
          isValid = false
          message = `Source columns count (${sourceColumns.length}) does not match reference columns count (${referenceColumns.length})`
          break
        }

        // Get the reference table data
        const referenceData = datasets[referenceTable]
        if (!referenceData || !referenceData.length) {
          isValid = false
          message = `Reference table "${referenceTable}" is empty or not found`
          break
        }

        console.log(`Checking composite key match in ${referenceTable} table with ${referenceData.length} records`)

        // Extract source values from the current row
        const sourceValues = sourceColumns.map((col) => row[col])
        console.log("Source values:", sourceValues)

        // Check if there's a matching record in the reference table
        let foundMatch = false
        for (const refRow of referenceData) {
          const refValues = referenceColumns.map((col) => refRow[col])
          console.log("Comparing with reference values:", refValues)

          // Check if all values match
          const allMatch = sourceValues.every((val, index) => {
            const refVal = refValues[index]

            // Handle different types of comparisons
            if (val === refVal) return true
            if (String(val) === String(refVal)) return true
            return false
          })

          if (allMatch) {
            foundMatch = true
            console.log("Found matching record in reference table")
            break
          }
        }

        if (!foundMatch) {
          isValid = false
          message = `No matching record found in "${referenceTable}" for composite key [${sourceColumns.join(", ")}] with values [${sourceValues.join(", ")}]`
        }
        break

      // Add support for date rules
      case "date-before":
        try {
          // Parse the column value as a date
          const dateValue = new Date(value)

          // Check if the date is valid
          if (isNaN(dateValue.getTime())) {
            isValid = false
            message = `${rule.column} contains an invalid date: "${value}"`
            break
          }

          // Parse the compare date from the rule parameters
          const compareDate = new Date(rule.parameters.compareDate)

          // Check if the compare date is valid
          if (isNaN(compareDate.getTime())) {
            isValid = false
            message = `Invalid compare date in rule: "${rule.parameters.compareDate}"`
            break
          }

          // Check if the date is before the compare date
          if (dateValue >= compareDate) {
            isValid = false
            message = `${rule.column} (${value}) should be before ${rule.parameters.compareDate}`
          }
        } catch (error) {
          console.error(`Error in date-before validation:`, error)
          isValid = false
          message = `Date validation error: ${error.message}`
        }
        break

      case "date-after":
        try {
          // Add debug logging to see what parameters are available
          console.log("Date After rule parameters:", JSON.stringify(rule.parameters, null, 2))

          // Parse the column value as a date
          const dateValue = new Date(value)

          // Check if the date is valid
          if (isNaN(dateValue.getTime())) {
            isValid = false
            message = `${rule.column} contains an invalid date: "${value}"`
            break
          }

          // Try different parameter names for the compare date
          let compareDate: Date | null = null

          // Check all possible parameter names
          if (rule.parameters.compareDate !== undefined) {
            compareDate = new Date(rule.parameters.compareDate)
          } else if (rule.parameters.afterDate !== undefined) {
            compareDate = new Date(rule.parameters.afterDate)
          } else if (rule.parameters.referenceDate !== undefined) {
            compareDate = new Date(rule.parameters.referenceDate)
          } else if (rule.parameters.date !== undefined) {
            compareDate = new Date(rule.parameters.date)
          }

          // If we still don't have a valid date, check the rule object directly
          if (!compareDate || isNaN(compareDate.getTime())) {
            console.log("No valid compare date found in parameters, checking rule object")

            if (rule.compareDate !== undefined) {
              compareDate = new Date(rule.compareDate)
            } else if (rule.afterDate !== undefined) {
              compareDate = new Date(rule.afterDate)
            } else if (rule.referenceDate !== undefined) {
              compareDate = new Date(rule.referenceDate)
            } else if (rule.date !== undefined) {
              compareDate = new Date(rule.date)
            }
          }

          // If we still don't have a valid date, report an error
          if (!compareDate || isNaN(compareDate.getTime())) {
            isValid = false
            message = `Invalid or missing compare date in rule. Available parameters: ${Object.keys(rule.parameters).join(", ")}`
            break
          }

          // Check if the date is after the compare date
          if (dateValue <= compareDate) {
            isValid = false
            message = `${rule.column} (${value}) should be after ${compareDate.toISOString()}`
          }
        } catch (error) {
          console.error(`Error in date-after validation:`, error)
          isValid = false
          message = `Date validation error: ${error.message}`
        }
        break

      case "date-between":
        try {
          // Parse the column value as a date
          const dateValue = new Date(value)

          // Check if the date is valid
          if (isNaN(dateValue.getTime())) {
            isValid = false
            message = `${rule.column} contains an invalid date: "${value}"`
            break
          }

          // Parse the start and end dates from the rule parameters
          const startDate = new Date(rule.parameters.startDate)
          const endDate = new Date(rule.parameters.endDate)

          // Check if the start and end dates are valid
          if (isNaN(startDate.getTime())) {
            isValid = false
            message = `Invalid start date in rule: "${rule.parameters.startDate}"`
            break
          }

          if (isNaN(endDate.getTime())) {
            isValid = false
            message = `Invalid end date in rule: "${rule.parameters.endDate}"`
            break
          }

          // Check if the date is between the start and end dates
          const isAfterStart = dateValue >= startDate
          const isBeforeEnd = dateValue <= endDate

          if (!isAfterStart || !isBeforeEnd) {
            isValid = false
            message = `${rule.column} (${value}) should be between ${rule.parameters.startDate} and ${rule.parameters.endDate}`
          }
        } catch (error) {
          console.error(`Error in date-between validation:`, error)
          isValid = false
          message = `Date validation error: ${error.message}`
        }
        break

      case "date-format":
        try {
          // Get the expected format from the rule parameters
          const expectedFormat = rule.parameters.format

          if (!expectedFormat) {
            isValid = false
            message = `Missing format parameter in date-format rule`
            break
          }

          // For date-format validation, we'll do a simple check based on common formats
          // This is a simplified approach - a more robust solution would use a date library

          // Convert the value to a string
          const dateStr = String(value)

          // Define some basic format validation functions
          const formatValidators: Record<string, (dateStr: string) => boolean> = {
            // YYYY-MM-DD format (ISO date)
            "YYYY-MM-DD": (str) => /^\d{4}-\d{2}-\d{2}$/.test(str),

            // MM/DD/YYYY format (US date)
            "MM/DD/YYYY": (str) => /^\d{2}\/\d{2}\/\d{4}$/.test(str),

            // DD/MM/YYYY format (European date)
            "DD/MM/YYYY": (str) => /^\d{2}\/\d{2}\/\d{4}$/.test(str),

            // YYYY/MM/DD format
            "YYYY/MM/DD": (str) => /^\d{4}\/\d{2}\/\d{2}$/.test(str),

            // ISO datetime format
            ISO: (str) => !isNaN(new Date(str).getTime()),
          }

          // Check if the format is supported
          if (!formatValidators[expectedFormat]) {
            isValid = false
            message = `Unsupported date format: "${expectedFormat}"`
            break
          }

          // Validate the date string against the expected format
          if (!formatValidators[expectedFormat](dateStr)) {
            isValid = false
            message = `${rule.column} (${value}) does not match the expected format "${expectedFormat}"`
          }

          // Additional check: verify it's a valid date
          const dateObj = new Date(value)
          if (isNaN(dateObj.getTime())) {
            isValid = false
            message = `${rule.column} contains an invalid date: "${value}"`
          }
        } catch (error) {
          console.error(`Error in date-format validation:`, error)
          isValid = false
          message = `Date format validation error: ${error.message}`
        }
        break

      default:
        console.warn(`Unhandled rule type: ${rule.ruleType}`)
        return {
          table: rule.table,
          column: rule.column,
          ruleName: rule.name,
          message: `Unsupported rule type: ${rule.ruleType}`,
          severity: "warning",
        }
    }
  } catch (error) {
    console.error(`Error validating rule ${rule.name}:`, error)
    return {
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message: `Validation error: ${error.message}`,
      severity: "failure",
    }
  }

  if (!isValid) {
    return {
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message,
      severity: rule.severity || "failure",
    }
  } else {
    // Return success results too
    return {
      table: rule.table,
      column: rule.column,
      ruleName: rule.name,
      message,
      severity: "success", // Always use success for passing validations
    }
  }
}

// Helper function to evaluate a single condition
function evaluateCondition(row: DataRecord, condition: Condition): boolean {
  console.log(`Evaluating condition: ${condition.column} ${condition.operator} ${condition.value}`)

  // Get the column value from the row
  const columnValue = row[condition.column]
  console.log(`Column value: ${columnValue}, type: ${typeof columnValue}`)

  // Handle special operators first
  if (condition.operator === "is-blank") {
    return columnValue === undefined || columnValue === null || String(columnValue).trim() === ""
  }

  if (condition.operator === "is-not-blank") {
    return !(columnValue === undefined || columnValue === null || String(columnValue).trim() === "")
  }

  // For other operators, if the column value is undefined or null, the condition fails
  if (columnValue === undefined || columnValue === null) {
    console.log("Column value is undefined or null, condition fails")
    return false
  }

  // Handle other operators
  switch (condition.operator) {
    case "==":
      return String(columnValue) === String(condition.value)

    case "!=":
      return String(columnValue) !== String(condition.value)

    case ">":
      return Number(columnValue) > Number(condition.value)

    case ">=":
      return Number(columnValue) >= Number(condition.value)

    case "<":
      return Number(columnValue) < Number(condition.value)

    case "<=":
      return Number(columnValue) <= Number(condition.value)

    case "contains":
      return String(columnValue).includes(String(condition.value))

    case "not-contains":
      return !String(columnValue).includes(String(condition.value))

    case "starts-with":
      return String(columnValue).startsWith(String(condition.value))

    case "ends-with":
      return String(columnValue).endsWith(String(condition.value))

    case "matches":
      try {
        const regex = new RegExp(String(condition.value))
        return regex.test(String(columnValue))
      } catch (error) {
        console.error("Invalid regex in condition:", error)
        return false
      }

    default:
      console.warn(`Unsupported condition operator: ${condition.operator}`)
      return false
  }
}

export function validateFormula(
  row: DataRecord,
  formula?: string,
  operator?: string,
  value?: any,
  aggregations?: any[],
  dataset?: DataRecord[],
): { isValid: boolean; message: string } {
  // Log inputs for debugging
  console.log("validateFormula inputs:", { formula, operator, value, aggregationsCount: aggregations?.length })

  // Log aggregations details if available
  if (aggregations && aggregations.length > 0) {
    console.log("Aggregations details:", JSON.stringify(aggregations, null, 2))
  }

  // Add more detailed logging for the value parameter
  console.log("Raw value parameter:", value)
  console.log("Type of value parameter:", typeof value)
  console.log("Value is undefined:", value === undefined)
  console.log("Value is null:", value === null)
  console.log("Value is zero:", value === 0)
  console.log("Value as string:", String(value))

  if (!formula || formula.trim() === "") {
    console.warn("Empty formula provided to validateFormula")
    return { isValid: false, message: "Empty formula provided" }
  }

  try {
    // TARGETED FIX: Handle conditional SUM and other aggregation functions
    if (aggregations && aggregations.length > 0) {
      console.log("Using aggregations data directly for evaluation")

      // Find the first aggregation (we'll handle one at a time for now)
      const aggregation = aggregations[0]

      if (aggregation && aggregation.function) {
        console.log("Processing aggregation:", JSON.stringify(aggregation, null, 2))

        // Extract the column and filter information
        const columnName = aggregation.column
        const filter = aggregation.filter

        // Verify we have the necessary data
        if (!columnName) {
          console.error("Missing column name in aggregation")
          return { isValid: false, message: "Invalid aggregation: missing column name" }
        }

        if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
          console.warn("Empty dataset for aggregation calculation")
          return { isValid: false, message: "Empty dataset for aggregation calculation" }
        }

        // Calculate the aggregation result based on the function type
        let result = 0

        switch (aggregation.function.toLowerCase()) {
          case "sum":
            result = calculateConditionalSum(dataset, columnName, filter)
            break
          case "avg":
            result = calculateConditionalAverage(dataset, columnName, filter)
            break
          case "count":
            result = calculateConditionalCount(dataset, columnName, filter)
            break
          case "min":
            result = calculateConditionalMin(dataset, columnName, filter)
            break
          case "max":
            result = calculateConditionalMax(dataset, columnName, filter)
            break
          case "distinct-group-sum":
            const groupColumns = aggregation.groupColumns || []
            result = calculateDistinctGroupSum(row, columnName, groupColumns, dataset)
            break
          default:
            console.warn(`Unsupported aggregation function: ${aggregation.function}`)
            return {
              isValid: false,
              message: `Unsupported aggregation function: ${aggregation.function}`,
            }
        }

        console.log(`Aggregation ${aggregation.function} result:`, result)

        // Compare with the expected value
        const numericResult = Number(result)
        const numericValue = Number(value || 0)

        // Default to equality comparison if operator is not provided
        const comparisonOperator = operator || "=="

        let comparisonResult = false
        switch (comparisonOperator) {
          case "==":
            comparisonResult = Math.abs(numericResult - numericValue) < 0.000001 // Use epsilon for floating point
            break
          case "!=":
            comparisonResult = Math.abs(numericResult - numericValue) >= 0.000001
            break
          case ">":
            comparisonResult = numericResult > numericValue
            break
          case ">=":
            comparisonResult = numericResult >= numericValue
            break
          case "<":
            comparisonResult = numericResult < numericValue
            break
          case "<=":
            comparisonResult = numericResult <= numericValue
            break
          default:
            return {
              isValid: false,
              message: `Unknown operator: ${comparisonOperator}`,
            }
        }

        return {
          isValid: comparisonResult,
          message: comparisonResult
            ? `Formula "${formula}" ${comparisonOperator} ${numericValue} is true`
            : `Formula "${formula}" evaluated to ${numericResult}, which is not ${comparisonOperator} ${numericValue}`,
        }
      }
    }

    // If we get here, either there are no aggregations or none of them are recognized
    // Try to parse the formula directly as a fallback
    console.log("No recognized aggregation found, trying to parse formula directly:", formula)

    // Check if the formula is a SUM with condition
    const sumWithConditionRegex = /SUM\s*$$\s*"([^"]+)"\s*,\s*([^)]+)$$/i
    const sumMatch = formula.match(sumWithConditionRegex)

    if (sumMatch) {
      console.log("Detected SUM with condition formula")

      const columnName = sumMatch[1]
      const condition = sumMatch[2]

      console.log("Parsed from formula - column:", columnName, "condition:", condition)

      // Create a filter object from the condition
      // This is a simplified approach - for complex conditions, we'd need a more robust parser
      const filterParts = condition.split(/\s*(==|!=|>=|<=|>|<)\s*/)

      if (filterParts.length >= 3) {
        const filterColumn = filterParts[0].trim()
        const filterOperator = filterParts[1].trim()
        let filterValue = filterParts[2].trim()

        // Remove quotes if present
        filterValue = filterValue.replace(/^["']|["']$/g, "")

        console.log("Parsed condition - column:", filterColumn, "operator:", filterOperator, "value:", filterValue)

        const filter = {
          column: filterColumn,
          operator: filterOperator,
          value: filterValue,
        }

        // Calculate the sum with the filter
        const result = calculateConditionalSum(dataset || [], columnName, filter)
        console.log("Calculated conditional sum:", result)

        // Compare with the expected value
        const numericResult = Number(result)
        const numericValue = Number(value || 0)

        // Default to equality comparison if operator is not provided
        const comparisonOperator = operator || "=="

        let comparisonResult = false
        switch (comparisonOperator) {
          case "==":
            comparisonResult = Math.abs(numericResult - numericValue) < 0.000001
            break
          case "!=":
            comparisonResult = Math.abs(numericResult - numericValue) >= 0.000001
            break
          case ">":
            comparisonResult = numericResult > numericValue
            break
          case ">=":
            comparisonResult = numericResult >= numericValue
            break
          case "<":
            comparisonResult = numericResult < numericValue
            break
          case "<=":
            comparisonResult = numericResult <= numericValue
            break
          default:
            return {
              isValid: false,
              message: `Unknown operator: ${comparisonOperator}`,
            }
        }

        return {
          isValid: comparisonResult,
          message: comparisonResult
            ? `Formula "${formula}" ${comparisonOperator} ${numericValue} is true`
            : `Formula "${formula}" evaluated to ${numericResult}, which is not ${comparisonOperator} ${numericValue}`,
        }
      }
    }

    // For other formulas, use the standard evaluation approach
    console.log("Using standard evaluation for formula:", formula)

    // Create a safe evaluation context with all row values
    const context: Record<string, any> = { ...row }

    // Add aggregation functions
    const aggregationFunctions = {
      SUM: (column: string) => 0,
      AVG: (column: string) => 0,
      COUNT: (column: string) => 0,
      MIN: (column: string) => 0,
      MAX: (column: string) => 0,
      DISTINCT_COUNT: (column: string) => 0,
      DISTINCT: (column: string) => 0,
      GROUP: (column: string) => 0,
      GROUP_BY: (column: string) => 0,
      DISTINCT_GROUP: (column: string) => 0,
      DISTINCT_GROUP_SUM: (column: string) => 0,
      DISTINCT_GROUP_COUNT: (column: string) => 0,
      DISTINCT_GROUP_AVG: (column: string) => 0,
    }

    Object.assign(context, aggregationFunctions)

    // Sanitize column names for use as variables
    Object.keys(row).forEach((key) => {
      if (/[^a-zA-Z0-9_]/.test(key)) {
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "_")
        context[sanitizedKey] = row[key]
      }
    })

    // Create a function to evaluate the formula safely
    // Use a safer approach with Function constructor instead of eval
    const paramNames = Object.keys(context)
    const paramValues = paramNames.map((key) => context[key])

    // Create a function that evaluates the formula with the provided context
    const evalFunc = new Function(
      ...paramNames,
      `try {
        return ${formula};
      } catch (e) {
        console.error("Formula evaluation error:", e);
        throw e;
      }`,
    )

    // Execute the function with the context values
    const result = evalFunc(...paramValues)
    console.log("Formula evaluation result:", result)

    // If the formula already contains a comparison operator, the result should be a boolean
    if (typeof result === "boolean") {
      return {
        isValid: result,
        message: result ? `Formula "${formula}" evaluated to true` : `Formula "${formula}" evaluated to false`,
      }
    }

    // Otherwise, compare the result with the provided value using the operator
    const numericResult = Number(result)

    // TARGETED FIX: Handle the case where value is undefined or NaN
    // For Math Formula rules, default to 0 if value is undefined or NaN
    let numericValue = Number(value)

    if (isNaN(numericValue) || value === undefined) {
      // Default to 0 for Math Formula rules
      numericValue = 0
      console.log("Value is undefined or NaN, defaulting to 0 for Math Formula rule")
    }

    // Default to equality comparison if operator is not provided
    const comparisonOperator = operator || "=="

    // Add detailed logging for comparison values
    console.log("Comparison details:", {
      formula,
      formulaResult: result,
      numericResult,
      operator: comparisonOperator,
      rawComparisonValue: value,
      numericComparisonValue: numericValue,
      valueIsUndefined: value === undefined,
      valueIsZero: value === 0,
      valueAfterNumberConversion: Number(value),
    })

    let comparisonResult = false
    switch (comparisonOperator) {
      case "==":
        comparisonResult = Math.abs(numericResult - numericValue) < 0.000001 // Use epsilon for floating point
        break
      case "!=":
        comparisonResult = Math.abs(numericResult - numericValue) >= 0.000001
        break
      case ">":
        comparisonResult = numericResult > numericValue
        break
      case ">=":
        comparisonResult = numericResult >= numericValue
        break
      case "<":
        comparisonResult = numericResult < numericValue
        break
      case "<=":
        comparisonResult = numericResult <= numericValue
        break
      default:
        return {
          isValid: false,
          message: `Unknown operator: ${comparisonOperator}`,
        }
    }

    return {
      isValid: comparisonResult,
      message: comparisonResult
        ? `Formula "${formula}" ${comparisonOperator} ${numericValue} is true`
        : `Formula "${formula}" evaluated to ${numericResult}, which is not ${comparisonOperator} ${numericValue}`,
    }
  } catch (error) {
    console.error("Error in validateFormula:", error)
    return {
      isValid: false,
      message: `Formula validation error: ${error.message}`,
    }
  }
}

// Helper function to calculate conditional SUM
function calculateConditionalSum(dataset: DataRecord[], columnName: string, filter: any): number {
  console.log("calculateConditionalSum inputs:", {
    columnName,
    filter: JSON.stringify(filter),
    datasetSize: dataset.length,
  })

  try {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
      console.warn("Empty dataset for conditional SUM calculation")
      return 0
    }

    // Clean the column name (remove quotes if present)
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")
    console.log("Clean column name:", cleanColumnName)

    // Check if the column exists in the dataset
    const sampleRecord = dataset[0]
    if (!(cleanColumnName in sampleRecord)) {
      console.warn(`Column "${cleanColumnName}" not found in dataset`)
      // Check if it exists with different casing
      const lowerColumnName = cleanColumnName.toLowerCase()
      const matchingColumn = Object.keys(sampleRecord).find((key) => key.toLowerCase() === lowerColumnName)
      if (matchingColumn) {
        console.log(`Found column with different casing: "${matchingColumn}"`)
        // Use the correctly cased column name
        columnName = matchingColumn
      } else {
        console.error(`Column "${cleanColumnName}" not found in dataset with any casing`)
        return 0
      }
    }

    // Find all records that match the filter
    const matchingRecords = dataset.filter((record) => {
      // If no filter is provided, include all records
      if (!filter) return true

      // Get the filter column, operator, and value
      const filterColumn = filter.column?.replace(/^["']|["']$/g, "")
      const filterOperator = filter.operator
      const filterValue = filter.value

      if (!filterColumn || !filterOperator) return true

      // Get the record value for the filter column
      const recordValue = record[filterColumn]

      // Compare based on the operator
      switch (filterOperator) {
        case "==":
          return String(recordValue) === String(filterValue)
        case "!=":
          return String(recordValue) !== String(filterValue)
        case ">":
          return Number(recordValue) > Number(filterValue)
        case ">=":
          return Number(recordValue) >= Number(filterValue)
        case "<":
          return Number(recordValue) < Number(filterValue)
        case "<=":
          return Number(recordValue) <= Number(filterValue)
        default:
          console.warn(`Unsupported filter operator: ${filterOperator}`)
          return true
      }
    })

    console.log("Matching records count:", matchingRecords.length)
    if (matchingRecords.length > 0) {
      console.log("First matching record:", JSON.stringify(matchingRecords[0]))
    }

    // Sum the values of the specified column from matching records
    let sum = 0
    let validValueCount = 0

    for (const record of matchingRecords) {
      const value = record[cleanColumnName]
      console.log(`Record ${cleanColumnName} value:`, value, "type:", typeof value)

      if (value === undefined || value === null) {
        console.log("Skipping undefined/null value")
        continue
      }

      const numValue = Number(value)
      if (isNaN(numValue)) {
        console.log(`Value "${value}" is not a number, skipping`)
        continue
      }

      console.log(`Adding ${numValue} to sum`)
      sum += numValue
      validValueCount++
    }

    console.log("Final calculated sum:", sum, "from", validValueCount, "valid values")
    return sum
  } catch (error) {
    console.error("Error in calculateConditionalSum:", error)
    return 0
  }
}

// Helper function to calculate conditional AVERAGE
function calculateConditionalAverage(dataset: DataRecord[], columnName: string, filter: any): number {
  try {
    const sum = calculateConditionalSum(dataset, columnName, filter)

    // Count the number of matching records with valid values
    let count = 0

    // Clean the column name
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")

    // Find all records that match the filter
    const matchingRecords = dataset.filter((record) => {
      // If no filter is provided, include all records
      if (!filter) return true

      // Get the filter column, operator, and value
      const filterColumn = filter.column?.replace(/^["']|["']$/g, "")
      const filterOperator = filter.operator
      const filterValue = filter.value

      if (!filterColumn || !filterOperator) return true

      // Get the record value for the filter column
      const recordValue = record[filterColumn]

      // Compare based on the operator
      switch (filterOperator) {
        case "==":
          return String(recordValue) === String(filterValue)
        case "!=":
          return String(recordValue) !== String(filterValue)
        case ">":
          return Number(recordValue) > Number(filterValue)
        case ">=":
          return Number(recordValue) >= Number(filterValue)
        case "<":
          return Number(recordValue) < Number(filterValue)
        case "<=":
          return Number(recordValue) <= Number(filterValue)
        default:
          console.warn(`Unsupported filter operator: ${filterOperator}`)
          return true
      }
    })

    // Count records with valid numeric values
    for (const record of matchingRecords) {
      const value = record[cleanColumnName]
      if (value !== undefined && value !== null && !isNaN(Number(value))) {
        count++
      }
    }

    // Calculate average
    if (count === 0) {
      console.log("No valid values found for average calculation")
      return 0
    }

    const average = sum / count
    console.log("Calculated average:", average, "from", count, "valid values")
    return average
  } catch (error) {
    console.error("Error in calculateConditionalAverage:", error)
    return 0
  }
}

// Helper function to calculate conditional COUNT
function calculateConditionalCount(dataset: DataRecord[], columnName: string, filter: any): number {
  try {
    // Clean the column name
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")

    // Find all records that match the filter
    const matchingRecords = dataset.filter((record) => {
      // If no filter is provided, include all records
      if (!filter) return true

      // Get the filter column, operator, and value
      const filterColumn = filter.column?.replace(/^["']|["']$/g, "")
      const filterOperator = filter.operator
      const filterValue = filter.value

      if (!filterColumn || !filterOperator) return true

      // Get the record value for the filter column
      const recordValue = record[filterColumn]

      // Compare based on the operator
      switch (filterOperator) {
        case "==":
          return String(recordValue) === String(filterValue)
        case "!=":
          return String(recordValue) !== String(filterValue)
        case ">":
          return Number(recordValue) > Number(filterValue)
        case ">=":
          return Number(recordValue) >= Number(filterValue)
        case "<":
          return Number(recordValue) < Number(filterValue)
        case "<=":
          return Number(recordValue) <= Number(filterValue)
        default:
          console.warn(`Unsupported filter operator: ${filterOperator}`)
          return true
      }
    })

    // Count records with non-null values in the specified column
    let count = 0
    for (const record of matchingRecords) {
      if (record[cleanColumnName] !== undefined && record[cleanColumnName] !== null) {
        count++
      }
    }

    console.log("Calculated count:", count)
    return count
  } catch (error) {
    console.error("Error in calculateConditionalCount:", error)
    return 0
  }
}

// Helper function to calculate conditional MIN
function calculateConditionalMin(dataset: DataRecord[], columnName: string, filter: any): number {
  try {
    // Clean the column name
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")

    // Find all records that match the filter
    const matchingRecords = dataset.filter((record) => {
      // If no filter is provided, include all records
      if (!filter) return true

      // Get the filter column, operator, and value
      const filterColumn = filter.column?.replace(/^["']|["']$/g, "")
      const filterOperator = filter.operator
      const filterValue = filter.value

      if (!filterColumn || !filterOperator) return true

      // Get the record value for the filter column
      const recordValue = record[filterColumn]

      // Compare based on the operator
      switch (filterOperator) {
        case "==":
          return String(recordValue) === String(filterValue)
        case "!=":
          return String(recordValue) !== String(filterValue)
        case ">":
          return Number(recordValue) > Number(filterValue)
        case ">=":
          return Number(recordValue) >= Number(filterValue)
        case "<":
          return Number(recordValue) < Number(filterValue)
        case "<=":
          return Number(recordValue) <= Number(filterValue)
        default:
          console.warn(`Unsupported filter operator: ${filterOperator}`)
          return true
      }
    })

    // Find the minimum value
    let min = Number.POSITIVE_INFINITY
    let foundValidValue = false

    for (const record of matchingRecords) {
      const value = record[cleanColumnName]
      if (value !== undefined && value !== null) {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          min = Math.min(min, numValue)
          foundValidValue = true
        }
      }
    }

    if (!foundValidValue) {
      console.log("No valid values found for min calculation")
      return 0
    }

    console.log("Calculated min:", min)
    return min
  } catch (error) {
    console.error("Error in calculateConditionalMin:", error)
    return 0
  }
}

// Helper function to calculate conditional MAX
function calculateConditionalMax(dataset: DataRecord[], columnName: string, filter: any): number {
  try {
    // Clean the column name
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")

    // Find all records that match the filter
    const matchingRecords = dataset.filter((record) => {
      // If no filter is provided, include all records
      if (!filter) return true

      // Get the filter column, operator, and value
      const filterColumn = filter.column?.replace(/^["']|["']$/g, "")
      const filterOperator = filter.operator
      const filterValue = filter.value

      if (!filterColumn || !filterOperator) return true

      // Get the record value for the filter column
      const recordValue = record[filterColumn]

      // Compare based on the operator
      switch (filterOperator) {
        case "==":
          return String(recordValue) === String(filterValue)
        case "!=":
          return String(recordValue) !== String(filterValue)
        case ">":
          return Number(recordValue) > Number(filterValue)
        case ">=":
          return Number(recordValue) >= Number(filterValue)
        case "<":
          return Number(recordValue) < Number(filterValue)
        case "<=":
          return Number(recordValue) <= Number(filterValue)
        default:
          console.warn(`Unsupported filter operator: ${filterOperator}`)
          return true
      }
    })

    // Find the maximum value
    let max = Number.NEGATIVE_INFINITY
    let foundValidValue = false

    for (const record of matchingRecords) {
      const value = record[cleanColumnName]
      if (value !== undefined && value !== null) {
        const numValue = Number(value)
        if (!isNaN(numValue)) {
          max = Math.max(max, numValue)
          foundValidValue = true
        }
      }
    }

    if (!foundValidValue) {
      console.log("No valid values found for max calculation")
      return 0
    }

    console.log("Calculated max:", max)
    return max
  } catch (error) {
    console.error("Error in calculateConditionalMax:", error)
    return 0
  }
}

// Helper function to calculate DISTINCT-GROUP-SUM directly
function calculateDistinctGroupSum(
  row: DataRecord,
  columnName: string,
  groupColumns: string[],
  dataset: DataRecord[],
): number {
  console.log("calculateDistinctGroupSum inputs:", {
    columnName,
    groupColumns,
    rowData: JSON.stringify(row),
    datasetSize: dataset.length,
  })

  try {
    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
      console.warn("Empty dataset for DISTINCT-GROUP-SUM calculation")
      return 0
    }

    // Verify that the column and group columns exist in the dataset
    const sampleRecord = dataset[0]
    console.log("Sample record from dataset:", JSON.stringify(sampleRecord))

    // Clean the column name (remove quotes if present)
    const cleanColumnName = columnName.replace(/^["']|["']$/g, "")
    console.log("Clean column name:", cleanColumnName)

    // Check if the column exists in the dataset
    if (!(cleanColumnName in sampleRecord)) {
      console.warn(`Column "${cleanColumnName}" not found in dataset`)
      // Check if it exists with different casing
      const lowerColumnName = cleanColumnName.toLowerCase()
      const matchingColumn = Object.keys(sampleRecord).find((key) => key.toLowerCase() === lowerColumnName)
      if (matchingColumn) {
        console.log(`Found column with different casing: "${matchingColumn}"`)
        // Use the correctly cased column name
        columnName = matchingColumn
      } else {
        console.error(`Column "${cleanColumnName}" not found in dataset with any casing`)
        return 0
      }
    }

    // Clean and verify group columns
    const cleanGroupColumns = groupColumns.map((col) => col.replace(/^["']|["']$/g, ""))
    console.log("Clean group columns:", cleanGroupColumns)

    // Check if group columns exist in the dataset
    for (const groupCol of cleanGroupColumns) {
      if (!(groupCol in sampleRecord)) {
        console.warn(`Group column "${groupCol}" not found in dataset`)
        // Check if it exists with different casing
        const lowerGroupCol = groupCol.toLowerCase()
        const matchingColumn = Object.keys(sampleRecord).find((key) => key.toLowerCase() === lowerGroupCol)
        if (matchingColumn) {
          console.log(`Found group column with different casing: "${matchingColumn}"`)
          // Replace the group column with the correctly cased one
          const index = cleanGroupColumns.indexOf(groupCol)
          if (index !== -1) {
            cleanGroupColumns[index] = matchingColumn
          }
        } else {
          console.error(`Group column "${groupCol}" not found in dataset with any casing`)
          return 0
        }
      }
    }

    // Get the current row's group values
    const currentGroupValues: any[] = []
    for (const col of cleanGroupColumns) {
      currentGroupValues.push(row[col])
    }

    console.log("Current group values:", currentGroupValues)

    // Find all records that match the current row's group values
    const matchingRecords = dataset.filter((record) => {
      return cleanGroupColumns.every((col, index) => {
        const recordValue = record[col]
        const currentValue = currentGroupValues[index]

        // Handle different types of comparisons
        if (recordValue === currentValue) return true
        if (String(recordValue) === String(currentValue)) return true
        return false
      })
    })

    console.log("Matching records count:", matchingRecords.length)
    if (matchingRecords.length > 0) {
      console.log("First matching record:", JSON.stringify(matchingRecords[0]))
    }

    // Sum the values of the specified column from matching records
    let sum = 0
    for (const record of matchingRecords) {
      const value = record[cleanColumnName]
      console.log(`Record ${cleanColumnName} value:`, value, "type:", typeof value)

      if (value === undefined || value === null) {
        console.log("Skipping undefined/null value")
        continue
      }

      const numValue = Number(value)
      if (isNaN(numValue)) {
        console.log(`Value "${value}" is not a number, skipping`)
        continue
      }

      console.log(`Adding ${numValue} to sum`)
      sum += numValue
    }

    console.log("Final calculated sum:", sum)
    return sum
  } catch (error) {
    console.error("Error in calculateDistinctGroupSum:", error)
    return 0
  }
}
