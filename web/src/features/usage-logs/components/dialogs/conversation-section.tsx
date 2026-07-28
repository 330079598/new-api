import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Maximize2,
  MessageSquare,
} from 'lucide-react'
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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Response } from '@/components/ai-elements/response'
import { StatusBadge, type StatusBadgeProps } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

import { getConversationLog } from '../../api'
import type { ConversationLog } from '../../types'

interface ChatMessage {
  role: string
  content: unknown
}

interface ParsedRequest {
  messages: ChatMessage[]
  params: Record<string, unknown>
}

interface RoleStyle {
  badge: string
  bubble: string
}

const ROLE_STYLES: Record<string, RoleStyle> = {
  system: {
    badge:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    bubble:
      'border-violet-200/60 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20',
  },
  user: {
    badge:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    bubble:
      'border-blue-200/50 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/15',
  },
  assistant: {
    badge:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    bubble:
      'border-emerald-200/50 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/15',
  },
  tool: {
    badge:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    bubble:
      'border-amber-200/50 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/15',
  },
}

const DEFAULT_ROLE_STYLE: RoleStyle = {
  badge: 'border-border bg-muted/40 text-muted-foreground',
  bubble: 'border-border/60 bg-muted/30',
}

function parseRequestMessages(raw: string): ParsedRequest | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.messages)) return null

    const params: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (key !== 'messages') params[key] = value
    }

    return { messages: parsed.messages as ChatMessage[], params }
  } catch {
    return null
  }
}

function getContentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (!part || typeof part !== 'object') return ''

      const contentPart = part as Record<string, unknown>
      if (contentPart.type === 'text' && typeof contentPart.text === 'string') {
        return contentPart.text
      }
      if (contentPart.type === 'image_url' || contentPart.type === 'image') {
        return '[image]'
      }
      if (contentPart.type === 'file') return '[file]'
      if (contentPart.type === 'input_audio') return '[audio]'
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function getRoleStyle(role: string): RoleStyle {
  return ROLE_STYLES[role] ?? DEFAULT_ROLE_STYLE
}

function getConversationStatusVariant(
  status: string
): StatusBadgeProps['variant'] {
  if (status === 'success') return 'green'
  if (status === 'error') return 'red'
  return 'yellow'
}

function MessageBubble(props: { message: ChatMessage; index: number }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const style = getRoleStyle(props.message.role)
  const text = getContentText(props.message.content)
  let roleLabel = props.message.role
  if (props.message.role === 'system') roleLabel = t('System')
  if (props.message.role === 'user') roleLabel = t('User')
  if (props.message.role === 'assistant') roleLabel = t('Assistant')
  if (props.message.role === 'tool') roleLabel = t('Tool')

  return (
    <div
      className={cn('min-w-0 overflow-hidden rounded-md border', style.bubble)}
    >
      <div className='flex min-w-0 items-center gap-1.5 px-2 py-1.5'>
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center transition-colors'
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('Expand') : t('Collapse')}
        >
          <ChevronRight
            className={cn(
              'size-3 transition-transform',
              !collapsed && 'rotate-90'
            )}
            aria-hidden='true'
          />
        </button>
        <button
          type='button'
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
            style.badge
          )}
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          {roleLabel}
          <span className='ml-1 text-[9px] opacity-50'>#{props.index + 1}</span>
        </button>
        {collapsed && text && (
          <span className='text-muted-foreground min-w-0 truncate font-mono text-[10px]'>
            {text.slice(0, 80).replaceAll('\n', ' ')}
          </span>
        )}
      </div>
      {!collapsed && (
        <p className='min-w-0 px-2 pb-2 text-xs leading-relaxed break-words whitespace-pre-wrap'>
          {text}
        </p>
      )}
    </div>
  )
}

function RequestParams(props: { params: Record<string, unknown> }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const entries = Object.entries(props.params).filter(
    ([, value]) => value !== undefined && value !== null
  )
  if (entries.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] transition-colors'>
        <ChevronRight
          className={cn('size-3 transition-transform', open && 'rotate-90')}
          aria-hidden='true'
        />
        {t('Parameters')} ({entries.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className='bg-background/60 mt-1 overflow-x-auto rounded border p-2'>
          <table className='w-full text-[11px]'>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} className='align-top'>
                  <td className='text-muted-foreground pr-3 pb-0.5 font-mono whitespace-nowrap'>
                    {key}
                  </td>
                  <td className='text-foreground pb-0.5 font-mono break-all'>
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function RequestContentView(props: {
  raw: string
  expanded?: boolean
  collapsible?: boolean
}) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const [collapsed, setCollapsed] = useState(false)
  const parsed = parseRequestMessages(props.raw)

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <button
          type='button'
          className={cn(
            'flex items-center gap-1 text-[11px] font-semibold',
            props.collapsible
              ? 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
              : 'text-muted-foreground cursor-default'
          )}
          onClick={
            props.collapsible
              ? () => setCollapsed((value) => !value)
              : undefined
          }
          aria-expanded={props.collapsible ? !collapsed : undefined}
        >
          {props.collapsible && (
            <ChevronRight
              className={cn(
                'pointer-events-none size-3 transition-transform',
                !collapsed && 'rotate-90'
              )}
              aria-hidden='true'
            />
          )}
          {t('Request')}
          {parsed && (
            <span className='text-muted-foreground/60 font-normal'>
              · {parsed.messages.length} {t('Messages')}
            </span>
          )}
        </button>
        <Button
          variant='ghost'
          size='sm'
          className='h-5 w-5 p-0'
          onClick={() => copyToClipboard(props.raw)}
          title={t('Copy')}
          aria-label={t('Copy')}
        >
          {copiedText === props.raw ? (
            <Check className='size-3 text-green-600' aria-hidden='true' />
          ) : (
            <Copy className='size-3' aria-hidden='true' />
          )}
        </Button>
      </div>

      {!collapsed &&
        (parsed ? (
          <div className='space-y-1.5'>
            {parsed.messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${JSON.stringify(message.content)}`}
                message={message}
                index={index}
              />
            ))}
            <RequestParams params={parsed.params} />
          </div>
        ) : (
          <pre
            className={cn(
              'bg-background/60 overflow-y-auto rounded border p-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap',
              !props.expanded && 'max-h-60'
            )}
          >
            {props.raw}
          </pre>
        ))}
    </div>
  )
}

function ResponseContentView(props: {
  raw: string
  expanded?: boolean
  collapsible?: boolean
}) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <button
          type='button'
          className={cn(
            'flex items-center gap-1 text-[11px] font-semibold',
            props.collapsible
              ? 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
              : 'text-muted-foreground cursor-default'
          )}
          onClick={
            props.collapsible
              ? () => setCollapsed((value) => !value)
              : undefined
          }
          aria-expanded={props.collapsible ? !collapsed : undefined}
        >
          {props.collapsible && (
            <ChevronRight
              className={cn(
                'pointer-events-none size-3 transition-transform',
                !collapsed && 'rotate-90'
              )}
              aria-hidden='true'
            />
          )}
          {t('Response')}
        </button>
        <Button
          variant='ghost'
          size='sm'
          className='h-5 w-5 p-0'
          onClick={() => copyToClipboard(props.raw)}
          title={t('Copy')}
          aria-label={t('Copy')}
        >
          {copiedText === props.raw ? (
            <Check className='size-3 text-green-600' aria-hidden='true' />
          ) : (
            <Copy className='size-3' aria-hidden='true' />
          )}
        </Button>
      </div>
      {!collapsed && (
        <div
          className={cn(
            'bg-background/60 overflow-y-auto rounded border p-3 text-xs leading-relaxed',
            !props.expanded && 'max-h-96'
          )}
        >
          <Response className='[&_code]:text-[11px] [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_li]:text-xs [&_p]:text-xs [&_pre]:text-[11px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'>
            {props.raw}
          </Response>
        </div>
      )}
    </div>
  )
}

function ConversationContent(props: {
  data: ConversationLog
  expanded?: boolean
  collapsible?: boolean
}) {
  const { t } = useTranslation()

  return (
    <>
      {props.data.request_content && (
        <RequestContentView
          raw={props.data.request_content}
          expanded={props.expanded}
          collapsible={props.collapsible}
        />
      )}
      {props.data.response_content && (
        <ResponseContentView
          raw={props.data.response_content}
          expanded={props.expanded}
          collapsible={props.collapsible}
        />
      )}
      {props.data.error_message && (
        <div className='space-y-1'>
          <span className='text-[11px] font-semibold text-red-500'>
            {t('Error')}
          </span>
          <pre className='max-h-40 overflow-y-auto rounded border border-red-200 bg-red-50 p-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap dark:border-red-900 dark:bg-red-950/20'>
            {props.data.error_message}
          </pre>
        </div>
      )}
    </>
  )
}

function ConversationExpandDialog(props: {
  data: ConversationLog
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex h-[92vh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-w-none'>
        <DialogHeader className='shrink-0 border-b px-5 py-3.5'>
          <DialogTitle className='flex items-center gap-2 text-sm'>
            <MessageSquare className='size-4' aria-hidden='true' />
            {t('Conversation')}
            <div className='ml-1 flex items-center gap-1.5'>
              <StatusBadge
                label={props.data.status}
                variant={getConversationStatusVariant(props.data.status)}
                size='sm'
                copyable={false}
              />
              {props.data.is_stream && (
                <StatusBadge
                  label={t('Stream')}
                  variant='blue'
                  size='sm'
                  copyable={false}
                />
              )}
            </div>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {t('Conversation details')}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='space-y-4 p-5'>
            <ConversationContent data={props.data} expanded collapsible />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ConversationSection(props: { requestId: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [expandOpen, setExpandOpen] = useState(false)
  const conversationQuery = useQuery({
    queryKey: ['conversation-log', props.requestId],
    queryFn: async () => {
      const response = await getConversationLog(props.requestId)
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load conversation')
      }
      return response.data
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return (
    <>
      {conversationQuery.data && (
        <ConversationExpandDialog
          data={conversationQuery.data}
          open={expandOpen}
          onOpenChange={setExpandOpen}
        />
      )}
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className='flex w-full items-center gap-1.5'>
          <CollapsibleTrigger className='flex flex-1 items-center gap-1.5'>
            <ChevronDown
              className={cn(
                'text-muted-foreground size-3.5 transition-transform',
                open && 'rotate-180'
              )}
              aria-hidden='true'
            />
            <span className='flex cursor-pointer items-center gap-1.5 text-xs font-semibold'>
              <MessageSquare className='size-3.5' aria-hidden='true' />
              {t('Conversation')}
            </span>
          </CollapsibleTrigger>
          {conversationQuery.data && (
            <Button
              variant='ghost'
              size='sm'
              className='h-5 w-5 p-0'
              onClick={() => setExpandOpen(true)}
              title={t('Expand')}
              aria-label={t('Expand')}
            >
              <Maximize2 className='size-3' aria-hidden='true' />
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <div className='bg-muted/30 mt-1.5 min-w-0 space-y-2.5 overflow-hidden rounded-md border p-2.5'>
            {conversationQuery.isLoading && (
              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                <Loader2 className='size-3 animate-spin' aria-hidden='true' />
                {t('Loading')}...
              </div>
            )}
            {conversationQuery.isError && (
              <p className='text-xs text-red-500'>{t('Failed to load')}</p>
            )}
            {conversationQuery.data && (
              <>
                <div className='flex items-center gap-2'>
                  <StatusBadge
                    label={conversationQuery.data.status}
                    variant={getConversationStatusVariant(
                      conversationQuery.data.status
                    )}
                    size='sm'
                    copyable={false}
                  />
                  {conversationQuery.data.is_stream && (
                    <StatusBadge
                      label={t('Stream')}
                      variant='blue'
                      size='sm'
                      copyable={false}
                    />
                  )}
                </div>
                <ConversationContent data={conversationQuery.data} />
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  )
}
