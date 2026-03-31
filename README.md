# Campsite Checker - Scusset Beach

Automated availability checker for **Scusset Beach State Reservation, MA**.
Runs every minute via GitHub Actions. When an RV/TRAILER ELECTRIC site becomes available for the target dates, it sends an email alert.

## Current Configuration

| Setting         | Value                         |
|-----------------|-------------------------------|
| Campground      | Scusset Beach State Reservation |
| Arrival Date    | July 29, 2026                 |
| Length of Stay  | 6 nights                      |
| Site Type       | RV/TRAILER ELECTRIC           |
| Check Frequency | Every 1 minute                |
| Email Cooldown  | 1 hour after sending          |
| Alert Email     | dkoolj5@gmail.com             |

## Setup

### 1. Gmail App Password

You need a Gmail account with an **App Password** (not your regular password):

1. Go to [myaccount.google.com](https://myaccount.google.com/)
2. Security → 2-Step Verification (enable if not already)
3. Search "App passwords" or go to Security → App passwords
4. Create a new app password (select "Mail" / "Other")
5. Copy the 16-character password

### 2. GitHub Repository Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret Name          | Value                          |
|----------------------|--------------------------------|
| `GMAIL_USER`         | Your Gmail address (the sender)|
| `GMAIL_APP_PASSWORD` | The 16-char app password       |

### 3. Push and Enable

Push this repo to GitHub. The workflow runs automatically every minute. You can also trigger it manually from the **Actions** tab.

## Running Locally

```bash
export GMAIL_USER=you@gmail.com
export GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

npm run check
```

## Changing Configuration

Edit the `CONFIG` object at the top of `index.js` to change dates, site type, email address, or cooldown duration.
