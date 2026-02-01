import { getRun } from 'workflow/api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params
  const { searchParams } = new URL(req.url)
  const startIndex = parseInt(searchParams.get('startIndex') || '0', 10)

  try {
    const run = getRun(runId)
    const readable = run.getReadable({ startIndex }) as ReadableStream

    // run.getReadable() emits deserialized JS objects (via devalue).
    // Transform them into SSE-formatted text for EventSource clients.
    const encoder = new TextEncoder()
    const workflowReader = readable.getReader()
    const sseStream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await workflowReader.read()
          if (done) {
            controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))
            controller.close()
            return
          }
          const line = `data: ${JSON.stringify(value)}\n\n`
          controller.enqueue(encoder.encode(line))
        } catch {
          const errLine = `data: ${JSON.stringify({ type: 'error', message: 'Stream terminated unexpectedly' })}\n\n`
          controller.enqueue(encoder.encode(errLine))
          controller.close()
        }
      },
    })

    return new Response(sseStream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const body = `data: ${JSON.stringify({ type: 'error', message })}\n\n`
    return new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
}
