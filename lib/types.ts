export type RuleType =
  | "required"
  | "equals"
  | "not-equals"
  | "greater-than"
  | "greater-than-equals"
  | "less-than"
  | "less-than-equals"
  | "range"
  | "regex"
  | "unique"
  | "type"
  | "enum"
  | "list"
  | "contains"
  | "dependency"
  | "multi-column"
  | "lookup"
  | "custom"
  | "formula"
  | "javascript-formula"
  | "date-before"
  | "date-after"
  | "date-between"
  | "date-format"
  | "reference-integrity"
  | "composite-reference"
  | "column-comparison"
  | "math-operation" // New rule type

export type RuleSeverity = "warning" | "failure" | "success"

export type LogicalOperator = "AND" | "OR"

export interface Condition {
  column: string
  operator:
    | "=="
    | "!="
    | ">"
    | ">="
    | "<"
    | "<="
    | "contains"
    | "not-contains"
    | "starts-with"
    | "ends-with"
    | "matches"
    | "is-blank"
    | "is-not-blank"
  value: string | number | boolean | null
  logicalOperator?: LogicalOperator // The operator connecting this condition to the next one
}

export interface CrossTableCondition extends Condition {
  table: string // The table this condition applies to
}

export interface ColumnCondition {
  column: string
  ruleType: RuleType
  parameters: Record<string, any>
  logicalOperator: LogicalOperator // The operator connecting this condition to the next one
}

export interface DataQualityRule {
  id: string
  name: string
  tableName?: string
  table: string
  column: string
  ruleType: RuleType
  parameters: Record<string, any>
  description: string
  severity: RuleSeverity
  enabled: boolean // Add this field
  secondaryColumns?: string[]
  additionalColumns?: string[]
  referenceTable?: TableName
  referenceColumn?: string
  conditions?: Condition[] // For multi-column rules
  additionalConditions?: Condition[] // For additional conditions on any rule type
  crossTableConditions?: CrossTableCondition[] // For conditions that reference other tables
  columnConditions?: ColumnCondition[] // For multiple column conditions
}

export interface ValidationResult {
  rowIndex: number
  table: string
  column: string
  ruleName: string
  message: string
  severity: RuleSeverity
}

export interface DataRecord {
  [key: string]: any
}

export interface DataTables {
  [key: string]: DataRecord[]
}

export interface ValueList {
  id: string
  name: string
  description: string
  values: string[]
}

export type TableName = "users" | "transactions"

export interface DataQualityRuleParameters {
  // For column-comparison rule
  leftColumn?: string
  rightColumn?: string
  comparisonOperator?: "==" | "!=" | ">" | ">=" | "<" | "<="
  allowNull?: boolean // Skip validation if either value is null
}

export type MathOperationType = "add" | "subtract" | "multiply" | "divide"

export interface MathOperandDefinition {
  type: "column" | "constant"
  value: string | number
}

export interface MathOperationRuleParameters {
  operation: MathOperationType
  operands: MathOperandDefinition[]
  comparisonOperator: "==" | "!=" | ">" | ">=" | "<" | "<="
  comparisonValue: number
}
