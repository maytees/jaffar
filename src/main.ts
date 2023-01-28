import { colors, config, Confirm, Input } from "./depts.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import {
  deleteScreenshots,
  getSettings,
  logCheck,
  screenshotAlert,
  Settings,
} from "./helpers.ts";

config();

await main();

async function main() {
  deleteScreenshots();

  // Ask for info about CNAME and auth code
  const host: string = await Input.prompt({
    message: "What is the hostname?",
    hint: "Example: example.domain.com",
  });

  const port: string = await Input.prompt({
    message: "What is the port number?",
    hint: "Example: 6183",
  });

  const authcode: string = await Input.prompt({
    message: "What is the auth code for HE DNS",
  });

  console.log(
    colors.bold.cyan(`Host: ${host}, port: ${port}, autcode: ${authcode}`),
  );
  if (!await Confirm.prompt("Is the info above correct?")) {
    await main();
    return;
  }

  const username: string = Deno.env.get("HE_USERNAME") || "";
  const password: string = Deno.env.get("HE_PASSWORD") || "";

  console.log(
    colors.bold.green(
      "Screenshots will be in consecutive order in screenshots/\n\n",
    ),
  );

  createHeCname(host, authcode, username, password);
}

async function createHeCname(
  host: string,
  authcode: string,
  username: string,
  password: string,
) {
  const browser = await puppeteer.launch({
    product: "chrome",
  });
  logCheck("Opened browser");

  const page = await browser.newPage();
  logCheck("Opened new page");

  await page.goto("https://dns.he.net");
  logCheck("Went to dns.he.net");

  const usernameField = await page.waitForSelector("input[name=email]");
  await page.$eval(
    "input[name=email]",
    (el, user: string) => el.value = user,
    username,
  );
  logCheck("Put username into username field");

  const passwordField = await page.waitForSelector("input[name=pass]");
  await page.$eval(
    "input[name=pass]",
    (el, pass: string) => el.value = pass,
    password,
  );
  logCheck("Put password into password field");

  await page.screenshot({ path: "./screenshots/1.png" });
  screenshotAlert("Username & password screenshot taken as 1.png");

  await page.waitForSelector("#_loginbutton");
  await page.click("#_loginbutton", { delay: 1000 });
  logCheck("Logged into HE");

  await page.waitForSelector("input[name=tfacode]");
  await page.$eval(
    "input[name=tfacode]",
    (el, code: string) => el.value = code,
    authcode,
  );
  await page.screenshot({ path: "./screenshots/2.png" });
  screenshotAlert("Auth page screenshot taken as 2.png");

  await page.waitForSelector("input[value=Submit]");
  await page.click("input[value=Submit]");
  logCheck("Put auth code into field");

  await page.screenshot({ path: "./screenshots/3.png" });
  screenshotAlert("Post-login page screenshot taken as 3.png");

  await browser.close();
}
