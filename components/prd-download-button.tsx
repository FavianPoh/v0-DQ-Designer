"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import type { jsPDF } from "jspdf"

export function PRDDownloadButton() {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)

      // Import jsPDF dynamically to avoid server-side rendering issues
      const { jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Add content to the PDF
      createPRDContent(doc, autoTable)

      // Save the PDF
      doc.save("Data-Quality-Framework-PRD.pdf")

      toast({
        title: "Success",
        description: "PRD downloaded successfully",
      })
    } catch (error) {
      console.error("Error downloading PRD:", error)
      toast({
        title: "Error",
        description: "Failed to download PRD",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="gap-2">
      <FileDown className="h-4 w-4" />
      {isDownloading ? "Generating PDF..." : "Download PRD"}
    </Button>
  )
}

function createPRDContent(doc: jsPDF, autoTable: any) {
  // Set font size and add title
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("Data Quality Framework", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" })

  doc.setFontSize(16)
  doc.text("Product Requirements Document (PRD)", doc.internal.pageSize.getWidth() / 2, 30, { align: "center" })

  // Add date
  doc.setFontSize(10)
  doc.setFont("helvetica", "italic")
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, doc.internal.pageSize.getWidth() / 2, 38, {
    align: "center",
  })

  let yPos = 50

  // 1. Introduction
  yPos = addSection(doc, "1. Introduction", yPos)
  yPos = addParagraph(
    doc,
    "This document outlines the product requirements for the Data Quality Framework, a tool designed to ensure data accuracy, " +
      "consistency, and reliability across various datasets. This framework provides a user-friendly interface for defining, " +
      "managing, and executing data quality rules, enabling users to identify and address data quality issues efficiently.",
    yPos,
  )

  // 2. Goals
  yPos = addSection(doc, "2. Goals", yPos)
  yPos = addParagraph(doc, "The primary goals of the Data Quality Framework are to:", yPos)

  const goals = [
    "Improve Data Quality: Provide a comprehensive set of tools to identify and resolve data quality issues.",
    "Increase Data Trustworthiness: Ensure data is accurate, consistent, and reliable for decision-making.",
    "Enhance Data Governance: Facilitate the implementation and enforcement of data quality standards.",
    "Streamline Data Validation: Automate the data validation process, reducing manual effort and errors.",
  ]

  yPos = addBulletPoints(doc, goals, yPos)

  // 3. System Overview
  yPos = addSection(doc, "3. System Overview", yPos)
  yPos = addParagraph(doc, "The Data Quality Framework consists of the following key components:", yPos)

  const components = [
    "Dataset Viewer: Displays data from various tables, allowing users to inspect data quality.",
    "Rule Manager: Enables users to create, manage, and execute data quality rules.",
    "List Manager: Manages lists of valid values for enumeration and list validation rules.",
    "Validation Results: Presents the results of data validation, highlighting data quality issues.",
  ]

  yPos = addBulletPoints(doc, components, yPos)

  // 4. Key Features
  yPos = addSection(doc, "4. Key Features", yPos)

  // 4.1 Dataset Viewer
  yPos = addSubsection(doc, "4.1. Dataset Viewer", yPos)

  const datasetViewerFeatures = [
    "Data Display: Displays data from various tables in a tabular format.",
    "Data Editing: Allows users to edit data directly within the viewer.",
    "Rule Integration: Integrates with the Rule Manager to display validation results alongside data.",
  ]

  yPos = addBulletPoints(doc, datasetViewerFeatures, yPos)

  // 4.2 Rule Manager
  yPos = addSubsection(doc, "4.2. Rule Manager", yPos)

  const ruleManagerFeatures = [
    "Rule Creation: Provides a user-friendly interface for creating data quality rules.",
    "Rule Management: Allows users to manage existing rules, including editing, enabling/disabling, and deleting rules.",
    "Rule Execution: Executes data quality rules against selected datasets.",
  ]

  yPos = addBulletPoints(doc, ruleManagerFeatures, yPos)

  yPos = addParagraph(doc, "Rule Types: Supports a wide range of rule types, including:", yPos)

  const ruleTypes = [
    "Required",
    "Equals",
    "Not Equals",
    "Greater Than",
    "Less Than",
    "Range",
    "Regex",
    "Type",
    "Enum",
    "List",
    "Contains",
    "Dependency",
    "Multi-Column",
    "Lookup",
    "Custom",
    "Formula",
    "JavaScript Formula",
    "Date Before",
    "Date After",
    "Date Between",
    "Date Format",
    "Reference Integrity",
    "Composite Reference",
    "Column Comparison",
    "Math Operation",
  ]

  // Check if we need a new page
  if (yPos + ruleTypes.length * 5 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    yPos = 20
  }

  yPos = addBulletPoints(doc, ruleTypes, yPos, 8)

  // 5. Validation Rule Types
  yPos = addSection(doc, "5. Validation Rule Types", yPos)

  // Add a table for rule types
  const ruleTypeData = [
    ["Rule Type", "Description", "Example"],
    [
      "Required",
      "Validates that a field has a value and is not empty, null, or undefined.",
      'Ensure that the "email" field is not empty.',
    ],
    [
      "Equals",
      "Checks if the field value exactly matches the specified value.",
      'Ensure that the "status" field is equal to "active".',
    ],
    [
      "Range",
      "Checks if the field value falls within the specified minimum and maximum values.",
      'Ensure that the "value" field is between 0 and 100.',
    ],
    [
      "Column Comparison",
      "Compares values between different columns in the same row.",
      'Ensure that "endDate" is greater than "startDate".',
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [ruleTypeData[0]],
    body: ruleTypeData.slice(1),
    headStyles: { fillColor: [66, 139, 202], textColor: 255 },
    margin: { top: 10 },
    styles: { overflow: "linebreak", cellWidth: "auto" },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 70 },
    },
  })

  // Get the final Y position after the table
  yPos = (doc as any).lastAutoTable.finalY + 10

  // Add note that this is a partial list
  yPos = addParagraph(
    doc,
    "Note: This is a partial list of rule types. The full PRD contains details for all 27 rule types.",
    yPos,
    { font: "italic", fontSize: 10 },
  )

  // 6. Technical Architecture
  yPos = addSection(doc, "6. Technical Architecture", yPos)

  // Frontend
  yPos = addSubsection(doc, "Frontend:", yPos, 12)

  const frontendTech = [
    "Next.js (React framework)",
    "TypeScript (programming language)",
    "Tailwind CSS (styling framework)",
    "shadcn/ui (UI component library)",
    "lucide-react (icons)",
  ]

  yPos = addBulletPoints(doc, frontendTech, yPos)

  // Backend
  yPos = addSubsection(doc, "Backend:", yPos, 12)

  const backendTech = ["Next.js API routes (serverless functions)", "File system (data storage)"]

  yPos = addBulletPoints(doc, backendTech, yPos)

  // Data Storage
  yPos = addSubsection(doc, "Data Storage:", yPos, 12)

  const dataStorageTech = ["JSON files (rules and lists)", "Local Storage (fallback for data persistence)"]

  yPos = addBulletPoints(doc, dataStorageTech, yPos)

  // 7. Future Enhancements
  yPos = addSection(doc, "7. Future Enhancements", yPos)

  const futureEnhancements = [
    "Data Source Integration: Support integration with external databases (e.g., PostgreSQL, MySQL).",
    "Real-Time Validation: Implement real-time data validation as data is entered or modified.",
    "Data Quality Reporting: Generate comprehensive data quality reports with visualizations.",
    "User Authentication: Implement user authentication and authorization to control access to the framework.",
    "Automated Data Correction: Implement automated data correction based on predefined rules.",
    "Customizable Dashboards: Allow users to create customizable dashboards to monitor data quality metrics.",
  ]

  yPos = addBulletPoints(doc, futureEnhancements, yPos)

  // Footer
  doc.setFontSize(10)
  doc.setFont("helvetica", "italic")
  doc.text(
    "Data Quality Framework - PRD",
    doc.internal.pageSize.getWidth() / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" },
  )
}

function addSection(doc: jsPDF, title: string, yPos: number): number {
  // Check if we need a new page
  if (yPos > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(title, 10, yPos)

  return yPos + 10
}

function addSubsection(doc: jsPDF, title: string, yPos: number, fontSize = 14): number {
  // Check if we need a new page
  if (yPos > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(fontSize)
  doc.setFont("helvetica", "bold")
  doc.text(title, 10, yPos)

  return yPos + 8
}

function addParagraph(
  doc: jsPDF,
  text: string,
  yPos: number,
  options: { font?: string; fontSize?: number } = {},
): number {
  // Check if we need a new page
  if (yPos > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage()
    yPos = 20
  }

  const fontSize = options.fontSize || 12
  const font = options.font || "normal"

  doc.setFontSize(fontSize)
  doc.setFont("helvetica", font)

  const textLines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - 20)
  doc.text(textLines, 10, yPos)

  return yPos + textLines.length * (fontSize * 0.35) + 5
}

function addBulletPoints(doc: jsPDF, points: string[], yPos: number, fontSize = 12): number {
  doc.setFontSize(fontSize)
  doc.setFont("helvetica", "normal")

  for (const point of points) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      yPos = 20
    }

    const textLines = doc.splitTextToSize(point, doc.internal.pageSize.getWidth() - 25)
    doc.text("•", 10, yPos)
    doc.text(textLines, 15, yPos)

    yPos += textLines.length * (fontSize * 0.35) + 5
  }

  return yPos + 5
}
