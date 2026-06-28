import { getUsers } from "../app/actions/users";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
    const res = await getUsers({ type: 'Customer' });
    console.log(JSON.stringify(res, null, 2));
}

test();
