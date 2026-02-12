import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App Component', () => {
  it('renders the Auth page by default (redirects from /)', () => {
    render(<App />)
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument()
  })

  it('shows the login form initial state', () => {
    render(<App />)
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('can toggle between Login and Sign Up', async () => {
    const user = userEvent.setup()
    render(<App />)

    const signUpLink = screen.getByRole('button', { name: /Sign Up/i })
    await user.click(signUpLink)

    expect(screen.getByText(/Create Account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()

    const logInLink = screen.getByRole('button', { name: /Log In/i })
    await user.click(logInLink)

    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument()
  })
})
