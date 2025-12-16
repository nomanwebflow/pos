
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('Error loading .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createBucket() {
    console.log('Creating "product-images" bucket...');

    const { data, error } = await supabase
        .storage
        .createBucket('product-images', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
            fileSizeLimit: 2 * 1024 * 1024 // 2MB
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "product-images" already exists.');
            // Check if public
            const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('product-images');
            if (bucketData && !bucketData.public) {
                console.log('Updating bucket to be public...');
                await supabase.storage.updateBucket('product-images', { public: true });
            }
        } else {
            console.error('Error creating bucket:', error);
            process.exit(1);
        }
    } else {
        console.log('Bucket "product-images" created successfully.');
    }
}

createBucket();
