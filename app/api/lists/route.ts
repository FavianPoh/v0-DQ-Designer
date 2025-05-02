import { NextResponse } from "next/server"
import { getLists, addList, updateList, deleteList } from "@/lib/db"
import type { ValueList } from "@/lib/types"

export async function GET() {
  try {
    const lists = await getLists()
    return NextResponse.json(lists)
  } catch (error) {
    console.error("API Error - Failed to fetch lists:", error)
    return NextResponse.json({ error: "Failed to fetch lists", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const list = (await request.json()) as ValueList
    const success = await addList(list)

    if (success) {
      return NextResponse.json({ success: true, list })
    } else {
      return NextResponse.json({ error: "Failed to add list" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to add list:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const list = (await request.json()) as ValueList
    const success = await updateList(list)

    if (success) {
      return NextResponse.json({ success: true, list })
    } else {
      return NextResponse.json({ error: "Failed to update list" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to update list:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const success = await deleteList(id)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to delete list" }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error - Failed to delete list:", error)
    return NextResponse.json({ error: "Failed to process request", details: String(error) }, { status: 400 })
  }
}
