import { colors, Confirm, Input } from "./depts.ts";

await main();

async function main() {
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
}
