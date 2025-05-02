"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

export function CaseValidationHelper() {
  const [input, setInput] = useState("")

  const isUpperCase = input && input === input.toUpperCase() && input !== input.toLowerCase()
  const isLowerCase = input && input === input.toLowerCase() && input !== input.toUpperCase()
  const isTitleCase = input && /^[A-Z][a-z]*(\s+[A-Z][a-z]*)*$/.test(input)
  const isCamelCase = input && /^[a-z][a-zA-Z0-9]*$/.test(input)
  const isPascalCase = input && /^[A-Z][a-zA-Z0-9]*$/.test(input)

  const caseExamples = [
    {
      name: "UPPERCASE",
      example: "HELLO WORLD",
      regex: "^[A-Z0-9\\s.,!?;:'\"()\\-_]+$",
      function: "return typeof value === 'string' && value === value.toUpperCase() && value !== value.toLowerCase();",
    },
    {
      name: "lowercase",
      example: "hello world",
      regex: "^[a-z0-9\\s.,!?;:'\"()\\-_]+$",
      function: "return typeof value === 'string' && value === value.toLowerCase() && value !== value.toUpperCase();",
    },
    {
      name: "Title Case",
      example: "Hello World",
      regex: "^([A-Z][a-z0-9\\s.,!?;:'\"()\\-_]*\\s*)+$",
      function:
        "return typeof value === 'string' && value.split(' ').every(word => word.charAt(0) === word.charAt(0).toUpperCase() && word.slice(1) === word.slice(1).toLowerCase());",
    },
    {
      name: "camelCase",
      example: "helloWorld",
      regex: "^[a-z][a-zA-Z0-9]*$",
      function:
        "return typeof value === 'string' && value.charAt(0) === value.charAt(0).toLowerCase() && /^[a-z][a-zA-Z0-9]*$/.test(value);",
    },
    {
      name: "PascalCase",
      example: "HelloWorld",
      regex: "^[A-Z][a-zA-Z0-9]*$",
      function:
        "return typeof value === 'string' && value.charAt(0) === value.charAt(0).toUpperCase() && /^[A-Z][a-zA-Z0-9]*$/.test(value);",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Validation Helper</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-input">Test your text</Label>
            <Input
              id="test-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something to test case formats..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={isUpperCase ? "success" : "outline"}>
                {isUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Badge>
              <span>UPPERCASE</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isLowerCase ? "success" : "outline"}>
                {isLowerCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Badge>
              <span>lowercase</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isTitleCase ? "success" : "outline"}>
                {isTitleCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Badge>
              <span>Title Case</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isCamelCase ? "success" : "outline"}>
                {isCamelCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Badge>
              <span>camelCase</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isPascalCase ? "success" : "outline"}>
                {isPascalCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </Badge>
              <span>PascalCase</span>
            </div>
          </div>

          <Tabs defaultValue="regex">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regex">Regex Pattern</TabsTrigger>
              <TabsTrigger value="function">Custom Function</TabsTrigger>
            </TabsList>

            <TabsContent value="regex" className="space-y-4">
              <p className="text-sm text-slate-600">Use these regex patterns with the "Regex Pattern" rule type:</p>

              {caseExamples.map((example, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">{example.name}</Label>
                    <span className="text-xs text-slate-500">Example: "{example.example}"</span>
                  </div>
                  <div className="relative">
                    <Input
                      value={example.regex}
                      readOnly
                      onClick={(e) => {
                        const input = e.target as HTMLInputElement
                        input.select()
                        navigator.clipboard.writeText(input.value)
                        alert(`Copied regex for ${example.name} to clipboard!`)
                      }}
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="function" className="space-y-4">
              <p className="text-sm text-slate-600">Use these functions with the "Custom Function" rule type:</p>

              {caseExamples.map((example, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">{example.name}</Label>
                    <span className="text-xs text-slate-500">Example: "{example.example}"</span>
                  </div>
                  <div className="relative">
                    <textarea
                      className="w-full h-20 p-2 text-sm font-mono border rounded-md"
                      value={example.function}
                      readOnly
                      onClick={(e) => {
                        const textarea = e.target as HTMLTextAreaElement
                        textarea.select()
                        navigator.clipboard.writeText(textarea.value)
                        alert(`Copied function for ${example.name} to clipboard!`)
                      }}
                    />
                  </div>
                  <JavaScriptExplainer code={example.function} />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple version of JavaScriptExplainer for this component
function JavaScriptExplainer({ code }: { code: string }) {
  let explanation = "This code checks if the value meets specific case format requirements."

  if (code.includes("toUpperCase()") && code.includes("toLowerCase()")) {
    if (code.includes("value === value.toUpperCase()")) {
      explanation = "This checks if the text is entirely in UPPERCASE (all capital letters)."
    } else if (code.includes("value === value.toLowerCase()")) {
      explanation = "This checks if the text is entirely in lowercase (all small letters)."
    }
  }

  if (code.includes("charAt(0).toUpperCase()") || code.includes("word.charAt(0) === word.charAt(0).toUpperCase()")) {
    explanation = "This checks if each word starts with an uppercase letter and the rest are lowercase (Title Case)."
  }

  if (code.includes("charAt(0) === value.charAt(0).toLowerCase()")) {
    explanation = "This checks if the text starts with a lowercase letter and has no spaces (camelCase)."
  }

  if (code.includes("charAt(0) === value.charAt(0).toUpperCase()") && code.includes("^[A-Z]")) {
    explanation = "This checks if the text starts with an uppercase letter and has no spaces (PascalCase)."
  }

  return (
    <div className="text-xs text-slate-600 mt-1">
      <span className="font-medium">In plain English:</span> {explanation}
    </div>
  )
}
