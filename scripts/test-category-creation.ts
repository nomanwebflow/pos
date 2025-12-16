
import { categoryQueries } from '../lib/db-queries'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseKey!)

async function testCategoryCreation() {
    try {
        console.log("Fetching a valid Business ID...")
        const { data: business } = await supabase.from('Business').select('id').limit(1).single()

        if (!business) {
            console.error("No business found to test with.")
            return
        }

        console.log("Using Business ID:", business.id)

        console.log("Testing Category Creation...")
        // Using a dummy business ID (assuming it is valid GUID or string)
        // If RLS checks 'businessId' relation to User, this might fail if checks exist.
        // But Admin Client should bypass.
        const id = await categoryQueries.createCategory({
            name: "Test Cat " + Date.now(),
            description: "Test Desc",
            businessId: business.id,
            isActive: 1
        })
        console.log("Category created successfully with ID:", id)
    } catch (error: any) {
        console.error("Creation failed:", error.message)
    }
}

testCategoryCreation()
