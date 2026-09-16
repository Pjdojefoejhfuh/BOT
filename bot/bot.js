require("dotenv").config();
const {
  Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder,
} = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = ".";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Custom emojis
const EMOJI = {
  yes: "<a:MCE_yes:1549726857090441296>",
  no: "<a:No:1549726859661545492>",
  loading: "<a:loading:1549726853424615424>",
};

client.once("ready", () => {
  console.log("");
  console.log("  ⚡ SiteObfusque Bot");
  console.log("  ────────────────────");
  console.log(`  🤖 Logged in: ${client.user.tag}`);
  console.log(`  🌐 Site: ${SITE_URL}`);
  console.log(`  🐙 GitHub: ${GITHUB_TOKEN ? "✅" : "❌"}`);
  console.log("");
  client.user.setActivity("⚡ .help", { type: 3 });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "obf" || command === "obfuscate") return handleObf(message);
  if (command === "upload") return handleUpload(message);
  if (command === "help" || command === "aide") return handleHelp(message);
});

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI.yes} SiteObfusque Bot — Commands`)
    .setColor(0x7c3aed)
    .addFields(
      {
        name: "`.obf`",
        value: `Obfuscate a \`.lua\` / \`.luau\` file attachment. Returns the obfuscated file.\n${EMOJI.loading} Powered by Clyde Protection VM`,
      },
      {
        name: "`.upload`",
        value: `Upload a file to GitHub Gist. Returns the raw link + ready-to-use loadstring.\n${EMOJI.yes} Auto-generates the loader`,
      },
      {
        name: "`.help`",
        value: `Show this message.\n${EMOJI.yes} You're looking at it`,
      }
    )
    .setFooter({ text: "SiteObfusque" });
  await message.reply({ embeds: [embed] });
}

async function handleObf(message) {
  const attachment = message.attachments.first();

  if (!attachment) {
    return message.reply(`${EMOJI.no} Attach a \`.lua\` / \`.luau\` file with the command.`);
  }

  const filename = attachment.name.toLowerCase();
  if (!filename.endsWith(".lua") && !filename.endsWith(".luau") && !filename.endsWith(".txt")) {
    return message.reply(`${EMOJI.no} Supported formats: \`.lua\`, \`.luau\`, \`.txt\``);
  }

  const processing = await message.reply(`${EMOJI.loading} Obfuscating...`);

  try {
    const res = await fetch(attachment.url);
    const source = await res.text();

    if (source.length > 500000) {
      return processing.edit(`${EMOJI.no} File too long (max 500 KB).`);
    }

    const apiRes = await fetch(`${SITE_URL}/api/obfuscate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        filename: attachment.name,
        options: { vm: true, strings: true, flow: true, vmLevel: "maximum" },
      }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok || data.error) {
      return processing.edit(`${EMOJI.no} Error: ${data.error || "unknown"}`);
    }

    const buffer = Buffer.from(data.output, "utf-8");
    const file = new AttachmentBuilder(buffer, { name: "obfuscated.lua" });

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.yes} Obfuscation Successful`)
      .setColor(0x22c55e)
      .addFields(
        { name: "Input", value: `${source.length} chars`, inline: true },
        { name: "Output", value: `${data.output.length} chars`, inline: true },
        { name: "Ratio", value: `${(data.output.length / source.length).toFixed(2)}x`, inline: true }
      )
      .setFooter({ text: "SiteObfusque" });

    await processing.edit({ content: "", embeds: [embed], files: [file] });
  } catch (e) {
    console.error("[.obf error]", e);
    await processing.edit(`${EMOJI.no} Error: ${e.message}`);
  }
}

async function handleUpload(message) {
  if (!GITHUB_TOKEN) {
    return message.reply(`${EMOJI.no} \`GITHUB_TOKEN\` not configured in \`.env\`.`);
  }

  const attachment = message.attachments.first();
  if (!attachment) {
    return message.reply(`${EMOJI.no} Attach a \`.lua\` file with the command.`);
  }

  const filename = attachment.name.toLowerCase();
  if (!filename.endsWith(".lua") && !filename.endsWith(".luau") && !filename.endsWith(".txt")) {
    return message.reply(`${EMOJI.no} Supported formats: \`.lua\`, \`.luau\`, \`.txt\``);
  }

  const processing = await message.reply(`${EMOJI.loading} Uploading to GitHub...`);

  try {
    const res = await fetch(attachment.url);
    const content = await res.text();

    const gistRes = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: `SiteObfusque — ${attachment.name}`,
        public: false,
        files: { [attachment.name]: { content } },
      }),
    });

    const gist = await gistRes.json();

    if (!gistRes.ok) {
      return processing.edit(`${EMOJI.no} GitHub error: ${gist.message || "unknown"}`);
    }

    const fileKey = Object.keys(gist.files)[0];
    const rawUrl = gist.files[fileKey].raw_url;
    const loadstring = `loadstring(game:HttpGet("${rawUrl}"))()`;

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.yes} Upload Successful`)
      .setColor(0x22c55e)
      .addFields(
        { name: "📄 File", value: `\`${attachment.name}\``, inline: false },
        { name: "🔗 Raw URL", value: `\`${rawUrl}\``, inline: false },
        { name: "⚡ Loadstring", value: "```lua\n" + loadstring + "\n```", inline: false }
      )
      .setFooter({ text: "SiteObfusque" });

    await processing.edit({ content: "", embeds: [embed] });
  } catch (e) {
    console.error("[.upload error]", e);
    await processing.edit(`${EMOJI.no} Error: ${e.message}`);
  }
}

client.login(process.env.DISCORD_TOKEN);
