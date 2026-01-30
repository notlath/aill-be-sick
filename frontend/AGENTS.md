# AGENTS.md for AI'll Be Sick Frontend

## Styling Guidelines for AI Assistants

### DaisyUI Only Policy

**CRITICAL: This project uses DaisyUI exclusively for all UI components and styling.**

#### Rules

1. **ALWAYS use DaisyUI components and classes**
   - Use DaisyUI's built-in components: `btn`, `card`, `modal`, `alert`, `badge`, etc.
   - Use DaisyUI's utility classes: `btn-primary`, `btn-ghost`, `card-body`, etc.

2. **NEVER use custom Tailwind classes for styling**
   - ❌ No custom `bg-gradient-to-br`, `hover:scale-105`, `shadow-2xl`
   - ❌ No custom transitions or animations beyond DaisyUI defaults
   - ✅ Use DaisyUI classes like `btn-success`, `card-compact`, `shadow-xl`

3. **Use Lucide React for icons**
   - ✅ Import from `lucide-react`: `import { Icon } from "lucide-react"`
   - ✅ Use Lucide components: `<Icon className="w-5 h-5" />`
   - ❌ No FontAwesome, Heroicons, or other icon libraries

4. **NEVER create custom gradients or effects**
   - ❌ No `bg-gradient-to-r from-emerald-500 to-emerald-600`
   - ❌ No `backdrop-blur-sm`, custom shadows, or blur effects
   - ✅ Use DaisyUI's color system: `bg-base-200`, `bg-success`, `text-primary`

### DaisyUI Components Reference

#### Common Components

- **Buttons**: `btn`, `btn-primary`, `btn-secondary`, `btn-success`, `btn-ghost`, `btn-outline`
- **Cards**: `card`, `card-body`, `card-title`, `card-actions`
- **Modals**: `modal`, `modal-box`, `modal-backdrop`, `modal-open`
- **Alerts**: `alert`, `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- **Badges**: `badge`, `badge-primary`, `badge-secondary`, `badge-outline`
- **Avatars**: `avatar`, `avatar-placeholder`, `avatar-ring`

#### Layout

- **Base colors**: `bg-base-100`, `bg-base-200`, `bg-base-300`
- **Text colors**: `text-base-content`, `text-primary`, `text-secondary`
- **Shadows**: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`

### Example: Correct vs Incorrect

#### ❌ INCORRECT (Custom Tailwind)

```tsx
<button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105">
  Click me
</button>
```

#### ✅ CORRECT (DaisyUI Only)

```tsx
<button className="btn btn-success btn-lg">Click me</button>
```

### Sidebar Navigation Links

When creating new navigation items for the sidebar:

- **ALWAYS copy the design from existing `nav-link.tsx`**
- Use the same styling structure with:
  - Icon container with hover effects and transitions
  - Gradient overlay on hover
  - Active state handling
  - Consistent spacing and sizing
- Maintain the same animation curve: `ease-[cubic-bezier(0.32,0.72,0,1)]`
- Keep icon size consistent: `size-4.5` with `strokeWidth={2.5}`

**Example:** See `nav-link.tsx` and `help-button.tsx` for reference implementation.

### When in doubt

- Check [DaisyUI documentation](https://daisyui.com/components/)
- Use DaisyUI's pre-built components and utilities
- Keep it simple with DaisyUI classes

**Remember: Consistency is key. DaisyUI provides everything we need.**
