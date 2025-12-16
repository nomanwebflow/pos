
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}


const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
    console.log("Checking 'ProductCategory' table...")
    const { error: err1 } = await supabase.from('ProductCategory').select('id').limit(1)
    if (!err1) {
        console.log("✅ Table 'ProductCategory' exists.")
    } else {
        console.log("❌ Table 'ProductCategory' error: " + err1.message)
    }

    console.log("Checking 'Category' table...")
    const { error: err2 } = await supabase.from('Category').select('id').limit(1)
    if (!err2) {
        console.log("✅ Table 'Category' exists.")
    } else {
        console.log("❌ Table 'Category' error: " + err2.message)
    }
}

checkTables()
