define(['wq/app', 'wq/photos', 'wq/template', './play', './edit', './config'],
function(app, photos, tmpl, play, edit, config) {

config.jqmInit = true;
app.use(photos);
app.use(play);
app.use(edit);
app.init(config)
   .then(app.prefetchAll)
   .then(app.models.theme.load)
   .then(function(themes) {
       tmpl.setDefault('themes', themes.list);
   })
   .then(app.models.pointtype.load)
   .then(function(pointtypes) {
       tmpl.setDefault('pointtypes', pointtypes.list);
   });

});
