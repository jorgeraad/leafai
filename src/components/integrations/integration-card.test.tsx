// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { IntegrationCard } from './integration-card'

afterEach(cleanup)

describe('IntegrationCard', () => {
  const onConnect = vi.fn()
  const onDisconnect = vi.fn()

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders Connect button when not_connected', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="not_connected"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    expect(screen.getByText('Not connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
    expect(screen.getByText(/Connect your Google Drive/)).toBeInTheDocument()
  })

  it('renders email and Disconnect button when active', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="active"
        email="user@example.com"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Connected as user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
  })

  it('renders Reconnect button when error', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="error"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument()
  })

  it('calls onConnect when Connect clicked', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="not_connected"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
    expect(onConnect).toHaveBeenCalledOnce()
  })

  it('calls onDisconnect when Disconnect clicked', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="active"
        email="user@example.com"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  it('calls onConnect when Reconnect clicked', () => {
    render(
      <IntegrationCard
        provider="google_drive"
        status="error"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }))
    expect(onConnect).toHaveBeenCalledOnce()
  })
})
