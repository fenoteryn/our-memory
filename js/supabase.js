import { createClient }
from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabase =
createClient(
    'https://zfigzgjbcbvtdedzkprn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaWd6Z2piY2J2dGRlZHprcHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTU3NTEsImV4cCI6MjA5NTg5MTc1MX0.30RVHu2V8OQTTWd5EBJMsyWGMYcOeGBGtiFzRjn2P98'
);