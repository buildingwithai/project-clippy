// Simple Vercel test function to debug deployment
export default function handler(req, res) {
  console.log('Hello function called:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  res.status(200).json({
    message: 'Hello from Vercel!',
    timestamp: new Date().toISOString(),
    method: req.method,
    success: true
  });
}