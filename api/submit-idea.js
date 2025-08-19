// API endpoint for submitting ideas from website
// Triggers GitHub workflow via repository_dispatch

export default async function handler(req, res) {
  console.log('Submit idea endpoint called:', {
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST'] 
    });
  }

  try {
    const { title, description, labels = [] } = req.body;

    // Basic validation
    if (!title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description']
      });
    }

    console.log('Processing idea submission:', { title, description, labels });

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN environment variable not set');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'GitHub integration not configured'
      });
    }

    // Trigger GitHub workflow via repository_dispatch
    const dispatchResponse = await fetch('https://api.github.com/repos/buildingwithai/project-clippy/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'project-clippy-website'
      },
      body: JSON.stringify({
        event_type: 'web-intake.create',
        client_payload: {
          title: `[Website] ${title}`,
          body: description,
          labels: ['intake', 'website', ...labels],
          source: 'website',
          timestamp: new Date().toISOString()
        }
      })
    });

    console.log('GitHub dispatch response:', {
      status: dispatchResponse.status,
      statusText: dispatchResponse.statusText,
      ok: dispatchResponse.ok
    });

    if (!dispatchResponse.ok) {
      const errorText = await dispatchResponse.text();
      console.error('GitHub dispatch failed:', errorText);
      
      return res.status(500).json({
        error: 'Failed to submit idea',
        details: 'GitHub integration error',
        githubStatus: dispatchResponse.status
      });
    }

    console.log('Idea submitted successfully via GitHub workflow');

    return res.status(200).json({
      success: true,
      message: 'Idea submitted successfully!',
      title,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Submit idea error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}