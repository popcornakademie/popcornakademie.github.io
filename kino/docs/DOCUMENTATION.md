# Court Side Kino – Technical Documentation

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Supabase   │     │   Resend    │
│  (Pages)    │     │  (PostgreSQL)│     │   (Email)   │
└──────┬──────┘     └──────────────┘     └──────▲──────┘
       │                                         │
       │              ┌──────────────┐           │
       ├─────────────▶│  CF Workers  │───────────┘
       │              │ Email/Payment│
       │              └──────┬───────┘
       │                     │
       │              ┌──────▼───────┐
       │              │    SumUp     │
       │              │  (Payment)   │
       └──────────────┴──────────────┘
```

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `films` | Movie data | title, slug, genre, poster_url |
| `screenings` | Showtimes | film_id, screening_date, start_time, prices |
| `tickets` | Bookings | screening_id, seat_numbers, payment_status, qr_code_data |
| `seat_availability` | Per-seat tracking | screening_id, seat_number, is_available |
| `menu_items` | Food & drinks | category, name, price, allergens |
| `reservations` | Biergarten bookings | date, time, party_size |
| `newsletter_subscribers` | Email list | email, status, confirm_token |

### RLS Policies

All tables have Row Level Security enabled:
- **Read:** Public (anon) can read films, screenings, menu items, seat availability
- **Write:** Anon can insert tickets, reservations, newsletter subscriptions
- **Update:** Anon can update tickets (payment status) and seat availability

## JavaScript Modules

### Core

| File | Purpose |
|------|---------|
| `config.js` | Site-wide configuration constants |
| `supabase-client.js` | All database CRUD operations |
| `utils.js` | Formatting, validation, cart, toast, storage |
| `animations.js` | Intersection Observer, parallax, FAQ accordion |
| `app.js` | App init, theme toggle, cookie consent |

### Components

| Component | File | Usage |
|-----------|------|-------|
| Navbar | `components/navbar.js` | Mobile menu, scroll effect, newsletter |
| FilmCard | `components/film-card.js` | `renderFilmCard()`, countdown, weather |
| SeatPlan | `components/seat-plan.js` | `new SeatPlan(container, options)` |
| Cart | `components/seat-plan.js` | `renderCart()`, `initCartListener()` |

### Page Scripts

Each page has a dedicated script in `js/pages/` that handles page-specific data loading and interactions.

## Ticket Booking Flow

1. User selects a screening → `selectScreening()`
2. Seat plan loads availability from `seat_availability` table
3. User picks seats → stored in `cart` (localStorage)
4. User enters customer data → form validation
5. `createTicket()` inserts into `tickets` table
6. `reserveSeats()` marks seats as unavailable
7. Payment Worker creates SumUp checkout → redirect
8. Return URL → `buchung-erfolgreich.html?ref=CSK-xxx`
9. Email Worker sends confirmation with QR code

## Email Worker Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/booking` | POST | Ticket confirmation email |
| `/reservation` | POST | Biergarten reservation confirmation |
| `/newsletter` | POST | Welcome email for new subscribers |
| `/contact` | POST | Contact form (admin + user confirmation) |

## Payment Worker Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/checkout` | POST | Create SumUp checkout session |
| `/status` | GET | Check payment status by checkout_id |
| `/webhook` | POST | Receive SumUp payment webhooks |

## CSS Architecture

Mobile-first with CSS custom properties:

```css
/* Breakpoints */
Base:     < 768px  (mobile)
Tablet:   ≥ 768px
Desktop:  ≥ 1024px
Large:    ≥ 1280px
```

Color system uses semantic variables (`--color-primary`, `--color-accent`, `--color-tennis`) with dark mode overrides via `[data-theme="dark"]`.

## Animation System

- **Scroll reveal:** `.reveal` class + Intersection Observer
- **Stagger:** `.stagger-children` with CSS `transition-delay`
- **Parallax:** `.parallax-bg` with `data-speed` attribute
- **Hero:** CSS keyframe animations on load
- **Reduced motion:** Respects `prefers-reduced-motion`

## Security Considerations

- Supabase RLS prevents unauthorized data access
- API keys for Resend and SumUp are server-side only (Workers)
- Input sanitization via `sanitize()` helper
- Form validation on client and should be reinforced server-side
- CORS headers configured on Workers
- CSP headers can be added via Cloudflare Page Rules

## Performance

- Lazy loading images (`loading="lazy"`)
- Google Fonts preconnect
- Scripts loaded with `defer`
- No build step = zero JS bundle overhead
- Cloudflare CDN for static assets
- CSS custom properties avoid redundant rules

## Future Enhancements

- [ ] English language toggle
- [ ] Service Worker for offline support
- [ ] Real QR code generation (server-side)
- [ ] Admin dashboard for film/screening management
- [ ] Webhook integration to auto-update payment status in Supabase
- [ ] Image optimization pipeline (WebP conversion)
