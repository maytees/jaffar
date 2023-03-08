import { colors, config, Confirm, delay, Input, Select } from "./depts.ts";
import puppeteer, { Page } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import {
  deleteScreenshots,
  Domain,
  getSettings,
  logCheck,
  OverrideValues,
  progressLog,
  screenshotAlert,
  TTL,
  TTLOptions,
} from "./helpers.ts";

config();

await main();

async function main() {
  deleteScreenshots();

  const {
    he_password,
    he_username,
    domains,
    alwaysHourTTL,
    opnsense_password,
    opnsense_username,
    opnsense_url,
    override_values,
    containerIp,
    containerPort,
    containerUsername,
  } = getSettings();

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

  const upstream_app: string = await Input.prompt({
    message: "What is the upstream app ip?",
    hint: "Example: 192.168.10.150",
  });

  const authcode: string = await Input.prompt({
    message: "What is the auth code for HE DNS",
  });

  console.log(
    colors.bold.magenta(
      `Full domain: ${host}.${domain?.domain}, DomainId: ${domain?.id}, TTL: ${timeTo?.name}, Port: ${port}, Upstream app: ${upstream_app}, Authcode: ${authcode}`,
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

  const browser = await puppeteer.launch({
    product: "chrome",
  });
  logCheck("Opened browser");

  const page: Page = await browser.newPage();
  logCheck("Opened new page");

  createHeCname(page, host, domain, timeTo, authcode, he_username, he_password);
  progressLog("Finished Hurricane DNS - 1/3");

  await opnsenseHostAlias(
    page,
    opnsense_url,
    opnsense_username,
    opnsense_password,
    domain!.domain,
    host,
    override_values,
  );
  progressLog("Finished OPNSense host alias creation - 2/3");

  await nginx_conf(
    host,
    domain!,
    port,
    upstream_app,
  );

  await browser.close();
}

async function nginx_conf(
  host: string,
  domain: Domain,
  port: string,
  upstream_app: string,
) {
  const file_content =
    `server {\tlisten 443 ssl;\n\tlisten [::]:443 ssl;\n\t#change server name\n\tserver_name ${host}.${domain.domain};\n\n\tinclude /config/nginx/ssl.conf;\n\n\tclient_max_body_size 0;\n\n\tlocation / {\n\t\t# update server info\n\t\tinclude /config/nginx/proxy.conf;\n\t\tresolver 127.00.11 valid=30s;\n\t\tset $upstream_app ${upstream_app};\n\t\tset $upstream_proto ${port};\n\t\tset $upstream_proto http;\n\t\tproxy_pass $upstream_proto://$upstream_app:$upstream_port;\n\n\t}\n}`;

  const file = await Deno.writeTextFile(
    `output/file.txt`,
    file_content,
  );
  logCheck("Put swag config in output/file.txt take it to you destination");
}

async function opnsenseHostAlias(
  page: Page,
  url: string,
  loginUsername: string,
  loginPassword: string,
  domain: string,
  host: string,
  override_values: OverrideValues,
  description?: string,
) {
  // Log into opnsense
  await page.goto(url);
  logCheck("Went to " + url);

  await page.waitForSelector("input[id=usernamefld]");
  page.$eval("input[id=usernamefld]", (el, username: string) => {
    el.value = username;
  }, loginUsername);

  await page.waitForSelector("input[id=passwordfld]");
  page.$eval("input[id=passwordfld]", (el, password: string) => {
    el.value = password;
  }, loginPassword);
  logCheck("Put in username & password into corresponding fields");

  await page.screenshot({ path: "./screenshots/8.png" });
  screenshotAlert("Took opnsense login screenshot as 8.png");

  await page.waitForSelector("button[name=login]");
  await page.click("button[name=login]");
  logCheck("Clicked log in button");

  await delay(3000);

  await page.screenshot({ path: "./screenshots/9.png" });
  screenshotAlert("Took main opnsense screenshot as 9.png");

  await page.goto(url + "/ui/unbound/overrides/");
  logCheck("Went to overrides page");

  await delay(1000);

  await page.screenshot({ path: "./screenshots/10.png" });
  screenshotAlert("Took screenshot of overrides page as 10.png");

  // Create alias for v4
  const v4Selector = `input[type=checkbox][value=${override_values.v4}]`;
  await page.waitForSelector(v4Selector);
  await page.click(v4Selector);
  logCheck("Clicked on v4 host override checkbox");

  await page.screenshot({ path: "./screenshots/11.png" });
  screenshotAlert("Took screenshot of v4 overrides");

  await delay(1000);

  await page.waitForSelector(
    "#grid-aliases > tfoot > tr > td:nth-child(2) > button:nth-child(1)",
  );
  await page.click(
    "#grid-aliases > tfoot > tr > td:nth-child(2) > button:nth-child(1)",
  );

  await delay(1000);

  const hostnameValue = await page.$("#alias\\.hostname");
  await hostnameValue?.type(host);

  // await page.waitForSelector(hostnameSelector);
  // await page.$eval(hostnameSelector, (el, hostname: string) => {
  //   el.value = hostname;
  // }, host);

  const domainValue = await page.$("#alias\\.domain");
  await domainValue?.type(domain);

  // await page.waitForSelector(domainSelector);
  // await page.$eval(domainSelector, (el, domain: string) => {
  //   el.value = domain;
  // }, domain);
  logCheck("Put hostname value");

  await page.click("#btn_DialogHostAlias_save");
  logCheck("Saved v4 host alias");

  await page.click("#reconfigureAct > b");
  logCheck("Applied changes");

  // Create alias for v6
  const v6Selector = `input[type=checkbox][value=${override_values.v6}]`;
  await page.waitForSelector(v6Selector);
  await page.click(v6Selector);
  logCheck("Clicked on v6 host override checkbox");

  await delay(1000);

  await page.click(
    "#grid-aliases > tfoot > tr > td:nth-child(2) > button:nth-child(1)",
  );

  await delay(1000);

  const hostnameValtwo = await page.$("#alias\\.hostname");
  await hostnameValtwo?.type(host);

  // await page.waitForSelector(hostnameSelector);
  // await page.$eval(hostnameSelector, (el, hostname: string) => {
  //   el.value = hostname;
  // }, host);

  const domainValtwo = await page.$("#alias\\.domain");
  await domainValtwo?.type(domain);

  // await page.waitForSelector(domainSelector);
  // await page.$eval(domainSelector, (el, domain: string) => {
  //   el.value = domain;
  // }, domain);
  logCheck("Put hostname value");

  await page.click("#btn_DialogHostAlias_save");
  logCheck("Saved v6 host alias");

  await page.click("#reconfigureAct > b");
  logCheck("Applied changes");

  await page.screenshot({ path: "./screenshots/12.png" });
  screenshotAlert("Took screenshot of overrides as 12.png");
}

async function createHeCname(
  page: Page,
  host: string,
  domain: Domain | undefined,
  ttl: TTL | undefined,
  authcode: string,
  username: string,
  password: string,
) {
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
  logCheck("Created CNAME!");

  await page.screenshot({ path: "./screenshots/7.png" });
  screenshotAlert("Post creation of cname taken as 7.png");
}
