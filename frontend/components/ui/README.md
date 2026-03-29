# UI Components Documentation

This directory contains reusable UI components following the project's design system and conventions.

## Available Components

### Input Components

- **Input** - Basic text input field
- **PasswordInput** - Secure password input with show/hide toggle

### Layout Components

- **Card** - Container with consistent styling and structure
- **Tabs** - Tabbed navigation interface

### Utility Components

- **Badge** - Status indicators and labels
- **DatePicker** - Date selection interface
- **Select** - Dropdown selection
- **Table** - Data table with sorting and filtering
- **Toaster** - Notification system

## PasswordInput Component

### Purpose

Secure password input field with built-in show/hide functionality for enhanced user experience.

### Usage

```tsx
import { PasswordInput } from "@/components/ui/password-input";

// Basic usage
<PasswordInput
  id="password"
  name="password"
  placeholder="Enter your password"
  onChange={(e) => setPassword(e.target.value)}
/>

// With additional props
<PasswordInput
  id="confirm-password"
  name="confirmPassword"
  placeholder="Confirm password"
  disabled={isSubmitting}
  className="w-full"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
/>
```

### Props

- `id` (required): Unique identifier for the input
- `name` (optional): Form field name
- `placeholder` (optional): Input placeholder text
- `value` (optional): Controlled input value
- `onChange` (optional): Change event handler
- `disabled` (optional): Disable the input
- `className` (optional): Additional CSS classes
- All other standard input props are supported

### Features

- Toggle button to show/hide password
- Accessible labels and ARIA attributes
- Consistent styling with project design system
- Mobile-responsive design
- Error state handling through standard input props

### When to Use

- Login forms
- Registration forms
- Password reset flows
- Profile settings (password changes)
- Any form requiring secure password input

### When Not to Use

- Non-password text inputs (use Input instead)
- Password confirmation fields (use PasswordInput with appropriate validation)
- Multi-line text areas

## Design System Integration

All components follow these conventions:

- **Styling**: Tailwind CSS with DaisyUI components
- **Icons**: Lucide React for consistent iconography
- **Accessibility**: ARIA labels and keyboard navigation
- **Responsive**: Mobile-first design approach
- **Error Handling**: Standard error state patterns

## Component Structure

Each component follows this pattern:

```tsx
// Import dependencies
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";

// Define props interface
interface ComponentProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Component-specific props
}

// Export component
export const ComponentName = ({ id, ...props }: ComponentProps) => {
  // Component logic
  return (
    // JSX structure
  );
};
```

## Development Guidelines

- **Consistency**: Follow established patterns in existing components
- **Accessibility**: Include proper ARIA labels and keyboard navigation
- **Performance**: Use React.memo for expensive components
- **Testing**: Include basic interaction tests
- **Documentation**: Add JSDoc comments for props and usage

## AI Integration

### For AI-Assisted Development

- **Discovery**: AI should scan @/components/ui directory for available components
- **Pattern Recognition**: AI should recognize password field contexts (name="password", type="password")
- **Recommendation**: AI should suggest PasswordInput for any password-related input
- **Skill Files**: Update skill files to include PasswordInput in recommended components list

### For Manual Development

- **Directory Structure**: Components are located in @/components/ui/
- **Import Path**: Use @/components/ui/component-name
- **Usage Patterns**: Follow examples in existing usage files
- **Documentation**: Check this README for component details
- **Consistency**: Match styling and behavior of existing components
