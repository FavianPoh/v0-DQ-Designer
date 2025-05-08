import type { DataRecord, DataQualityRule, ValidationResult, DataTables, ValueList } from "./types"

// Declare interfaces at the top
interface Condition {
  column?: string
  field?: string
  operator: string
  value: any
  logicalOperator?: "AND" | "OR"
}

interface AggregationConfig {
  function: string
  column: string
  alias?: string
  filter?: {
    column?: string
    operator?: string
    value?: any
    type?: "AND" | "OR"
    conditions?: Condition[]
  }
}

// Define validateFormula with a complete implementation
function validateFormula(
  row: DataRecord,
  formula?: string,
  operator?: string,
  value?: any,
  aggregations?: AggregationConfig[],
  dataset?: DataRecord[],
): { isValid: boolean; message: string } {
  // ADDED: Detailed logging of input parameters
  console.log("FORMULA VALIDATION INPUT:", {
    formula: formula,
    operator: operator,
    value: value,
    operatorType: typeof operator,
    valueType: typeof value,
    valueIsZero: value === 0,
    valueIsZeroString: value === "0",
    valueToString: String(value),
    valueToNumber: Number(value),
  })

  if (!formula || formula.trim() === "") {
    console.warn("Empty formula provided to validateFormula")
    return { isValid: false, message: "Empty formula provided" }
  }

  try {
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

    // ADDED: Check for undefined/null values
    console.log("COMPARISON CHECK:", {
      hasOperator: operator !== undefined && operator !== null,
      hasValue: value !== undefined && value !== null,
      operatorIsEmpty: operator === "",
      valueIsZero: value === 0,
      valueIsZeroString: value === "0",
      valueIsEmptyString: value === "",
      valueIsUndefined: value === undefined,
      valueIsNull: value === null,
    })

    // Create a lookup table for aggregation functions to replace them with concrete values
    const aggregationValues: Record<string, number> = {}

    if (aggregations?.length && dataset?.length) {
      // Pre-compute all aggregation values and store them in the lookup table
      aggregations.forEach((agg) => {
        const funcName = getFunctionName(agg.function).toUpperCase()
        const columnName = agg.column.replace(/"/g, "") // Remove any quotes

        // Compute the aggregation
        const value = computeAggregation(dataset, agg)

        // Log the computed value for debugging
        console.log(`Computed aggregation ${funcName}("${columnName}") = ${value}`)

        // Store with both quoted and unquoted versions to handle all cases
        const key1 = `${funcName}("${columnName}")`
        const key2 = `${funcName}(${columnName})`

        // Also store versions with filter conditions
        let filterText = ""
        if (agg.filter) {
          if ("conditions" in agg.filter) {
            // Multi-condition filter
            const conditions = agg.filter.conditions
              .map((c) => `${c.column} ${c.operator} ${typeof c.value === "string" ? `"${c.value}"` : c.value}`)
              .join(" OR ")
            filterText = `, ${conditions}`
          } else {
            // Legacy single condition filter
            filterText = `, ${agg.filter.column} ${agg.filter.operator || "=="} ${
              typeof agg.filter.value === "string" ? `"${agg.filter.value}"` : agg.filter.value
            }`
          }
        }

        if (filterText) {
          const key3 = `${funcName}("${columnName}"${filterText})`
          const key4 = `${funcName}(${columnName}${filterText})`
          aggregationValues[key3] = value
          aggregationValues[key4] = value

          // Also add versions with spaces removed around operators for more robust matching
          const compactFilterText = filterText.replace(/\s+/g, "")
          const key5 = `${funcName}("${columnName}"${compactFilterText})`
          const key6 = `${funcName}(${columnName}${compactFilterText})`
          aggregationValues[key5] = value
          aggregationValues[key6] = value
        }

        aggregationValues[key1] = value
        aggregationValues[key2] = value

        console.log(`Pre-computed aggregation: ${key1} = ${value}`)

        // Special case for SUM("age", category == "A") pattern
        if (funcName === "SUM" && filterText.includes("==")) {
          // Create additional keys for the common pattern without spaces
          const compactKey = `${funcName}("${columnName}",${filterText.replace(/\s+/g, "")})`
          aggregationValues[compactKey] = value
          console.log(`Added compact key: ${compactKey} = ${value}`)

          // Also try with single quotes for string values
          if (filterText.includes('"')) {
            const singleQuoteKey = `${funcName}("${columnName}",${filterText.replace(/"/g, "'").replace(/\s+/g, "")})`
            aggregationValues[singleQuoteKey] = value
            console.log(`Added single quote key: ${singleQuoteKey} = ${value}`)
          }
        }
      })
    }

    // Replace aggregation function patterns with their pre-computed values
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

    // Replace column references with actual values from the row
    const columnNames = Object.keys(row).sort((a, b) => b.length - a.length) // Sort by length to avoid partial replacements
    for (const colName of columnNames) {
      const colValue = row[colName]
      if (colValue !== undefined && colValue !== null) {
        // Replace the column name with its value, being careful about word boundaries
        const regex = new RegExp(`\\b${colName}\\b`, "g")
        processedFormula = processedFormula.replace(
          regex,
          typeof colValue === "string" ? `"${colValue}"` : String(colValue),
        )
      }
    }

    console.log(`Formula after column replacement: ${processedFormula}`)

    // Check if the formula already contains a comparison operator
    const hasComparisonOperator = /[<>]=?|[!=]=/.test(processedFormula)

    // Create a safe evaluation function to get the formula result
    const evalFormula = new Function("return " + processedFormula)

    // Evaluate the formula to get the numeric result
    const formulaResult = evalFormula()
    console.log(`Formula evaluation result: ${formulaResult}`)

    // Handle NaN results
    if (isNaN(formulaResult)) {
      console.log("Formula evaluated to NaN, treating as 0 for comparison")
      const isValid = false // NaN should fail validation
      return {
        isValid,
        message: `Failed validation: Formula "${formula}" evaluated to NaN`,
      }
    }

    // If the formula already has a comparison operator, the result should be a boolean
    if (hasComparisonOperator) {
      const isValid = Boolean(formulaResult)
      return {
        isValid,
        message: isValid
          ? `Passed validation: ${formula}`
          : `Failed validation: Formula "${formula}" evaluated to false`,
      }
    }

    // CRITICAL FIX: For Math Formula rules, use default operator and value if they're undefined
    let finalOperator = operator
    let finalValue = value

    // If operator is undefined, default to "==" for Math Formula rules
    if (finalOperator === undefined || finalOperator === null) {
      finalOperator = "=="
      console.log("Using default operator '==' because operator is undefined")
    }

    // If value is undefined, default to 0 for Math Formula rules
    if (finalValue === undefined || finalValue === null) {
      finalValue = 0
      console.log("Using default value 0 because value is undefined")
    }

    // ADDED: Force parameter conversion to ensure correct types
    const operatorStr = String(finalOperator)
    const valueNum = Number(finalValue)

    console.log("PARAMETER CONVERSION:", {
      originalOperator: operator,
      originalValue: value,
      finalOperator: finalOperator,
      finalValue: finalValue,
      convertedOperator: operatorStr,
      convertedValue: valueNum,
    })

    // Now perform the comparison with the final values
    let isValid = false
    const numericResult = Number(formulaResult)

    console.log(`CRITICAL COMPARISON: ${numericResult} ${operatorStr} ${valueNum}`)

    // ADDED: Detailed logging for equality comparison
    if (operatorStr === "==") {
      console.log("EQUALITY COMPARISON DETAILS:", {
        numericResult: numericResult,
        valueNum: valueNum,
        difference: Math.abs(numericResult - valueNum),
        epsilon: 0.000001,
        isCloseToZero: Math.abs(numericResult) < 0.000001,
        valueIsCloseToZero: Math.abs(valueNum) < 0.000001,
      })
    }

    // CRITICAL FIX: Handle equality comparison separately from other operators
    if (operatorStr === "==") {
      // Use a small epsilon for floating-point comparison
      const epsilon = 0.000001
      isValid = Math.abs(numericResult - valueNum) < epsilon
      console.log(`EQUALITY CHECK: Math.abs(${numericResult} - ${valueNum}) < ${epsilon} = ${isValid}`)
    } else if (operatorStr === "!=") {
      const epsilon = 0.000001
      isValid = Math.abs(numericResult - valueNum) >= epsilon
    } else if (operatorStr === ">") {
      isValid = numericResult > valueNum
    } else if (operatorStr === ">=") {
      isValid = numericResult >= valueNum
    } else if (operatorStr === "<") {
      isValid = numericResult < valueNum
    } else if (operatorStr === "<=") {
      isValid = numericResult <= valueNum
    } else {
      console.warn(`Unknown operator: ${operatorStr}`)
      isValid = false
    }

    console.log(`COMPARISON RESULT: ${numericResult} ${operatorStr} ${valueNum} = ${isValid}`)

    return {
      isValid,
      message: isValid
        ? `Passed validation: ${formula} ${operatorStr} ${valueNum}`
        : `Failed validation: ${numericResult} ${operatorStr} ${valueNum} is false`,
    }
  } catch (error) {
    console.error("Error in validateFormula:", error)
    return {
      isValid: false,
      message: `Validation failed: ${error.message}`,
    }
  }
}

function getFunctionName(functionString: string): string {
  const match = functionString.match(/^([A-Za-z_]+)/)
  return match ? match[1] : functionString
}

function computeAggregation(dataset: DataRecord[], aggregationConfig: AggregationConfig): number {
  const { function: funcName, column, filter } = aggregationConfig

  // Filter the dataset based on the filter config
  const filteredData = filterData(dataset, filter)

  // Log the filtered data for debugging
  console.log(`Filtered data for ${funcName}("${column}"): ${filteredData.length} rows`)

  // Check if filtered data is empty
  if (filteredData.length === 0) {
    console.log(`No data matches the filter criteria for ${funcName}("${column}")`)
    // Return appropriate default values based on function type
    switch (funcName.toUpperCase()) {
      case "SUM":
        return 0
      case "AVG":
        return 0
      case "COUNT":
        return 0
      case "MIN":
        return 0
      case "MAX":
        return 0
      case "DISTINCT_COUNT":
        return 0
      default:
        return 0
    }
  }

  // Extract values from the specified column
  const values = filteredData.map((record) => {
    const value = record[column]
    // Handle null/undefined values
    return value === null || value === undefined ? 0 : Number(value)
  })

  // Log the extracted values for debugging
  console.log(
    `Values for ${funcName}("${column}"): ${JSON.stringify(values.slice(0, 5))}${values.length > 5 ? "..." : ""}`,
  )

  // Perform the aggregation based on the function name
  switch (funcName.toUpperCase()) {
    case "SUM":
      // Filter out NaN values and sum the rest
      const validValues = values.filter((v) => !isNaN(v))
      console.log(`Valid values for SUM: ${validValues.length} of ${values.length}`)
      return validValues.reduce((sum, value) => sum + value, 0)
    case "AVG":
      const validAvgValues = values.filter((v) => !isNaN(v))
      return validAvgValues.length > 0
        ? validAvgValues.reduce((sum, value) => sum + value, 0) / validAvgValues.length
        : 0
    case "COUNT":
      return values.length
    case "MIN":
      const validMinValues = values.filter((v) => !isNaN(v))
      return validMinValues.length > 0 ? Math.min(...validMinValues) : 0
    case "MAX":
      const validMaxValues = values.filter((v) => !isNaN(v))
      return validMaxValues.length > 0 ? Math.max(...validMaxValues) : 0
    case "DISTINCT_COUNT": {
      const distinctValues = new Set(values.filter((v) => !isNaN(v)))
      return distinctValues.size
    }
    default:
      console.warn(`Unknown aggregation function: ${funcName}`)
      return 0
  }
}

function filterData(dataset: DataRecord[], filterConfig?: AggregationConfig["filter"]): DataRecord[] {
  if (!filterConfig) {
    return dataset // No filter, return the original dataset
  }

  let conditions: Condition[] = []

  if ("conditions" in filterConfig && Array.isArray(filterConfig.conditions)) {
    conditions = filterConfig.conditions
  } else if ("column" in filterConfig && filterConfig.column) {
    // Handle the legacy single-condition filter
    conditions = [
      {
        column: filterConfig.column,
        operator: filterConfig.operator || "==",
        value: filterConfig.value,
      },
    ]
  } else {
    console.warn("Invalid filter configuration:", filterConfig)
    return dataset // Invalid filter, return the original dataset
  }

  // Log the conditions for debugging
  console.log(`Filtering with conditions: ${JSON.stringify(conditions)}`)

  return dataset.filter((record) => {
    let result = true // Start with true for AND, false for OR

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const { column, operator, value, logicalOperator } = condition

      let conditionResult = false // Default to false

      if (column && operator !== undefined && value !== undefined) {
        const recordValue = record[column]

        // Log the comparison for debugging
        console.log(`Comparing ${column}: ${recordValue} ${operator} ${value}`)

        switch (operator) {
          case "==":
            conditionResult = String(recordValue) === String(value)
            break
          case "!=":
            conditionResult = String(recordValue) !== String(value)
            break
          case ">":
            conditionResult = Number(recordValue) > Number(value)
            break
          case ">=":
            conditionResult = Number(recordValue) >= Number(value)
            break
          case "<":
            conditionResult = Number(recordValue) < Number(value)
            break
          case "<=":
            conditionResult = Number(recordValue) <= Number(value)
            break
          case "contains":
            conditionResult = String(recordValue).includes(String(value))
            break
          case "not contains":
            conditionResult = !String(recordValue).includes(String(value))
            break
          case "is empty":
            conditionResult = recordValue === null || recordValue === undefined || String(recordValue).trim() === ""
            break
          case "is not empty":
            conditionResult = recordValue !== null && recordValue !== undefined && String(recordValue).trim() !== ""
            break
          default:
            console.warn(`Unknown operator: ${operator}`)
            conditionResult = false
        }
      }

      if (i === 0) {
        result = conditionResult
      } else if (logicalOperator === "OR") {
        result = result || conditionResult
      } else {
        result = result && conditionResult
      }
    }

    return result
  })
}

// Add this function to set default date rule parameters
function ensureDateRuleParameters(rule: DataQualityRule): DataQualityRule {
  // Create a deep copy of the rule to avoid modifying the original
  const updatedRule = JSON.parse(JSON.stringify(rule))

  // Make sure parameters object exists
  if (!updatedRule.parameters) {
    updatedRule.parameters = {}
  }

  // Set default parameters based on rule type
  if (updatedRule.ruleType === "date-before" || updatedRule.ruleType === "date-after") {
    if (!updatedRule.parameters.compareDate) {
      // Set default to today's date
      const today = new Date()
      updatedRule.parameters.compareDate = today.toISOString().split("T")[0] // YYYY-MM-DD format
      console.log(`Set default compareDate for ${updatedRule.ruleType} rule:`, updatedRule.parameters.compareDate)
    }
  } else if (updatedRule.ruleType === "date-between") {
    if (!updatedRule.parameters.startDate || !updatedRule.parameters.endDate) {
      // Set default start date to 30 days ago and end date to today
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)

      if (!updatedRule.parameters.startDate) {
        updatedRule.parameters.startDate = thirtyDaysAgo.toISOString().split("T")[0]
        console.log(`Set default startDate for date-between rule:`, updatedRule.parameters.startDate)
      }

      if (!updatedRule.parameters.endDate) {
        updatedRule.parameters.endDate = today.toISOString().split("T")[0]
        console.log(`Set default endDate for date-between rule:`, updatedRule.parameters.endDate)
      }
    }
  } else if (updatedRule.ruleType === "date-format" && !updatedRule.parameters.format) {
    updatedRule.parameters.format = "iso" // Default to ISO format
    console.log(`Set default format for date-format rule: iso`)
  }

  return updatedRule
}

// Helper function to evaluate a single condition
function evaluateCondition(row: DataRecord, condition: Condition): boolean {
  if (!condition || !condition.column || condition.operator === undefined) {
    console.warn("Invalid condition:", condition)
    return false
  }

  const { column, operator, value } = condition
  const rowValue = row[column]

  switch (operator) {
    case "==":
      return rowValue == value
    case "!=":
      return rowValue != value
    case ">":
      return Number(rowValue) > Number(value)
    case ">=":
      return Number(rowValue) >= Number(value)
    case "<":
      return Number(rowValue) < Number(value)
    case "<=":
      return Number(rowValue) <= Number(value)
    case "contains":
    case "contains":
      return String(rowValue).includes(String(value))
    case "not-contains":
      return !String(rowValue).includes(String(value))
    case "starts-with":
      return String(rowValue).startsWith(String(value))
    case "ends-with":
      return String(rowValue).endsWith(String(value))
    case "matches":
      try {
        const regex = new RegExp(String(value))
        return regex.test(String(rowValue))
      } catch (error) {
        console.error("Invalid regex in condition:", value)
        return false
      }
    case "is-blank":
      return rowValue === null || rowValue === undefined || String(rowValue).trim() === ""
    case "is-not-blank":
      return rowValue !== null && rowValue !== undefined && String(rowValue).trim() !== ""
    default:
      console.warn(`Unknown operator in condition: ${operator}`)
      return false
  }
}

// Helper function to evaluate multiple conditions with logical operators
function evaluateMultipleConditions(row: DataRecord, conditions: Condition[]): boolean {
  if (!conditions || conditions.length === 0) {
    return true // No conditions means it passes
  }

  let result = evaluateCondition(row, conditions[0])

  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const prevCondition = conditions[i - 1]
    const logicalOperator = prevCondition.logicalOperator || "AND"

    const conditionResult = evaluateCondition(row, condition)

    if (logicalOperator === "OR") {
      result = result || conditionResult
    } else {
      result = result && conditionResult
    }
  }

  return result
}

export function validateDataset(
  data: DataTables,
  rules: DataQualityRule[],
  valueLists?: ValueList[],
): ValidationResult[] {
  const results: ValidationResult[] = []

  for (const tableName in data) {
    if (data.hasOwnProperty(tableName)) {
      const tableData = data[tableName]
      const tableRules = rules.filter((rule) => rule.table === tableName && rule.enabled !== false)

      for (let rule of tableRules) {
        // ADDED: Log rule configuration before validation
        console.log(
          "RULE CONFIG:",
          JSON.stringify(
            {
              id: rule.id,
              name: rule.name,
              ruleType: rule.ruleType,
              parameters: rule.parameters,
            },
            null,
            2,
          ),
        )

        // CRITICAL FIX: Ensure formula rules have default operator and value
        if (rule.ruleType === "formula" && rule.parameters) {
          if (rule.parameters.operator === undefined || rule.parameters.operator === null) {
            rule.parameters.operator = "=="
            console.log(`Set default operator '==' for formula rule: ${rule.name}`)
          }

          if (rule.parameters.value === undefined || rule.parameters.value === null) {
            rule.parameters.value = 0
            console.log(`Set default value 0 for formula rule: ${rule.name}`)
          }
        }

        // Apply default parameters for date rules
        if (rule.ruleType?.startsWith("date-")) {
          rule = ensureDateRuleParameters(rule)
          console.log(`Processed date rule for validation:`, {
            id: rule.id,
            name: rule.name,
            type: rule.ruleType,
            parameters: rule.parameters,
          })
        }

        // For unique rules, validate across all rows at once
        if (rule.ruleType === "unique") {
          const uniqueResults = validateUniqueRule(rule, tableData, tableName)
          results.push(...uniqueResults)
          continue // Skip the row-by-row validation for unique rules
        }

        for (let i = 0; i < tableData.length; i++) {
          const row = tableData[i]
          let isValid = true
          let message = `Row ${i + 1} in table "${tableName}" passed validation for rule "${rule.name}".`

          try {
            console.log(`Processing rule: ${rule.name}, type: "${rule.ruleType}", column: ${rule.column}`)

            // Debug log for date rules
            if (rule.ruleType?.includes("date-")) {
              console.log("Date rule parameters:", rule.parameters)
            }

            switch (rule.ruleType) {
              case "multi-column":
                // For multi-column rules, evaluate all conditions with logical operators
                if (rule.conditions && rule.conditions.length > 0) {
                  isValid = evaluateMultipleConditions(row, rule.conditions)
                  if (!isValid) {
                    message = `Row ${i + 1} in table "${tableName}" failed multi-column validation for rule "${rule.name}".`
                  }
                } else {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed multi-column validation for rule "${rule.name}" because no conditions were defined.`
                }
                break

              case "required":
                if (
                  row[rule.column] === undefined ||
                  row[rule.column] === null ||
                  String(row[rule.column]).trim() === ""
                ) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed required validation for rule "${rule.name}". Column "${rule.column}" is missing or empty.`
                }
                break

              case "equals":
                if (String(row[rule.column]) !== String(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed equals validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" does not equal "${rule.parameters.value}".`
                }
                break

              case "not-equals":
                if (String(row[rule.column]) === String(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed not equals validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" equals "${rule.parameters.value}".`
                }
                break

              case "greater-than":
                if (Number(row[rule.column]) <= Number(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed greater than validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not greater than "${rule.parameters.value}".`
                }
                break

              case "greater-than-equals":
                if (Number(row[rule.column]) < Number(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed greater than or equals validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not greater than or equal to "${rule.parameters.value}".`
                }
                break

              case "less-than":
                if (Number(row[rule.column]) >= Number(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed less than validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not less than "${rule.parameters.value}".`
                }
                break

              case "less-than-equals":
                if (Number(row[rule.column]) > Number(rule.parameters.value)) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed less than or equals validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not less than or equal to "${rule.parameters.value}".`
                }
                break

              case "range":
                if (rule.parameters.minValue !== undefined && rule.parameters.maxValue !== undefined) {
                  const value = Number(row[rule.column])
                  if (isNaN(value) || value < rule.parameters.minValue || value > rule.parameters.maxValue) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed range validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not within the range [${rule.parameters.minValue}, ${rule.parameters.maxValue}].`
                  }
                }
                break

              case "regex":
                if (rule.parameters.pattern) {
                  const regex = new RegExp(rule.parameters.pattern)
                  if (!regex.test(String(row[rule.column]))) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed regex validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" does not match the pattern "${rule.parameters.pattern}".`
                  }
                }
                break

              case "type":
                if (rule.parameters.dataType) {
                  let typeCheckPassed = false
                  switch (rule.parameters.dataType) {
                    case "string":
                      typeCheckPassed = typeof row[rule.column] === "string"
                      break
                    case "number":
                      typeCheckPassed = typeof row[rule.column] === "number"
                      break
                    case "boolean":
                      typeCheckPassed = typeof row[rule.column] === "boolean"
                      break
                    case "date":
                      typeCheckPassed = row[rule.column] instanceof Date
                      break
                    default:
                      typeCheckPassed = false
                  }

                  if (!typeCheckPassed) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed type validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not of type "${rule.parameters.dataType}".`
                  }
                }
                break

              case "enum":
                if (rule.parameters.allowedValues) {
                  const allowedValues = String(rule.parameters.allowedValues)
                    .split(",")
                    .map((v: string) => v.trim())
                  const columnValue = String(row[rule.column]).trim()
                  const caseInsensitive = rule.parameters.caseInsensitive === true

                  let valueFound = false
                  for (const allowedValue of allowedValues) {
                    if (caseInsensitive) {
                      if (columnValue.toLowerCase() === allowedValue.toLowerCase()) {
                        valueFound = true
                        break
                      }
                    } else if (columnValue === allowedValue) {
                      valueFound = true
                      break
                    }
                  }

                  if (!valueFound) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed enum validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not in the allowed list: ${allowedValues.join(", ")}.`
                  }
                }
                break

              case "list":
                if (rule.parameters.valueList) {
                  // Find the value list by name
                  const valueList = valueLists?.find((list) => list.id === rule.parameters.valueList)

                  if (valueList) {
                    const validValues = valueList.values
                    const columnValue = String(row[rule.column]).trim()

                    if (!validValues.includes(columnValue)) {
                      isValid = false
                      message = `Row ${i + 1} in table "${tableName}" failed list validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not in the allowed list: ${validValues.join(", ")}.`
                    }
                  } else {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed list validation for rule "${rule.name}". Value list "${rule.parameters.valueList}" not found.`
                  }
                }
                break

              case "contains":
                if (rule.parameters.substring) {
                  if (!String(row[rule.column]).includes(rule.parameters.substring)) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed contains validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" does not contain "${rule.parameters.substring}".`
                  }
                }
                break

              case "formula":
                if (rule.parameters.formula) {
                  // ADDED: Log formula rule parameters before validation
                  console.log("FORMULA RULE PARAMETERS:", {
                    formula: rule.parameters.formula,
                    operator: rule.parameters.operator,
                    value: rule.parameters.value,
                    operatorType: typeof rule.parameters.operator,
                    valueType: typeof rule.parameters.value,
                  })

                  const formulaResult = validateFormula(
                    row,
                    rule.parameters.formula,
                    rule.parameters.operator,
                    rule.parameters.value,
                    rule.parameters.aggregations,
                    tableData,
                  )
                  isValid = formulaResult.isValid
                  message = formulaResult.message
                }
                break

              case "javascript-formula":
                if (rule.parameters.javascriptExpression) {
                  try {
                    // Create a function that has access to row properties as parameters
                    const paramNames = Object.keys(row)
                    const paramValues = paramNames.map((key) => row[key])

                    // Create a function that evaluates the expression with the row data
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

                    // Execute the function with the row values
                    const result = evalFunc(...paramValues)

                    if (typeof result !== "boolean") {
                      console.warn(
                        `JavaScript formula for rule "${rule.name}" did not return a boolean value. Returning false by default.`,
                      )
                      isValid = false
                      message = `Row ${i + 1} in table "${tableName}" failed JavaScript formula validation for rule "${rule.name}". The formula did not return a boolean value.`
                    } else {
                      isValid = result
                      message = `Row ${i + 1} in table "${tableName}" ${
                        isValid ? "passed" : "failed"
                      } JavaScript formula validation for rule "${rule.name}".`
                    }
                  } catch (error: any) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed JavaScript formula validation for rule "${rule.name}" due to an error: ${error.message}`
                    console.error(message, error)
                  }
                }
                break

              case "date-before":
              case "date_before":
              case "dateBefore":
              case "DateBefore":
                try {
                  // Get the date values to compare
                  const beforeDate = new Date(row[rule.column])
                  const compareBeforeDate = new Date(rule.parameters.compareDate)
                  const isBeforeInclusive = rule.parameters.inclusive === true

                  // Skip validation if the value is not a valid date
                  if (isNaN(beforeDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-before validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not a valid date.`
                  } else if (isNaN(compareBeforeDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-before validation for rule "${rule.name}". Compare date "${rule.parameters.compareDate}" is not a valid date.`
                  } else {
                    // Check if the date is before the compare date
                    if (isBeforeInclusive) {
                      // On or before (<=)
                      isValid = beforeDate <= compareBeforeDate
                    } else {
                      // Strictly before (<)
                      isValid = beforeDate < compareBeforeDate
                    }

                    if (!isValid) {
                      message = `Row ${i + 1} in table "${tableName}" failed date-before validation for rule "${rule.name}". Date "${row[rule.column]}" is not ${isBeforeInclusive ? "on or " : ""}before "${rule.parameters.compareDate}".`
                    }
                  }
                } catch (error) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed date-before validation for rule "${rule.name}" due to an error: ${error.message}`
                }
                break

              case "date-after":
              case "date_after":
              case "dateAfter":
              case "DateAfter":
                try {
                  // Get the date values to compare
                  const afterDate = new Date(row[rule.column])
                  const compareAfterDate = new Date(rule.parameters.compareDate)
                  const isAfterInclusive = rule.parameters.inclusive === true

                  // Skip validation if the value is not a valid date
                  if (isNaN(afterDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-after validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not a valid date.`
                  } else if (isNaN(compareAfterDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-after validation for rule "${rule.name}". Compare date "${rule.parameters.compareDate}" is not a valid date.`
                  } else {
                    // Check if the date is after the compare date
                    if (isAfterInclusive) {
                      // On or after (>=)
                      isValid = afterDate >= compareAfterDate
                    } else {
                      // Strictly after (>)
                      isValid = afterDate > compareAfterDate
                    }

                    if (!isValid) {
                      message = `Row ${i + 1} in table "${tableName}" failed date-after validation for rule "${rule.name}". Date "${row[rule.column]}" is not ${isAfterInclusive ? "on or " : ""}after "${rule.parameters.compareDate}".`
                    }
                  }
                } catch (error) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed date-after validation for rule "${rule.name}" due to an error: ${error.message}`
                }
                break

              case "date-between":
              case "date_between":
              case "dateBetween":
              case "DateBetween":
                try {
                  // Get the date values to compare
                  const betweenDate = new Date(row[rule.column])
                  const startDate = new Date(rule.parameters.startDate)
                  const endDate = new Date(rule.parameters.endDate)
                  const isBetweenInclusive = rule.parameters.inclusive === true

                  // Skip validation if any value is not a valid date
                  if (isNaN(betweenDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-between validation for rule "${rule.name}". Column "${rule.column}" value "${row[rule.column]}" is not a valid date.`
                  } else if (isNaN(startDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-between validation for rule "${rule.name}". Start date "${rule.parameters.startDate}" is not a valid date.`
                  } else if (isNaN(endDate.getTime())) {
                    isValid = false
                    message = `Row ${i + 1} in table "${tableName}" failed date-between validation for rule "${rule.name}". End date "${rule.parameters.endDate}" is not a valid date.`
                  } else {
                    // Check if the date is between start and end dates
                    if (isBetweenInclusive) {
                      // Inclusive range (>=, <=)
                      isValid = betweenDate >= startDate && betweenDate <= endDate
                    } else {
                      // Exclusive range (>, <)
                      isValid = betweenDate > startDate && betweenDate < endDate
                    }

                    if (!isValid) {
                      message = `Row ${i + 1} in table "${tableName}" failed date-between validation for rule "${rule.name}". Date "${row[rule.column]}" is not ${isBetweenInclusive ? "on or " : ""}between "${rule.parameters.startDate}" and "${rule.parameters.endDate}".`
                    }
                  }
                } catch (error) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed date-between validation for rule "${rule.name}" due to an error: ${error.message}`
                }
                break

              case "date-format":
              case "date_format":
              case "dateFormat":
              case "DateFormat":
                try {
                  const formatValue = String(row[rule.column])
                  const formatType = rule.parameters.format || "iso"
                  const isRequired = rule.parameters.required === true

                  // Skip validation if the value is empty and not required
                  if (!isRequired && (!formatValue || formatValue.trim() === "")) {
                    isValid = true
                    break
                  }

                  // Validate based on format type
                  let formatRegex
                  switch (formatType) {
                    case "iso":
                      formatRegex = /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD
                      break
                    case "us":
                      formatRegex = /^\d{2}\/\d{2}\/\d{4}$/ // MM/DD/YYYY
                      break
                    case "eu":
                      formatRegex = /^\d{2}\/\d{2}\/\d{4}$/ // DD/MM/YYYY
                      break
                    case "custom":
                      if (rule.parameters.customFormat) {
                        // Convert the custom format to a regex
                        // This is a simplified version - a real implementation would be more complex
                        const customRegex = rule.parameters.customFormat
                          .replace(/YYYY/g, "\\d{4}")
                          .replace(/MM/g, "\\d{2}")
                          .replace(/DD/g, "\\d{2}")
                          .replace(/HH/g, "\\d{2}")
                          .replace(/mm/g, "\\d{2}")
                          .replace(/ss/g, "\\d{2}")
                        formatRegex = new RegExp(`^${customRegex}$`)
                      } else {
                        formatRegex = /.*/ // Any format if custom format is not specified
                      }
                      break
                    case "any":
                      // For "any" format, just check if it's a valid date
                      isValid = !isNaN(new Date(formatValue).getTime())
                      if (!isValid) {
                        message = `Row ${i + 1} in table "${tableName}" failed date format validation for rule "${rule.name}". Value "${formatValue}" is not a valid date.`
                      }
                      break
                    default:
                      formatRegex = /.*/ // Any format if not specified
                  }

                  // If we're using a regex for validation
                  if (formatType !== "any" && formatRegex) {
                    isValid = formatRegex.test(formatValue)
                    if (!isValid) {
                      message = `Row ${i + 1} in table "${tableName}" failed date format validation for rule "${rule.name}". Value "${formatValue}" does not match the ${formatType} format.`
                    }

                    // For specific formats, also check if it's a valid date
                    if (isValid && ["iso", "us", "eu"].includes(formatType)) {
                      let dateObj
                      if (formatType === "iso") {
                        dateObj = new Date(formatValue)
                      } else if (formatType === "us") {
                        const [month, day, year] = formatValue.split("/")
                        dateObj = new Date(`${year}-${month}-${day}`)
                      } else if (formatType === "eu") {
                        const [day, month, year] = formatValue.split("/")
                        dateObj = new Date(`${year}-${month}-${day}`)
                      }

                      isValid = !isNaN(dateObj.getTime())
                      if (!isValid) {
                        message = `Row ${i + 1} in table "${tableName}" failed date format validation for rule "${rule.name}". Value "${formatValue}" matches the format but is not a valid date.`
                      }
                    }
                  }
                } catch (error) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed date format validation for rule "${rule.name}" due to an error: ${error.message}`
                }
                break

              case "column-comparison":
              case "column_comparison":
              case "columnComparison":
              case "ColumnComparison":
                // Get the column values to compare
                const leftColumn = rule.column
                const rightColumn = rule.parameters.rightColumn || rule.parameters.secondaryColumn
                const operator = rule.parameters.operator || rule.parameters.comparisonOperator || "=="
                const allowNull = rule.parameters.allowNull === true

                // Skip validation if either value is null and allowNull is true
                if (
                  allowNull &&
                  (row[leftColumn] === null ||
                    row[leftColumn] === undefined ||
                    row[rightColumn] === null ||
                    row[rightColumn] === undefined)
                ) {
                  isValid = true
                  message = `Row ${i + 1} in table "${tableName}" skipped column comparison validation for rule "${rule.name}" because one of the values is null.`
                } else {
                  // Get the values to compare
                  const leftValue = row[leftColumn]
                  const rightValue = row[rightColumn]

                  // Perform the comparison based on the operator
                  switch (operator) {
                    case "==":
                      isValid = leftValue == rightValue
                      break
                    case "!=":
                      isValid = leftValue != rightValue
                      break
                    case ">":
                      isValid = Number(leftValue) > Number(rightValue)
                      break
                    case ">=":
                      isValid = Number(leftValue) >= Number(rightValue)
                      break
                    case "<":
                      isValid = Number(leftValue) < Number(rightValue)
                      break
                    case "<=":
                      isValid = Number(leftValue) <= Number(rightValue)
                      break
                    default:
                      isValid = false
                      message = `Row ${i + 1} in table "${tableName}" failed column comparison validation for rule "${rule.name}" due to unknown operator "${operator}".`
                  }

                  if (!isValid && !message.includes("unknown operator")) {
                    message = `Row ${i + 1} in table "${tableName}" failed column comparison validation for rule "${rule.name}". ${leftColumn} (${leftValue}) ${operator} ${rightColumn} (${rightValue}) is false.`
                  }
                }
                break

              case "cross-column":
              case "cross_column":
              case "crossColumn":
              case "CrossColumn":
                // Get the column values to compare
                const leftColName = rule.column
                const rightColName = rule.parameters.rightColumn || rule.parameters.secondaryColumn
                const compOperator = rule.parameters.operator || rule.parameters.comparisonOperator || "=="
                const skipNull = rule.parameters.allowNull === true

                console.log(`Cross-column validation: ${leftColName} ${compOperator} ${rightColName}`)

                // Skip validation if either value is null and allowNull is true
                if (
                  skipNull &&
                  (row[leftColName] === null ||
                    row[leftColName] === undefined ||
                    row[rightColName] === null ||
                    row[rightColName] === undefined)
                ) {
                  isValid = true
                  message = `Row ${i + 1} in table "${tableName}" skipped cross-column validation for rule "${rule.name}" because one of the values is null.`
                } else {
                  // Get the values to compare
                  const leftColValue = row[leftColName]
                  const rightColValue = row[rightColName]

                  console.log(`Comparing values: ${leftColValue} ${compOperator} ${rightColValue}`)

                  // Perform the comparison based on the operator
                  switch (compOperator) {
                    case "==":
                      isValid = leftColValue == rightColValue
                      break
                    case "!=":
                      isValid = leftColValue != rightColValue
                      break
                    case ">":
                      isValid = Number(leftColValue) > Number(rightColValue)
                      break
                    case ">=":
                      isValid = Number(leftColValue) >= Number(rightColValue)
                      break
                    case "<":
                      isValid = Number(leftColValue) < Number(rightColValue)
                      break
                    case "<=":
                      isValid = Number(leftColValue) <= Number(rightColValue)
                      break
                    default:
                      isValid = false
                      message = `Row ${i + 1} in table "${tableName}" failed cross-column validation for rule "${rule.name}" due to unknown operator "${compOperator}".`
                  }

                  if (!isValid && !message.includes("unknown operator")) {
                    message = `Row ${i + 1} in table "${tableName}" failed cross-column validation for rule "${rule.name}". ${leftColName} (${leftColValue}) ${compOperator} ${rightColName} (${rightColValue}) is false.`
                  }
                }
                break

              case "composite-reference":
              case "composite_reference":
              case "compositeReference":
              case "CompositeReference":
                // Get the source columns (from the current table)
                const sourceColumns = rule.parameters.sourceColumns || rule.parameters.columns || []

                // Get the target table and columns
                const targetTable = rule.parameters.targetTable || rule.parameters.referenceTable
                const targetColumns = rule.parameters.targetColumns || rule.parameters.referenceColumns || []

                // Skip validation if any required parameter is missing
                if (!sourceColumns.length || !targetTable || !targetColumns.length || !data[targetTable]) {
                  isValid = false
                  message = `Row ${i + 1} in table "${tableName}" failed composite reference validation for rule "${rule.name}" due to missing configuration parameters.`
                  break
                }

                // Extract the source values from the current row
                const sourceValues = sourceColumns.map((col) => row[col])

                // Check if any source value is null or undefined and skip if allowNull is true
                const allowNullRef = rule.parameters.allowNull === true
                if (allowNullRef && sourceValues.some((val) => val === null || val === undefined)) {
                  isValid = true
                  message = `Row ${i + 1} in table "${tableName}" skipped composite reference validation for rule "${rule.name}" because one of the source values is null.`
                  break
                }

                // Check if the composite key exists in the target table
                const targetData = data[targetTable]

                // Find a matching row in the target table
                const matchFound = targetData.some((targetRow) => {
                  // Check if all columns match
                  return sourceColumns.every((sourceCol, index) => {
                    const targetCol = targetColumns[index]
                    return String(row[sourceCol]) === String(targetRow[targetCol])
                  })
                })

                if (!matchFound) {
                  isValid = false
                  const sourceValuesStr = sourceColumns.map((col, idx) => `${col}=${row[col]}`).join(", ")
                  message = `Row ${i + 1} in table "${tableName}" failed composite reference validation for rule "${rule.name}". Composite key (${sourceValuesStr}) does not exist in table "${targetTable}".`
                }
                break

              default:
                isValid = false
                message = `Row ${i + 1} in table "${tableName}" has an unknown rule type "${rule.ruleType}".`
            }
          } catch (error: any) {
            isValid = false
            message = `Row ${i + 1} in table "${tableName}" validation failed for rule "${rule.name}" due to an error: ${error.message}`
            console.error(message, error)
          }

          results.push({
            rowIndex: i,
            table: tableName,
            column: rule.column,
            ruleName: rule.name,
            message: message,
            severity: isValid ? "success" : rule.severity, // Use rule.severity instead of hardcoding "failure"
            ruleId: rule.id,
          })
        }
      }
    }
  }

  return results
}

// Function to validate unique rules
function validateUniqueRule(rule: DataQualityRule, tableData: DataRecord[], tableName: string): ValidationResult[] {
  const results: ValidationResult[] = []

  // Get the columns to check for uniqueness
  const uniqueColumns = rule.parameters.uniqueColumns || [rule.column]

  if (!uniqueColumns.length) {
    results.push({
      rowIndex: -1,
      table: tableName,
      column: rule.column,
      ruleName: rule.name,
      message: `Failed to validate unique rule "${rule.name}" because no columns were specified.`,
      severity: "failure",
      ruleId: rule.id,
    })
    return results
  }

  // Create a map to track values and their occurrences
  const valueMap = new Map<string, number[]>()

  // Check each row for uniqueness
  tableData.forEach((row, rowIndex) => {
    // Create a composite key from the values of all columns
    const values = uniqueColumns.map((col) => {
      const val = row[col]
      return val === null || val === undefined ? "" : String(val)
    })

    const compositeKey = values.join("|")

    // If this composite key already exists, it's a duplicate
    if (valueMap.has(compositeKey)) {
      valueMap.get(compositeKey)!.push(rowIndex)
    } else {
      valueMap.set(compositeKey, [rowIndex])
    }
  })

  // Find duplicates and create validation results
  for (const [compositeKey, rowIndexes] of valueMap.entries()) {
    if (rowIndexes.length > 1) {
      // There are duplicates
      const values = compositeKey.split("|")
      const columnsWithValues = uniqueColumns.map((col, i) => `${col}="${values[i]}"`).join(", ")

      // Create a validation result for each duplicate row
      rowIndexes.forEach((rowIndex) => {
        results.push({
          rowIndex,
          table: tableName,
          column: uniqueColumns.join(", "),
          ruleName: rule.name,
          message: `Row ${rowIndex + 1} in table "${tableName}" failed unique validation for rule "${rule.name}". The combination (${columnsWithValues}) is not unique.`,
          severity: rule.severity,
          ruleId: rule.id,
        })
      })
    } else {
      // This row passes the uniqueness check
      results.push({
        rowIndex: rowIndexes[0],
        table: tableName,
        column: uniqueColumns.join(", "),
        ruleName: rule.name,
        message: `Row ${rowIndexes[0] + 1} in table "${tableName}" passed unique validation for rule "${rule.name}".`,
        severity: "success",
        ruleId: rule.id,
      })
    }
  }

  return results
}
