const methods = [
    { name: 'sample.echo', params: [{name:'message', type:'string'}], returns: ['message'], description: 'Echo message', ai: true },
    { name: 'sample.ping', params: [], returns: ['status'], description: 'Returns pong', ai: true },
    { name: 'sample.entities', params: [], description: 'Get entity definitions', returns: ['entities'], ai: false }
];

module.exports = methods;
