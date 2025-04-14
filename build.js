require('fs').mkdirSync('api',{recursive:true});
require('fs').mkdirSync('client/dash',{recursive:true});
require('fs').writeFileSync('api/index.js','module.exports=(req,res)=>res.json({ok:1})');
require('fs').writeFileSync('client/dash/index.html','<h1>WeWe RSS</h1>'); 