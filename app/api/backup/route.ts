import { NextResponse } from "next/server"
import { backupData } from "@/lib/db"

export async function POST() {
  try {
    const success = await backupData()

    if (success) {
      return NextResponse.json({ success: true, message: "Backup created successfully" })
    } else {
      return NextResponse.json({ error: "Failed to create backup" }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to process backup request" }, { status: 400 })
  }
}
