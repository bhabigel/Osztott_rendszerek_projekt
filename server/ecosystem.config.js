module.exports = {
  apps: [
    {
      name: "betting-instance-1",
      script: "./server.js",
      exec_mode: "fork",
      env: { PORT: 3001 }
    },
    {
      name: "betting-instance-2",
      script: "./server.js",
      exec_mode: "fork",
      env: { PORT: 3002 }
    },
    {
      name: "betting-instance-3",
      script: "./server.js",
      exec_mode: "fork",
      env: { PORT: 3003 }
    }
  ]
}