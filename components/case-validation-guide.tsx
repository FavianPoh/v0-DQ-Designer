"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

export default function CaseValidationGuide() {
  const [value, setValue] = useState("")
  const [activeTab, setActiveTab] = useState("uppercase")

  const isUpperCase = /^[A-Z0-9\s.,!?;:'"()\-_]+$/.test(value)
  const isLowerCase = /^[a-z0-9\s.,!?;:'"()\-_]+$/.test(value)
  const isTitleCase = /^([A-Z][a-z0-9\s.,!?;:'"()\-_]*\s*)+$/.test(value)
  const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(value)
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(value)

  const patterns = {
    uppercase: "^[A-Z0-9\\s.,!?;:'\"()\\-_]+$",
    lowercase: "^[a-z0-9\\s.,!?;:'\"()\\-_]+$",
    titlecase: "^([A-Z][a-z0-9\\s.,!?;:'\"()\\-_]*\\s*)+$",
    camelcase: "^[a-z][a-zA-Z0-9]*$",
    pascalcase: "^[A-Z][a-zA-Z0-9]*$",
  }

  const descriptions = {
    uppercase: "All letters are uppercase (A-Z). Numbers and punctuation are allowed.",
    lowercase: "All letters are lowercase (a-z). Numbers and punctuation are allowed.",
    titlecase: "Each word begins with an uppercase letter followed by lowercase letters.",
    camelcase: "Starts with lowercase, no spaces, each new word starts with uppercase.",
    pascalcase: "Starts with uppercase, no spaces, each new word starts with uppercase.",
  }

  const examples = {
    uppercase: "HELLO WORLD 123",
    lowercase: "hello world 123",
    titlecase: "Hello World 123",
    camelcase: "helloWorld123",
    pascalcase: "HelloWorld123",
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Case Validation Rules</CardTitle>
        <CardDescription>
          Test different case validation patterns and see how to implement them as rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="uppercase">UPPERCASE</TabsTrigger>
            <TabsTrigger value="lowercase">lowercase</TabsTrigger>
            <TabsTrigger value="titlecase">Title Case</TabsTrigger>
            <TabsTrigger value="camelcase">camelCase</TabsTrigger>
            <TabsTrigger value="pascalcase">PascalCase</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            <div>
              <Label htmlFor="test-input">Test Input</Label>
              <Input
                id="test-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Example: ${examples[activeTab]}`}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="font-medium">Validation Result:</div>
              {activeTab === "uppercase" &&
                (isUpperCase ? (
                  <div className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" /> Valid uppercase
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X size={16} className="mr-1" /> Not valid uppercase
                  </div>
                ))}
              {activeTab === "lowercase" &&
                (isLowerCase ? (
                  <div className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" /> Valid lowercase
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X size={16} className="mr-1" /> Not valid lowercase
                  </div>
                ))}
              {activeTab === "titlecase" &&
                (isTitleCase ? (
                  <div className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" /> Valid title case
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X size={16} className="mr-1" /> Not valid title case
                  </div>
                ))}
              {activeTab === "camelcase" &&
                (isCamelCase ? (
                  <div className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" /> Valid camelCase
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X size={16} className="mr-1" /> Not valid camelCase
                  </div>
                ))}
              {activeTab === "pascalcase" &&
                (isPascalCase ? (
                  <div className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" /> Valid PascalCase
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <X size={16} className="mr-1" /> Not valid PascalCase
                  </div>
                ))}
            </div>

            <div className="bg-muted p-4 rounded-md space-y-2">
              <h3 className="font-medium">How to implement this rule:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Create a new rule with the <strong>Regex Pattern</strong> rule type
                </li>
                <li>Select the column you want to validate</li>
                <li>Enter the following regex pattern:</li>
                <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">
                  {patterns[activeTab]}
                </pre>
                <li>Add a descriptive name and message for the rule</li>
              </ol>
              <div className="mt-3 text-sm">
                <strong>Description:</strong> {descriptions[activeTab]}
              </div>
              <div className="mt-1 text-sm">
                <strong>Example:</strong> "{examples[activeTab]}"
              </div>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
