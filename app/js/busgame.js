requirejs.config({
    'baseUrl': '/js/lib',
    'paths': {
        'busgame': '../busgame',
        'data': '../data/'
    }
});

requirejs(['busgame/main']);
