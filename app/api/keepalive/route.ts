export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    }
  });

  return Response.json({
    status: response.ok ? "Pinged Supabase successfully 🚀" : "Ping failed ❌",
    time: new Date().toISOString()
  });
}
