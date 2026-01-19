const chalk = require('chalk');

/**
 * Create Gateway Logic Methods
 * @param {object} redisClient - Redis client instance
 * @param {object} options - Configuration options
 */
function createLogic(redisClient, options = {}) {
    const { serviceName = 'gateway' } = options;

    return {
        gateway: {
            ping: async () => {
                return { status: 'ok', service: serviceName };
            },

            echo: async (params) => {
                return { echo: params };
            }
        },

        email: {
            send: async (params) => {
                const { to, subject, content } = params;
                if (!to || !subject || !content) {
                    throw new Error('Missing required fields: to, subject, content');
                }

                // TODO: Implement real email provider (SendGrid, SES, etc.)
                const messageId = require('crypto').randomUUID();
                console.log(chalk.green(`[${serviceName}] Sending Email to ${to}`));
                console.log(chalk.gray(`Subject: ${subject}`));

                return { success: true, messageId, provider: 'mock' };
            }
        },

        sms: {
            send: async (params) => {
                const { phone, code, content } = params;
                const recipient = phone;
                const message = content || `Your verification code is: ${code}`;

                if (!recipient) {
                    throw new Error('Missing required field: phone');
                }

                // TODO: Implement real SMS provider (Aliyun SMS, Twilio, etc.)
                const messageId = require('crypto').randomUUID();
                console.log(chalk.blue(`[${serviceName}] Sending SMS to ${recipient}`));
                console.log(chalk.gray(`Content: ${message}`));

                return { success: true, messageId, provider: 'mock' };
            }
        }
    };
}

module.exports = createLogic;
