const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  url: "https://massdcrcamping.reserveamerica.com/camping/scusset-beach-state-reservation/r/campgroundDetails.do?contractCode=MA&parkId=32620",
  arrivalDate: "07/29/2026",
  lengthOfStay: "6",
  siteType: "RV/TRAILER ELECTRIC",
  emailTo: "dkoolj5@gmail.com",
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

async function sendEmail(subject, body) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing env vars: GMAIL_USER, GMAIL_APP_PASSWORD");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: CONFIG.emailTo,
    subject,
    text: body,
  });

  console.log(`Email sent to ${CONFIG.emailTo}`);
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

    await page.waitForSelector("#campingDate");
    await page.click("#campingDate", { clickCount: 3 });
    await page.type("#campingDate", CONFIG.arrivalDate);

    await page.click("#lengthOfStay", { clickCount: 3 });
    await page.type("#lengthOfStay", CONFIG.lengthOfStay);

    console.log("Submitting search...");
    await page.click("#search_avail");

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

    await new Promise((r) => setTimeout(r, 2000));

    const result = await page.evaluate((targetType) => {
      const bodyText = document.body.innerText;

      const countMatch = bodyText.match(
        /(\d+)\s*site\(s\)\s*available\s*out\s*of\s*(\d+)/
      );
      const availableCount = countMatch ? parseInt(countMatch[1], 10) : 0;
      const totalCount = countMatch ? parseInt(countMatch[2], 10) : 0;

      const typeRegex = new RegExp(
        targetType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\((\\d+)\\)"
      );
      const typeMatch = bodyText.match(typeRegex);
      const typeCount = typeMatch ? parseInt(typeMatch[1], 10) : 0;

      const noAvailability = bodyText.includes(
        "No suitable availability shown"
      );

      return { availableCount, totalCount, typeCount, noAvailability };
    }, CONFIG.siteType);

    console.log("Results:", JSON.stringify(result, null, 2));
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
      const subject = "CAMPSITE AVAILABLE - Scusset Beach";
      const body = [
        `${result.typeCount} ${CONFIG.siteType} site(s) are available at Scusset Beach!`,
        ``,
        `Date: Jul 29, 2026`,
        `Length of stay: ${CONFIG.lengthOfStay} nights`,
        ``,
        `Book now:`,
        CONFIG.url,
      ].join("\n");

      console.log("AVAILABILITY FOUND! Sending email...");
      await sendEmail(subject, body);
      recordNotification();
      console.log("Email sent. Cooldown started (1 hour).");
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
