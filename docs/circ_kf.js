var r = 24; // radius of circular path, in pixels
var g = 0.2; // circumferential line segment resolution, in segments per pixel
//
var pi2 = 2*Math.PI;
var b = 100000;
var c = Math.ceil( pi2 * r ) * g;
var f_len = 100.0 / c;
for( var f = 0; f <= c; ++f ) {
	var pct = Math.round( f * f_len * b ) / b;
	var x = Math.round( r * Math.cos( pi2 * ( pct / 100 )) * b ) / b;
	var y = Math.round( r * Math.sin( pi2 * ( pct / 100 )) * b ) / b;
	console.log( pct+'%{top:'+y+'px;left:'+x+'px}' );
}
