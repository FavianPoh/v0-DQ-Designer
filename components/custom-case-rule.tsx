"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, Copy } from "lucide-react"

export default function CustomCaseRule() {
  const [copied, setCopied] = useState<string | null>(null)

  const customFunctions = {
    uppercase: `function(value, row) {
  // Skip validation if value is null or undefined
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // Check if the value is a string
  if (typeof value !== 'string') {
    return { 
      isValid: false, 
      message: 'Value must be a string for case validation'
    };
  }
  
  // Check if all alphabetic characters are uppercase
  const hasLowerCase = /[a-z]/.test(value);
  
  return { 
    isValid: !hasLowerCase,
    message: hasLowerCase ? 'Value must be in UPPERCASE' : ''
  };
}`,
    lowercase: `function(value, row) {
  // Skip validation if value is null or undefined
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // Check if the value is a string
  if (typeof value !== 'string') {
    return { 
      isValid: false, 
      message: 'Value must be a string for case validation'
    };
  }
  
  // Check if all alphabetic characters are lowercase
  const hasUpperCase = /[A-Z]/.test(value);
  
  return { 
    isValid: !hasUpperCase,
    message: hasUpperCase ? 'Value must be in lowercase' : ''
  };
}`,
    titlecase: `function(value, row) {
  // Skip validation if value is null or undefined
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // Check if the value is a string
  if (typeof value !== 'string') {
    return { 
      isValid: false, 
      message: 'Value must be a string for case validation'
    };
  }
  
  // Split the string into words
  const words = value.trim().split(/\\s+/);
  
  // Check if each word starts with an uppercase letter
  const isValid = words.every(word => {
    // Skip empty words
    if (word.length === 0) return true;
    
    // Check if the first character is uppercase
    return /^[A-Z]/.test(word);
  });
  
  return { 
    isValid,
    message: isValid ? '' : 'Each word must start with an uppercase letter'
  };
}`,
    camelcase: `function(value, row) {
  // Skip validation if value is null or undefined
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // Check if the value is a string
  if (typeof value !== 'string') {
    return { 
      isValid: false, 
      message: 'Value must be a string for case validation'
    };
  }
  
  // Check if the string follows camelCase pattern
  // - Starts with lowercase
  // - Contains no spaces or special characters
  // - May contain uppercase letters after the first character
  const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(value);
  
  return { 
    isValid: isCamelCase,
    message: isCamelCase ? '' : 'Value must be in camelCase format'
  };
}`,
    pascalcase: `function(value, row) {
  // Skip validation if value is null or undefined
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // Check if the value is a string
  if (typeof value !== 'string') {
    return { 
      isValid: false, 
      message: 'Value must be a string for case validation'
    };
  }
  
  // Check if the string follows PascalCase pattern
  // - Starts with uppercase
  // - Contains no spaces or special characters
  // - May contain uppercase letters for new words
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(value);
  
  return { 
    isValid: isPascalCase,
    message: isPascalCase ? '' : 'Value must be in PascalCase format'
  };
}`,
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Custom Case Validation Functions</CardTitle>
        <CardDescription>
          Use these custom functions with the "Custom Function" rule type for more advanced case validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="uppercase" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="uppercase">UPPERCASE</TabsTrigger>
            <TabsTrigger value="lowercase">lowercase</TabsTrigger>
            <TabsTrigger value="titlecase">Title Case</TabsTrigger>
            <TabsTrigger value="camelcase">camelCase</TabsTrigger>
            <TabsTrigger value="pascalcase">PascalCase</TabsTrigger>
          </TabsList>

          <TabsContent value="uppercase">
            <div className="space-y-4">
              <div className="relative">
                <Textarea value={customFunctions.uppercase} className="font-mono text-sm h-80" readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(customFunctions.uppercase, "uppercase")}
                >
                  {copied === "uppercase" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm">
                <p>This function validates that all alphabetic characters in the value are uppercase.</p>
                <p className="mt-2">It allows numbers, spaces, and punctuation.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lowercase">
            <div className="space-y-4">
              <div className="relative">
                <Textarea value={customFunctions.lowercase} className="font-mono text-sm h-80" readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(customFunctions.lowercase, "lowercase")}
                >
                  {copied === "lowercase" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm">
                <p>This function validates that all alphabetic characters in the value are lowercase.</p>
                <p className="mt-2">It allows numbers, spaces, and punctuation.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="titlecase">
            <div className="space-y-4">
              <div className="relative">
                <Textarea value={customFunctions.titlecase} className="font-mono text-sm h-80" readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(customFunctions.titlecase, "titlecase")}
                >
                  {copied === "titlecase" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm">
                <p>This function validates that each word in the value starts with an uppercase letter.</p>
                <p className="mt-2">It splits the text by spaces and checks the first character of each word.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="camelcase">
            <div className="space-y-4">
              <div className="relative">
                <Textarea value={customFunctions.camelcase} className="font-mono text-sm h-80" readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(customFunctions.camelcase, "camelcase")}
                >
                  {copied === "camelcase" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm">
                <p>This function validates that the value follows camelCase format:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Starts with a lowercase letter</li>
                  <li>Contains no spaces or special characters</li>
                  <li>May contain uppercase letters for new words</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pascalcase">
            <div className="space-y-4">
              <div className="relative">
                <Textarea value={customFunctions.pascalcase} className="font-mono text-sm h-80" readOnly />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(customFunctions.pascalcase, "pascalcase")}
                >
                  {copied === "pascalcase" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-sm">
                <p>This function validates that the value follows PascalCase format:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Starts with an uppercase letter</li>
                  <li>Contains no spaces or special characters</li>
                  <li>May contain uppercase letters for new words</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
