// Backend disabled for static site deployment.
export default function handler(req, res) {
  res.status(200).json({ message: "Static deployment only." });
}