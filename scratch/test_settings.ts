import * as dotenv from 'dotenv';
import { updateSystemSettings, getSystemSettings } from '../app/actions/settings';

dotenv.config();

async function test() {
    console.log("Initial fetch:");
    const initial = await getSystemSettings();
    console.log(initial.data?.site_name);

    console.log("\nSetting to custom value 'My Custom Site'...");
    await updateSystemSettings({ site_name: 'My Custom Site' });
    const modified = await getSystemSettings();
    console.log(modified.data?.site_name);

    console.log("\nSetting to empty string...");
    await updateSystemSettings({ site_name: '' });
    const empty = await getSystemSettings();
    console.log(empty.data?.site_name);
}

test();
