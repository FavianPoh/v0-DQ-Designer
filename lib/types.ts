export type RuleType =
  | "required"
  | "range"
  | "regex"
  | "unique"
  | "type"
  | "enum"
  | "dependency"
  | "multi-column" // Changed back from "conjunction"
  | "lookup"
  | "list"
  | "custom"
  | "cross-column"
  | "contains"
  | "formula"
  | "equals"
  | "not-equals"
  | "greater-than"
  | "greater-than-equals"
  | "less-than"
  | "less-than-equals"
  | "reference-integrity" // Now "Cross-Table Key Integrity" in the UI
  | "composite-reference" // Now "Cross-Table Composite Key" in the UI
  | "date-before"
  | "date-after"
  | "date-between"
  | "date-format"

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
