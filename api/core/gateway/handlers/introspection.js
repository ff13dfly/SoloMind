/**
 * Gateway Introspection Methods
 * Describes all available RPC methods for Router discovery
 */
module.exports = [
    {
        name: 'gateway.ping',
        params: [],
        description: 'Health check',
        ai: false
    },
    {
        name: 'gateway.echo',
        params: ['data'],
        description: 'Echo input data',
        ai: false
    },
    {
        name: 'gateway.email.send',
        params: ['to', 'subject', 'content'],
        description: 'Send email via external provider',
        ai: true
    },
    {
        name: 'gateway.sms.send',
        params: ['phone', 'code', 'content'],
        description: 'Send SMS via external provider',
        ai: true
    }
];
