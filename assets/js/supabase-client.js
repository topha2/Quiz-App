// Shared Supabase Client Setup

// Hardcoded credentials for the published app
const SUPABASE_URL = "https://sfqnyefhroqaxmvobodk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcW55ZWZocm9xYXhtdm9ib2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjkxMDEsImV4cCI6MjA4NjIwNTEwMX0.SlkFzBApQldGXxBM0Bryse1fen1OOsByUWBTEj_PjOA";

let quizAppDb = null;

function initSupabase() {
    // Check if global Supabase object exists (from CDN)
    if (typeof window.supabase === 'undefined') {
        alert("System Error: Supabase Library not loaded. Check your internet connection or ad-blocker.");
        console.error("Supabase Client library not loaded!");
        return null;
    }

    try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase initialized with hardcoded credentials");
        return client;
    } catch (e) {
        alert("Connection Failed: " + e.message);
        console.error("Failed to init Supabase:", e);
        return null;
    }
}
