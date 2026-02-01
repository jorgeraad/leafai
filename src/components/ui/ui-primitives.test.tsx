import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createRef } from 'react'

afterEach(cleanup)

import { Button } from './button'
import { Input } from './input'
import { Card, CardHeader, CardContent, CardFooter } from './card'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { Badge } from './badge'
import { ScrollArea } from './scroll-area'
import { Skeleton } from './skeleton'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('supports disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Input', () => {
  it('renders without crashing', () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('calls onChange', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalledOnce()
  })
})

describe('Card', () => {
  it('renders header, content, and footer slots', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('renders without crashing', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText('AB')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders without crashing', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })
})

describe('ScrollArea', () => {
  it('renders without crashing', () => {
    render(<ScrollArea>Scrollable content</ScrollArea>)
    expect(screen.getByText('Scrollable content')).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).toHaveClass('animate-pulse')
  })
})

describe('Collapsible', () => {
  it('toggles content visibility', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )

    // Content should be hidden initially
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()

    // Click to open
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.getByText('Hidden content')).toBeInTheDocument()

    // Click to close
    fireEvent.click(screen.getByText('Toggle'))
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })
})
