"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface JavaScriptExplainerProps {
  code: string
  columnName?: string
}

export function JavaScriptExplainer({ code, columnName = "value" }: JavaScriptExplainerProps) {
  const [explanation, setExplanation] = useState<string>("")
  const [examples, setExamples] = useState<Array<{ input: any; result: boolean; explanation: string }>>([])

  useEffect(() => {
    if (!code) {
      setExplanation("No code provided")
      return
    }

    try {
      // Generate explanation based on the code
      const explainedCode = explainJavaScript(code, columnName)
      setExplanation(explainedCode.explanation)
      setExamples(explainedCode.examples || [])
    } catch (error) {
      setExplanation(`Could not explain code: ${error}`)
    }
  }, [code, columnName])

  return (
    <Card className="mt-4 bg-slate-50 border-slate-200">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-1">In Plain English</h4>
            <p className="text-sm text-slate-700">{explanation}</p>
          </div>
        </div>

        {examples.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <h5 className="text-xs font-medium mb-2">Examples:</h5>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <Badge variant={example.result ? "success" : "destructive"} className="h-5 px-1.5">
                    {example.result ? "PASS" : "FAIL"}
                  </Badge>
                  <span className="text-slate-700">{example.explanation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ExplainedCode {
  explanation: string
  examples?: Array<{ input: any; result: boolean; explanation: string }>
}

function explainJavaScript(code: string, columnName: string): ExplainedCode {
  // Clean up the code
  const cleanCode = code.trim()

  // Common patterns and their explanations
  if (cleanCode.includes("return value !== null") && cleanCode.includes("value !== undefined")) {
    return {
      explanation: `Check that the ${columnName} is not empty (not null and not undefined).`,
      examples: [
        { input: "Hello", result: true, explanation: `"Hello" is not empty, so it passes.` },
        { input: null, result: false, explanation: `null is empty, so it fails.` },
      ],
    }
  }

  if (cleanCode.includes("value.toUpperCase() === value")) {
    return {
      explanation: `Check that the ${columnName} is in UPPERCASE (all capital letters).`,
      examples: [
        { input: "HELLO", result: true, explanation: `"HELLO" is all uppercase, so it passes.` },
        { input: "Hello", result: false, explanation: `"Hello" has lowercase letters, so it fails.` },
      ],
    }
  }

  if (cleanCode.includes("value.toLowerCase() === value")) {
    return {
      explanation: `Check that the ${columnName} is in lowercase (all small letters).`,
      examples: [
        { input: "hello", result: true, explanation: `"hello" is all lowercase, so it passes.` },
        { input: "Hello", result: false, explanation: `"Hello" has uppercase letters, so it fails.` },
      ],
    }
  }

  if (cleanCode.includes("charAt(0).toUpperCase()") && cleanCode.includes("slice(1).toLowerCase()")) {
    return {
      explanation: `Check that the ${columnName} is in Title Case (first letter uppercase, rest lowercase).`,
      examples: [
        { input: "Hello", result: true, explanation: `"Hello" is in title case, so it passes.` },
        { input: "hello", result: false, explanation: `"hello" doesn't start with uppercase, so it fails.` },
      ],
    }
  }

  if (cleanCode.includes("match(/^[a-z][a-zA-Z0-9]*$/")) {
    return {
      explanation: `Check that the ${columnName} is in camelCase (starts with lowercase, no spaces).`,
      examples: [
        { input: "helloWorld", result: true, explanation: `"helloWorld" is in camelCase, so it passes.` },
        { input: "HelloWorld", result: false, explanation: `"HelloWorld" starts with uppercase, so it fails.` },
      ],
    }
  }

  if (cleanCode.includes("match(/^[A-Z][a-zA-Z0-9]*$/")) {
    return {
      explanation: `Check that the ${columnName} is in PascalCase (starts with uppercase, no spaces).`,
      examples: [
        { input: "HelloWorld", result: true, explanation: `"HelloWorld" is in PascalCase, so it passes.` },
        { input: "helloWorld", result: false, explanation: `"helloWorld" starts with lowercase, so it fails.` },
      ],
    }
  }

  if ((cleanCode.includes("value.length") && cleanCode.includes(">")) || cleanCode.includes(">=")) {
    const match = cleanCode.match(/value\.length\s*(>=|>)\s*(\d+)/)
    if (match) {
      const operator = match[1]
      const length = match[2]
      return {
        explanation: `Check that the ${columnName} has ${operator === ">" ? "more than" : "at least"} ${length} characters.`,
        examples: [
          {
            input: "a".repeat(Number(length) + 1),
            result: true,
            explanation: `"${"a".repeat(Number(length) + 1)}" has ${Number(length) + 1} characters, so it passes.`,
          },
          {
            input: "a".repeat(Number(length) - 1),
            result: false,
            explanation: `"${"a".repeat(Number(length) - 1)}" has only ${Number(length) - 1} characters, so it fails.`,
          },
        ],
      }
    }
  }

  if ((cleanCode.includes("value.length") && cleanCode.includes("<")) || cleanCode.includes("<=")) {
    const match = cleanCode.match(/value\.length\s*(<=|<)\s*(\d+)/)
    if (match) {
      const operator = match[1]
      const length = match[2]
      return {
        explanation: `Check that the ${columnName} has ${operator === "<" ? "less than" : "at most"} ${length} characters.`,
        examples: [
          {
            input: "a".repeat(Number(length) - 1),
            result: true,
            explanation: `"${"a".repeat(Number(length) - 1)}" has ${Number(length) - 1} characters, so it passes.`,
          },
          {
            input: "a".repeat(Number(length) + 1),
            result: false,
            explanation: `"${"a".repeat(Number(length) + 1)}" has ${Number(length) + 1} characters, so it fails.`,
          },
        ],
      }
    }
  }

  if ((cleanCode.includes("row.") && cleanCode.includes("===")) || cleanCode.includes("!==")) {
    // Cross-column comparison
    const match = cleanCode.match(/row\.(\w+)\s*(===|!==|==|!=)\s*(.+)/)
    if (match) {
      const otherColumn = match[1]
      const operator = match[2]
      const compareValue = match[3]

      const isEqual = operator === "===" || operator === "=="
      const compareToValue = compareValue.includes("row.")
        ? `another column (${compareValue.replace("row.", "")})`
        : `the value ${compareValue}`

      return {
        explanation: `Check that the ${columnName} is ${isEqual ? "equal to" : "not equal to"} ${compareToValue}.`,
        examples: [
          {
            input: isEqual ? "matching value" : "different value",
            result: true,
            explanation: `When ${columnName} ${isEqual ? "matches" : "differs from"} ${compareToValue}, it passes.`,
          },
          {
            input: isEqual ? "different value" : "matching value",
            result: false,
            explanation: `When ${columnName} ${isEqual ? "differs from" : "matches"} ${compareToValue}, it fails.`,
          },
        ],
      }
    }
  }

  // If we can't identify a specific pattern, provide a generic explanation
  return {
    explanation: `This code checks if the ${columnName} meets custom validation criteria.`,
    examples: [
      { input: "example", result: true, explanation: "If the value meets all conditions, it passes." },
      { input: "invalid", result: false, explanation: "If the value doesn't meet all conditions, it fails." },
    ],
  }
}
