
export default async function handler(req, res) {
  // Only allow Vercel's Cron system to trigger this or manual dev pings
  // Vercel sends an authorization header for crons usually, but for simple uptime pings, we focus on the side effect.
  
  console.log("Triggering uptime ping for Render backend...");

  try {
    const renderUrl = "https://qwen-placeholder.onrender.com/generate";
    
    // We send a dummy POST request to keep the /generate endpoint warm
    // Render free tier spins down after 15 mins, so this cron will run every 14 mins.
    const response = await fetch(renderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }) 
    });

    const status = response.status;
    console.log(`Render backend pinged. Status: ${status}`);

    return res.status(200).json({ 
      success: true, 
      message: "Ping successful", 
      backendStatus: status 
    });
  } catch (error) {
    console.error("Failed to ping Render backend:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
