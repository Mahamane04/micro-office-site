// Netlify Scheduled Function for periodic TTL revalidation
// Runs every 5 minutes to refresh ISR cache

// Export config for scheduled function
export const config = {
  schedule: '*/5 * * * *', // Every 5 minutes
};

export default async (req: Request) => {
  try {
    console.log('TTL revalidation scheduled task triggered');

    // Get the revalidation function URL
    // In Netlify, we can call our own function
    const revalidateFunctionUrl = `${process.env.DEPLOY_URL || 'http://localhost:8888'}/.netlify/functions/revalidate`;

    // Call the revalidation function with TTL trigger
    const response = await fetch(revalidateFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.NETLIFY_ISR_SECRET || 'dev-secret',
      },
      body: JSON.stringify({
        table: 'TTL',
        action: 'periodic',
        timestamp: new Date().toISOString(),
      }),
    });

    const result = await response.json();

    console.log('TTL revalidation completed:', result);

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'TTL revalidation completed',
        details: result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Scheduled revalidation error:', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
