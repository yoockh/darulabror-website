# Darul Abror Website

Public website for Pondok Pesantren Darul Abror (www.darulabror.com). Built with HTML, CSS, Vanilla JavaScript, and Bootstrap 5.

## Overview

This is the frontend public website for Darul Abror Islamic Boarding School. The website provides information about the institution, educational programs, and allows prospective students to register online through the PPDB (Penerimaan Peserta Didik Baru) form.

## Features

- **Homepage**: Introduction, featured programs, latest articles, and quick navigation
- **Profile**: About the institution, vision & mission, history, leadership, facilities, and location
- **Education**: Information about Salaf/Diniyah, Tahfidz, formal SMP & MA programs, curriculum, schedules, and student conduct
- **PPDB**: Registration information, process flow, FAQ, and online registration form
- **Articles**: News and articles from the institution
- **Gallery**: Photo gallery (auto-generated from article images)
- **Contact**: Contact form and institution contact information

## Technology Stack

- HTML5
- CSS3 (with custom styles and Bootstrap 5.3.3)
- Vanilla JavaScript (ES6+)
- Bootstrap 5.3.3
- Bootstrap Icons 1.11.3

## Design Features

- Glassmorphism navbar with blur effects
- Responsive design (mobile-first approach)
- Interactive hover effects on cards, buttons, and images
- Smooth transitions and animations
- Modern color scheme (Emerald green #0F766E, Accent green #10B981)

## API Integration

The website integrates with the Darul Abror backend API:

**Base URL**: `https://darulabror-717070183986.asia-southeast2.run.app`

### Public Endpoints

- `GET /articles` - Fetch published articles (with pagination)
- `GET /articles/:id` - Get article detail
- `POST /registrations` - Submit PPDB registration
- `POST /contacts` - Submit contact form

### Error Handling

The website provides user-friendly error messages for common validation errors:
- NISN must be exactly 10 digits
- Email format validation
- Phone number format validation
- Date format validation
- Duplicate email/NISN detection

## Project Structure

```
darulabror-website/
├── assets/
│   ├── css/
│   │   └── main.css           # Main stylesheet
│   ├── img/                   # Images and photos
│   └── js/
│       ├── articles.js        # Article list page
│       ├── article-detail.js  # Article detail page
│       ├── contact.js         # Contact form handler
│       ├── gallery.js         # Gallery page
│       ├── home-latest-articles.js  # Homepage articles
│       └── ppdb-form.js       # PPDB registration form
├── index.html                 # Homepage
├── profil.html               # Profile page
├── pendidikan.html           # Education page
├── ppdb.html                 # PPDB info page
├── ppdb-form.html            # PPDB registration form
├── artikel.html              # Articles list page
├── article.html              # Article detail page
├── galeri.html               # Gallery page
├── kontak.html               # Contact page
├── 404.html                  # Error page
├── firebase.json             # Firebase hosting config
├── .firebaserc               # Firebase project config
└── README.md                 # This file
```

## Local Development

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for testing)

### Running Locally

1. Clone the repository:
```bash
git clone <repository-url>
cd darulabror-website
```

2. Serve the files using any local web server:

**Using Python:**
```bash
python3 -m http.server 5000
```

**Using Node.js (http-server):**
```bash
npx http-server -p 5000
```

**Using PHP:**
```bash
php -S localhost:5000
```

3. Open browser and navigate to `http://localhost:5000`

## Deployment

The website is deployed on Firebase Hosting.

### Deploy to Firebase

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Deploy:
```bash
firebase deploy
```

## Configuration

### API Base URL

The API base URL is configured in each JavaScript file:
```javascript
const API_BASE = window.DA_API_BASE || "https://darulabror-717070183986.asia-southeast2.run.app";
```

To override for local development, set `window.DA_API_BASE` before loading scripts.

## Form Validation

### PPDB Registration Form

- **NISN**: Must be exactly 10 digits
- **Email**: Must be valid format and unique
- **Phone**: Indonesian format (08xxxxxxxxxx)
- **Date of Birth**: YYYY-MM-DD format
- All fields marked with (*) are required

### Contact Form

- **Email**: Must be valid format
- **Subject**: Required
- **Message**: Required

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License. See LICENSE file for details.

## Author

Aisiya Qutwatunnada
