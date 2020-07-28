module.exports = function(typ) {
  return function() {
    const serial = JSON.stringify({
      data:true,
      typ, 
    });
    global.broadcast({data: `_files${serial}`});
  }
}
