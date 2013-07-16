function new_group() {
	new_group = function() { };
	//
	var btn = document.getElementById('create_group_button');
	btn.className += ' loading';
	//
	var loader_idle =  document.getElementById('loader_anim_idle');
	var loader_hover = document.getElementById('loader_anim_hover');
	var sz = 32, f_ms = 35, f_c = 75, f_i = 0;
	setInterval( function() {
		if( f_i >= f_c )
			f_i = 0;
		loader_idle.style.backgroundPosition  = '-'+(f_i*sz)+'px 0';
		loader_hover.style.backgroundPosition = '-'+(f_i*sz)+'px -32px';
		++f_i;
	}, f_ms );
	//
	var d = 750 + Math.random()*1250;
	setTimeout( function() {
		var form = document.createElement('form');
		form.method = 'post';
		form.action = '/new';
		form.style.display = 'none'
		document.body.appendChild( form );
		form.submit();
	}, d );
}
