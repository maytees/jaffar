import { colors } from "./depts.ts";

export interface TTL {
  name: string;
  seconds: string;
}

export const TTLOptions: TTL[] = [
  {
    name: "5 Minutes (300)",
    seconds: "300",
  },
  {
    name: "15 Minutes (900)",
    seconds: "900",
  },
  {
    name: "30 Minutes (1800)",
    seconds: "1800",
  },
  {
    name: "1 Hour (3600)",
    seconds: "3600",
  },
  {
    name: "2 Hours (7200)",
    seconds: "7200",
  },
  {
    name: "4 Hours (14400)",
    seconds: "14400",
  },
  {
    name: "8 Hours (28800)",
    seconds: "28800",
  },
  {
    name: "12 Hours (43200)",
    seconds: "43200",
  },
  {
    name: "24 Hours (86400)",
    seconds: "86400",
  },
  {
    name: "48 Hours (172800)",
    seconds: "172800",
  },
];

export function progressLog(msg: string) {
  console.log(colors.bold.italic.brightMagenta(msg + "  ✅"));
}

export function logCheck(msg: string) {
  console.log(colors.bold.italic.cyan(msg + "  ✅"));
}

export function screenshotAlert(msg: string) {
  console.log(colors.bold.italic.yellow(msg + " ✅"));
}

export function deleteScreenshots() {
  const deleteCommand = Deno.run({
    cmd: [
      "rm",
      "-rf",
      "screenshots/*",
    ],
  });

  deleteCommand.status();
  deleteCommand.close();
}

export interface Domain {
  domain: string;
  id: string;
}

export interface OverrideValues {
  v4: string;
  v6: string;
}

export interface Settings {
  he_username: string;
  he_password: string;
  opnsense_username: string;
  opnsense_password: string;
  opnsense_url: string;
  override_values: OverrideValues;
  domains: Domain[];
  alwaysHourTTL: boolean;
}

export function getSettings(): Settings {
  return JSON.parse(Deno.readTextFileSync("./settings.json"));
}