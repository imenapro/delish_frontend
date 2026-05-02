async function verify() {
    const url = 'https://jcdaovmwmpkflccecsrg.supabase.co/functions/v1/reset-password-flow';
    console.log('--- Verifying CORS Preflight (OPTIONS) ---');
    try {
        const response = await fetch(url, {
            method: 'OPTIONS',
            headers: {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type',
                'Origin': 'https://delish.rw'
            }
        });
        console.log('Status:', response.status);
        const headers = {};
        response.headers.forEach((v, k) => headers[k] = v);
        console.log('Headers:', JSON.stringify(headers, null, 2));
        
        if (response.status === 204 || response.status === 200) {
            console.log('\n--- Verifying Function Invocation (POST) ---');
            const postResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGFvdm13bXBrZmxjY2Vjc3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTk2MTMsImV4cCI6MjA4NTMzNTYxM30.L9qT60c7NpXqDL_LrRUxog20ISOlWizQVvV5L4zCrxo'
                },
                body: JSON.stringify({
                    step: 'request',
                    email: 'nonexistent@test.com',
                    businessId: 'fd3e0f65-cdd0-4dff-8af8-48c06810867e'
                })
            });
            console.log('POST Status:', postResponse.status);
            const data = await postResponse.json();
            console.log('POST Data:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
verify();
