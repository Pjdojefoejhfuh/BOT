module.exports = {
  apps: [
    {
      name: "siteobfusque-site",
      script: "src/server.js",
      cwd: "C:/Users/Utilisateur/Desktop/siteobfusque",
      interpreter: "node",
      watch: false,
      autorestart: true,
    },
    {
      name: "siteobfusque-bot",
      script: "bot.js",
      cwd: "C:/Users/Utilisateur/Desktop/siteobfusque/bot",
      interpreter: "node",
      watch: false,
      autorestart: true,
    }
  ]
};
