import { colors, config, Confirm, delay, Input, Select } from "./depts.ts";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import {
  deleteScreenshots,
  Domain,
  getSettings,
  logCheck,
  screenshotAlert,
  TTL,
  TTLOptions,
} from "./helpers.ts";

config();

await main();

async function main() {
  deleteScreenshots();

  const { he_password, he_username, domains, alwaysHourTTL } = getSettings();

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

  let timeTo: TTL | undefined = {
    name: "1 Hour (3600)",
    seconds: "3600",
  };

  if (!alwaysHourTTL) {
    const selectedTTL: string = await Select.prompt({
      message: "What would you like the TLL to be?",
      options: TTLOptions.map((ttl: TTL) => {
        return ttl.name;
      }),
    });

    timeTo = TTLOptions.find((ttl: TTL) => {
      ttl.name === selectedTTL;
    });
  }

  const port: string = await Input.prompt({
    message: "What is the port number?",
    hint: "Example: 6183",
  });

  const authcode: string = await Input.prompt({
    message: "What is the auth code for HE DNS",
  });

  console.log(
    colors.bold.magenta(
      `Full domain: ${host}.${domain?.domain}, DomainId: ${domain?.id}, TTL: ${timeTo?.name}, Port: ${port}, Authcode: ${authcode}`,
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

  createHeCname(host, domain, timeTo, authcode, he_username, he_password);
}

async function createHeCname(
  host: string,
  domain: Domain | undefined,
  ttl: TTL | undefined,
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

  await page.goto(
    `https://dns.he.net/?hosted_dns_zoneid=${domain?.id}&menu=edit_zone&hosted_dns_editzone`,
  );
  logCheck("Went to zone: " + domain?.domain);

  await delay(2000);

  await page.screenshot({ path: "./screenshots/4.png" });
  screenshotAlert("Zone page screenshot taken as 4.png");

  const [newCname] = await page.$x("//a[contains(., 'New CNAME')]");
  await newCname.click();
  logCheck("Clicked new CNAME");

  await delay(1000);

  await page.screenshot({ path: "./screenshots/5.png" });
  screenshotAlert("New CNAME screenshot taken into 5.png");

  // Put host into name field
  await page.waitForSelector("input[id=_name]");
  await page.$eval(
    "input[id=_name]",
    (el, h: string) => el.value = h,
    host,
  );
  logCheck("Put host into name field");

  // @ into hostname, meaning keep it as its current domain
  await page.waitForSelector("input[id=_content]");
  await page.$eval("input[id=_content]", (el) => el.value = "@");
  logCheck("Put @ into hostname field");

  // Select TTL
  await page.select("#_ttl", ttl!.seconds);
  logCheck("Chose " + ttl?.name + " tll");

  await page.screenshot({ path: "./screenshots/6.png" });
  screenshotAlert("CNAME creation screenshot taken as 6.png");

  await page.click("#_hds");
  await delay(1000);
  logCheck("Created CNAME!")

  await page.screenshot({path: "./screenshots/7.png"});
  screenshotAlert("Post creation of cname taken as 7.png");

  await browser.close();
}
