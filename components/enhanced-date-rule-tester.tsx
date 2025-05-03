"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Info } from "lucide-react"

// Function to validate date after rule
function validateDateAfter(
  testDate: Date | null,
  compareDate: Date | null,
  inclusive: boolean,
): { isValid: boolean; message: string } {
  // If either date is null, we can't validate
  if (!testDate || !compareDate) {
    return {
      isValid: false,
      message: "Both dates must be provided for validation",
    }
  }

  // Normalize dates to remove time components for consistent comparison
  const testTime = new Date(testDate.setHours(0, 0, 0, 0)).getTime()
  const compareTime = new Date(compareDate.setHours(0, 0, 0, 0)).getTime()

  // Perform the validation based on inclusive flag
  const isValid = inclusive ? testTime >= compareTime : testTime > compareTime

  // Create appropriate message
  const message = isValid
    ? `Date ${formatDate(testDate)} is ${inclusive ? "on or " : ""}after ${formatDate(compareDate)}`
    : `Date ${formatDate(testDate)} is not ${inclusive ? "on or " : ""}after ${formatDate(compareDate)}`

  return { isValid, message }
}

// Function to validate date before rule
function validateDateBefore(
  testDate: Date | null,
  compareDate: Date | null,
  inclusive: boolean,
): { isValid: boolean; message: string } {
  // If either date is null, we can't validate
  if (!testDate || !compareDate) {
    return {
      isValid: false,
      message: "Both dates must be provided for validation",
    }
  }

  // Normalize dates to remove time components for consistent comparison
  const testTime = new Date(testDate.setHours(0, 0, 0, 0)).getTime()
  const compareTime = new Date(compareDate.setHours(0, 0, 0, 0)).getTime()

  // Perform the validation based on inclusive flag
  const isValid = inclusive ? testTime <= compareTime : testTime < compareTime

  // Create appropriate message
  const message = isValid
    ? `Date ${formatDate(testDate)} is ${inclusive ? "on or " : ""}before ${formatDate(compareDate)}`
    : `Date ${formatDate(testDate)} is not ${inclusive ? "on or " : ""}before ${formatDate(compareDate)}`

  return { isValid, message }
}

// Function to validate date between rule
function validateDateBetween(
  testDate: Date | null,
  startDate: Date | null,
  endDate: Date | null,
  inclusive: boolean,
): { isValid: boolean; message: string } {
  // If any date is null, we can't validate
  if (!testDate || !startDate || !endDate) {
    return {
      isValid: false,
      message: "All dates must be provided for validation",
    }
  }

  // Normalize dates to remove time components for consistent comparison
  const testTime = new Date(testDate.setHours(0, 0, 0, 0)).getTime()
  const startTime = new Date(startDate.setHours(0, 0, 0, 0)).getTime()
  const endTime = new Date(endDate.setHours(0, 0, 0, 0)).getTime()

  // Perform the validation based on inclusive flag
  const isValid = inclusive ? testTime >= startTime && testTime <= endTime : testTime > startTime && testTime < endTime

  // Create appropriate message
  const message = isValid
    ? `Date ${formatDate(testDate)} is ${inclusive ? "on or " : ""}between ${formatDate(startDate)} and ${formatDate(endDate)}`
    : `Date ${formatDate(testDate)} is not ${inclusive ? "on or " : ""}between ${formatDate(startDate)} and ${formatDate(endDate)}`

  return { isValid, message }
}

// Helper function to format dates consistently
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Helper function to parse date strings safely
function parseDate(dateString: string): Date | null {
  if (!dateString) return null

  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

// Generate a range of test dates around a target date
function generateTestDates(targetDate: Date, daysRange = 3): Date[] {
  const dates: Date[] = []

  for (let i = -daysRange; i <= daysRange; i++) {
    const date = new Date(targetDate)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

export function EnhancedDateRuleTester() {
  // State for the active tab
  const [activeTab, setActiveTab] = useState("date-after")

  // State for date after rule
  const [afterTestDate, setAfterTestDate] = useState("")
  const [afterCompareDate, setAfterCompareDate] = useState("")
  const [afterInclusive, setAfterInclusive] = useState(false)
  const [afterResult, setAfterResult] = useState<{ isValid: boolean; message: string } | null>(null)

  // State for date before rule
  const [beforeTestDate, setBeforeTestDate] = useState("")
  const [beforeCompareDate, setBeforeCompareDate] = useState("")
  const [beforeInclusive, setBeforeInclusive] = useState(false)
  const [beforeResult, setBeforeResult] = useState<{ isValid: boolean; message: string } | null>(null)

  // State for date between rule
  const [betweenTestDate, setBetweenTestDate] = useState("")
  const [betweenStartDate, setBetweenStartDate] = useState("")
  const [betweenEndDate, setBetweenEndDate] = useState("")
  const [betweenInclusive, setBetweenInclusive] = useState(false)
  const [betweenResult, setBetweenResult] = useState<{ isValid: boolean; message: string } | null>(null)

  // State for batch test results
  const [batchResults, setBatchResults] = useState<Array<{ testDate: string; isValid: boolean; message: string }>>([])

  // State for comprehensive test results
  const [comprehensiveResults, setComprehensiveResults] = useState<{
    afterTests: Array<{ testDate: string; isValid: boolean; message: string }>
    beforeTests: Array<{ testDate: string; isValid: boolean; message: string }>
    betweenTests: Array<{ testDate: string; isValid: boolean; message: string }>
  }>({
    afterTests: [],
    beforeTests: [],
    betweenTests: [],
  })

  // Initialize with today's date
  useEffect(() => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    setAfterTestDate(formatDate(today))
    setAfterCompareDate(formatDate(yesterday))

    setBeforeTestDate(formatDate(today))
    setBeforeCompareDate(formatDate(tomorrow))

    setBetweenTestDate(formatDate(today))
    setBetweenStartDate(formatDate(yesterday))
    setBetweenEndDate(formatDate(nextWeek))
  }, [])

  // Function to test date after rule
  const testDateAfter = () => {
    const testDate = parseDate(afterTestDate)
    const compareDate = parseDate(afterCompareDate)
    const result = validateDateAfter(testDate, compareDate, afterInclusive)
    setAfterResult(result)
  }

  // Function to test date before rule
  const testDateBefore = () => {
    const testDate = parseDate(beforeTestDate)
    const compareDate = parseDate(beforeCompareDate)
    const result = validateDateBefore(testDate, compareDate, beforeInclusive)
    setBeforeResult(result)
  }

  // Function to test date between rule
  const testDateBetween = () => {
    const testDate = parseDate(betweenTestDate)
    const startDate = parseDate(betweenStartDate)
    const endDate = parseDate(betweenEndDate)
    const result = validateDateBetween(testDate, startDate, endDate, betweenInclusive)
    setBetweenResult(result)
  }

  // Function to run batch tests for date after rule
  const runBatchTestsAfter = () => {
    const compareDate = parseDate(afterCompareDate)
    if (!compareDate) {
      alert("Please enter a valid comparison date")
      return
    }

    // Generate test dates around the compare date
    const testDates = generateTestDates(compareDate, 3)

    // Run tests
    const results = testDates.map((testDate) => ({
      testDate: formatDate(testDate),
      ...validateDateAfter(testDate, compareDate, afterInclusive),
    }))

    setBatchResults(results)
  }

  // Function to run batch tests for date before rule
  const runBatchTestsBefore = () => {
    const compareDate = parseDate(beforeCompareDate)
    if (!compareDate) {
      alert("Please enter a valid comparison date")
      return
    }

    // Generate test dates around the compare date
    const testDates = generateTestDates(compareDate, 3)

    // Run tests
    const results = testDates.map((testDate) => ({
      testDate: formatDate(testDate),
      ...validateDateBefore(testDate, compareDate, beforeInclusive),
    }))

    setBatchResults(results)
  }

  // Function to run batch tests for date between rule
  const runBatchTestsBetween = () => {
    const startDate = parseDate(betweenStartDate)
    const endDate = parseDate(betweenEndDate)
    if (!startDate || !endDate) {
      alert("Please enter valid start and end dates")
      return
    }

    // Generate test dates around and between the start and end dates
    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2)
    const testDates = [...generateTestDates(startDate, 2), midPoint, ...generateTestDates(endDate, 2)]

    // Remove duplicates
    const uniqueDates = testDates.filter(
      (date, index, self) => self.findIndex((d) => formatDate(d) === formatDate(date)) === index,
    )

    // Sort dates
    uniqueDates.sort((a, b) => a.getTime() - b.getTime())

    // Run tests
    const results = uniqueDates.map((testDate) => ({
      testDate: formatDate(testDate),
      ...validateDateBetween(testDate, startDate, endDate, betweenInclusive),
    }))

    setBatchResults(results)
  }

  // Function to run comprehensive tests for all rule types
  const runComprehensiveTests = () => {
    // Get dates for testing
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Test dates for "after" rule
    const afterTests = [
      { testDate: formatDate(lastWeek), compareDate: today, inclusive: false },
      { testDate: formatDate(yesterday), compareDate: today, inclusive: false },
      { testDate: formatDate(today), compareDate: today, inclusive: false },
      { testDate: formatDate(today), compareDate: today, inclusive: true },
      { testDate: formatDate(tomorrow), compareDate: today, inclusive: false },
      { testDate: formatDate(nextWeek), compareDate: today, inclusive: false },
    ].map((test) => ({
      testDate: test.testDate,
      ...validateDateAfter(parseDate(test.testDate), test.compareDate, test.inclusive),
      inclusive: test.inclusive,
    }))

    // Test dates for "before" rule
    const beforeTests = [
      { testDate: formatDate(lastWeek), compareDate: today, inclusive: false },
      { testDate: formatDate(yesterday), compareDate: today, inclusive: false },
      { testDate: formatDate(today), compareDate: today, inclusive: false },
      { testDate: formatDate(today), compareDate: today, inclusive: true },
      { testDate: formatDate(tomorrow), compareDate: today, inclusive: false },
      { testDate: formatDate(nextWeek), compareDate: today, inclusive: false },
    ].map((test) => ({
      testDate: test.testDate,
      ...validateDateBefore(parseDate(test.testDate), test.compareDate, test.inclusive),
      inclusive: test.inclusive,
    }))

    // Test dates for "between" rule
    const betweenTests = [
      { testDate: formatDate(lastWeek), startDate: yesterday, endDate: tomorrow, inclusive: false },
      { testDate: formatDate(yesterday), startDate: yesterday, endDate: tomorrow, inclusive: false },
      { testDate: formatDate(yesterday), startDate: yesterday, endDate: tomorrow, inclusive: true },
      { testDate: formatDate(today), startDate: yesterday, endDate: tomorrow, inclusive: false },
      { testDate: formatDate(tomorrow), startDate: yesterday, endDate: tomorrow, inclusive: false },
      { testDate: formatDate(tomorrow), startDate: yesterday, endDate: tomorrow, inclusive: true },
      { testDate: formatDate(nextWeek), startDate: yesterday, endDate: tomorrow, inclusive: false },
    ].map((test) => ({
      testDate: test.testDate,
      ...validateDateBetween(parseDate(test.testDate), test.startDate, test.endDate, test.inclusive),
      inclusive: test.inclusive,
      startDate: formatDate(test.startDate),
      endDate: formatDate(test.endDate),
    }))

    setComprehensiveResults({
      afterTests,
      beforeTests,
      betweenTests,
    })
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced Date Rule Tester</CardTitle>
        <CardDescription>
          Test and verify the behavior of date validation rules to ensure they work correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Button onClick={runComprehensiveTests} className="w-full">
            Run Comprehensive Tests For All Rule Types
          </Button>
        </div>

        {Object.keys(comprehensiveResults).some((key) => (comprehensiveResults as any)[key].length > 0) && (
          <div className="mb-8 space-y-6">
            <h3 className="text-lg font-medium">Comprehensive Test Results</h3>

            {/* Date After Tests */}
            {comprehensiveResults.afterTests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium">Date After Tests</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Test Date</th>
                        <th className="px-4 py-2 text-left">Compare Date</th>
                        <th className="px-4 py-2 text-left">Inclusive</th>
                        <th className="px-4 py-2 text-left">Result</th>
                        <th className="px-4 py-2 text-left">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprehensiveResults.afterTests.map((result, index) => {
                        // Determine expected result
                        const testDate = parseDate(result.testDate)!
                        const compareDate = new Date()
                        compareDate.setHours(0, 0, 0, 0)

                        let expected = false
                        if (result.inclusive) {
                          expected = testDate.getTime() >= compareDate.getTime()
                        } else {
                          expected = testDate.getTime() > compareDate.getTime()
                        }

                        const isCorrect = result.isValid === expected

                        return (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2">{result.testDate}</td>
                            <td className="px-4 py-2">{formatDate(compareDate)}</td>
                            <td className="px-4 py-2">{result.inclusive ? "Yes" : "No"}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                {result.isValid ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                {result.isValid ? "Valid" : "Invalid"}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                {isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                {expected ? "Valid" : "Invalid"}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Date Before Tests */}
            {comprehensiveResults.beforeTests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium">Date Before Tests</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Test Date</th>
                        <th className="px-4 py-2 text-left">Compare Date</th>
                        <th className="px-4 py-2 text-left">Inclusive</th>
                        <th className="px-4 py-2 text-left">Result</th>
                        <th className="px-4 py-2 text-left">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprehensiveResults.beforeTests.map((result, index) => {
                        // Determine expected result
                        const testDate = parseDate(result.testDate)!
                        const compareDate = new Date()
                        compareDate.setHours(0, 0, 0, 0)

                        let expected = false
                        if (result.inclusive) {
                          expected = testDate.getTime() <= compareDate.getTime()
                        } else {
                          expected = testDate.getTime() < compareDate.getTime()
                        }

                        const isCorrect = result.isValid === expected

                        return (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2">{result.testDate}</td>
                            <td className="px-4 py-2">{formatDate(compareDate)}</td>
                            <td className="px-4 py-2">{result.inclusive ? "Yes" : "No"}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                {result.isValid ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                {result.isValid ? "Valid" : "Invalid"}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                {isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                )}
                                {expected ? "Valid" : "Invalid"}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Date Between Tests */}
            {comprehensiveResults.betweenTests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium">Date Between Tests</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Test Date</th>
                        <th className="px-4 py-2 text-left">Start Date</th>
                        <th className="px-4 py-2 text-left">End Date</th>
                        <th className="px-4 py-2 text-left">Inclusive</th>
                        <th className="px-4 py-2 text-left">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprehensiveResults.betweenTests.map((result, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <td className="px-4 py-2">{result.testDate}</td>
                          <td className="px-4 py-2">{(result as any).startDate}</td>
                          <td className="px-4 py-2">{(result as any).endDate}</td>
                          <td className="px-4 py-2">{(result as any).inclusive ? "Yes" : "No"}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center">
                              {result.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {result.isValid ? "Valid" : "Invalid"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="date-after">Date After</TabsTrigger>
            <TabsTrigger value="date-before">Date Before</TabsTrigger>
            <TabsTrigger value="date-between">Date Between</TabsTrigger>
          </TabsList>

          {/* Date After Tab */}
          <TabsContent value="date-after" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="after-test-date">Test Date</Label>
                <Input
                  id="after-test-date"
                  type="date"
                  value={afterTestDate}
                  onChange={(e) => setAfterTestDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="after-compare-date">Compare Date (After)</Label>
                <Input
                  id="after-compare-date"
                  type="date"
                  value={afterCompareDate}
                  onChange={(e) => setAfterCompareDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="after-inclusive"
                checked={afterInclusive}
                onCheckedChange={(checked) => setAfterInclusive(checked === true)}
              />
              <Label htmlFor="after-inclusive">Include the specified date (on or after)</Label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={testDateAfter}>Test Single Date</Button>
              <Button variant="outline" onClick={runBatchTestsAfter}>
                Run Batch Tests
              </Button>
            </div>

            {afterResult && (
              <Alert variant={afterResult.isValid ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {afterResult.isValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertTitle>{afterResult.isValid ? "Valid" : "Invalid"}</AlertTitle>
                </div>
                <AlertDescription>{afterResult.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Date Before Tab */}
          <TabsContent value="date-before" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="before-test-date">Test Date</Label>
                <Input
                  id="before-test-date"
                  type="date"
                  value={beforeTestDate}
                  onChange={(e) => setBeforeTestDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="before-compare-date">Compare Date (Before)</Label>
                <Input
                  id="before-compare-date"
                  type="date"
                  value={beforeCompareDate}
                  onChange={(e) => setBeforeCompareDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="before-inclusive"
                checked={beforeInclusive}
                onCheckedChange={(checked) => setBeforeInclusive(checked === true)}
              />
              <Label htmlFor="before-inclusive">Include the specified date (on or before)</Label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={testDateBefore}>Test Single Date</Button>
              <Button variant="outline" onClick={runBatchTestsBefore}>
                Run Batch Tests
              </Button>
            </div>

            {beforeResult && (
              <Alert variant={beforeResult.isValid ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {beforeResult.isValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertTitle>{beforeResult.isValid ? "Valid" : "Invalid"}</AlertTitle>
                </div>
                <AlertDescription>{beforeResult.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Date Between Tab */}
          <TabsContent value="date-between" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="between-test-date">Test Date</Label>
              <Input
                id="between-test-date"
                type="date"
                value={betweenTestDate}
                onChange={(e) => setBetweenTestDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="between-start-date">Start Date</Label>
                <Input
                  id="between-start-date"
                  type="date"
                  value={betweenStartDate}
                  onChange={(e) => setBetweenStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="between-end-date">End Date</Label>
                <Input
                  id="between-end-date"
                  type="date"
                  value={betweenEndDate}
                  onChange={(e) => setBetweenEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="between-inclusive"
                checked={betweenInclusive}
                onCheckedChange={(checked) => setBetweenInclusive(checked === true)}
              />
              <Label htmlFor="between-inclusive">Include the boundary dates (on or between)</Label>
            </div>

            <div className="flex space-x-2">
              <Button onClick={testDateBetween}>Test Single Date</Button>
              <Button variant="outline" onClick={runBatchTestsBetween}>
                Run Batch Tests
              </Button>
            </div>

            {betweenResult && (
              <Alert variant={betweenResult.isValid ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {betweenResult.isValid ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <AlertTitle>{betweenResult.isValid ? "Valid" : "Invalid"}</AlertTitle>
                </div>
                <AlertDescription>{betweenResult.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {/* Batch Test Results */}
        {batchResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Batch Test Results</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Test Date</th>
                    <th className="px-4 py-2 text-left">Result</th>
                    <th className="px-4 py-2 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="px-4 py-2">{result.testDate}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          {result.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          {result.isValid ? "Valid" : "Invalid"}
                        </div>
                      </td>
                      <td className="px-4 py-2">{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          <Info className="h-4 w-4 inline mr-1" />
          This tester uses the same validation logic as the data validator
        </div>
      </CardFooter>
    </Card>
  )
}
