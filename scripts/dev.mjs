import { spawn } from "node:child_process";

const rawArgs = process.argv.slice(2);
const cleanedArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === "--host") {
    cleanedArgs.push("-H", rawArgs[i + 1] || "0.0.0.0");
    i++;
  } else if (arg.startsWith("--host=")) {
    cleanedArgs.push("-H", arg.split("=")[1]);
  } else {
    cleanedArgs.push(arg);
  }
}

if (!cleanedArgs.includes("-p") && !cleanedArgs.includes("--port")) {
  cleanedArgs.push("-p", "3000");
}
if (!cleanedArgs.includes("-H") && !cleanedArgs.includes("--hostname")) {
  cleanedArgs.push("-H", "0.0.0.0");
}

const child = spawn("next", ["dev", ...cleanedArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
