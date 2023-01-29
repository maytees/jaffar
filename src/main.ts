import { colors, config, Confirm, delay, Input, Select } from "./depts.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import {
  deleteScreenshots,
  Domain,
  getSettings,
  logCheck,
  screenshotAlert,
} from "./helpers.ts";

config();

await main();

async function main() {
  deleteScreenshots();

  const { he_password, he_username, domains } = getSettings();

  // Ask for info about CNAME and auth code
  const host: string = await Input.prompt({
    message: "What is the hostname? (this will be added to the domain)",
    hint: "Example: examplehost",
  });

  const selectedDomain: string = await Select.prompt({
    message: "Select the domain you'd like to use",
    options: domains.map((d: Domain): string => {
      return d.domain;
    }),
  });

  const domain: Domain | undefined = domains.find((d) =>
    d.domain === selectedDomain
  );

  const port: string = await Input.prompt({
    message: "What is the port number?",
    hint: "Example: 6183",
  });

  const authcode: string = await Input.prompt({
    message: "What is the auth code for HE DNS",
  });

  console.log(
    colors.bold.cyan(
      `Full domain: ${host}.${domain?.domain}, DomainId: ${domain?.id} Port: ${port}, Authcode: ${authcode}`,
    ),
  );

  if (!await Confirm.prompt("Is the info above correct?")) {
    console.log(colors.red.bold("Ok, we'll go back."));
    await main();
    return;
  }

  console.log(
    colors.bold.green(
      "Screenshots will be in consecutive order in screenshots/\n\n",
    ),
  );

  createHeCname(host, authcode, he_username, he_password);
}

async function createHeCname(
  host: string,
  authcode: string,
  username: string,
  password: string,
) {
  const browser = await puppeteer.launch({
    product: "chrome",
    args: [`--window-size=1920,1080`],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  logCheck("Opened browser");

  const page = await browser.newPage();
  logCheck("Opened new page");

  await page.goto("https://dns.he.net");
  logCheck("Went to dns.he.net");

  await page.waitForSelector("input[name=email]");
  await page.$eval(
    "input[name=email]",
    (el, user: string) => el.value = user,
    username,
  );
  logCheck("Put username into username field");

  await page.waitForSelector("input[name=pass]");
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

  await delay(2000);

  await page.screenshot({ path: "./screenshots/3.png" });
  screenshotAlert("Post-login page screenshot taken as 3.png");

  await browser.close();
}
