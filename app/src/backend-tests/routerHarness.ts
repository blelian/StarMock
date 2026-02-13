import { vi } from 'vitest'

type NextFn = (err?: unknown) => void
type RouterLike = { stack: Array<Record<string, any>> }
type RouteHandler = (
  req: Record<string, any>,
  res: MockResponse,
  next: NextFn
) => unknown

export type MockResponse = {
  statusCode: number
  body: unknown
  headersSent: boolean
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  clearCookie: ReturnType<typeof vi.fn>
}

export function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status: vi.fn(),
    json: vi.fn(),
    clearCookie: vi.fn(),
  }

  res.status.mockImplementation((code: number) => {
    res.statusCode = code
    return res
  })

  res.json.mockImplementation((payload: unknown) => {
    res.body = payload
    res.headersSent = true
    return res
  })

  return res
}

export function getRouteHandlers(
  router: RouterLike,
  method: 'get' | 'post' | 'patch',
  path: string
): RouteHandler[] {
  const layer = router.stack.find(
    (item: any) =>
      item.route &&
      item.route.path === path &&
      item.route.methods &&
      item.route.methods[method]
  )

  if (!layer) {
    throw new Error(`Route not found for ${method.toUpperCase()} ${path}`)
  }

  return layer.route.stack.map((item: any) => item.handle as RouteHandler)
}

export async function runRouteHandlers(
  handlers: RouteHandler[],
  req: Record<string, any>,
  res: MockResponse = createMockResponse()
): Promise<MockResponse> {
  let index = -1

  const dispatch = async (position: number): Promise<void> => {
    if (position <= index) {
      throw new Error('next() called multiple times')
    }
    index = position

    const handler = handlers[position]
    if (!handler) {
      return
    }

    let nextCalled = false
    let nextError: unknown
    const next: NextFn = (err?: unknown) => {
      nextCalled = true
      nextError = err
    }

    const result = handler(req, res, next)
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      await (result as Promise<unknown>)
    }

    if (nextError) {
      throw nextError
    }

    if (nextCalled && !res.headersSent) {
      await dispatch(position + 1)
    }
  }

  await dispatch(0)
  return res
}
