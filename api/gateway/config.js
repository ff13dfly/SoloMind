module.exports = {
    port: process.env.GATEWAY_PORT || 4020,
    debug: process.env.DEBUG === 'true' || true,
    
    // External Provider Configs (TODO: Configure for production)
    providers: {
        email: {
            type: 'mock', // Options: 'mock', 'sendgrid', 'ses'
            apiKey: process.env.EMAIL_API_KEY || ''
        },
        sms: {
            type: 'mock', // Options: 'mock', 'aliyun', 'twilio'
            apiKey: process.env.SMS_API_KEY || '',
            signName: process.env.SMS_SIGN_NAME || 'SoloMind'
        }
    },

    // Semantic description for Router discovery
    description: {
        name: 'gateway',
        desc: 'External communication gateway service for email, SMS, and third-party API integration',
        category: 'system',
        keywords: ['email', 'sms', 'notification', 'external']
    }
};
