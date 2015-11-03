define(['wq/app', 'wq/photos', './play', './edit', './config'],
function(app, photos, play, edit, config) {

config.jqmInit = true;
app.use(photos);
app.use(play);
app.use(edit);
app.init(config).then(app.prefetchAll);

});
