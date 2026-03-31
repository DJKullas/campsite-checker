# Campsite Checker - Scusset Beach

Automated availability checker for **Scusset Beach State Reservation, MA**.
Runs every minute via GitHub Actions. When an RV/TRAILER ELECTRIC site becomes available, it emails an alert via Resend.

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

### 1. Get a Resend API Key

1. Go to [resend.com](https://resend.com/) and click **Sign in with GitHub**
2. Go to [resend.com/api-keys](https://resend.com/api-keys)
3. Click **Create API Key**, copy it

### 2. Add GitHub Secret

Go to repo **Settings → Secrets and variables → Actions** and add:

| Secret Name      | Value              |
|------------------|--------------------|
| `RESEND_API_KEY` | Your Resend API key |

That's it. The workflow starts running automatically.

## Running Locally

```bash
export RESEND_API_KEY=re_xxxxxxxxx
npm run check
```

## Changing Configuration

Edit the `CONFIG` object at the top of `index.js`.
