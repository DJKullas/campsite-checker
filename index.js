const puppeteer = require("puppeteer");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  url: "https://massdcrcamping.reserveamerica.com/camping/scusset-beach-state-reservation/r/campgroundDetails.do?contractCode=MA&parkId=32620",
  arrivalDate: "07/29/2026",
  lengthOfStay: "6",
  siteType: "RV/TRAILER ELECTRIC",
  phoneNumber: "+17742265876",
  cooldownMs: 60 * 60 * 1000, // 1 hour
};

const COOLDOWN_FILE = path.join(__dirname, ".last_notified");

function shouldNotify() {
  if (!fs.existsSync(COOLDOWN_FILE)) return true;
  try {
    const lastNotified = parseInt(fs.readFileSync(COOLDOWN_FILE, "utf8"), 10);
    return Date.now() - lastNotified >= CONFIG.cooldownMs;
  } catch {
    return true;
  }
}

function recordNotification() {
  fs.writeFileSync(COOLDOWN_FILE, Date.now().toString());
}

async function sendSms(message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Missing Twilio env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER"
    );
  }

  const client = twilio(accountSid, authToken);
  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to: CONFIG.phoneNumber,
  });
  console.log(`SMS sent successfully (SID: ${result.sid})`);
}

async function checkAvailability() {
  console.log(`[${new Date().toISOString()}] Starting availability check...`);
  console.log(
    `Looking for: ${CONFIG.siteType} | Date: ${CONFIG.arrivalDate} | Stay: ${CONFIG.lengthOfStay} nights`
  );

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    page.setDefaultNavigationTimeout(60000);

    console.log("Navigating to campground page...");
    await page.goto(CONFIG.url, { waitUntil: "networkidle2" });

    // Fill arrival date
    await page.waitForSelector("#campingDate");
    await page.click("#campingDate", { clickCount: 3 });
    await page.type("#campingDate", CONFIG.arrivalDate);

    // Fill length of stay
    await page.click("#lengthOfStay", { clickCount: 3 });
    await page.type("#lengthOfStay", CONFIG.lengthOfStay);

    // Click Search Available
    console.log("Submitting search...");
    await page.click("#search_avail");

    // Wait for results (AJAX-based, watch for the results text to appear)
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("site(s) available out of") ||
          text.includes("No suitable availability shown")
        );
      },
      { timeout: 30000 }
    );

    // Small extra wait for DOM to settle
    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate((targetType) => {
      const bodyText = document.body.innerText;

      // Parse "X site(s) available out of Y site(s)"
      const countMatch = bodyText.match(
        /(\d+)\s*site\(s\)\s*available\s*out\s*of\s*(\d+)/
      );
      const availableCount = countMatch ? parseInt(countMatch[1], 10) : 0;
      const totalCount = countMatch ? parseInt(countMatch[2], 10) : 0;

      // Parse the specific type count, e.g. "RV/TRAILER ELECTRIC (3)"
      const typeRegex = new RegExp(
        targetType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\((\\d+)\\)"
      );
      const typeMatch = bodyText.match(typeRegex);
      const typeCount = typeMatch ? parseInt(typeMatch[1], 10) : 0;

      const noAvailability = bodyText.includes(
        "No suitable availability shown"
      );

      return {
        availableCount,
        totalCount,
        typeCount,
        noAvailability,
      };
    }, CONFIG.siteType);

    console.log("Results:", JSON.stringify(result, null, 2));

    // Save a screenshot for debugging
    const screenshotDir = path.join(__dirname, "screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);
    const screenshotPath = path.join(screenshotDir, "last_check.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved: ${screenshotPath}`);

    return result;
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!shouldNotify()) {
    const lastTime = parseInt(fs.readFileSync(COOLDOWN_FILE, "utf8"), 10);
    const minsLeft = Math.ceil(
      (CONFIG.cooldownMs - (Date.now() - lastTime)) / 60000
    );
    console.log(
      `Cooldown active (${minsLeft} min remaining). Skipping check.`
    );
    process.exit(0);
  }

  try {
    const result = await checkAvailability();

    const hasAvailability = result.typeCount > 0 || result.availableCount > 0;

    if (hasAvailability) {
      const message = [
        `CAMPSITE AVAILABLE at Scusset Beach!`,
        `${result.typeCount} ${CONFIG.siteType} site(s) open.`,
        `Date: Jul 29, 2026 | ${CONFIG.lengthOfStay} nights`,
        `Book now: ${CONFIG.url}`,
      ].join("\n");

      console.log("AVAILABILITY FOUND! Sending text...");
      await sendSms(message);
      recordNotification();
      console.log("Text sent. Cooldown started (1 hour).");
    } else {
      console.log(
        `No ${CONFIG.siteType} sites available. Will check again next run.`
      );
    }
  } catch (error) {
    console.error("Check failed:", error.message);
    process.exit(1);
  }
}

main();
