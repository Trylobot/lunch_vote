// base + utility
Object.keys = Object.keys || function(o) {
	var result = [];
	for(var name in o)
		if (o.hasOwnProperty(name))
			result.push(name);
	return result;
};
function pad( val, len )
{
	var str = String( val );
	if( len > str.length )
		str = Array( len + 1 - str.length ).join( "0" ) + str;
	return str;
}
function isNumber( n ) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
function cookie_get( name ) {
  if( !document.cookie || document.cookie == '' )
    return null;
  cookie = {};
  _.each( document.cookie.split('; '), function( item ) {
    val = item.split( '=' );
    cookie[val[0]] = val[1];
  });
  return cookie[name];
}
function cookie_set( name, value, life_days ) {
  var t = new Date();
  t.setDate( t.getDate() + life_days );
  document.cookie = name + '=' + escape(value) + (life_days ? '; expires='+t.toUTCString() : '' );
}


// knockout js
var view_model = {
	// constants
	group_id: null, // delayed initialization
	date_fmt_string: 'dddd MMMM d yyyy, h:mm:ss tt',
	foursquare_oauth_token: '0KI2ZGHKKLM2LICI2XAKN0XSCIDICP10USYPQDBAC2CVCJB5',
	tick_time: 67,
	identicon_size: 24,
	// vanilla fields
	chat_scrollbar: null,
	config_location_autocomplete: null,
	add_entity_input_autocomplete: null,
	pending_select: null,
	// vanilla methods
	clear_filter: null,
	tick: null,
	send_chat: null,
	trigger_vote: null,
	update_location: null,
	add_poll: null,
	cancel_poll: null,
	compare_entities: null,
	add_entity: null,
	remove_entity: null,
	share_email: null,
	toggle_admin: null,
	render_identicon: null,
	select_text: null,
	enhance_entity_with_external_info: null,
	find_config_entity_by_name: null,
	set_entity_detail_by_name: null,
	entity_detail_afterRender: null,
	entity_list_afterRender: null,
	chat_scrollbar_update: null,
	// observed fields
	offset: ko.observable( 0 ),
	state: ko.observable( null ),
	user_count: ko.observable( 0 ),
	chats: ko.observableArray( [] ),
	clock: ko.observable( 0 ),
	ticks: ko.observable( 0 ),
	vote: ko.observable( null ),
	current_poll_start_ts: ko.observable( null ),
	chat_input: ko.observable( '' ),
	loading: ko.observable( true ),
	show_admin: ko.observable( false ),
	add_poll_start_ts: ko.observable( 'now' ),
	add_poll_duration: ko.observable( '5' ),
	add_poll_runoff_duration: ko.observable( '2' ),
	config_location_input: ko.observable( '' ),
	config_location_has_focus: ko.observable( false ),
	config_location: ko.observable( null ),
	add_entity_input: ko.observable( '' ),
	add_entity_input_has_focus: ko.observable( false ),
	config_entities: ko.observableArray( [] ),
	filter: ko.observable( '' ),
	entity_detail: ko.observable( null ),
	// computed fields
	previous_poll: null,
	previous_poll_entities_by_vote: null,
	previous_poll_voters: null,
	current_poll: null,
	filtered_current_poll_entities: null,
	upcoming_polls: null,
	next_poll_ts: null,
	has_winner: null,
	is_tie: null,
	has_votes: null,
	previous_poll_winner: null,
	countdown_readout: null,
	tailing_chat: null,
	add_poll_start_ts_datejs: null,
	add_poll_start_ts_server: null,
	zero_entities: null,
	zero_upcoming_polls: null,
	add_poll_form_invalid: null
};
//
view_model.group_id = Object.keys($.url().param())[0];
//
view_model.clear_filter = function() {
	view_model.filter( '' );
}
view_model.tick = function() {
	view_model.ticks( view_model.ticks() + 1 );
	var ts = null;
	var current_poll = view_model.current_poll();
	if( current_poll )
		ts = current_poll.end_ts;
	else {
		var next_poll_start_ts = view_model.next_poll_ts();
		if( next_poll_start_ts )
			ts = next_poll_start_ts;
	}
	if( ts !== null )
		view_model.clock( Math.max( 0, ((ts + view_model.offset()) - (new Date()).getTime())/1000 ));
}
view_model.send_chat = function() {
	var chat_input_truncated = $.trim( view_model.chat_input().substring( 0, 256 ));
	if( chat_input_truncated.length == 0 )
		return;
	socket.emit( 'chat', chat_input_truncated );
	view_model.chat_input( '' );
}
view_model.trigger_vote = function( poll_entity ) {
	view_model.vote( poll_entity );
	view_model.set_entity_detail_by_name( poll_entity );
}
view_model.update_location = function( place ) {
	socket.emit( 'update_location', place );
}
view_model.add_poll = function() {
	if( view_model.add_poll_form_invalid() )
		return;
	socket.emit( 'add_poll', {
		start_ts: view_model.add_poll_start_ts_server(),
		duration: view_model.add_poll_duration(),
		runoff_duration: view_model.add_poll_runoff_duration()
	});
	if( view_model.add_poll_start_ts() == 'now' )
		view_model.show_admin( false );
	$('#powerTip').hide();
}
view_model.cancel_poll = function( poll_start ) {
	socket.emit( 'cancel_poll', poll_start.ts );
}
view_model.compare_entities = function( a, b ) {
	if( a.simple_name < b.simple_name )
		return -1;
	if( a.simple_name > b.simple_name )
		return 1;
	else
		return 0;
}
view_model.add_entity = function( entity ) {
	socket.emit( 'add_entity', entity );
	view_model.enhance_entity_with_external_info( entity, view_model.update_entity );
}
view_model.update_entity = function( entity ) {
	socket.emit( 'update_entity', entity.name, entity );
	//
	var entity_detail = view_model.entity_detail();
	if( entity_detail && entity && entity_detail.name == entity.name )
		view_model.entity_detail( entity );
}
view_model.remove_entity = function( entity ) {
	socket.emit( 'remove_entity', entity.name );
}
view_model.toggle_admin = function() {
	view_model.show_admin( !view_model.show_admin() );
}
view_model.show_admin.subscribe( function( new_value ) {
	$('#powerTip').hide();
});
view_model.render_identicon = function( elem, idx, chat ) {
	var img = $(elem).find('img.identicon')[0];
	if( typeof img == 'undefined' || img.rendered )
		return;
	var hash = Sha1.hash( chat.author );
	img.setAttribute( 'data-identicon', hash );
	img.width = view_model.identicon_size;
	img.height = view_model.identicon_size;
	Identicon( img );
	img.rendered = true;
}
view_model.select_text = function( data, event ) {
	event.target.select();
}
view_model.enhance_entity_with_external_info = function( entity_detail, destination_fn ) {
	if( !entity_detail
	||( !entity_detail.lat || !entity_detail.lng ))
		return; // cannot enhance, foursquare won't know what to do with this
	//
	var service_url = 'https://api.foursquare.com/v2/venues/search';
	var v = '20120321';
	var params = {
		intent: 'browse',
		query: entity_detail.name,
		ll: entity_detail.lat+','+entity_detail.lng,
		radius: 500,
		limit: 1,
		v: v,
		oauth_token: view_model.foursquare_oauth_token
	};
	$.ajax({
		url: service_url,
		data: params,
		dataType: 'jsonp',
		success: function( data, textStatus, jqXHR ) {
			if( data.meta.code == 200 && data.response.venues.length >= 1 ) {
				// TODO: CHECK THAT data.response.venues[0] has name or phone number or address match with google place
				var venue_id = data.response.venues[0].id;
				var service_url = 'https://api.foursquare.com/v2/venues/'+venue_id;
				var params = {
					v: v,
					oauth_token: view_model.foursquare_oauth_token
				};
				$.ajax({
					url: service_url,
					data: params,
					dataType: 'jsonp',
					success: function( data, textStatus, jqXHR ) {
						if( data.meta.code == 200 ) {
							var result = data.response.venue;
							var enriched_entity_detail = $.extend({
								loaded: true,
								rating: (result.rating / 2.0),
								review_count: result.stats.checkinsCount,
								categories: _.map( result.categories, function( elem ) { return elem.name; })
							}, entity_detail );
							destination_fn( enriched_entity_detail );
						} else {
							console.log( data );
						}
					},
					error: function( jqXHR, textStatus, errorThrown ) {
						console.log( textStatus+' '+errorThrown );
					}
				});
			} else {
				console.log( data );
			}
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log( textStatus+' '+errorThrown );
		}
	});
}
view_model.find_config_entity_by_name = function( entity_name ) {
	var entities = view_model.config_entities();
	for( var i = 0; i < entities.length; ++i )
		if( entities[i].name == entity_name )
			return entities[i];
	return null;
}
view_model.set_entity_detail_by_name = function( poll_entity ) {
	if( !poll_entity )
		return;
	var entity = view_model.find_config_entity_by_name( poll_entity.name );
	if( entity )
		view_model.entity_detail( entity );
}
view_model.entity_detail_afterRender = function() {
	$('.entity_detail *[title]').powerTip({placement:'e'});
	view_model.chat_scrollbar_update();
	setTimeout( view_model.chat_scrollbar_update, 25 );
}
view_model.entity_list_afterRender = function() {
	$('.entity_list *[title]').powerTip({placement:'e'});
}
view_model.chat_scrollbar_update = function() {
	view_model.chat_scrollbar.mCustomScrollbar( 'update' ); // content dimensions possibly changed
	view_model.chat_scrollbar.mCustomScrollbar( 'scrollTo', 'bottom' ); // tail (scroll to bottom)
}
//
view_model.previous_poll = ko.computed( function() {
	var state = view_model.state();
	if( state && state.poll.previous ) {
		var prev_poll_start = new Date( state.poll.previous.start_ts + view_model.offset() );
		if( prev_poll_start.is().today() )
			return state.poll.previous;
		else
			return null; // hide polls from previous days
	}
	else
		return null;
});
view_model.previous_poll_entities_by_vote = ko.computed( function() {
	var poll = view_model.previous_poll();
	if( poll ) {
		var entities = [];
		for( var entity in poll.tally ) {
			var count = poll.tally[entity];
			if( count > 0 )
				entities.push({
					name: entity,
					count: count
				});
		}
		entities.sort( function( a, b ) {
			return b.count - a.count;
		});
		return entities;
	}
	return null;
});
view_model.previous_poll_voters = ko.computed( function() {
	var poll = view_model.previous_poll();
	if( poll ) {
		var voters = [];
		for( var voter in poll.votes ) {
			voters.push({
				entity: poll.votes[voter]
			});
		}
		return voters;
	}
	return null;
});
view_model.current_poll = ko.computed( function() {
	var state = view_model.state();
	if( state ) {
		if( state.poll.current )
			view_model.current_poll_start_ts( state.poll.current.start_ts );
		return state.poll.current;
	}
	else
		return null;
});
view_model.current_poll_progress_pct = ko.computed( function() {
	view_model.ticks(); // observe.
	var poll = view_model.current_poll();
	if( poll ) {
		var pct = 100*(((new Date()).getTime() - (poll.start_ts + view_model.offset()))/((poll.end_ts + view_model.offset()) - (poll.start_ts + view_model.offset())));
		if( pct < 0 ) pct = 0;
		if( pct > 100 ) pct = 100;
		return pct;
	}
	else
		return 0;
});
view_model.filtered_current_poll_entities = ko.computed( function() {
	var poll = view_model.current_poll();
	var filter = view_model.filter();
	var simple_filter = removeDiacritics( filter ).toLowerCase();
	if( poll ) {
		var entities = [];
		for( var i = 0; i < poll.entities.length; ++i ) {
			var entity = poll.entities[i];
			var simple_entity = removeDiacritics( entity ).toLowerCase();
			if( simple_entity.indexOf( simple_filter ) != -1 )
				entities.push({
					name: entity,
					simple_name: simple_entity,
					count: poll.tally[entity]
				});
		}
		entities.sort( view_model.compare_entities );
		return entities;
	}
	return null;
});
view_model.upcoming_polls = ko.computed( function() {
	var state = view_model.state();
	if( state ) {
		var timestamps = [];
		if( state.poll.current )
			timestamps.push({
				ts: -1,
				str: 'started (in-progress)'
			});
		for( var i = 0; i < state.poll.next_ts.length; ++i ) {
			timestamps.push({
				ts: state.poll.next_ts[i],
				str: (new Date( state.poll.next_ts[i] + view_model.offset() )).toString( view_model.date_fmt_string )
			});
		}
		return timestamps;
	}
	return [];
});
view_model.next_poll_ts = ko.computed( function() {
	var state = view_model.state();
	if( state )
		if( state.poll.next_ts.length > 0 )
			return state.poll.next_ts[0];
		else
			return null;
	else
		return null;
});
view_model.has_winner = ko.computed( function() {
	var poll = view_model.previous_poll();
	if( poll && poll.winner )
		return true;
	else
		return false;
});
view_model.is_tie = ko.computed( function() {
	var poll = view_model.previous_poll();
	if( poll && poll.tie )
		return true;
	else
		return false;
});
view_model.has_votes = ko.computed( function() {
	var poll = view_model.previous_poll();
	if( poll && poll.vote_count > 0 )
		return true;
	else
		return false;
});
view_model.previous_poll_winner = ko.computed( function() {
	if( view_model.has_winner() ) {
		var poll = view_model.previous_poll();
		if( poll )
			return view_model.find_config_entity_by_name( poll.winner );
	}
	return null;
});
view_model.countdown_readout = ko.computed( function() {
	// calc
	var t, h, m, s;
	t = view_model.clock();
	if( t <= 0 )
		return "";
	h = Math.floor(t/(60*60)); t -= h*(60*60);
	m = Math.floor(t/60);      t -= m*60;
	s = Math.floor(t);
	if( h > 0 )
		return h+":"+pad(m,2)+":"+pad(s,2);
	else if( m > 0 )
		return m+":"+pad(s,2);
	else
		return s;
});
view_model.add_poll_start_ts_datejs = ko.computed( function() {
	view_model.ticks(); // observe.
	var date = Date.parse( view_model.add_poll_start_ts() );
	if( date ) {
		return date.toString( view_model.date_fmt_string );
	}
	else
		return null;
});
view_model.add_poll_start_ts_server = ko.computed( function() {
	view_model.ticks(); // observe.
	var date = Date.parse( view_model.add_poll_start_ts() );
	if( date ) {
		return (date.getTime() - view_model.offset());
	}
	else
		return null;
});
view_model.previous_poll_winner_directions_url = ko.computed( function() {
	var entity_detail = view_model.previous_poll_winner();
	if( !entity_detail )
		return null;
	var config_location = view_model.config_location();
	if( !config_location || !config_location.address )
		return null;
	// the maps url must be left relatively dynamic
	return 'http://maps.google.com/maps?q='
		+ encodeURIComponent( '"'+config_location.address+'"' )
		+ encodeURIComponent( ' to ' )
		+ '"'
			+ ((entity_detail.lat && entity_detail.lng)? encodeURIComponent( entity_detail.name+', ' ) : '')
			+	encodeURIComponent( entity_detail.address )
		+ '"';
});
view_model.zero_entities = ko.computed( function() {
	return view_model.config_entities().length == 0;
});
view_model.zero_upcoming_polls = ko.computed( function() {
	return view_model.upcoming_polls().length == 0;
});
view_model.add_poll_form_invalid = ko.computed( function() {
	var now = (new Date());
	var start_time = Date.parse( view_model.add_poll_start_ts() );
	// view_model.offset() omitted intentionally
	if( start_time == null )
		return true; // invalid date specifier
	else if( start_time - now < 0 )
		return true; // occurs in the past
	else if( !isNumber( view_model.add_poll_duration() ))
		return true; // invalid duration
	else if( parseFloat( view_model.add_poll_duration() ) < 0 )
		return true; // negative
	else if( !isNumber( view_model.add_poll_runoff_duration() ))
		return true; // invalid runoff
	else if( parseFloat( view_model.add_poll_runoff_duration() ) < 0 )
		return true; // negative
	else if( view_model.zero_entities() )
		return true; // empty list
	//
	return false; // eh, ok
});
//
ko.bindingHandlers.executeOnEnter = {
	init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
		var allBindings = allBindingsAccessor();
		$(element).keypress(function (event) {
			var keyCode = (event.which ? event.which : event.keyCode);
			if (keyCode === 13) { // KEY_ENTER
				allBindings.executeOnEnter.call(viewModel);
				return false;
			}
			return true;
		});
	}
};
//
view_model.current_poll_start_ts.subscribe( function( value ) {
	view_model.vote( null );
});
view_model.vote.subscribe( function( value ) {
	if( typeof value != 'undefined'
	&&  value != null
	&& 'name' in value
	&& value.name != null )
		socket.emit( 'vote', value.name );
});
// vanilla / 3rd-party glue
//
var timer = setInterval( view_model.tick, view_model.tick_time ); // an appropriately short delay; arbitrary
//
view_model.chat_scrollbar = $('#chat_window').mCustomScrollbar({
	scrollInertia: 100
});
// help tips
$('*[title]').powerTip();
//
// knockoutjs finalize
////////////////////////
ko.applyBindings( view_model );
////////////////////////


// socket
var socket = io.connect( location.host );
//
socket.on( 'connect', function() {
	view_model.loading( false ); // connection established
});
socket.on( 'id', function( id ) {
	cookie_set( 'id', id, 7 ); // remember id
});
socket.on( 'state', function( state ) {
	view_model.state( state );
});
socket.on( 'config', function( config ) {
	view_model.config_location( config.location );
	view_model.config_entities( config.entities );
	//
	if( config.location && config.location.address != view_model.config_location_input() ) {
		view_model.config_location_input( config.location.address );
		gmaps_handlers.config_location({
			formatted_address: config.location.address,
			geometry: {
				viewport: gmaps_handlers.decode_viewport( config.location.viewport )
			}
		});
	}
	//
	if( view_model.pending_select ) {
		view_model.entity_detail( view_model.find_config_entity_by_name( view_model.pending_select ));
		view_model.pending_select = null;
	}
	// new users - empty list
	if( !view_model.show_admin() && view_model.zero_entities() ) {
		view_model.show_admin( true );
		$.powerTip.showTip($('.restaurant_settings h2>span'));
	}
});
socket.on( 'time', function( server_time ) {
	view_model.offset( (new Date()).getTime() - server_time ); // ignores server round-trip time
});
socket.on( 'user_count', function( user_count ) {
	view_model.user_count( user_count );
});
socket.on( 'chat', function( chat ) {
	view_model.chats.push( chat );
	view_model.chat_scrollbar_update();
});
socket.on( 'disconnect', function() {
	view_model.loading( true ); // connection lost
});
//
socket.emit( 'register', {
	group_id: view_model.group_id,
	id: cookie_get( 'id' )
});


// google maps helper
view_model.config_location_autocomplete = new google.maps.places.Autocomplete( $('#config_location_input')[0] );
view_model.config_location_autocomplete.setTypes(['geocode']);

view_model.add_entity_input_autocomplete = new google.maps.places.Autocomplete( $('#add_entity_input')[0] );
view_model.add_entity_input_autocomplete.setTypes(['establishment']);

// TODO: trigger this event upon socket receive config data
var gmaps_handlers = {
	encode_viewport: function( gmaps_viewport ) {
		var ne = gmaps_viewport.getNorthEast();
		var sw = gmaps_viewport.getSouthWest();
		return {
			ne: {
				lat: ne.lat(),
				lng: ne.lng()
			},
			sw: {
				lat: sw.lat(),
				lng: sw.lng()
			}
		};
	},
	decode_viewport: function( viewport_data ) {
		return new google.maps.LatLngBounds(
			new google.maps.LatLng( 
				viewport_data.sw.lat, 
				viewport_data.sw.lng ),
			new google.maps.LatLng(
				viewport_data.ne.lat,
				viewport_data.ne.lng ));
	},
	synthesize_viewport: function( location ) {
		var lat_span = 0.002;
		var lng_span = 0.003;
		return new google.maps.LatLngBounds(
			new google.maps.LatLng( 
				location.lat() - lat_span/2, 
				location.lng() - lng_span/2 ),
			new google.maps.LatLng(
				location.lat() + lat_span/2, 
				location.lng() + lng_span/2 ));
	},
	encode_place: function( gmaps_place ) {
		return {
			name:    gmaps_place.formatted_address? gmaps_place.name : 'Address',
			address: gmaps_place.formatted_address? gmaps_place.formatted_address : gmaps_place.name,
			phone:   gmaps_place.formatted_phone_number || null,
			lat:     gmaps_place.geometry? gmaps_place.geometry.location.lat() : null,
			lng:     gmaps_place.geometry? gmaps_place.geometry.location.lng() : null
		}
	},
	config_location: function( place ) {
		var src = 'direct';
		if( typeof place === 'undefined' ) {
			src = 'gmaps_api';
			place = view_model.config_location_autocomplete.getPlace();
		}
		if( place.geometry != null ) {
			var viewport = place.geometry.viewport;
			if( !viewport )
				viewport = gmaps_handlers.synthesize_viewport( place.geometry.location );
			view_model.add_entity_input_autocomplete.setBounds( viewport );
			if( src == 'gmaps_api' && $('#config_location_input').is(':focus'))
				$('#add_entity_input').focus().select();
			view_model.update_location({
				address: place.formatted_address,
				viewport: gmaps_handlers.encode_viewport( viewport )
			});
		}
	},
	add_entity: function( place ) {
		place = place || view_model.add_entity_input_autocomplete.getPlace();
		encoded_place = gmaps_handlers.encode_place( place );
		view_model.add_entity( encoded_place );
		view_model.pending_select = encoded_place.name;
	}
}
google.maps.event.addListener( view_model.config_location_autocomplete, 'place_changed', gmaps_handlers.config_location );
google.maps.event.addListener( view_model.add_entity_input_autocomplete, 'place_changed', gmaps_handlers.add_entity );


