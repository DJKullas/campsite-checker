# Campsite Checker - Scusset Beach

Automated availability checker for **Scusset Beach State Reservation, MA**.
Runs on a cron schedule via GitHub Actions. When an RV/TRAILER ELECTRIC site becomes available for the target dates, it sends a text alert via Twilio.

## Current Configuration

| Setting         | Value                         |
|-----------------|-------------------------------|
| Campground      | Scusset Beach State Reservation |
| Arrival Date    | July 29, 2026                 |
| Length of Stay  | 6 nights                      |
| Site Type       | RV/TRAILER ELECTRIC           |
| Check Frequency | Every 15 minutes              |
| SMS Cooldown    | 1 hour after sending          |

## Setup

### 1. Twilio Account

You need a Twilio account for SMS. Sign up at [twilio.com](https://www.twilio.com/).

Once you have an account, grab:
- **Account SID** (from your Twilio dashboard)
- **Auth Token** (from your Twilio dashboard)
- **Phone Number** (a Twilio phone number you've provisioned — must be SMS-capable)

### 2. GitHub Repository Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret Name          | Value                     |
|----------------------|---------------------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID   |
| `TWILIO_AUTH_TOKEN`  | Your Twilio Auth Token    |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number (e.g. `+1XXXXXXXXXX`) |

### 3. Push and Enable

Push this repo to GitHub. The workflow will start running automatically on the cron schedule. You can also trigger it manually from the **Actions** tab.

## Running Locally

```bash
# Set env vars
export TWILIO_ACCOUNT_SID=your_sid
export TWILIO_AUTH_TOKEN=your_token
export TWILIO_FROM_NUMBER=+1XXXXXXXXXX

# Run the check
npm run check
```

## How It Works

1. Launches a headless browser using Puppeteer
2. Navigates to the Scusset Beach campground page
3. Fills in the arrival date and length of stay
4. Clicks "Search Available" and waits for results
5. Parses the availability count for RV/TRAILER ELECTRIC sites
6. If any are available, sends an SMS and enters a 1-hour cooldown
7. Screenshots are saved as GitHub Actions artifacts for debugging

## Changing Configuration

Edit the `CONFIG` object at the top of `index.js` to change dates, site type, phone number, or cooldown duration.
