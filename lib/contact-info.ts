/**
 * Single source of truth for HealthMitraUS contact information.
 * Import from here — never hardcode contact info in individual files.
 */

export const CONTACT = {
    phone: '9818823106',
    phoneDisplay: '+91 9818823106',
    phoneTel: 'tel:+919818823106',
    phoneWhatsApp: 'https://wa.me/919818823106',

    email: 'service@healthmitraus.com',
    emailMailto: 'mailto:service@healthmitraus.com',

    companyName: 'HealthMitra Systems Pvt Ltd',
    website: 'https://www.healthmitraus.com',

    offices: {
        usa: {
            label: '🇺🇸 USA Office',
            address: '1550 Sheridan Drive, Buffalo, NY 14217, United States',
            addressShort: '1550 Sheridan Drive, Buffalo, NY 14217',
        },
        india: {
            label: '🇮🇳 India Office',
            name: 'HealthMitra Systems Pvt Ltd',
            address: 'C/O JSS Academy of Technical Education, C-20/1, Sector 62, Noida, Uttar Pradesh 201309',
            addressFull: 'HealthMitra Systems Pvt Ltd, C/O JSS Academy of Technical Education, C-20/1, Sector 62, Noida, Uttar Pradesh 201309',
        },
    },

    hours: {
        weekdays: 'Monday – Saturday: 9 AM – 8 PM',
        sunday: 'Sunday: 10 AM – 6 PM',
        emergency: '24/7 Emergency Helpline',
    },
} as const;
