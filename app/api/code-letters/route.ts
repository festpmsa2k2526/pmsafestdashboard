import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

const ASSET_KEY = "event_code_letters"

// Helper to get all code letters mapping: { [eventId: string]: { [participationId: string]: string } }
async function getCodeLettersMap(): Promise<Record<string, Record<string, string>>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_assets")
      .select("value")
      .eq("key", ASSET_KEY)
      .maybeSingle()

    if (error || !data || !data.value) {
      return {}
    }

    try {
      const parsed = JSON.parse(data.value)
      if (typeof parsed === "object" && parsed !== null) {
        return parsed
      }
    } catch {
      return {}
    }
  } catch (err) {
    console.error("Error fetching code letters map:", err)
  }
  return {}
}

// Helper to save code letters mapping
async function saveCodeLettersMap(map: Record<string, Record<string, string>>): Promise<boolean> {
  const jsonValue = JSON.stringify(map)

  // Check if asset exists
  const { data: existing } = await supabaseAdmin
    .from("site_assets")
    .select("id")
    .eq("key", ASSET_KEY)
    .maybeSingle()

  if (existing && existing.id) {
    const { error } = await supabaseAdmin
      .from("site_assets")
      .update({
        value: jsonValue,
        updated_at: new Date().toISOString()
      })
      .eq("key", ASSET_KEY)

    if (error) {
      console.error("Error updating code letters:", error)
      return false
    }
  } else {
    const { error } = await supabaseAdmin
      .from("site_assets")
      .insert({
        key: ASSET_KEY,
        label: "Event Code Letters",
        type: "link",
        description: "Assigned code letters (A, B, C...) for event participants",
        value: jsonValue,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error("Error inserting code letters:", error)
      return false
    }
  }

  return true
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get("eventId")

    const fullMap = await getCodeLettersMap()

    if (eventId) {
      return NextResponse.json({
        success: true,
        eventId,
        codeLetters: fullMap[eventId] || {}
      })
    }

    return NextResponse.json({
      success: true,
      codeLetters: fullMap
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get code letters" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventId, participationId, codeLetter, updates, resetEvent } = body

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "eventId is required" },
        { status: 400 }
      )
    }

    const fullMap = await getCodeLettersMap()
    if (!fullMap[eventId]) {
      fullMap[eventId] = {}
    }

    if (resetEvent) {
      fullMap[eventId] = {}
    } else if (updates && typeof updates === "object") {
      // Bulk update for an event: { [participationId]: "A", ... }
      Object.entries(updates).forEach(([pId, code]) => {
        if (!code || code === "" || code === "-") {
          delete fullMap[eventId][pId]
        } else {
          fullMap[eventId][pId] = String(code).trim().toUpperCase()
        }
      })
    } else if (participationId) {
      // Single update
      if (!codeLetter || codeLetter === "" || codeLetter === "-") {
        delete fullMap[eventId][participationId]
      } else {
        fullMap[eventId][participationId] = String(codeLetter).trim().toUpperCase()
      }
    }

    const saved = await saveCodeLettersMap(fullMap)
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to persist code letters" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId,
      codeLetters: fullMap[eventId] || {}
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update code letters" },
      { status: 500 }
    )
  }
}
