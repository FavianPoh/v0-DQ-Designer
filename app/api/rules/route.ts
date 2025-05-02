import { NextResponse } from "next/server"
import { getRules, addRule, updateRule, deleteRule } from "@/lib/db"
import type { DataQualityRule } from "@/lib/types"

export async function GET() {
  try {
    const rules = await getRules()
    return NextResponse.json(rules)
  } catch (error) {
    console.error("API Error - Failed to fetch rules:", error)
    return NextResponse.json({ error: "Failed to fetch rules", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const rule = (await request.json()) as DataQualityRule
    const success = await addRule(rule)

    if (success) {
      return NextResponse.json({ success: true, rule })
    } else {
      return NextResponse.json({ error: "Failed to add rule" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to add rule:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const rule = (await request.json()) as DataQualityRule
    const success = await updateRule(rule)

    if (success) {
      return NextResponse.json({ success: true, rule })
    } else {
      return NextResponse.json({ error: "Failed to update rule" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to update rule:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const success = await deleteRule(id)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to delete rule:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}
