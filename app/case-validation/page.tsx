import { CaseValidationHelper } from "@/components/case-validation-helper"

export default function CaseValidationPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Case Validation Rules</h1>
        <p className="text-slate-600">
          Use this helper to create rules that validate text case formats like UPPERCASE, lowercase, Title Case,
          camelCase, and PascalCase.
        </p>
      </div>

      <CaseValidationHelper />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">How to Use Case Validation</h2>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Option 1: Using Regex Pattern Rules</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              Create a new rule with the <strong>Regex Pattern</strong> rule type
            </li>
            <li>Select the column you want to validate</li>
            <li>Copy the regex pattern from the helper above</li>
            <li>Paste it into the "Regex Pattern" field</li>
            <li>Save your rule</li>
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Option 2: Using Custom Function Rules</h3>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              Create a new rule with the <strong>Custom Function</strong> rule type
            </li>
            <li>Select the column you want to validate</li>
            <li>Copy the function from the helper above</li>
            <li>Paste it into the "Custom Validation Function" field</li>
            <li>Save your rule</li>
          </ol>
          <p className="text-sm text-slate-600 mt-2">
            The custom function approach provides better error messages and handles edge cases better.
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Pro Tip: Understanding the JavaScript</h3>
          <p className="text-sm text-blue-700">
            When you add a JavaScript function to a rule, you'll now see an "In Plain English" explanation that
            describes what the code does in non-technical terms. This helps you understand the validation logic even if
            you're not familiar with JavaScript.
          </p>
        </div>
      </div>
    </div>
  )
}
