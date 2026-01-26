// Simple status endpoint for backend
export default function handler(req, res) {
  res.status(200).json({ status: "Vekkam API Operational", version: "1.0.0" });
}