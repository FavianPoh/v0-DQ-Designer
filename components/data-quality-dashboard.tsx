"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatasetViewer } from "@/components/dataset-viewer"
import { RuleManager } from "@/components/rule-manager"
import { ValidationResults } from "@/components/validation-results"
import { ListManager } from "@/components/list-manager"
import { generateSyntheticData } from "@/lib/data-generator"
import { validateDataset } from "@/lib/data-validator"
import type { DataQualityRule, DataTables, ValueList } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
// Import the DirectRuleEditor component
import { DirectRuleEditor } from "@/components/direct-rule-editor"

export function DataQualityDashboard() {
  const [datasets, setDatasets] = useState<DataTables>(() => generateSyntheticData(100))
  const [selectedTable, setSelectedTable] = useState<string>("users")
  const [activeTab, setActiveTab] = useState("dataset")
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rules, setRules] = useState<DataQualityRule[]>([])
  const [valueLists, setValueLists] = useState<ValueList[]>([])
  const [validationResults, setValidationResults] = useState<any[]>([])
  const [showPassingRules, setShowPassingRules] = useState<boolean>(false)

  // Load data from server
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch rules
        const rulesResponse = await fetch("/api/rules")
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json()
          console.log("Successfully loaded rules from server:", rulesData.length, rulesData)
          setRules(rulesData)
        } else {
          const errorData = await rulesResponse.json().catch(() => ({}))
          console.error("Failed to fetch rules:", errorData)

          // Try to load from localStorage as fallback
          const savedRules = localStorage.getItem("dataQualityRules")
          if (savedRules) {
            try {
              const parsedRules = JSON.parse(savedRules)
              console.log("Loaded rules from localStorage:", parsedRules.length, parsedRules)
              setRules(parsedRules)
              toast({
                title: "Loaded from localStorage",
                description: "Rules loaded from browser storage",
              })
            } catch (error) {
              console.error("Error parsing saved rules:", error)
              toast({
                title: "Error",
                description: "Failed to load rules. Using default rules.",
                variant: "destructive",
              })
              setRules([])
            }
          } else {
            toast({
              title: "Error",
              description: "Failed to load rules from server. Using default rules.",
              variant: "destructive",
            })
            setRules([])
          }
        }

        // Fetch lists
        const listsResponse = await fetch("/api/lists")
        if (listsResponse.ok) {
          const listsData = await listsResponse.json()
          setValueLists(listsData)
        } else {
          const errorData = await listsResponse.json().catch(() => ({}))
          console.error("Failed to fetch lists:", errorData)

          // Try to load from localStorage as fallback
          const savedLists = localStorage.getItem("dataQualityLists")
          if (savedLists) {
            try {
              const parsedLists = JSON.parse(savedLists)
              setValueLists(parsedLists)
              toast({
                title: "Loaded from localStorage",
                description: "Value lists loaded from browser storage",
              })
            } catch (error) {
              console.error("Error parsing saved lists:", error)
              toast({
                title: "Error",
                description: "Failed to load value lists. Using default lists.",
                variant: "destructive",
              })
              setValueLists([])
            }
          } else {
            toast({
              title: "Error",
              description: "Failed to load value lists from server. Using default lists.",
              variant: "destructive",
            })
            setValueLists([])
          }
        }

        // Load datasets from localStorage (or generate new ones if not available)
        const savedDatasets = localStorage.getItem("dataQualityDatasets")
        if (savedDatasets) {
          try {
            const parsedDatasets = JSON.parse(savedDatasets)
            // Convert date strings back to Date objects
            Object.keys(parsedDatasets).forEach((tableName) => {
              parsedDatasets[tableName].forEach((record: any) => {
                Object.keys(record).forEach((key) => {
                  if (typeof record[key] === "string" && record[key].match(/^\d{4}-\d{2}-\d{2}T/)) {
                    record[key] = new Date(record[key])
                  }
                })
              })
            })
            setDatasets(parsedDatasets)
          } catch (error) {
            console.error("Error loading saved datasets:", error)
            // Generate new data if loading fails
            setDatasets(generateSyntheticData(100))
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data from server. Using default values.",
          variant: "destructive",
        })

        // Try to load from localStorage as fallback
        const savedRules = localStorage.getItem("dataQualityRules")
        const savedLists = localStorage.getItem("dataQualityLists")

        if (savedRules) {
          try {
            setRules(JSON.parse(savedRules))
          } catch (error) {
            setRules([])
          }
        }

        if (savedLists) {
          try {
            setValueLists(JSON.parse(savedLists))
          } catch (error) {
            setValueLists([])
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Add this code after the useEffect that loads data but before the handleAddRule function
  useEffect(() => {
    if (!loading && rules.length === 0) {
      console.log("No rules found, adding a test JavaScript formula rule")

      // Create a test JavaScript formula rule
      const testRule = {
        id: "test-js-formula-rule",
        name: "Test JavaScript Formula Rule [ID: test-js-formula-rule]",
        table: "transactions",
        column: "amount",
        ruleType: "javascript-formula",
        parameters: {
          formula: "amount - refundAmount - processingFee > 0",
          javascriptExpression: "amount - refundAmount - processingFee > 0",
        },
        severity: "warning",
        enabled: true,
      }

      // Add the rule to the local state
      setRules([testRule])

      // Save to localStorage for persistence
      localStorage.setItem("dataQualityRules", JSON.stringify([testRule]))

      // Notify the user
      toast({
        title: "Test Rule Added",
        description: "A test JavaScript formula rule has been added for validation testing",
      })
    }
  }, [loading, rules.length])

  // Update validation results when data changes
  useEffect(() => {
    if (!loading) {
      refreshValidationResults()
      // Save datasets to localStorage
      localStorage.setItem("dataQualityDatasets", JSON.stringify(datasets))
    }
  }, [datasets, rules, valueLists, loading])

  // Handle tab changes
  useEffect(() => {
    if (activeTab === "rules" && (highlightedRuleId || editingRuleId)) {
      // Scroll to the highlighted/edited rule
      setTimeout(() => {
        const ruleId = editingRuleId || highlightedRuleId
        const ruleElement = document.getElementById(`rule-${ruleId}`)
        if (ruleElement) {
          ruleElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
    }
  }, [activeTab, highlightedRuleId, editingRuleId])

  const handleAddRule = async (rule: DataQualityRule) => {
    try {
      setIsSaving(true)
      // Add rule ID to rule name for reference in validation results
      // Ensure enabled is set to true by default if not specified
      const ruleWithId = {
        ...rule,
        name: `${rule.name} [ID: ${rule.id}]`,
        enabled: rule.enabled !== false,
      }

      // Save to server
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ruleWithId),
      })

      if (response.ok) {
        // Update local state
        setRules((prev) => {
          const newRules = [...prev, ruleWithId]
          // Also save to localStorage as backup
          localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
          return newRules
        })
        toast({
          title: "Success",
          description: "Rule added successfully",
        })
      } else {
        // If server save fails, still update local state and localStorage
        setRules((prev) => {
          const newRules = [...prev, ruleWithId]
          localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
          return newRules
        })
        toast({
          title: "Warning",
          description: "Rule saved to browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error adding rule:", error)
      // Still update local state and localStorage
      setRules((prev) => {
        const newRules = [...prev, rule]
        localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
        return newRules
      })
      toast({
        title: "Warning",
        description: "Rule saved to browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      setIsSaving(true)
      // Delete from server
      const response = await fetch("/api/rules", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: ruleId }),
      })

      // Update local state regardless of server response
      setRules((prev) => {
        const newRules = prev.filter((rule) => rule.id !== ruleId)
        // Also update localStorage
        localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
        return newRules
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rule deleted successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Rule deleted from browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error deleting rule:", error)
      toast({
        title: "Warning",
        description: "Rule deleted from browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateRule = async (updatedRule: DataQualityRule) => {
    try {
      setIsSaving(true)

      // Create a deep copy to avoid reference issues
      const ruleCopy = JSON.parse(JSON.stringify(updatedRule))

      // Preserve the ID in the rule name if it exists
      let updatedName = ruleCopy.name
      if (!updatedName.includes(`[ID: ${ruleCopy.id}]`)) {
        updatedName = `${ruleCopy.name} [ID: ${ruleCopy.id}]`
      }

      // Special handling for date rules
      if (ruleCopy.ruleType?.startsWith("date-")) {
        console.log("Updating date rule in handleUpdateRule:", ruleCopy)
        console.log("Column value:", ruleCopy.column)

        // Ensure column is not empty
        if (!ruleCopy.column) {
          console.error("Missing column for date rule in handleUpdateRule")

          // Try to find a suitable column from the dataset
          if (ruleCopy.table && datasets[ruleCopy.table]?.length > 0) {
            const availableColumns = Object.keys(datasets[ruleCopy.table][0])

            // Look for date-like columns
            const dateColumns = availableColumns.filter(
              (col) =>
                col.toLowerCase().includes("date") ||
                col.toLowerCase().includes("time") ||
                col.toLowerCase().includes("day"),
            )

            if (dateColumns.length > 0) {
              // Use the first date-like column
              ruleCopy.column = dateColumns[0]
              console.log(`Auto-selected column for date rule: ${ruleCopy.column}`)

              toast({
                title: "Column Auto-Selected",
                description: `Column "${ruleCopy.column}" was automatically selected for this date rule.`,
                variant: "warning",
              })
            } else if (availableColumns.length > 0) {
              // If no date-like columns, use the first available column
              ruleCopy.column = availableColumns[0]
              console.log(`Auto-selected first available column: ${ruleCopy.column}`)

              toast({
                title: "Column Auto-Selected",
                description: `Column "${ruleCopy.column}" was automatically selected for this date rule.`,
                variant: "warning",
              })
            } else {
              toast({
                title: "Error",
                description: "Column must be specified for date rules and no columns are available",
                variant: "destructive",
              })
              setIsSaving(false)
              return
            }
          } else {
            toast({
              title: "Error",
              description: "Column must be specified for date rules and no table data is available",
              variant: "destructive",
            })
            setIsSaving(false)
            return
          }
        }

        // Ensure date parameters are properly formatted
        if (ruleCopy.ruleType === "date-before" || ruleCopy.ruleType === "date-after") {
          if (ruleCopy.parameters.compareDate) {
            // Ensure compareDate is in YYYY-MM-DD format
            const dateObj = new Date(ruleCopy.parameters.compareDate)
            if (!isNaN(dateObj.getTime())) {
              ruleCopy.parameters.compareDate = dateObj.toISOString().split("T")[0]
            }
          }
        } else if (ruleCopy.ruleType === "date-between") {
          if (ruleCopy.parameters.startDate) {
            // Ensure startDate is in YYYY-MM-DD format
            const startDateObj = new Date(ruleCopy.parameters.startDate)
            if (!isNaN(startDateObj.getTime())) {
              ruleCopy.parameters.startDate = startDateObj.toISOString().split("T")[0]
            }
          }
          if (ruleCopy.parameters.endDate) {
            // Ensure endDate is in YYYY-MM-DD format
            const endDateObj = new Date(ruleCopy.parameters.endDate)
            if (!isNaN(endDateObj.getTime())) {
              ruleCopy.parameters.endDate = endDateObj.toISOString().split("T")[0]
            }
          }
        }
      }

      const finalRule = {
        ...ruleCopy,
        name: updatedName,
      }

      console.log("Final rule for update in handleUpdateRule:", finalRule)

      // Update on server
      const response = await fetch("/api/rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRule),
      })

      // Update local state regardless of server response
      setRules((prev) => {
        const newRules = prev.map((rule) => (rule.id === finalRule.id ? finalRule : rule))
        // Also update localStorage
        localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
        return newRules
      })

      setEditingRuleId(null)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rule updated successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Rule updated in browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error updating rule:", error)
      toast({
        title: "Warning",
        description: "Rule updated in browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddList = async (list: ValueList) => {
    try {
      setIsSaving(true)
      // Save to server
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(list),
      })

      // Update local state regardless of server response
      setValueLists((prev) => {
        const newLists = [...prev, list]
        // Also update localStorage
        localStorage.setItem("dataQualityLists", JSON.stringify(newLists))
        return newLists
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Value list added successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Value list saved to browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error adding list:", error)
      toast({
        title: "Warning",
        description: "Value list saved to browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateList = async (updatedList: ValueList) => {
    try {
      setIsSaving(true)
      // Update on server
      const response = await fetch("/api/lists", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedList),
      })

      // Update local state regardless of server response
      setValueLists((prev) => {
        const newLists = prev.map((list) => (list.id === updatedList.id ? updatedList : list))
        // Also update localStorage
        localStorage.setItem("dataQualityLists", JSON.stringify(newLists))
        return newLists
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Value list updated successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Value list updated in browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error updating list:", error)
      toast({
        title: "Warning",
        description: "Value list updated in browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    try {
      setIsSaving(true)
      // Delete from server
      const response = await fetch("/api/lists", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: listId }),
      })

      // Update local state regardless of server response
      setValueLists((prev) => {
        const newLists = prev.filter((list) => list.id !== listId)
        // Also update localStorage
        localStorage.setItem("dataQualityLists", JSON.stringify(newLists))
        return newLists
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Value list deleted successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Value list deleted from browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error deleting list:", error)
      toast({
        title: "Warning",
        description: "Value list deleted from browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDataChange = (tableName: string, newData: any[]) => {
    setDatasets((prev) => {
      const newDatasets = {
        ...prev,
        [tableName]: newData,
      }
      // Save to localStorage
      localStorage.setItem("dataQualityDatasets", JSON.stringify(newDatasets))
      return newDatasets
    })
    refreshValidationResults()
  }

  const handleRegenerateData = () => {
    const newData = generateSyntheticData(100)
    setDatasets(newData)
    // Save to localStorage
    localStorage.setItem("dataQualityDatasets", JSON.stringify(newData))
    refreshValidationResults()
  }

  // Add this right before the refreshValidationResults function
  const logRuleTypes = () => {
    console.log("All rules:", rules)

    // Count rules by type
    const ruleTypeCount = rules.reduce(
      (acc, rule) => {
        acc[rule.ruleType] = (acc[rule.ruleType] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    console.log("Rule types count:", ruleTypeCount)

    // Count rules with cross-table conditions
    const rulesWithCrossTableConditions = rules.filter(
      (r) => r.crossTableConditions && r.crossTableConditions.length > 0,
    )

    console.log(
      "Rules with cross-table conditions:",
      rulesWithCrossTableConditions.length,
      rulesWithCrossTableConditions,
    )
  }

  // Modify the refreshValidationResults function to include the logging
  const refreshValidationResults = () => {
    // Add debug logging for validation process
    console.log("Starting validation with rules:", rules)

    // Log rule types and cross-table rules
    logRuleTypes()

    const results = validateDataset(datasets, rules, valueLists)

    // After getting validation results
    console.log("Validation complete. Results:", results)

    // Debug cross-table validation results
    const crossTableRuleIds = rules
      .filter((r) => r.crossTableConditions && r.crossTableConditions.length > 0)
      .map((r) => r.id)

    if (crossTableRuleIds.length > 0) {
      const crossTableResults = results.filter((r) => crossTableRuleIds.includes(r.ruleId))
      console.log("Cross-table validation results:", crossTableResults.length, crossTableResults)
    }

    // Debug date rules
    const dateRules = rules.filter((r) => r.ruleType.startsWith("date-") || r.name.toLowerCase().includes("date"))
    console.log("Date rules:", dateRules.length, dateRules)

    const dateResults = results.filter(
      (r) => r.ruleName.toLowerCase().includes("date") || r.message.toLowerCase().includes("date"),
    )
    console.log("Date validation results:", dateResults.length, dateResults)

    // After calling validateData and before setting validation results
    // Check if date rules have results
    const dateRules2 = rules.filter(
      (r) =>
        r.type === "date-before" || r.type === "date-after" || r.type === "date-between" || r.type === "date-format",
    )
    console.log("Date rules to validate:", dateRules2)

    if (dateRules2.length > 0) {
      const dateRuleIds = dateRules2.map((r) => r.id)
      const dateRuleResults = results.filter((r) => dateRuleIds.includes(r.ruleId))
      console.log("Date rule validation results count:", dateRuleResults.length)

      if (dateRuleResults.length === 0) {
        console.warn("No validation results found for date rules!")
      }
    }

    setValidationResults(results)
  }

  const handleRuleClick = (ruleIdOrRule: string | DataQualityRule) => {
    let ruleId: string

    // Check if the parameter is a rule object or a rule ID string
    if (typeof ruleIdOrRule === "string") {
      console.log("Rule click handler called with ID:", ruleIdOrRule)
      ruleId = ruleIdOrRule

      // Extract the rule ID from the rule name if needed
      if (ruleId.includes("[ID:")) {
        const match = ruleId.match(/\[ID: ([a-zA-Z0-9-]+)\]/)
        if (match && match[1]) {
          ruleId = match[1]
        }
      }

      // Find the rule by ID
      const rule = rules.find((r) => r.id === ruleId)

      if (rule) {
        console.log("Found rule:", rule)
        setEditingRuleId(rule.id)

        // Only switch to rules tab if we're not already there AND we're not coming from validation results tab
        if (activeTab !== "rules" && activeTab !== "validation") {
          setActiveTab("rules")
        }
      } else {
        console.error("Rule not found:", ruleId)
      }
    } else {
      // Handle the case where a rule object is passed (from validation results)
      console.log("Rule click handler called with rule object")
      const updatedRule = ruleIdOrRule as DataQualityRule
      handleUpdateRule(updatedRule)
      // Don't change the active tab in this case
    }
  }

  const handleBackupData = async () => {
    try {
      setIsSaving(true)
      const response = await fetch("/api/backup", { method: "POST" })

      // Also backup to localStorage with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      localStorage.setItem(`dataQualityRules-backup-${timestamp}`, JSON.stringify(rules))
      localStorage.setItem(`dataQualityLists-backup-${timestamp}`, JSON.stringify(valueLists))

      if (response.ok) {
        toast({
          title: "Success",
          description: "Data backed up successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Data backed up to browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error backing up data:", error)
      toast({
        title: "Warning",
        description: "Data backed up to browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = () => {
    try {
      const exportData = {
        rules,
        valueLists,
        exportDate: new Date().toISOString(),
        version: "1.0",
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

      const exportFileName = `data-quality-export-${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileName)
      linkElement.click()

      toast({
        title: "Success",
        description: "Data exported successfully",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (importedData.rules && Array.isArray(importedData.rules)) {
          setRules(importedData.rules)
          localStorage.setItem("dataQualityRules", JSON.stringify(importedData.rules))
        }

        if (importedData.valueLists && Array.isArray(importedData.valueLists)) {
          setValueLists(importedData.valueLists)
          localStorage.setItem("dataQualityLists", JSON.stringify(importedData.valueLists))
        }

        toast({
          title: "Success",
          description: "Data imported successfully",
        })

        // Also save to server
        importedData.rules?.forEach(async (rule: DataQualityRule) => {
          await fetch("/api/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rule),
          }).catch((err) => console.error("Error saving imported rule to server:", err))
        })

        importedData.valueLists?.forEach(async (list: ValueList) => {
          await fetch("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(list),
          }).catch((err) => console.error("Error saving imported list to server:", err))
        })
      } catch (error) {
        console.error("Error importing data:", error)
        toast({
          title: "Error",
          description: "Failed to import data. Invalid format.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset the input
    if (event.target) {
      event.target.value = ""
    }
  }

  const toggleShowPassingRules = () => {
    console.log("Toggling show passing rules from", showPassingRules, "to", !showPassingRules)
    setShowPassingRules(!showPassingRules)
    // Refresh validation results to include/exclude passing rules
    refreshValidationResults()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading data quality framework...</span>
      </div>
    )
  }

  const handleDirectRuleUpdate = async (updatedRule: DataQualityRule) => {
    try {
      setIsSaving(true)

      // Create a deep copy to avoid reference issues
      const ruleCopy = JSON.parse(JSON.stringify(updatedRule))

      console.log("Received rule for update:", ruleCopy)

      // Preserve the ID in the rule name if it exists
      let updatedName = ruleCopy.name
      if (!updatedName.includes(`[ID: ${ruleCopy.id}]`)) {
        updatedName = `${ruleCopy.name} [ID: ${ruleCopy.id}]`
      }

      // Special handling for date rules
      if (ruleCopy.ruleType?.startsWith("date-")) {
        console.log("Updating date rule:", ruleCopy)
        console.log("Column value:", ruleCopy.column)
        console.log("Parameters:", ruleCopy.parameters)

        // Ensure column is not empty
        if (!ruleCopy.column) {
          console.error("Missing column for date rule in dashboard update")

          // Try to find a suitable column from the dataset
          if (ruleCopy.table && datasets[ruleCopy.table]?.length > 0) {
            const availableColumns = Object.keys(datasets[ruleCopy.table][0])

            // Look for date-like columns
            const dateColumns = availableColumns.filter(
              (col) =>
                col.toLowerCase().includes("date") ||
                col.toLowerCase().includes("time") ||
                col.toLowerCase().includes("day"),
            )

            if (dateColumns.length > 0) {
              // Use the first date-like column
              ruleCopy.column = dateColumns[0]
              console.log(`Auto-selected column for date rule: ${ruleCopy.column}`)

              toast({
                title: "Column Auto-Selected",
                description: `Column "${ruleCopy.column}" was automatically selected for this date rule.`,
                variant: "warning",
              })
            } else if (availableColumns.length > 0) {
              // If no date-like columns, use the first available column
              ruleCopy.column = availableColumns[0]
              console.log(`Auto-selected column for date rule: ${ruleCopy.column}`)

              toast({
                title: "Column Auto-Selected",
                description: `Column "${ruleCopy.column}" was automatically selected for this date rule.`,
                variant: "warning",
              })
            } else {
              toast({
                title: "Error",
                description: "Column must be specified for date rules and no columns are available",
                variant: "destructive",
              })
              setIsSaving(false)
              return
            }
          } else {
            toast({
              title: "Error",
              description: "Column must be specified for date rules and no table data is available",
              variant: "destructive",
            })
            setIsSaving(false)
            return
          }
        }

        // Ensure date parameters are properly formatted
        if (ruleCopy.ruleType === "date-before" || ruleCopy.ruleType === "date-after") {
          if (ruleCopy.parameters.compareDate) {
            // Ensure compareDate is in YYYY-MM-DD format
            const dateObj = new Date(ruleCopy.parameters.compareDate)
            if (!isNaN(dateObj.getTime())) {
              ruleCopy.parameters.compareDate = dateObj.toISOString().split("T")[0]
            }
          }
        } else if (ruleCopy.ruleType === "date-between") {
          if (ruleCopy.parameters.startDate) {
            // Ensure startDate is in YYYY-MM-DD format
            const startDateObj = new Date(ruleCopy.parameters.startDate)
            if (!isNaN(startDateObj.getTime())) {
              ruleCopy.parameters.startDate = startDateObj.toISOString().split("T")[0]
            }
          }
          if (ruleCopy.parameters.endDate) {
            // Ensure endDate is in YYYY-MM-DD format
            const endDateObj = new Date(ruleCopy.parameters.endDate)
            if (!isNaN(endDateObj.getTime())) {
              ruleCopy.parameters.endDate = endDateObj.toISOString().split("T")[0]
            }
          }
        }
      }

      const finalRule = {
        ...ruleCopy,
        name: updatedName,
      }

      console.log("Final rule for update:", finalRule)

      // Update on server
      const response = await fetch("/api/rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRule),
      })

      // Update local state regardless of server response
      setRules((prev) => {
        const newRules = prev.map((rule) => {
          if (rule.id === finalRule.id) {
            return finalRule
          }
          return rule
        })
        // Also update localStorage
        localStorage.setItem("dataQualityRules", JSON.stringify(newRules))
        return newRules
      })

      setEditingRuleId(null)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rule updated successfully",
        })
      } else {
        toast({
          title: "Warning",
          description: "Rule updated in browser storage only",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error updating rule:", error)
      toast({
        title: "Warning",
        description: "Rule updated in browser storage only",
        variant: "default",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewRowData = (row: any) => {
    console.log("View row data:", row)
    // Implement your logic to display the row data, e.g., open a modal
  }

  const handleEditRule = (rule: DataQualityRule) => {
    console.log("Edit rule:", rule)
    handleRuleClick(rule)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Quality Framework</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleBackupData} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Backup Data
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        ref={tabsRef}
        key={`tabs-${activeTab}`} // Force re-render when tab changes
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dataset">Dataset</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="lists">Value Lists</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
        </TabsList>
        <TabsContent value="dataset" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="table-select">Table:</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger id="table-select" className="w-[180px]">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(datasets).map((table) => (
                    <SelectItem key={table} value={table}>
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleRegenerateData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Regenerate Data
            </button>
          </div>
          <DatasetViewer
            data={datasets[selectedTable]}
            tableName={selectedTable}
            onDataChange={(newData) => handleDataChange(selectedTable, newData)}
            onAddRule={handleAddRule}
            valueLists={valueLists}
            datasets={datasets}
            validationResults={validationResults} // Pass validation results to the DatasetViewer
          />
        </TabsContent>
        <TabsContent value="rules" className="pt-4">
          <RuleManager
            rules={rules}
            tables={Object.keys(datasets)}
            datasets={datasets}
            valueLists={valueLists}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            onUpdateRule={handleUpdateRule}
            highlightedRuleId={highlightedRuleId}
            editingRuleId={editingRuleId}
            onRuleHighlighted={() => setHighlightedRuleId(null)}
            onEditingChange={setEditingRuleId}
            isSaving={isSaving}
          />
        </TabsContent>
        <TabsContent value="lists" className="pt-4">
          <ListManager
            lists={valueLists}
            onAddList={handleAddList}
            onUpdateList={handleUpdateList}
            isSaving={isSaving}
          />
        </TabsContent>
        <TabsContent value="lists" className="pt-4">
          <ListManager
            lists={valueLists}
            onAddList={handleAddList}
            onUpdateList={handleUpdateList}
            onDeleteList={handleDeleteList}
            isSaving={isSaving}
          />
        </TabsContent>
        <TabsContent value="validation" className="pt-4">
          <ValidationResults
            results={validationResults}
            datasets={datasets}
            tables={Object.keys(datasets)}
            onRefresh={refreshValidationResults}
            onRuleClick={handleRuleClick}
            rules={rules}
            valueLists={valueLists}
            showPassingRules={showPassingRules}
            onTogglePassingRules={toggleShowPassingRules}
            onViewData={handleViewRowData}
            onEditRule={handleEditRule}
          />
        </TabsContent>
      </Tabs>
      <DirectRuleEditor
        ruleId={editingRuleId}
        rules={rules}
        tables={Object.keys(datasets)}
        datasets={datasets}
        valueLists={valueLists}
        onUpdateRule={handleDirectRuleUpdate}
        onCancel={() => setEditingRuleId(null)}
      />
    </div>
  )
}
