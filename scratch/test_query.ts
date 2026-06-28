import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, full_name, email, phone, created_at, status, role,
            ecard_members (
                plan_id,
                member_id_code,
                card_unique_id,
                valid_from,
                valid_till,
                status,
                plans (name)
            )
        `)
        .in('role', ['user', 'customer'])
        .limit(2);

    console.log(JSON.stringify(data, null, 2));
    console.log("Error:", error);
}
test();
