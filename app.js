// includes
var express =   require('express');
var http =      require('http');
var socket_io = require('socket.io');
var fs  =       require('fs');
/*date*/        require('datejs');
var mt =        require('mersenne');
var _ =         require('underscore');
// bootstrap
var app = express();
var server = http.createServer( app );
var io = socket_io.listen( server );
// static configs
io.set( 'log level', 1 ); // 0 - 4, ascending verbosity
app.use( express.compress() ); // gzip compression
mt = new mt.MersenneTwister19937;
// config-file config
var cfg = JSON.parse( fs.readFileSync( 'app.cfg.json', 'utf8' ));

// routes
// index page
app.get( '/', function( request, response ) {
	if( request.headers.host == 'analytics.bizlitics.com'
	||  request.headers.host == 'www.lunchvote.net' )
		response.redirect( 301, 'http://lunchvote.net' );
	else
		response.sendfile( 'index.html' );
});
// status
app.get('/health', function( request, response ) {
  response.send({
  	version: '1.0.1',
    pid: process.pid,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  })
});
// request to start a new group
app.post( '/new', function( request, response ) {
	if( request.headers.host == 'analytics.bizlitics.com' )
		return;
	var group_config = new GroupConfig();
	group_config.id = generate_new_group_id();
	save_group( group_config );
	response.redirect( '/vote?'+group_config.id );
});
// vote page
app.get( '/vote', function( request, response ) {
	var group_id = is_valid_group_request( request );
	if( group_id === false )
		response.send( 404 );
	else {
		if( request.headers.host == 'analytics.bizlitics.com' )
			response.redirect( 301, 'http://lunchvote.net/vote?'+group_id );
		else
			response.sendfile( 'vote.html' );
	}
});
// static fileserver
app.use( express.static( __dirname+'/public', {
	maxAge: 31557600000 // one year
}));

// start webserver
server.listen( cfg.server_port );

// global server state; GROUP_ID => GroupState
var server = {};

// global task scheduler
var scheduler = {};

// define socket handlers
io.sockets.on( 'connection', function( socket ) {
	// client joins group and completes initialization
	//   info : object
	//     group_id : string matching existing group id
	//     id : a previously-set socket id meant to link sessions
	socket.once( 'register', function( info ) {
		if( socket.locked )
			return; // already joined a room; suspicious!
		if( ! info )
			return;
		var group_id = info.group_id;
		var id = info.id;
		if( !id )
			id = socket.id;
		if( ! is_valid_group_id( group_id )) {
			socket.disconnect();
			return; // bad group id; suspicious!
		}
		socket.join( group_id );
		socket.locked = true;
		// send id to client for cookie persistence
		socket.emit( 'id', id );
		// initialize group state
		var group_state = null;
		if( group_id in server ) {
			group_state = server[group_id];
		} else {
			group_state = new GroupState();
			server[group_id] = group_state;
		}
		var group_config = load_group( group_id );
		// load previous poll, if any, into group state
		group_state.state.poll.previous = group_config.previous_poll;
		// send current state and config to new user
		socket.emit( 'state', group_state.state );
		socket.emit( 'config', group_config );
		// broadcast user_count
		group_state.user_count = io.sockets.in( group_id ).clients().length;
		io.sockets.in( group_id ).emit( 'user_count', group_state.user_count );
		// send server time so client can calculate client/server time offset
		socket.emit( 'time', now().getTime() );
		// now that there is a group set, define other event listeners
		// ----
		// relay/broadcast chat message
		//   message : string; chat mesage body
		socket.on( 'chat', function( message ) {
			if( typeof message !== 'string' || message.length == 0 )
				return;
			io.sockets.in( group_id ).emit( 'chat', {
				author: id,
				message: message
			});
		});
		// vote on current poll
		//   entity : string; name of entity to set vote to
		socket.on( 'vote', function( entity ) {
			var state = group_state.state;
			if( typeof entity != 'string' )
				return; // bad input
			if( state.poll.current ) {
				var poll = state.poll.current;
				if( poll.entities.indexOf( entity ) == -1 )
					return; // given entity is unknown to this poll
				// register vote
				poll.votes[id] = entity;
				// perform complete recount
				tally_votes( poll );
				// send updated state to all users
				io.sockets.in( group_id ).emit( 'state', group_state.state );
			}
		});
		// update maps location (address)
		//   location : object
		//     address: string,
		//     viewport: object
		//       ne: object
		//         lat: float,
		//         lng: float
		//       sw: object
		//         lat: float,
		//         lng: float
		socket.on( 'update_location', function( location ) {
			group_config = load_group( group_id );
			if( !_.isEqual( group_config.location, location )) {
				group_config.location = location;
				save_group( group_config );
				socket.emit( 'config', group_config );
			}
		});
		// start new poll
		//   poll_data  : object
		//     start_ts : timestamp string; (parseable by date.js)
		//     duration : number; time, in minutes (optional)
		socket.on( 'add_poll', function( poll_data ) {
			if( poll_data == null )
				return;
			var start_ts = poll_data.start_ts;
			if( !start_ts )
				return;
			var end_ts = start_ts + 1000.0*60.0*cfg.default_poll_duration_min;
			// optional fields
			if( 'duration' in poll_data 
			&&  poll_data.duration != null 
			&&  isNumber( poll_data.duration )) {
				var duration = parseFloat( poll_data.duration )
				end_ts = start_ts + 1000.0*60.0*duration;
			}
			// poll construction
			var poll = new Poll();
			poll.group_id = group_id;
			poll.start_ts = start_ts;
			poll.end_ts = end_ts;
			// schedule poll to start
			at( start_ts, start_poll, poll, fetch_entities, group_id );
			// register as an upcoming poll
			register_next( start_ts, group_id );
			// send updated state to all users
			io.sockets.in( group_id ).emit( 'state', group_state.state );
		});
		// cancel existing poll
		//   poll_start_ts : int, associated with previously added future poll that is not active
		socket.on( 'cancel_poll', function( poll_start_ts ) {
			if( poll_start_ts == -1 ) { // means cancel current
				var end_ts = group_state.state.poll.current.end_ts;
				clearTimeout( scheduler[end_ts] );
				delete scheduler[end_ts];
				group_state.state.poll.current = null;
			} else {
				clearTimeout( scheduler[poll_start_ts] );
				delete scheduler[poll_start_ts];
				deregister_next( poll_start_ts, group_id );
				// send updated state to all users
			}
			io.sockets.in( group_id ).emit( 'state', group_state.state );
		});
		// add entity
		//   new_entity : object, derived from google maps api v3 Place object (filtered fields)
		//     name     : string, name of business
		//     address  : string, full, formatted address
		//     phone    : string, full, formatted phone number
		//     lat      : float, latitude coordinate
		//     lng      : float, longitude coordinate
		socket.on( 'add_entity', function( new_entity ) {
			var group_config = load_group( group_id );
			if( _.indexOfObjectByProperty( group_config.entities, 'name', new_entity.name ) == -1 ) {
				group_config.entities.push( new_entity );
				save_group( group_config );
				// send updated config to all users
				io.sockets.in( group_id ).emit( 'config', group_config );
			}
		});
		// update entity
		//   entity_name : name of previously saved entity object
		//   data        : object, will be merged with existing entry if found, replacing conflicting fields with newer data
		socket.on( 'update_entity', function( entity_name, data ) {
			var group_config = load_group( group_id );
			var idx = _.indexOfObjectByProperty( group_config.entities, 'name', entity_name );
			if( idx != -1 ) {
				_.extend( group_config.entities[idx], data );
				save_group( group_config );
				// send updated config to all users
				io.sockets.in( group_id ).emit( 'config', group_config );
			}
		});
		// remove entity
		//   entity_name : name of previously saved entity object
		socket.on( 'remove_entity', function( entity_name ) {
			var group_config = load_group( group_id );
			var idx = _.indexOfObjectByProperty( group_config.entities, 'name', entity_name );
			if( idx != -1 ) {
				group_config.entities.splice( idx, 1 );
				save_group( group_config );
				// send updated config to all users
				io.sockets.in( group_id ).emit( 'config', group_config );
			}
		});
		// disconnect
		socket.on( 'disconnect', function() {
			// // delete this user's vote, if they have one
			// var state = group_state.state;
			// var poll = state.poll.current;
			// if( poll ) {
			// 	delete poll.votes[id];
			// 	// perform complete recount
			// 	tally_votes( poll );
			// 	// send updated state to all users
			// 	io.sockets.in( group_id ).emit( 'state', group_state.state );
			// }
		});
	});
});

// periodic processes
var user_count_monitoring = setInterval( function() {
	for( var group_id in server ) {
		var s = server[group_id];
		var c = io.sockets.clients( group_id ).length;
		if( s.user_count != c ) { // user count check
			s.user_count = c;
			io.sockets.in( group_id ).emit( 'user_count', c );
		}
		var poll = server[group_id].state.poll;
		if( s.user_count == 0 && poll.current == null && poll.next_ts.length == 0 ) {
			// group completely inactive; unload safely
			for( var i = 0; i < poll.next_ts.length; ++i ) {
				clearTimeout( scheduler[poll.next_ts[i]] );
				delete scheduler[poll.next_ts[i]];
			}
			delete server[group_id];
		}
	}
}, 807 ); // arbitrary delay

// classes
function GroupState() {
	this.user_count = 0;
	this.state = {
		poll: {
			current: null,
			previous: null,
			next_ts: []
		}
	};
}

function GroupConfig() {
	this.id = null;
	this.location = null;
	this.previous_poll = null;
	this.entities = [];
}

function Poll() {
	this.group_id = null;
	this.entities = [];
	this.votes = {};
	this.start_ts = 0;
	this.end_ts = 0;
	this.locked = false;
	this.winner = null;
	this.tally = {};
	this.vote_count = 0;
	this.tie = false;
}


// higher-order functions

function save_group( group ) {
	var string_data = JSON.stringify( group, null, 2 );
	var path = get_group_data_path( group.id );
	fs.writeFileSync( path, string_data );
}

function load_group( group_id ) {
	if( typeof group_id == 'undefined' )
		throw new Error( "group_id is undefined" );
	var path = get_group_data_path( group_id );
	var group = JSON.parse( fs.readFileSync( path, 'utf8' ));
	return group;
}

function start_poll( poll, entity_fn, group_id ) {
	var state = server[group_id].state;
	if( typeof entity_fn != 'undefined' && entity_fn ) // signal to pull latest
		poll.entities = entity_fn( group_id );
	state.poll.current = poll;
	deregister_next( poll.start_ts, group_id );
	// later, resolve this poll
	at( poll.end_ts, resolve_current_poll, group_id );
	// update clients
	io.sockets.in( poll.group_id ).emit( 'state', state );
}

function resolve_current_poll( group_id ) {
	if( !(group_id in server ))
		return; // group unloaded
	var state = server[group_id].state;
	if( state.poll.current == null )
		return; // hmm
	lock_poll( state.poll.current );
	state.poll.previous = state.poll.current;
	state.poll.current = null;
	// runoff check
	if( !state.poll.previous.winner 
	&&  state.poll.previous.vote_count > 0 ) {
		var poll = create_runoff_poll( state.poll.previous );
		start_poll( poll, null, group_id );
	}
	// persist previous poll in case group is unloaded
	var group_config = load_group( group_id );
	group_config.previous_poll = state.poll.previous;
	save_group( group_config );
	// update clients
	io.sockets.in( group_id ).emit( 'state', state );
}

function create_runoff_poll( origin_poll ) {
	var start_ts = origin_poll.end_ts;
	var end_ts = start_ts + 1000.0*60.0*cfg.default_runoff_duration_min;
	var poll = new Poll();
	poll.start_ts = start_ts;
	poll.end_ts = end_ts;
	if( Object.keys( origin_poll.tally ).length > 2 ) {
		// determine the minimum tally
		var min = null;
		var min_count = 0;
		for( var entity in origin_poll.tally ) {
			if( min == null || min > origin_poll.tally[entity] ) {
				min = origin_poll.tally[entity];
				min_count = 1;
			}
			else if( min == origin_poll.tally[entity] )
				++min_count;
		}
		// do not add lowest-performing entities to the pool
		// unless all entities performed equally
		if( min_count < origin_poll.entities.length ) {
			for( var entity in origin_poll.tally ) {
				if( origin_poll.tally[entity] > min )
					poll.entities.push( entity );
			}
		}
	}
	else { // length == 2
		poll.entities = Array.prototype.slice.call( origin_poll.entities );
	}
	return poll;
}

function lock_poll( poll ) {
	// locked bit
	poll.locked = true;
	poll.winner = null;
	// count votes against entities
	tally_votes( poll );
	// determine 
	var leader = find_leader( poll );
	poll.tie = leader.tie;
	poll.highest_pct = 100.0*(leader.vote_count / poll.vote_count);
	if( !poll.tie && poll.highest_pct >= cfg.required_majority_pct )
		poll.winner = leader.entity;
}

function tally_votes( poll ) {
	poll.tally = {};
	poll.vote_count = 0;
	for( var i = 0; i < poll.entities.length; ++i )
		poll.tally[poll.entities[i]] = 0;
	for( var voter in poll.votes ) {
		++poll.tally[poll.votes[voter]];
		++poll.vote_count;
	}
}

function find_leader( poll ) {
	var leader = {
		entity: null,
		vote_count: 0,
		tie: false
	}
	for( var entity in poll.tally ) {
		if( poll.tally[entity] > leader.vote_count ) {
			leader.vote_count = poll.tally[entity];
			leader.entity = entity;
			leader.tie = false;
		} else if( poll.tally[entity] == leader.vote_count ) {
			leader.entity = null;
			leader.tie = true;
		}
	}
	return leader;
}

function register_next( start_ts, group_id ) {
	var state = server[group_id].state;
	state.poll.next_ts.push( start_ts );
	state.poll.next_ts.sort( function( a, b ) {
		return a - b;
	});
}

function deregister_next( start_ts, group_id ) {
	var state = server[group_id].state;
	var idx = state.poll.next_ts.indexOf( start_ts );
	if( idx != -1 )
		state.poll.next_ts.splice( idx, 1 );
}

function fetch_entities( group_id ) { // fetches just the names; client resolves names to configs later
	var group_config = load_group( group_id );
	var entities = group_config.entities;
	var entity_names = _.map( entities, function( elem ) {
		return elem.name;
	});
	return entity_names;
}

// lower-order functions

function generate_new_group_id() {
	mt.init_genrand( now().getTime() % 1000000000 );
	var r = mt.genrand_real2();
	var id = Math.floor( r*(62*62*62*62*62) );
	var b62_id = base62_encode( id );
	var p_b62_id = pad( b62_id, 5 );
	return p_b62_id;
	// TODO: ensure that it does not already exist
}

function get_group_data_path( group_id ) {
	return 'data/'+group_id+'.group.json';
}

function is_valid_group_request( request ) {
	var keys = Object.keys( request.query );
	if( keys.length != 1 )
		return false;
	var group_id = keys[0];
	if( ! is_valid_group_id( group_id ))
		return false;
	// OK
	return group_id;
}

function is_valid_group_id( group_id ) {
	if( group_id == null || typeof group_id != 'string' || group_id.length != 5 )
		return false;
	if( ! /^[a-zA-Z0-9]{5}$/.test( group_id ))
		return false;
	var path = get_group_data_path( group_id );
	if( ! fs.existsSync( path ))
		return false;
	// OK
	return true;
}

function now() {
	// var d = new Date();
	// var debugging_offset = (-1*60*60*1000); // -1 hour
	// d.setTime( d.getTime() + debugging_offset );
	// return d;
	return new Date();
}

function at( ts, fn ) { // ...
	var from_now_ms = ts - now().getTime();
	var fn_args = Array.prototype.slice.call( arguments, 2 );
	fn_wrapper = function() {
		fn.apply( this, fn_args );
		delete scheduler[ts];
	};
	scheduler[ts] = setTimeout( fn_wrapper, from_now_ms );
}

function pad( val, len )
{
	var str = String( val );
	if( len > str.length )
		str = Array( len + 1 - str.length ).join( "0" ) + str;
	return str;
}

// enhancements & patches

_.indexOfObject = function( array, obj ) {
	for( var i = 0; i < array.length; ++i )
		if( _.isEqual( array[i], obj ))
			return i;
	return -1;
}
_.indexOfObjectByProperty = function( array, prop, val ) {
	for( var i = 0; i < array.length; ++i )
		if( array[i][prop] === val )
			return i;
	return -1;
}

// 3rd-party

function base62_encode(
  a, // positive base10 encoded integer
  b, // placeholder for result
  c  // placeholder for modulo
) {
  for (
    a = a !== +a || a % 1 ? -1 : a, b = ""; // if not a base10 integer, 'a' will be '-1'
    //                                         for example, '.5 % 1 == .5' but '1 % 1 == 0'
    a >= 0; // also prevents the user to use negative base10 integers
    a = Math.floor(a / 62) || -1 // using a bitwise hack here will fail with great numbers
  )
    // a%62 -> 0-61
    // 0-9   | 36-61 | 10-35
    // 48-57 | 65-90 | 97-121
    // 0-9   | A-Z   | a-z
    b = String.fromCharCode(((c = a % 62) > 9 ? c > 35 ? 29 : 87 : 48) + c) + b;
  return b // will return either an empty or a base62-encoded string
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

