define(["data/config", "data/templates", "data/version"],
function(config, templates, version) {

config.router = {
    'base_url': ''
}

config.template = {
    'templates': templates,
    'defaults': {
        'version': version
    }
};

config.store = {
    'service': config.router.base_url,
    'defaults': {'format': 'json'}
}

config.outbox = {};

config.transitions = {
    'default': "slide",
    'save': "flip"
};

return config;

});
