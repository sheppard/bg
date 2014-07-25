requirejs.config({
    'baseUrl': '/js/lib',
    'paths': {
        'busgame': '../busgame',
        'db': '../../'
    }
});

requirejs(['busgame/main']);
