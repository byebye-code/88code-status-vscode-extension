import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

function getCodexConfigPath(): string {
  return path.join(os.homedir(), ".codex", "auth.json");
}

function getClaudeConfigPath(): string {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function is88Key(key: any): boolean {
  return typeof key === "string" && key.startsWith("88_");
}

async function getKeyFromConfigFiles(): Promise<string | null> {
  // Codex
  try {
    const codexConfigPath = getCodexConfigPath();
    const codexConfig = JSON.parse(await fs.readFile(codexConfigPath, "utf8"));
    const key = codexConfig["OPENAI_API_KEY"];
    if (is88Key(key)) {
      return key;
    }
  } catch (e) {
    console.info("Failed to read API key from codex config file:", e);
  }

  // Claude
  try {
    const claudeConfigPath = getClaudeConfigPath();
    const claudeSettings = JSON.parse(await fs.readFile(claudeConfigPath, "utf8"));
    const key = claudeSettings["env"]["ANTHROPIC_AUTH_TOKEN"];
    if (is88Key(key)) {
      return key;
    }
  } catch (e) {
    console.info("Failed to read API key from claude settings file:", e);
  }

  return null;
}

function getFromEnv(): string | null {
  // key88 ANTHROPIC_AUTH_TOKEN OPENAI_API_KEY
  const key = process.env.key88 || process.env.ANTHROPIC_AUTH_TOKEN || process.env.OPENAI_API_KEY;
  if (is88Key(key)) {
    return key || null;
  }
  return null;
}

export async function readApiKey(): Promise<string | null> {
  try {
    // 首先尝试从配置文件读取
    let key = await getKeyFromConfigFiles();
    if (key) {
      return key;
    }
    // 再尝试从环境变量读取
    key = getFromEnv();
    if (key) {
      return key;
    }
    return null;
  } catch (e) {
    console.error("Failed to read API key with unexpected error: ", e);
    return null;
  }
}
