import { type NextRequest, NextResponse } from "next/server"

// In-memory store for signaling data
// In a production app, you would use a database or Redis
const sessions: Record<string, { offers: any[]; answers: any[]; candidates: any[] }> = {}

export async function POST(request: NextRequest) {
  const { sessionId, type, data } = await request.json()

  // Initialize session if it doesn't exist
  if (!sessions[sessionId]) {
    sessions[sessionId] = { offers: [], answers: [], candidates: [] }
  }

  const session = sessions[sessionId]

  // Handle different types of signaling messages
  switch (type) {
    case "offer":
      session.offers.push(data)
      break
    case "answer":
      session.answers.push(data)
      break
    case "candidate":
      session.candidates.push(data)
      break
    default:
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId")
  const messageType = request.nextUrl.searchParams.get("type")
  const lastIndex = Number.parseInt(request.nextUrl.searchParams.get("lastIndex") || "0")

  if (!sessionId || !messageType) {
    return NextResponse.json({ error: "Missing sessionId or type" }, { status: 400 })
  }

  // Return empty array if session doesn't exist
  if (!sessions[sessionId]) {
    return NextResponse.json({ messages: [] })
  }

  const session = sessions[sessionId]
  let messages: any[] = []

  // Get messages of the requested type
  switch (messageType) {
    case "offer":
      messages = session.offers.slice(lastIndex)
      break
    case "answer":
      messages = session.answers.slice(lastIndex)
      break
    case "candidate":
      messages = session.candidates.slice(lastIndex)
      break
    default:
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 })
  }

  return NextResponse.json({
    messages,
    lastIndex: lastIndex + messages.length,
  })
}

// Clean up old sessions (would be handled by a cron job in production)
export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId")

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  if (sessions[sessionId]) {
    delete sessions[sessionId]
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Session not found" }, { status: 404 })
}
