# 📍 En su Point

A modern social map platform where users can discover, rate, save and share local spots around Lima.

En su Point is designed for people who want to explore restaurants, pollerías, cafés, bars, rooftops, hidden places, photo spots and other local experiences through a community-driven map.

Inspired by modern social platforms, map-based discovery apps and local recommendation experiences.

---

## ✨ Features

- User authentication
- Public user profiles
- Editable profile information
- Avatar upload and profile customization
- Interactive Mapbox map
- Custom map pins by category
- Location-based discovery
- Create and publish new Points
- Upload main images for places
- Address autocomplete
- Manual map coordinate picker
- Category and district filters
- Ratings and reviews
- Comments system
- Emoji reactions
- Saved places system
- Favorite Points section
- Friend and follower system
- User search
- Real-time notifications
- XP and user level progression
- Trending places dashboard
- Admin moderation panel
- Dark modern responsive interface

---

## 🧠 Main Concept

En su Point is not just another map application.

The goal is to create a social discovery experience where users can:

- discover new local places
- recommend hidden spots
- rate their favorite places
- interact with friends
- save places they want to visit
- build a local explorer profile
- find recommendations based on community activity

The platform focuses on Lima and aims to make local exploration more social, visual and community-driven.

---

## 🗺️ Core Sections

### Home

The home dashboard gives users a quick overview of:

- trending places of the month
- new recommended Points
- friend activity
- nearby places
- places close to the user
- an interactive map preview

### Explore

Users can browse available Points and filter them by:

- name
- category
- district

Categories include restaurants, pollerías, cafés, bars, rooftops, karaokes, hotels, hidden places, photo spots and more.

### Map

The map page displays all Points in real time using Mapbox.

Each Point is shown with a custom marker, making it easier to identify different types of places visually.

### Create Point

Users can publish a new Point by adding:

- main photo
- place name
- category
- district
- address
- reference
- description
- exact map location
- optional initial rating
- anonymous publishing option

### Profile

Each user has a personal profile with:

- profile photo
- username
- bio
- district
- XP
- level title
- created Points
- favorite Points
- followers and following counters

### My Reviews

Users can manage their own activity:

- view their ratings
- update ratings
- delete ratings
- view comments
- edit comments
- delete comments

### Admin Panel

The app includes a moderation panel for admins, allowing them to:

- manage Points
- remove inappropriate comments
- delete ratings
- moderate community content

---

## 🛠️ Tech Stack

- React
- TypeScript
- TailwindCSS
- TanStack Router
- TanStack Query
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- Mapbox GL
- Mapbox Geocoding API
- Radix UI
- shadcn/ui components
- Lucide React
- Zod
- Vite

---

## 🎨 UI / UX

The interface is designed with a modern dark visual style.

Main design goals:

- urban social discovery feeling
- clean dark-mode experience
- immersive map-based navigation
- smooth card-based layouts
- strong visual identity
- readable filters and categories
- responsive structure
- community-focused interactions

The visual style combines elements inspired by:

- modern map apps
- social platforms
- dark dashboards
- local discovery apps
- recommendation-based interfaces

---

## 🔐 Roles

The platform includes different user roles:

- Regular users
- Moderators
- Admins
- Super admins

Admins can access a private moderation panel to manage community content and keep the platform clean.

---

## 🧩 Database Features

The backend uses Supabase and PostgreSQL with:

- user profiles
- roles and permissions
- categories
- points
- comments
- ratings
- saved places
- reactions
- followers
- notifications
- reports
- storage buckets for point images and avatars
- Row Level Security policies
- database triggers for ratings, XP and notifications

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/Fanaker/En-su-Point.git
cd En-su-Point
```

Install dependencies:

```bash
bun install
```

Run the development server:

```bash
bun run dev
```

Or using npm:

```bash
npm install
npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in the root of the project.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
VITE_MAPBOX_TOKEN=
```

Do not upload your real `.env` file to GitHub.

Use `.env.example` to show the required variables without exposing private keys.

---

## 🚀 Future Plans

- Advanced recommendation algorithm
- AI-based place suggestions
- Better social activity feed
- Achievement badges
- More detailed user rankings
- Group plans for visiting places
- Advanced filters by mood, distance and popularity
- Mobile app version
- Public shareable Point pages
- Improved admin analytics

---

## ⚠️ Disclaimer

This project is currently under active development.

Some features may still be experimental, incomplete or subject to future improvements.

---

## 📸 Screenshots

<img width="2508" height="1244" alt="p10" src="https://github.com/user-attachments/assets/3c44c417-4647-40a7-84f7-1da07d5ec3b0" />
<img width="2490" height="2494" alt="p11" src="https://github.com/user-attachments/assets/3f7b3072-d98f-4f71-a800-d487dcefc79d" />
<img width="2508" height="1244" alt="p1" src="https://github.com/user-attachments/assets/bb69b422-29d2-403d-89ff-70b033277c03" />
<img width="2508" height="1244" alt="p2" src="https://github.com/user-attachments/assets/ce9844ad-7f1d-4f61-aefd-c3d016726041" />
<img width="2508" height="1244" alt="p5" src="https://github.com/user-attachments/assets/2408700b-7de1-4370-85e2-0d416822a0f7" />
<img width="2508" height="1244" alt="p4" src="https://github.com/user-attachments/assets/63d184c7-75a0-4987-8465-8989f658024e" />
<img width="2508" height="1244" alt="p3" src="https://github.com/user-attachments/assets/39d22bfd-7ed1-4601-a04c-0cb621e22448" />
<img width="2508" height="1244" alt="p6" src="https://github.com/user-attachments/assets/f204ee30-920b-44cd-9eec-69bb65899cf3" />
<img width="2508" height="1244" alt="p7" src="https://github.com/user-attachments/assets/53050fa4-a143-478d-abd5-643c18af1f53" />
<img width="2508" height="1244" alt="p8" src="https://github.com/user-attachments/assets/84047c78-ba35-4e15-b039-f3a02f798a39" />
<img width="2508" height="1244" alt="p9" src="https://github.com/user-attachments/assets/c72d4461-b961-48e6-a1f1-7bbfa43f52e7" />
