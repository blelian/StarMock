import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock static assets
vi.mock('./assets/react.svg', () => ({
  default: 'react-logo.svg',
}))

vi.mock('/vite.svg', () => ({
  default: 'vite-logo.svg',
}))

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText(/Vite \+ React/i)).toBeInTheDocument()
  })

  it('renders Vite and React logos', () => {
    render(<App />)
    const viteLogo = screen.getByAltText('Vite logo')
    const reactLogo = screen.getByAltText('React logo')

    expect(viteLogo).toBeInTheDocument()
    expect(reactLogo).toBeInTheDocument()
  })

  it('displays initial count of 0', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    expect(button).toBeInTheDocument()
  })

  it('increments count when button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: /count is 0/i })
    await user.click(button)

    expect(
      screen.getByRole('button', { name: /count is 1/i })
    ).toBeInTheDocument()
  })

  it('increments count multiple times', async () => {
    const user = userEvent.setup()
    render(<App />)

    const button = screen.getByRole('button', { name: /count is/i })

    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(
      screen.getByRole('button', { name: /count is 3/i })
    ).toBeInTheDocument()
  })

  it('contains links to Vite and React documentation', () => {
    render(<App />)

    const viteLink = screen.getByRole('link', { name: /vite logo/i })
    const reactLink = screen.getByRole('link', { name: /react logo/i })

    expect(viteLink).toHaveAttribute('href', 'https://vite.dev')
    expect(reactLink).toHaveAttribute('href', 'https://react.dev')
  })

  it('displays the HMR instruction text', () => {
    render(<App />)
    expect(screen.getByText(/Edit/i)).toBeInTheDocument()
    expect(screen.getByText(/src\/App.tsx/i)).toBeInTheDocument()
    expect(screen.getByText(/and save to test HMR/i)).toBeInTheDocument()
  })

  it('displays the documentation hint', () => {
    render(<App />)
    expect(
      screen.getByText(/Click on the Vite and React logos to learn more/i)
    ).toBeInTheDocument()
  })
})
