function t() {
	var output = {};
	output.start_ts = new Date().getTime();
	var request = $.ajax({
		url: 'http://lunchvote.net/health',
		dataType: 'json',
		success: function( health ) {
			output.end_ts = new Date().getTime();
			output.server_ts = health.time;
			output.round_trip = output.end_ts - output.start_ts;
			output.one_way_trip = output.round_trip / 2;
			output.client_offset_apparent = output.start_ts - output.server_ts;
			output.client_offset_actual = output.start_ts - (output.server_ts - output.one_way_trip);
			console.log( output );
		}
	});
}
