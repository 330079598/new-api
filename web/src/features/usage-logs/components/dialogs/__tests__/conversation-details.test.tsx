/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { after, afterEach, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { api } = await import('@/lib/api')
const { DetailsDialog } = await import('../details-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({ lng: 'en' })

const originalGet = api.get
const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

type RenderedDialog = {
  container: HTMLDivElement
  root: ReturnType<typeof createRoot>
}

async function renderDialog(): Promise<RenderedDialog> {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  await act(async () => {
    root.render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <DetailsDialog
            log={{
              id: 1,
              user_id: 1,
              created_at: 1,
              type: 2,
              content: '',
              username: 'admin',
              token_name: 'test-token',
              model_name: 'test-model',
              quota: 0,
              prompt_tokens: 0,
              completion_tokens: 0,
              use_time: 0,
              is_stream: false,
              channel: 1,
              channel_name: 'test-channel',
              token_id: 1,
              group: 'default',
              ip: '',
              other: '',
              request_id: 'req-conversation-1',
              upstream_request_id: '',
            }}
            isAdmin
            open
            onOpenChange={() => {}}
          />
        </QueryClientProvider>
      </I18nextProvider>
    )
  })

  return { container, root }
}

async function unmountDialog(rendered: RenderedDialog) {
  await act(async () => rendered.root.unmount())
  rendered.container.remove()
}

describe('usage log conversation details', () => {
  afterEach(() => {
    api.get = originalGet
    document.body.replaceChildren()
  })

  after(() => {
    domWindow.close()
  })

  test('loads and displays the complete request and response for a request log', async () => {
    api.get = (async (url: string) => {
      assert.equal(url, '/api/log/conversation?request_id=req-conversation-1')
      return {
        data: {
          success: true,
          data: {
            id: 1,
            request_id: 'req-conversation-1',
            user_id: 1,
            username: 'admin',
            token_id: 1,
            token_name: 'test-token',
            model_name: 'test-model',
            channel_id: 1,
            group: 'default',
            relay_format: 'openai',
            request_path: '/v1/chat/completions',
            is_stream: false,
            status: 'success',
            request_content: JSON.stringify({
              messages: [{ role: 'user', content: 'full user question' }],
            }),
            response_content: 'complete assistant response',
            error_message: '',
            created_at: 1,
            updated_at: 2,
          },
        },
      }
    }) as typeof api.get

    const rendered = await renderDialog()
    const conversationTrigger = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Conversation')
    )
    assert.ok(conversationTrigger, 'conversation section trigger is visible')

    await act(async () => {
      conversationTrigger.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    assert.match(document.body.textContent ?? '', /full user question/)
    assert.match(document.body.textContent ?? '', /complete assistant response/)

    await unmountDialog(rendered)
  })
})
