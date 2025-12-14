# تطبيق تتبع الطلبيات - دليل التصميم الشامل

## Design Approach

**Selected System**: Material Design 3 (adapted for Arabic RTL)

**Justification**: Material Design provides robust RTL support, excellent component patterns for data-dense applications, and clear accessibility guidelines perfect for a bilingual tracking system requiring both customer simplicity and admin functionality.

**Core Principles**:
- Clarity and readability in Arabic typography
- Seamless RTL experience throughout
- Mobile-first for customer tracking
- Information hierarchy for quick scanning
- Professional, trustworthy aesthetic

---

## Typography

**Primary Font Family**: 'Tajawal' (Google Fonts) - modern Arabic sans-serif, excellent readability
**Secondary Font**: 'Cairo' for headings - strong presence for titles

**Scale & Weights**:
- **Hero/Page Titles**: text-4xl (2.25rem) / font-bold
- **Section Headers**: text-2xl (1.5rem) / font-semibold  
- **Card Titles**: text-xl (1.25rem) / font-semibold
- **Body Text**: text-base (1rem) / font-normal
- **Labels/Meta**: text-sm (0.875rem) / font-medium
- **Helper Text**: text-xs (0.75rem) / font-normal

**Line Heights**: Use leading-relaxed (1.625) for Arabic text readability

---

## Layout System

**Spacing Units**: Use Tailwind primitives of **4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6 or p-8
- Section spacing: py-12 or py-16
- Card gaps: gap-6
- Form field spacing: space-y-4

**Container Widths**:
- Customer Tracking Page: max-w-2xl (centered, focused experience)
- Admin Dashboard: max-w-7xl (full workspace)
- Forms: max-w-md for single-column inputs

**Grid System**:
- Admin Orders List: Single column on mobile, maintain list view on desktop for data density
- Admin Dashboard Cards: grid-cols-1 md:grid-cols-3 for stats overview

---

## Component Library

### Customer Tracking Page

**Search Card**:
- Elevated card (shadow-lg) centered on page
- Two input fields stacked vertically with generous spacing (space-y-6)
- Large, prominent search button (h-12, rounded-lg)
- Clear field labels with text-sm above inputs
- Input fields with border-2, rounded-md, h-12 for touch-friendliness

**Order Status Display**:
- Full-width card (max-w-3xl centered)
- Order number displayed prominently at top (text-3xl, font-bold)
- Customer name and phone in metadata section (text-sm, subtle treatment)

**Progress Tracker** (Critical Component):
- Horizontal stepped progress bar showing all 9 stages
- Active stage: filled circle with checkmark
- Completed stages: filled circles with connecting lines
- Future stages: outlined circles with dotted lines
- On mobile: Condense to vertical timeline with current stage highlighted
- Each step shows Arabic label below (text-xs)
- Current stage gets emphasized treatment (larger circle, bolder text)

**Information Sections**:
- Estimated delivery date in prominent card (rounded-xl, p-6)
- Admin notes section with distinct visual treatment (border-r-4 accent strip)
- Icons beside each section for quick recognition

### Admin Dashboard

**Authentication Page**:
- Centered card (max-w-md) with elevated shadow
- Logo/title at top (text-center, mb-8)
- Two inputs with clear labels
- Full-width login button (h-12)
- Error messages below form with icon

**Dashboard Layout**:
- **Top Navigation Bar**: 
  - App title on right (Arabic RTL)
  - User info and logout on left
  - Fixed position (sticky top-0)
  - Height: h-16

- **Sidebar** (Desktop only, lg:flex):
  - Width: w-64
  - Navigation items with icons
  - Active state with background treatment
  - Collapses to hamburger on mobile

- **Main Content Area**:
  - Dashboard stats: 3 cards across (grid-cols-3) showing totals
  - Each stat card: p-6, rounded-xl, shadow
  - Large number (text-4xl), label below (text-sm)

**Orders Management Table**:
- Responsive table with horizontal scroll on mobile
- Sticky header row
- Alternating row backgrounds for readability
- Action buttons column (تعديل، حذف) aligned left in RTL
- Status badges with rounded-full pills
- Search bar above table (w-full md:w-96)

**Order Form** (Add/Edit):
- Single column layout (max-w-2xl)
- Grouped fields with visual separation (space-y-8 between groups)
- Field groups:
  1. معلومات الزبون (customer info)
  2. تفاصيل الطلبية (order details)  
  3. الحالة والتوقيت (status & timing)
  4. ملاحظات (notes)
- Dropdown for status selection with all 9 stages
- Date picker for estimated delivery
- Textarea for notes (h-32, rounded-md)
- Action buttons at bottom: حفظ (save) and إلغاء (cancel)

**Status Dropdown**:
- Full list of 9 stages as options
- Current selection highlighted
- Checkmark icon for selected item
- Dropdown opens upward if near bottom of viewport

### Shared Components

**Buttons**:
- Primary actions: h-12, px-8, rounded-lg, font-semibold
- Secondary actions: h-10, px-6, rounded-md, outlined style
- Icon buttons (edit, delete): w-10, h-10, rounded-md

**Input Fields**:
- Standard height: h-12
- Rounded: rounded-md  
- Border width: border-2 for clear visibility
- Padding: px-4
- Labels: block, mb-2, text-sm, font-medium

**Cards**:
- Default: rounded-xl, p-6, shadow-md
- Elevated (important info): rounded-xl, p-8, shadow-lg

**Status Badges**:
- Inline-block, px-3, py-1, rounded-full, text-sm, font-medium
- Different visual treatment per stage (through semantic classes)

**Modal/Dialog**:
- Backdrop with blur effect
- Centered card (max-w-lg)
- Title, content, action buttons at bottom
- Close button (×) on top-left (RTL consideration)

---

## RTL Considerations

- All text alignment: text-right by default
- Flex/grid direction: reversed for RTL flow  
- Icons: flip horizontally where directional (arrows, chevrons)
- Margins/paddings: use logical properties (mr becomes ml in RTL context)
- Progress bar: flows right to left
- Tables: action columns on left side
- Forms: labels and inputs align right

---

## Responsive Breakpoints

- **Mobile (base)**: Single column, stacked layouts, full-width cards
- **Tablet (md: 768px)**: Two columns for some admin sections, sidebar appears
- **Desktop (lg: 1024px)**: Full dashboard layout, three-column stats, wider tables

---

## Animations

**Minimal, purposeful animations only**:
- Progress bar stage transition: subtle scale and fade (200ms)
- Button press feedback: scale-95 active state
- Page transitions: fade-in (300ms) for content load
- Dropdown open/close: slide and fade (150ms)

**No**: Parallax, continuous animations, complex scroll effects

---

## Accessibility

- Maintain 4.5:1 contrast ratios for all text
- Touch targets minimum 44x44px for mobile
- Clear focus states: outline-2, outline-offset-2
- Skip to main content link for keyboard users
- ARIA labels for icon-only buttons in Arabic
- Form validation messages with icons and text
- Semantic HTML throughout (nav, main, article, form)

---

## Images

**Logo/Branding**: 
- Company logo in top navigation bar (h-10, w-auto)
- Login page logo (h-16, centered above form)

**No hero image required** - this is a utility application focused on functionality. Customer tracking page leads directly with search interface. Admin dashboard leads with navigation and stats overview.

**Icons**: 
- Heroicons library (Arabic-compatible)
- Used throughout for: search, calendar, phone, user, edit, delete, check, clock, truck (delivery stages)