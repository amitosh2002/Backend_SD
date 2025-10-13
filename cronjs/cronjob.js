// import cron from "node-cron";
// import https from "https"; // or 'http' if your API is not using SSL

// // URL of your backend endpoint

// // Function to hit the backend using https]
// const BACKEND_URL = "https://backend-sd-c6i1.onrender.com/server"; // Replace with your actual backend URL
// function hitBackend() {
//   https
//     .get(BACKEND_URL, (res) => {
//       console.log(`✅ Backend responded with status: ${res.statusCode}`);
//     })
//     .on("error", (err) => {
//       console.error("❌ Error hitting backend:", err.message);
//     });
// }

// // Schedule the job to run every 15 minutes
// cron.schedule("*/15 * * * *", () => {
//   console.log("🔄 Running cron job to hit backend...");
//   hitBackend();
// });

import cron from "node-cron";
import https from "https"; // use 'http' if your backend isn't using SSL

// 🔗 Replace with your actual backend endpoint
const BACKEND_URL = "https://backend-sd-c6i1.onrender.com/server";

// 🧠 Helper to get formatted timestamp
function getTimestamp() {
  const now = new Date();
  return now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); // 🇮🇳 Adjust if needed
}

// 🧩 Function to call your backend
function hitBackend() {
  https
    .get(BACKEND_URL, (res) => {
      console.log(
        `[${getTimestamp()}] ✅ Cron hit backend successfully (Status: ${res.statusCode})`
      );
    })
    .on("error", (err) => {
      console.error(
        `[${getTimestamp()}] ❌ Error hitting backend: ${err.message}`
      );
    });
}

// ⏰ Schedule the job to run every 15 minutes
cron.schedule("*/15 * * * *", () => {
  console.log(`[${getTimestamp()}] 🔄 Running cron job to hit backend...`);
  hitBackend();
});
