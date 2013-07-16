// 2013-03-04
// + depends on: jQuery v1.9.1
////////////////////////
// jQuery URL Parser plugin, v2.2.1
// Date.js 1.0 Alpha-1
// Remove Diacritics
// SHA-1 implementation in JavaScript, + custom modification
// PowerTip v1.1.0
// Canvas Identicon v0.1, + custom modification
// jQuery mousewheel v3.0.6
// malihu jQuery custom scrollbars v2.8
////////////////////////


/*
 * JQuery URL Parser plugin, v2.2.1
 * Developed and maintanined by Mark Perkins, mark@allmarkedup.com
 * Source repository: https://github.com/allmarkedup/jQuery-URL-Parser
 * Licensed under an MIT-style license. See https://github.com/allmarkedup/jQuery-URL-Parser/blob/master/LICENSE for details.
 */ 

;(function(factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD available; use anonymous module
		if ( typeof jQuery !== 'undefined' ) {
			define(['jquery'], factory);	
		} else {
			define([], factory);
		}
	} else {
		// No AMD available; mutate global vars
		if ( typeof jQuery !== 'undefined' ) {
			factory(jQuery);
		} else {
			factory();
		}
	}
})(function($, undefined) {
	
	var tag2attr = {
			a       : 'href',
			img     : 'src',
			form    : 'action',
			base    : 'href',
			script  : 'src',
			iframe  : 'src',
			link    : 'href'
		},
		
		key = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'], // keys available to query
		
		aliases = { 'anchor' : 'fragment' }, // aliases for backwards compatability
		
		parser = {
			strict : /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,  //less intuitive, more accurate to the specs
			loose :  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // more intuitive, fails on relative paths and deviates from specs
		},
		
		toString = Object.prototype.toString,
		
		isint = /^[0-9]+$/;
	
	function parseUri( url, strictMode ) {
		var str = decodeURI( url ),
		res   = parser[ strictMode || false ? 'strict' : 'loose' ].exec( str ),
		uri = { attr : {}, param : {}, seg : {} },
		i   = 14;
		
		while ( i-- ) {
			uri.attr[ key[i] ] = res[i] || '';
		}
		
		// build query and fragment parameters		
		uri.param['query'] = parseString(uri.attr['query']);
		uri.param['fragment'] = parseString(uri.attr['fragment']);
		
		// split path and fragement into segments		
		uri.seg['path'] = uri.attr.path.replace(/^\/+|\/+$/g,'').split('/');     
		uri.seg['fragment'] = uri.attr.fragment.replace(/^\/+|\/+$/g,'').split('/');
		
		// compile a 'base' domain attribute        
		uri.attr['base'] = uri.attr.host ? (uri.attr.protocol ?  uri.attr.protocol+'://'+uri.attr.host : uri.attr.host) + (uri.attr.port ? ':'+uri.attr.port : '') : '';      
		  
		return uri;
	};
	
	function getAttrName( elm ) {
		var tn = elm.tagName;
		if ( typeof tn !== 'undefined' ) return tag2attr[tn.toLowerCase()];
		return tn;
	}
	
	function promote(parent, key) {
		if (parent[key].length == 0) return parent[key] = {};
		var t = {};
		for (var i in parent[key]) t[i] = parent[key][i];
		parent[key] = t;
		return t;
	}

	function parse(parts, parent, key, val) {
		var part = parts.shift();
		if (!part) {
			if (isArray(parent[key])) {
				parent[key].push(val);
			} else if ('object' == typeof parent[key]) {
				parent[key] = val;
			} else if ('undefined' == typeof parent[key]) {
				parent[key] = val;
			} else {
				parent[key] = [parent[key], val];
			}
		} else {
			var obj = parent[key] = parent[key] || [];
			if (']' == part) {
				if (isArray(obj)) {
					if ('' != val) obj.push(val);
				} else if ('object' == typeof obj) {
					obj[keys(obj).length] = val;
				} else {
					obj = parent[key] = [parent[key], val];
				}
			} else if (~part.indexOf(']')) {
				part = part.substr(0, part.length - 1);
				if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
				parse(parts, obj, part, val);
				// key
			} else {
				if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
				parse(parts, obj, part, val);
			}
		}
	}

	function merge(parent, key, val) {
		if (~key.indexOf(']')) {
			var parts = key.split('['),
			len = parts.length,
			last = len - 1;
			parse(parts, parent, 'base', val);
		} else {
			if (!isint.test(key) && isArray(parent.base)) {
				var t = {};
				for (var k in parent.base) t[k] = parent.base[k];
				parent.base = t;
			}
			set(parent.base, key, val);
		}
		return parent;
	}

	function parseString(str) {
		return reduce(String(str).split(/&|;/), function(ret, pair) {
			try {
				pair = decodeURIComponent(pair.replace(/\+/g, ' '));
			} catch(e) {
				// ignore
			}
			var eql = pair.indexOf('='),
				brace = lastBraceInKey(pair),
				key = pair.substr(0, brace || eql),
				val = pair.substr(brace || eql, pair.length),
				val = val.substr(val.indexOf('=') + 1, val.length);

			if ('' == key) key = pair, val = '';

			return merge(ret, key, val);
		}, { base: {} }).base;
	}
	
	function set(obj, key, val) {
		var v = obj[key];
		if (undefined === v) {
			obj[key] = val;
		} else if (isArray(v)) {
			v.push(val);
		} else {
			obj[key] = [v, val];
		}
	}
	
	function lastBraceInKey(str) {
		var len = str.length,
			 brace, c;
		for (var i = 0; i < len; ++i) {
			c = str[i];
			if (']' == c) brace = false;
			if ('[' == c) brace = true;
			if ('=' == c && !brace) return i;
		}
	}
	
	function reduce(obj, accumulator){
		var i = 0,
			l = obj.length >> 0,
			curr = arguments[2];
		while (i < l) {
			if (i in obj) curr = accumulator.call(undefined, curr, obj[i], i, obj);
			++i;
		}
		return curr;
	}
	
	function isArray(vArg) {
		return Object.prototype.toString.call(vArg) === "[object Array]";
	}
	
	function keys(obj) {
		var keys = [];
		for ( prop in obj ) {
			if ( obj.hasOwnProperty(prop) ) keys.push(prop);
		}
		return keys;
	}
		
	function purl( url, strictMode ) {
		if ( arguments.length === 1 && url === true ) {
			strictMode = true;
			url = undefined;
		}
		strictMode = strictMode || false;
		url = url || window.location.toString();
	
		return {
			
			data : parseUri(url, strictMode),
			
			// get various attributes from the URI
			attr : function( attr ) {
				attr = aliases[attr] || attr;
				return typeof attr !== 'undefined' ? this.data.attr[attr] : this.data.attr;
			},
			
			// return query string parameters
			param : function( param ) {
				return typeof param !== 'undefined' ? this.data.param.query[param] : this.data.param.query;
			},
			
			// return fragment parameters
			fparam : function( param ) {
				return typeof param !== 'undefined' ? this.data.param.fragment[param] : this.data.param.fragment;
			},
			
			// return path segments
			segment : function( seg ) {
				if ( typeof seg === 'undefined' ) {
					return this.data.seg.path;
				} else {
					seg = seg < 0 ? this.data.seg.path.length + seg : seg - 1; // negative segments count from the end
					return this.data.seg.path[seg];                    
				}
			},
			
			// return fragment segments
			fsegment : function( seg ) {
				if ( typeof seg === 'undefined' ) {
					return this.data.seg.fragment;                    
				} else {
					seg = seg < 0 ? this.data.seg.fragment.length + seg : seg - 1; // negative segments count from the end
					return this.data.seg.fragment[seg];                    
				}
			}
	    	
		};
	
	};
	
	if ( typeof $ !== 'undefined' ) {
		
		$.fn.url = function( strictMode ) {
			var url = '';
			if ( this.length ) {
				url = $(this).attr( getAttrName(this[0]) ) || '';
			}    
			return purl( url, strictMode );
		};
		
		$.url = purl;
		
	} else {
		window.purl = purl;
	}

});



/**
 * date.js
 * @version: 1.0 Alpha-1
 * @author: Coolite Inc. http://www.coolite.com/
 * @date: 2008-05-13
 * @copyright: Copyright (c) 2006-2008, Coolite Inc. (http://www.coolite.com/). All rights reserved.
 * @license: Licensed under The MIT License. See license.txt and http://www.datejs.com/license/. 
 * @website: http://www.datejs.com/
 */
Date.CultureInfo = {
	name: "en-US",
	englishName: "English (United States)",
	nativeName: "English (United States)",
	dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	abbreviatedDayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	shortestDayNames: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
	firstLetterDayNames: ["S", "M", "T", "W", "T", "F", "S"],
	monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	abbreviatedMonthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	amDesignator: "AM",
	pmDesignator: "PM",
	firstDayOfWeek: 0,
	twoDigitYearMax: 2029,
	dateElementOrder: "mdy",
	formatPatterns: {
		shortDate: "M/d/yyyy",
		longDate: "dddd, MMMM dd, yyyy",
		shortTime: "h:mm tt",
		longTime: "h:mm:ss tt",
		fullDateTime: "dddd, MMMM dd, yyyy h:mm:ss tt",
		sortableDateTime: "yyyy-MM-ddTHH:mm:ss",
		universalSortableDateTime: "yyyy-MM-dd HH:mm:ssZ",
		rfc1123: "ddd, dd MMM yyyy HH:mm:ss GMT",
		monthDay: "MMMM dd",
		yearMonth: "MMMM, yyyy"
	},
	regexPatterns: {
		jan: /^jan(uary)?/i,
		feb: /^feb(ruary)?/i,
		mar: /^mar(ch)?/i,
		apr: /^apr(il)?/i,
		may: /^may/i,
		jun: /^jun(e)?/i,
		jul: /^jul(y)?/i,
		aug: /^aug(ust)?/i,
		sep: /^sep(t(ember)?)?/i,
		oct: /^oct(ober)?/i,
		nov: /^nov(ember)?/i,
		dec: /^dec(ember)?/i,
		sun: /^su(n(day)?)?/i,
		mon: /^mo(n(day)?)?/i,
		tue: /^tu(e(s(day)?)?)?/i,
		wed: /^we(d(nesday)?)?/i,
		thu: /^th(u(r(s(day)?)?)?)?/i,
		fri: /^fr(i(day)?)?/i,
		sat: /^sa(t(urday)?)?/i,
		future: /^next/i,
		past: /^last|past|prev(ious)?/i,
		add: /^(\+|aft(er)?|from|hence)/i,
		subtract: /^(\-|bef(ore)?|ago)/i,
		yesterday: /^yes(terday)?/i,
		today: /^t(od(ay)?)?/i,
		tomorrow: /^tom(orrow)?/i,
		now: /^n(ow)?/i,
		millisecond: /^ms|milli(second)?s?/i,
		second: /^sec(ond)?s?/i,
		minute: /^mn|min(ute)?s?/i,
		hour: /^h(our)?s?/i,
		week: /^w(eek)?s?/i,
		month: /^m(onth)?s?/i,
		day: /^d(ay)?s?/i,
		year: /^y(ear)?s?/i,
		shortMeridian: /^(a|p)/i,
		longMeridian: /^(a\.?m?\.?|p\.?m?\.?)/i,
		timezone: /^((e(s|d)t|c(s|d)t|m(s|d)t|p(s|d)t)|((gmt)?\s*(\+|\-)\s*\d\d\d\d?)|gmt|utc)/i,
		ordinalSuffix: /^\s*(st|nd|rd|th)/i,
		timeContext: /^\s*(\:|a(?!u|p)|p)/i
	},
	timezones: [{
		name: "UTC",
		offset: "-000"
	}, {
		name: "GMT",
		offset: "-000"
	}, {
		name: "EST",
		offset: "-0500"
	}, {
		name: "EDT",
		offset: "-0400"
	}, {
		name: "CST",
		offset: "-0600"
	}, {
		name: "CDT",
		offset: "-0500"
	}, {
		name: "MST",
		offset: "-0700"
	}, {
		name: "MDT",
		offset: "-0600"
	}, {
		name: "PST",
		offset: "-0800"
	}, {
		name: "PDT",
		offset: "-0700"
	}]
};
(function() {
	var $D = Date,
		$P = $D.prototype,
		$C = $D.CultureInfo,
		p = function(s, l) {
			if (!l) {
				l = 2;
			}
			return ("000" + s).slice(l * -1);
		};
	$P.clearTime = function() {
		this.setHours(0);
		this.setMinutes(0);
		this.setSeconds(0);
		this.setMilliseconds(0);
		return this;
	};
	$P.setTimeToNow = function() {
		var n = new Date();
		this.setHours(n.getHours());
		this.setMinutes(n.getMinutes());
		this.setSeconds(n.getSeconds());
		this.setMilliseconds(n.getMilliseconds());
		return this;
	};
	$D.today = function() {
		return new Date().clearTime();
	};
	$D.compare = function(date1, date2) {
		if (isNaN(date1) || isNaN(date2)) {
			throw new Error(date1 + " - " + date2);
		} else if (date1 instanceof Date && date2 instanceof Date) {
			return (date1 < date2) ? -1 : (date1 > date2) ? 1 : 0;
		} else {
			throw new TypeError(date1 + " - " + date2);
		}
	};
	$D.equals = function(date1, date2) {
		return (date1.compareTo(date2) === 0);
	};
	$D.getDayNumberFromName = function(name) {
		var n = $C.dayNames,
			m = $C.abbreviatedDayNames,
			o = $C.shortestDayNames,
			s = name.toLowerCase();
		for (var i = 0; i < n.length; i++) {
			if (n[i].toLowerCase() == s || m[i].toLowerCase() == s || o[i].toLowerCase() == s) {
				return i;
			}
		}
		return -1;
	};
	$D.getMonthNumberFromName = function(name) {
		var n = $C.monthNames,
			m = $C.abbreviatedMonthNames,
			s = name.toLowerCase();
		for (var i = 0; i < n.length; i++) {
			if (n[i].toLowerCase() == s || m[i].toLowerCase() == s) {
				return i;
			}
		}
		return -1;
	};
	$D.isLeapYear = function(year) {
		return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
	};
	$D.getDaysInMonth = function(year, month) {
		return [31, ($D.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
	};
	$D.getTimezoneAbbreviation = function(offset) {
		var z = $C.timezones,
			p;
		for (var i = 0; i < z.length; i++) {
			if (z[i].offset === offset) {
				return z[i].name;
			}
		}
		return null;
	};
	$D.getTimezoneOffset = function(name) {
		var z = $C.timezones,
			p;
		for (var i = 0; i < z.length; i++) {
			if (z[i].name === name.toUpperCase()) {
				return z[i].offset;
			}
		}
		return null;
	};
	$P.clone = function() {
		return new Date(this.getTime());
	};
	$P.compareTo = function(date) {
		return Date.compare(this, date);
	};
	$P.equals = function(date) {
		return Date.equals(this, date || new Date());
	};
	$P.between = function(start, end) {
		return this.getTime() >= start.getTime() && this.getTime() <= end.getTime();
	};
	$P.isAfter = function(date) {
		return this.compareTo(date || new Date()) === 1;
	};
	$P.isBefore = function(date) {
		return (this.compareTo(date || new Date()) === -1);
	};
	$P.isToday = function() {
		return this.isSameDay(new Date());
	};
	$P.isSameDay = function(date) {
		return this.clone().clearTime().equals(date.clone().clearTime());
	};
	$P.addMilliseconds = function(value) {
		this.setMilliseconds(this.getMilliseconds() + value);
		return this;
	};
	$P.addSeconds = function(value) {
		return this.addMilliseconds(value * 1000);
	};
	$P.addMinutes = function(value) {
		return this.addMilliseconds(value * 60000);
	};
	$P.addHours = function(value) {
		return this.addMilliseconds(value * 3600000);
	};
	$P.addDays = function(value) {
		this.setDate(this.getDate() + value);
		return this;
	};
	$P.addWeeks = function(value) {
		return this.addDays(value * 7);
	};
	$P.addMonths = function(value) {
		var n = this.getDate();
		this.setDate(1);
		this.setMonth(this.getMonth() + value);
		this.setDate(Math.min(n, $D.getDaysInMonth(this.getFullYear(), this.getMonth())));
		return this;
	};
	$P.addYears = function(value) {
		return this.addMonths(value * 12);
	};
	$P.add = function(config) {
		if (typeof config == "number") {
			this._orient = config;
			return this;
		}
		var x = config;
		if (x.milliseconds) {
			this.addMilliseconds(x.milliseconds);
		}
		if (x.seconds) {
			this.addSeconds(x.seconds);
		}
		if (x.minutes) {
			this.addMinutes(x.minutes);
		}
		if (x.hours) {
			this.addHours(x.hours);
		}
		if (x.weeks) {
			this.addWeeks(x.weeks);
		}
		if (x.months) {
			this.addMonths(x.months);
		}
		if (x.years) {
			this.addYears(x.years);
		}
		if (x.days) {
			this.addDays(x.days);
		}
		return this;
	};
	var $y, $m, $d;
	$P.getWeek = function() {
		var a, b, c, d, e, f, g, n, s, w;
		$y = (!$y) ? this.getFullYear() : $y;
		$m = (!$m) ? this.getMonth() + 1 : $m;
		$d = (!$d) ? this.getDate() : $d;
		if ($m <= 2) {
			a = $y - 1;
			b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
			c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
			s = b - c;
			e = 0;
			f = $d - 1 + (31 * ($m - 1));
		} else {
			a = $y;
			b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
			c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
			s = b - c;
			e = s + 1;
			f = $d + ((153 * ($m - 3) + 2) / 5) + 58 + s;
		}
		g = (a + b) % 7;
		d = (f + g - e) % 7;
		n = (f + 3 - d) | 0;
		if (n < 0) {
			w = 53 - ((g - s) / 5 | 0);
		} else if (n > 364 + s) {
			w = 1;
		} else {
			w = (n / 7 | 0) + 1;
		}
		$y = $m = $d = null;
		return w;
	};
	$P.getISOWeek = function() {
		$y = this.getUTCFullYear();
		$m = this.getUTCMonth() + 1;
		$d = this.getUTCDate();
		return p(this.getWeek());
	};
	$P.setWeek = function(n) {
		return this.moveToDayOfWeek(1).addWeeks(n - this.getWeek());
	};
	$D._validate = function(n, min, max, name) {
		if (typeof n == "undefined") {
			return false;
		} else if (typeof n != "number") {
			throw new TypeError(n + " is not a Number.");
		} else if (n < min || n > max) {
			throw new RangeError(n + " is not a valid value for " + name + ".");
		}
		return true;
	};
	$D.validateMillisecond = function(value) {
		return $D._validate(value, 0, 999, "millisecond");
	};
	$D.validateSecond = function(value) {
		return $D._validate(value, 0, 59, "second");
	};
	$D.validateMinute = function(value) {
		return $D._validate(value, 0, 59, "minute");
	};
	$D.validateHour = function(value) {
		return $D._validate(value, 0, 23, "hour");
	};
	$D.validateDay = function(value, year, month) {
		return $D._validate(value, 1, $D.getDaysInMonth(year, month), "day");
	};
	$D.validateMonth = function(value) {
		return $D._validate(value, 0, 11, "month");
	};
	$D.validateYear = function(value) {
		return $D._validate(value, 0, 9999, "year");
	};
	$P.set = function(config) {
		if ($D.validateMillisecond(config.millisecond)) {
			this.addMilliseconds(config.millisecond - this.getMilliseconds());
		}
		if ($D.validateSecond(config.second)) {
			this.addSeconds(config.second - this.getSeconds());
		}
		if ($D.validateMinute(config.minute)) {
			this.addMinutes(config.minute - this.getMinutes());
		}
		if ($D.validateHour(config.hour)) {
			this.addHours(config.hour - this.getHours());
		}
		if ($D.validateMonth(config.month)) {
			this.addMonths(config.month - this.getMonth());
		}
		if ($D.validateYear(config.year)) {
			this.addYears(config.year - this.getFullYear());
		}
		if ($D.validateDay(config.day, this.getFullYear(), this.getMonth())) {
			this.addDays(config.day - this.getDate());
		}
		if (config.timezone) {
			this.setTimezone(config.timezone);
		}
		if (config.timezoneOffset) {
			this.setTimezoneOffset(config.timezoneOffset);
		}
		if (config.week && $D._validate(config.week, 0, 53, "week")) {
			this.setWeek(config.week);
		}
		return this;
	};
	$P.moveToFirstDayOfMonth = function() {
		return this.set({
			day: 1
		});
	};
	$P.moveToLastDayOfMonth = function() {
		return this.set({
			day: $D.getDaysInMonth(this.getFullYear(), this.getMonth())
		});
	};
	$P.moveToNthOccurrence = function(dayOfWeek, occurrence) {
		var shift = 0;
		if (occurrence > 0) {
			shift = occurrence - 1;
		} else if (occurrence === -1) {
			this.moveToLastDayOfMonth();
			if (this.getDay() !== dayOfWeek) {
				this.moveToDayOfWeek(dayOfWeek, -1);
			}
			return this;
		}
		return this.moveToFirstDayOfMonth().addDays(-1).moveToDayOfWeek(dayOfWeek, +1).addWeeks(shift);
	};
	$P.moveToDayOfWeek = function(dayOfWeek, orient) {
		var diff = (dayOfWeek - this.getDay() + 7 * (orient || +1)) % 7;
		return this.addDays((diff === 0) ? diff += 7 * (orient || +1) : diff);
	};
	$P.moveToMonth = function(month, orient) {
		var diff = (month - this.getMonth() + 12 * (orient || +1)) % 12;
		return this.addMonths((diff === 0) ? diff += 12 * (orient || +1) : diff);
	};
	$P.getOrdinalNumber = function() {
		return Math.ceil((this.clone().clearTime() - new Date(this.getFullYear(), 0, 1)) / 86400000) + 1;
	};
	$P.getTimezone = function() {
		return $D.getTimezoneAbbreviation(this.getUTCOffset());
	};
	$P.setTimezoneOffset = function(offset) {
		var here = this.getTimezoneOffset(),
			there = Number(offset) * -6 / 10;
		return this.addMinutes(there - here);
	};
	$P.setTimezone = function(offset) {
		return this.setTimezoneOffset($D.getTimezoneOffset(offset));
	};
	$P.hasDaylightSavingTime = function() {
		return (Date.today().set({
			month: 0,
			day: 1
		}).getTimezoneOffset() !== Date.today().set({
			month: 6,
			day: 1
		}).getTimezoneOffset());
	};
	$P.isDaylightSavingTime = function() {
		return (this.hasDaylightSavingTime() && new Date().getTimezoneOffset() === Date.today().set({
			month: 6,
			day: 1
		}).getTimezoneOffset());
	};
	$P.getUTCOffset = function() {
		var n = this.getTimezoneOffset() * -10 / 6,
			r;
		if (n < 0) {
			r = (n - 10000).toString();
			return r.charAt(0) + r.substr(2);
		} else {
			r = (n + 10000).toString();
			return "+" + r.substr(1);
		}
	};
	$P.getElapsed = function(date) {
		return (date || new Date()) - this;
	};
	if (!$P.toISOString) {
		$P.toISOString = function() {
			function f(n) {
				return n < 10 ? '0' + n : n;
			}
			return '"' + this.getUTCFullYear() + '-' + f(this.getUTCMonth() + 1) + '-' + f(this.getUTCDate()) + 'T' + f(this.getUTCHours()) + ':' + f(this.getUTCMinutes()) + ':' + f(this.getUTCSeconds()) + 'Z"';
		};
	}
	$P._toString = $P.toString;
	$P.toString = function(format) {
		var x = this;
		if (format && format.length == 1) {
			var c = $C.formatPatterns;
			x.t = x.toString;
			switch (format) {
			case "d":
				return x.t(c.shortDate);
			case "D":
				return x.t(c.longDate);
			case "F":
				return x.t(c.fullDateTime);
			case "m":
				return x.t(c.monthDay);
			case "r":
				return x.t(c.rfc1123);
			case "s":
				return x.t(c.sortableDateTime);
			case "t":
				return x.t(c.shortTime);
			case "T":
				return x.t(c.longTime);
			case "u":
				return x.t(c.universalSortableDateTime);
			case "y":
				return x.t(c.yearMonth);
			}
		}
		var ord = function(n) {
				switch (n * 1) {
				case 1:
				case 21:
				case 31:
					return "st";
				case 2:
				case 22:
					return "nd";
				case 3:
				case 23:
					return "rd";
				default:
					return "th";
				}
			};
		return format ? format.replace(/(\\)?(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|S)/g, function(m) {
			if (m.charAt(0) === "\\") {
				return m.replace("\\", "");
			}
			x.h = x.getHours;
			switch (m) {
			case "hh":
				return p(x.h() < 13 ? (x.h() === 0 ? 12 : x.h()) : (x.h() - 12));
			case "h":
				return x.h() < 13 ? (x.h() === 0 ? 12 : x.h()) : (x.h() - 12);
			case "HH":
				return p(x.h());
			case "H":
				return x.h();
			case "mm":
				return p(x.getMinutes());
			case "m":
				return x.getMinutes();
			case "ss":
				return p(x.getSeconds());
			case "s":
				return x.getSeconds();
			case "yyyy":
				return p(x.getFullYear(), 4);
			case "yy":
				return p(x.getFullYear());
			case "dddd":
				return $C.dayNames[x.getDay()];
			case "ddd":
				return $C.abbreviatedDayNames[x.getDay()];
			case "dd":
				return p(x.getDate());
			case "d":
				return x.getDate();
			case "MMMM":
				return $C.monthNames[x.getMonth()];
			case "MMM":
				return $C.abbreviatedMonthNames[x.getMonth()];
			case "MM":
				return p((x.getMonth() + 1));
			case "M":
				return x.getMonth() + 1;
			case "t":
				return x.h() < 12 ? $C.amDesignator.substring(0, 1) : $C.pmDesignator.substring(0, 1);
			case "tt":
				return x.h() < 12 ? $C.amDesignator : $C.pmDesignator;
			case "S":
				return ord(x.getDate());
			default:
				return m;
			}
		}) : this._toString();
	};
}());
(function() {
	var $D = Date,
		$P = $D.prototype,
		$C = $D.CultureInfo,
		$N = Number.prototype;
	$P._orient = +1;
	$P._nth = null;
	$P._is = false;
	$P._same = false;
	$P._isSecond = false;
	$N._dateElement = "day";
	$P.next = function() {
		this._orient = +1;
		return this;
	};
	$D.next = function() {
		return $D.today().next();
	};
	$P.last = $P.prev = $P.previous = function() {
		this._orient = -1;
		return this;
	};
	$D.last = $D.prev = $D.previous = function() {
		return $D.today().last();
	};
	$P.is = function() {
		this._is = true;
		return this;
	};
	$P.same = function() {
		this._same = true;
		this._isSecond = false;
		return this;
	};
	$P.today = function() {
		return this.same().day();
	};
	$P.weekday = function() {
		if (this._is) {
			this._is = false;
			return (!this.is().sat() && !this.is().sun());
		}
		return false;
	};
	$P.at = function(time) {
		return (typeof time === "string") ? $D.parse(this.toString("d") + " " + time) : this.set(time);
	};
	$N.fromNow = $N.after = function(date) {
		var c = {};
		c[this._dateElement] = this;
		return ((!date) ? new Date() : date.clone()).add(c);
	};
	$N.ago = $N.before = function(date) {
		var c = {};
		c[this._dateElement] = this * -1;
		return ((!date) ? new Date() : date.clone()).add(c);
	};
	var dx = ("sunday monday tuesday wednesday thursday friday saturday").split(/\s/),
		mx = ("january february march april may june july august september october november december").split(/\s/),
		px = ("Millisecond Second Minute Hour Day Week Month Year").split(/\s/),
		pxf = ("Milliseconds Seconds Minutes Hours Date Week Month FullYear").split(/\s/),
		nth = ("final first second third fourth fifth").split(/\s/),
		de;
	$P.toObject = function() {
		var o = {};
		for (var i = 0; i < px.length; i++) {
			o[px[i].toLowerCase()] = this["get" + pxf[i]]();
		}
		return o;
	};
	$D.fromObject = function(config) {
		config.week = null;
		return Date.today().set(config);
	};
	var df = function(n) {
			return function() {
				if (this._is) {
					this._is = false;
					return this.getDay() == n;
				}
				if (this._nth !== null) {
					if (this._isSecond) {
						this.addSeconds(this._orient * -1);
					}
					this._isSecond = false;
					var ntemp = this._nth;
					this._nth = null;
					var temp = this.clone().moveToLastDayOfMonth();
					this.moveToNthOccurrence(n, ntemp);
					if (this > temp) {
						throw new RangeError($D.getDayName(n) + " does not occur " + ntemp + " times in the month of " + $D.getMonthName(temp.getMonth()) + " " + temp.getFullYear() + ".");
					}
					return this;
				}
				return this.moveToDayOfWeek(n, this._orient);
			};
		};
	var sdf = function(n) {
			return function() {
				var t = $D.today(),
					shift = n - t.getDay();
				if (n === 0 && $C.firstDayOfWeek === 1 && t.getDay() !== 0) {
					shift = shift + 7;
				}
				return t.addDays(shift);
			};
		};
	for (var i = 0; i < dx.length; i++) {
		$D[dx[i].toUpperCase()] = $D[dx[i].toUpperCase().substring(0, 3)] = i;
		$D[dx[i]] = $D[dx[i].substring(0, 3)] = sdf(i);
		$P[dx[i]] = $P[dx[i].substring(0, 3)] = df(i);
	}
	var mf = function(n) {
			return function() {
				if (this._is) {
					this._is = false;
					return this.getMonth() === n;
				}
				return this.moveToMonth(n, this._orient);
			};
		};
	var smf = function(n) {
			return function() {
				return $D.today().set({
					month: n,
					day: 1
				});
			};
		};
	for (var j = 0; j < mx.length; j++) {
		$D[mx[j].toUpperCase()] = $D[mx[j].toUpperCase().substring(0, 3)] = j;
		$D[mx[j]] = $D[mx[j].substring(0, 3)] = smf(j);
		$P[mx[j]] = $P[mx[j].substring(0, 3)] = mf(j);
	}
	var ef = function(j) {
			return function() {
				if (this._isSecond) {
					this._isSecond = false;
					return this;
				}
				if (this._same) {
					this._same = this._is = false;
					var o1 = this.toObject(),
						o2 = (arguments[0] || new Date()).toObject(),
						v = "",
						k = j.toLowerCase();
					for (var m = (px.length - 1); m > -1; m--) {
						v = px[m].toLowerCase();
						if (o1[v] != o2[v]) {
							return false;
						}
						if (k == v) {
							break;
						}
					}
					return true;
				}
				if (j.substring(j.length - 1) != "s") {
					j += "s";
				}
				return this["add" + j](this._orient);
			};
		};
	var nf = function(n) {
			return function() {
				this._dateElement = n;
				return this;
			};
		};
	for (var k = 0; k < px.length; k++) {
		de = px[k].toLowerCase();
		$P[de] = $P[de + "s"] = ef(px[k]);
		$N[de] = $N[de + "s"] = nf(de);
	}
	$P._ss = ef("Second");
	var nthfn = function(n) {
			return function(dayOfWeek) {
				if (this._same) {
					return this._ss(arguments[0]);
				}
				if (dayOfWeek || dayOfWeek === 0) {
					return this.moveToNthOccurrence(dayOfWeek, n);
				}
				this._nth = n;
				if (n === 2 && (dayOfWeek === undefined || dayOfWeek === null)) {
					this._isSecond = true;
					return this.addSeconds(this._orient);
				}
				return this;
			};
		};
	for (var l = 0; l < nth.length; l++) {
		$P[nth[l]] = (l === 0) ? nthfn(-1) : nthfn(l);
	}
}());
(function() {
	Date.Parsing = {
		Exception: function(s) {
			this.message = "Parse error at '" + s.substring(0, 10) + " ...'";
		}
	};
	var $P = Date.Parsing;
	var _ = $P.Operators = {
		rtoken: function(r) {
			return function(s) {
				var mx = s.match(r);
				if (mx) {
					return ([mx[0], s.substring(mx[0].length)]);
				} else {
					throw new $P.Exception(s);
				}
			};
		},
		token: function(s) {
			return function(s) {
				return _.rtoken(new RegExp("^\s*" + s + "\s*"))(s);
			};
		},
		stoken: function(s) {
			return _.rtoken(new RegExp("^" + s));
		},
		until: function(p) {
			return function(s) {
				var qx = [],
					rx = null;
				while (s.length) {
					try {
						rx = p.call(this, s);
					} catch (e) {
						qx.push(rx[0]);
						s = rx[1];
						continue;
					}
					break;
				}
				return [qx, s];
			};
		},
		many: function(p) {
			return function(s) {
				var rx = [],
					r = null;
				while (s.length) {
					try {
						r = p.call(this, s);
					} catch (e) {
						return [rx, s];
					}
					rx.push(r[0]);
					s = r[1];
				}
				return [rx, s];
			};
		},
		optional: function(p) {
			return function(s) {
				var r = null;
				try {
					r = p.call(this, s);
				} catch (e) {
					return [null, s];
				}
				return [r[0], r[1]];
			};
		},
		not: function(p) {
			return function(s) {
				try {
					p.call(this, s);
				} catch (e) {
					return [null, s];
				}
				throw new $P.Exception(s);
			};
		},
		ignore: function(p) {
			return p ?
			function(s) {
				var r = null;
				r = p.call(this, s);
				return [null, r[1]];
			} : null;
		},
		product: function() {
			var px = arguments[0],
				qx = Array.prototype.slice.call(arguments, 1),
				rx = [];
			for (var i = 0; i < px.length; i++) {
				rx.push(_.each(px[i], qx));
			}
			return rx;
		},
		cache: function(rule) {
			var cache = {},
				r = null;
			return function(s) {
				try {
					r = cache[s] = (cache[s] || rule.call(this, s));
				} catch (e) {
					r = cache[s] = e;
				}
				if (r instanceof $P.Exception) {
					throw r;
				} else {
					return r;
				}
			};
		},
		any: function() {
			var px = arguments;
			return function(s) {
				var r = null;
				for (var i = 0; i < px.length; i++) {
					if (px[i] == null) {
						continue;
					}
					try {
						r = (px[i].call(this, s));
					} catch (e) {
						r = null;
					}
					if (r) {
						return r;
					}
				}
				throw new $P.Exception(s);
			};
		},
		each: function() {
			var px = arguments;
			return function(s) {
				var rx = [],
					r = null;
				for (var i = 0; i < px.length; i++) {
					if (px[i] == null) {
						continue;
					}
					try {
						r = (px[i].call(this, s));
					} catch (e) {
						throw new $P.Exception(s);
					}
					rx.push(r[0]);
					s = r[1];
				}
				return [rx, s];
			};
		},
		all: function() {
			var px = arguments,
				_ = _;
			return _.each(_.optional(px));
		},
		sequence: function(px, d, c) {
			d = d || _.rtoken(/^\s*/);
			c = c || null;
			if (px.length == 1) {
				return px[0];
			}
			return function(s) {
				var r = null,
					q = null;
				var rx = [];
				for (var i = 0; i < px.length; i++) {
					try {
						r = px[i].call(this, s);
					} catch (e) {
						break;
					}
					rx.push(r[0]);
					try {
						q = d.call(this, r[1]);
					} catch (ex) {
						q = null;
						break;
					}
					s = q[1];
				}
				if (!r) {
					throw new $P.Exception(s);
				}
				if (q) {
					throw new $P.Exception(q[1]);
				}
				if (c) {
					try {
						r = c.call(this, r[1]);
					} catch (ey) {
						throw new $P.Exception(r[1]);
					}
				}
				return [rx, (r ? r[1] : s)];
			};
		},
		between: function(d1, p, d2) {
			d2 = d2 || d1;
			var _fn = _.each(_.ignore(d1), p, _.ignore(d2));
			return function(s) {
				var rx = _fn.call(this, s);
				return [[rx[0][0], r[0][2]], rx[1]];
			};
		},
		list: function(p, d, c) {
			d = d || _.rtoken(/^\s*/);
			c = c || null;
			return (p instanceof Array ? _.each(_.product(p.slice(0, -1), _.ignore(d)), p.slice(-1), _.ignore(c)) : _.each(_.many(_.each(p, _.ignore(d))), px, _.ignore(c)));
		},
		set: function(px, d, c) {
			d = d || _.rtoken(/^\s*/);
			c = c || null;
			return function(s) {
				var r = null,
					p = null,
					q = null,
					rx = null,
					best = [
						[], s],
					last = false;
				for (var i = 0; i < px.length; i++) {
					q = null;
					p = null;
					r = null;
					last = (px.length == 1);
					try {
						r = px[i].call(this, s);
					} catch (e) {
						continue;
					}
					rx = [
						[r[0]], r[1]
					];
					if (r[1].length > 0 && !last) {
						try {
							q = d.call(this, r[1]);
						} catch (ex) {
							last = true;
						}
					} else {
						last = true;
					}
					if (!last && q[1].length === 0) {
						last = true;
					}
					if (!last) {
						var qx = [];
						for (var j = 0; j < px.length; j++) {
							if (i != j) {
								qx.push(px[j]);
							}
						}
						p = _.set(qx, d).call(this, q[1]);
						if (p[0].length > 0) {
							rx[0] = rx[0].concat(p[0]);
							rx[1] = p[1];
						}
					}
					if (rx[1].length < best[1].length) {
						best = rx;
					}
					if (best[1].length === 0) {
						break;
					}
				}
				if (best[0].length === 0) {
					return best;
				}
				if (c) {
					try {
						q = c.call(this, best[1]);
					} catch (ey) {
						throw new $P.Exception(best[1]);
					}
					best[1] = q[1];
				}
				return best;
			};
		},
		forward: function(gr, fname) {
			return function(s) {
				return gr[fname].call(this, s);
			};
		},
		replace: function(rule, repl) {
			return function(s) {
				var r = rule.call(this, s);
				return [repl, r[1]];
			};
		},
		process: function(rule, fn) {
			return function(s) {
				var r = rule.call(this, s);
				return [fn.call(this, r[0]), r[1]];
			};
		},
		min: function(min, rule) {
			return function(s) {
				var rx = rule.call(this, s);
				if (rx[0].length < min) {
					throw new $P.Exception(s);
				}
				return rx;
			};
		}
	};
	var _generator = function(op) {
			return function() {
				var args = null,
					rx = [];
				if (arguments.length > 1) {
					args = Array.prototype.slice.call(arguments);
				} else if (arguments[0] instanceof Array) {
					args = arguments[0];
				}
				if (args) {
					for (var i = 0, px = args.shift(); i < px.length; i++) {
						args.unshift(px[i]);
						rx.push(op.apply(null, args));
						args.shift();
						return rx;
					}
				} else {
					return op.apply(null, arguments);
				}
			};
		};
	var gx = "optional not ignore cache".split(/\s/);
	for (var i = 0; i < gx.length; i++) {
		_[gx[i]] = _generator(_[gx[i]]);
	}
	var _vector = function(op) {
			return function() {
				if (arguments[0] instanceof Array) {
					return op.apply(null, arguments[0]);
				} else {
					return op.apply(null, arguments);
				}
			};
		};
	var vx = "each any all".split(/\s/);
	for (var j = 0; j < vx.length; j++) {
		_[vx[j]] = _vector(_[vx[j]]);
	}
}());
(function() {
	var $D = Date,
		$P = $D.prototype,
		$C = $D.CultureInfo;
	var flattenAndCompact = function(ax) {
			var rx = [];
			for (var i = 0; i < ax.length; i++) {
				if (ax[i] instanceof Array) {
					rx = rx.concat(flattenAndCompact(ax[i]));
				} else {
					if (ax[i]) {
						rx.push(ax[i]);
					}
				}
			}
			return rx;
		};
	$D.Grammar = {};
	$D.Translator = {
		hour: function(s) {
			return function() {
				this.hour = Number(s);
			};
		},
		minute: function(s) {
			return function() {
				this.minute = Number(s);
			};
		},
		second: function(s) {
			return function() {
				this.second = Number(s);
			};
		},
		meridian: function(s) {
			return function() {
				this.meridian = s.slice(0, 1).toLowerCase();
			};
		},
		timezone: function(s) {
			return function() {
				var n = s.replace(/[^\d\+\-]/g, "");
				if (n.length) {
					this.timezoneOffset = Number(n);
				} else {
					this.timezone = s.toLowerCase();
				}
			};
		},
		day: function(x) {
			var s = x[0];
			return function() {
				this.day = Number(s.match(/\d+/)[0]);
			};
		},
		month: function(s) {
			return function() {
				this.month = (s.length == 3) ? "jan feb mar apr may jun jul aug sep oct nov dec".indexOf(s) / 4 : Number(s) - 1;
			};
		},
		year: function(s) {
			return function() {
				var n = Number(s);
				this.year = ((s.length > 2) ? n : (n + (((n + 2000) < $C.twoDigitYearMax) ? 2000 : 1900)));
			};
		},
		rday: function(s) {
			return function() {
				switch (s) {
				case "yesterday":
					this.days = -1;
					break;
				case "tomorrow":
					this.days = 1;
					break;
				case "today":
					this.days = 0;
					break;
				case "now":
					this.days = 0;
					this.now = true;
					break;
				}
			};
		},
		finishExact: function(x) {
			x = (x instanceof Array) ? x : [x];
			for (var i = 0; i < x.length; i++) {
				if (x[i]) {
					x[i].call(this);
				}
			}
			var now = new Date();
			if ((this.hour || this.minute) && (!this.month && !this.year && !this.day)) {
				this.day = now.getDate();
			}
			if (!this.year) {
				this.year = now.getFullYear();
			}
			if (!this.month && this.month !== 0) {
				this.month = now.getMonth();
			}
			if (!this.day) {
				this.day = 1;
			}
			if (!this.hour) {
				this.hour = 0;
			}
			if (!this.minute) {
				this.minute = 0;
			}
			if (!this.second) {
				this.second = 0;
			}
			if (this.meridian && this.hour) {
				if (this.meridian == "p" && this.hour < 12) {
					this.hour = this.hour + 12;
				} else if (this.meridian == "a" && this.hour == 12) {
					this.hour = 0;
				}
			}
			if (this.day > $D.getDaysInMonth(this.year, this.month)) {
				throw new RangeError(this.day + " is not a valid value for days.");
			}
			var r = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);
			if (this.timezone) {
				r.set({
					timezone: this.timezone
				});
			} else if (this.timezoneOffset) {
				r.set({
					timezoneOffset: this.timezoneOffset
				});
			}
			return r;
		},
		finish: function(x) {
			x = (x instanceof Array) ? flattenAndCompact(x) : [x];
			if (x.length === 0) {
				return null;
			}
			for (var i = 0; i < x.length; i++) {
				if (typeof x[i] == "function") {
					x[i].call(this);
				}
			}
			var today = $D.today();
			if (this.now && !this.unit && !this.operator) {
				return new Date();
			} else if (this.now) {
				today = new Date();
			}
			var expression = !! (this.days && this.days !== null || this.orient || this.operator);
			var gap, mod, orient;
			orient = ((this.orient == "past" || this.operator == "subtract") ? -1 : 1);
			if (!this.now && "hour minute second".indexOf(this.unit) != -1) {
				today.setTimeToNow();
			}
			if (this.month || this.month === 0) {
				if ("year day hour minute second".indexOf(this.unit) != -1) {
					this.value = this.month + 1;
					this.month = null;
					expression = true;
				}
			}
			if (!expression && this.weekday && !this.day && !this.days) {
				var temp = Date[this.weekday]();
				this.day = temp.getDate();
				if (!this.month) {
					this.month = temp.getMonth();
				}
				this.year = temp.getFullYear();
			}
			if (expression && this.weekday && this.unit != "month") {
				this.unit = "day";
				gap = ($D.getDayNumberFromName(this.weekday) - today.getDay());
				mod = 7;
				this.days = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
			}
			if (this.month && this.unit == "day" && this.operator) {
				this.value = (this.month + 1);
				this.month = null;
			}
			if (this.value != null && this.month != null && this.year != null) {
				this.day = this.value * 1;
			}
			if (this.month && !this.day && this.value) {
				today.set({
					day: this.value * 1
				});
				if (!expression) {
					this.day = this.value * 1;
				}
			}
			if (!this.month && this.value && this.unit == "month" && !this.now) {
				this.month = this.value;
				expression = true;
			}
			if (expression && (this.month || this.month === 0) && this.unit != "year") {
				this.unit = "month";
				gap = (this.month - today.getMonth());
				mod = 12;
				this.months = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
				this.month = null;
			}
			if (!this.unit) {
				this.unit = "day";
			}
			if (!this.value && this.operator && this.operator !== null && this[this.unit + "s"] && this[this.unit + "s"] !== null) {
				this[this.unit + "s"] = this[this.unit + "s"] + ((this.operator == "add") ? 1 : -1) + (this.value || 0) * orient;
			} else if (this[this.unit + "s"] == null || this.operator != null) {
				if (!this.value) {
					this.value = 1;
				}
				this[this.unit + "s"] = this.value * orient;
			}
			if (this.meridian && this.hour) {
				if (this.meridian == "p" && this.hour < 12) {
					this.hour = this.hour + 12;
				} else if (this.meridian == "a" && this.hour == 12) {
					this.hour = 0;
				}
			}
			if (this.weekday && !this.day && !this.days) {
				var temp = Date[this.weekday]();
				this.day = temp.getDate();
				if (temp.getMonth() !== today.getMonth()) {
					this.month = temp.getMonth();
				}
			}
			if ((this.month || this.month === 0) && !this.day) {
				this.day = 1;
			}
			if (!this.orient && !this.operator && this.unit == "week" && this.value && !this.day && !this.month) {
				return Date.today().setWeek(this.value);
			}
			if (expression && this.timezone && this.day && this.days) {
				this.day = this.days;
			}
			return (expression) ? today.add(this) : today.set(this);
		}
	};
	var _ = $D.Parsing.Operators,
		g = $D.Grammar,
		t = $D.Translator,
		_fn;
	g.datePartDelimiter = _.rtoken(/^([\s\-\.\,\/\x27]+)/);
	g.timePartDelimiter = _.stoken(":");
	g.whiteSpace = _.rtoken(/^\s*/);
	g.generalDelimiter = _.rtoken(/^(([\s\,]|at|@|on)+)/);
	var _C = {};
	g.ctoken = function(keys) {
		var fn = _C[keys];
		if (!fn) {
			var c = $C.regexPatterns;
			var kx = keys.split(/\s+/),
				px = [];
			for (var i = 0; i < kx.length; i++) {
				px.push(_.replace(_.rtoken(c[kx[i]]), kx[i]));
			}
			fn = _C[keys] = _.any.apply(null, px);
		}
		return fn;
	};
	g.ctoken2 = function(key) {
		return _.rtoken($C.regexPatterns[key]);
	};
	g.h = _.cache(_.process(_.rtoken(/^(0[0-9]|1[0-2]|[1-9])/), t.hour));
	g.hh = _.cache(_.process(_.rtoken(/^(0[0-9]|1[0-2])/), t.hour));
	g.H = _.cache(_.process(_.rtoken(/^([0-1][0-9]|2[0-3]|[0-9])/), t.hour));
	g.HH = _.cache(_.process(_.rtoken(/^([0-1][0-9]|2[0-3])/), t.hour));
	g.m = _.cache(_.process(_.rtoken(/^([0-5][0-9]|[0-9])/), t.minute));
	g.mm = _.cache(_.process(_.rtoken(/^[0-5][0-9]/), t.minute));
	g.s = _.cache(_.process(_.rtoken(/^([0-5][0-9]|[0-9])/), t.second));
	g.ss = _.cache(_.process(_.rtoken(/^[0-5][0-9]/), t.second));
	g.hms = _.cache(_.sequence([g.H, g.m, g.s], g.timePartDelimiter));
	g.t = _.cache(_.process(g.ctoken2("shortMeridian"), t.meridian));
	g.tt = _.cache(_.process(g.ctoken2("longMeridian"), t.meridian));
	g.z = _.cache(_.process(_.rtoken(/^((\+|\-)\s*\d\d\d\d)|((\+|\-)\d\d\:?\d\d)/), t.timezone));
	g.zz = _.cache(_.process(_.rtoken(/^((\+|\-)\s*\d\d\d\d)|((\+|\-)\d\d\:?\d\d)/), t.timezone));
	g.zzz = _.cache(_.process(g.ctoken2("timezone"), t.timezone));
	g.timeSuffix = _.each(_.ignore(g.whiteSpace), _.set([g.tt, g.zzz]));
	g.time = _.each(_.optional(_.ignore(_.stoken("T"))), g.hms, g.timeSuffix);
	g.d = _.cache(_.process(_.each(_.rtoken(/^([0-2]\d|3[0-1]|\d)/), _.optional(g.ctoken2("ordinalSuffix"))), t.day));
	g.dd = _.cache(_.process(_.each(_.rtoken(/^([0-2]\d|3[0-1])/), _.optional(g.ctoken2("ordinalSuffix"))), t.day));
	g.ddd = g.dddd = _.cache(_.process(g.ctoken("sun mon tue wed thu fri sat"), function(s) {
		return function() {
			this.weekday = s;
		};
	}));
	g.M = _.cache(_.process(_.rtoken(/^(1[0-2]|0\d|\d)/), t.month));
	g.MM = _.cache(_.process(_.rtoken(/^(1[0-2]|0\d)/), t.month));
	g.MMM = g.MMMM = _.cache(_.process(g.ctoken("jan feb mar apr may jun jul aug sep oct nov dec"), t.month));
	g.y = _.cache(_.process(_.rtoken(/^(\d\d?)/), t.year));
	g.yy = _.cache(_.process(_.rtoken(/^(\d\d)/), t.year));
	g.yyy = _.cache(_.process(_.rtoken(/^(\d\d?\d?\d?)/), t.year));
	g.yyyy = _.cache(_.process(_.rtoken(/^(\d\d\d\d)/), t.year));
	_fn = function() {
		return _.each(_.any.apply(null, arguments), _.not(g.ctoken2("timeContext")));
	};
	g.day = _fn(g.d, g.dd);
	g.month = _fn(g.M, g.MMM);
	g.year = _fn(g.yyyy, g.yy);
	g.orientation = _.process(g.ctoken("past future"), function(s) {
		return function() {
			this.orient = s;
		};
	});
	g.operator = _.process(g.ctoken("add subtract"), function(s) {
		return function() {
			this.operator = s;
		};
	});
	g.rday = _.process(g.ctoken("yesterday tomorrow today now"), t.rday);
	g.unit = _.process(g.ctoken("second minute hour day week month year"), function(s) {
		return function() {
			this.unit = s;
		};
	});
	g.value = _.process(_.rtoken(/^\d\d?(st|nd|rd|th)?/), function(s) {
		return function() {
			this.value = s.replace(/\D/g, "");
		};
	});
	g.expression = _.set([g.rday, g.operator, g.value, g.unit, g.orientation, g.ddd, g.MMM]);
	_fn = function() {
		return _.set(arguments, g.datePartDelimiter);
	};
	g.mdy = _fn(g.ddd, g.month, g.day, g.year);
	g.ymd = _fn(g.ddd, g.year, g.month, g.day);
	g.dmy = _fn(g.ddd, g.day, g.month, g.year);
	g.date = function(s) {
		return ((g[$C.dateElementOrder] || g.mdy).call(this, s));
	};
	g.format = _.process(_.many(_.any(_.process(_.rtoken(/^(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|zz?z?)/), function(fmt) {
		if (g[fmt]) {
			return g[fmt];
		} else {
			throw $D.Parsing.Exception(fmt);
		}
	}), _.process(_.rtoken(/^[^dMyhHmstz]+/), function(s) {
		return _.ignore(_.stoken(s));
	}))), function(rules) {
		return _.process(_.each.apply(null, rules), t.finishExact);
	});
	var _F = {};
	var _get = function(f) {
			return _F[f] = (_F[f] || g.format(f)[0]);
		};
	g.formats = function(fx) {
		if (fx instanceof Array) {
			var rx = [];
			for (var i = 0; i < fx.length; i++) {
				rx.push(_get(fx[i]));
			}
			return _.any.apply(null, rx);
		} else {
			return _get(fx);
		}
	};
	g._formats = g.formats(["\"yyyy-MM-ddTHH:mm:ssZ\"", "yyyy-MM-ddTHH:mm:ssZ", "yyyy-MM-ddTHH:mm:ssz", "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mmZ", "yyyy-MM-ddTHH:mmz", "yyyy-MM-ddTHH:mm", "ddd, MMM dd, yyyy H:mm:ss tt", "ddd MMM d yyyy HH:mm:ss zzz", "MMddyyyy", "ddMMyyyy", "Mddyyyy", "ddMyyyy", "Mdyyyy", "dMyyyy", "yyyy", "Mdyy", "dMyy", "d"]);
	g._start = _.process(_.set([g.date, g.time, g.expression], g.generalDelimiter, g.whiteSpace), t.finish);
	g.start = function(s) {
		try {
			var r = g._formats.call({}, s);
			if (r[1].length === 0) {
				return r;
			}
		} catch (e) {}
		return g._start.call({}, s);
	};
	$D._parse = $D.parse;
	$D.parse = function(s) {
		var r = null;
		if (!s) {
			return null;
		}
		if (s instanceof Date) {
			return s;
		}
		try {
			r = $D.Grammar.start.call({}, s.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1"));
		} catch (e) {
			return null;
		}
		return ((r[1].length === 0) ? r[0] : null);
	};
	$D.getParseFunction = function(fx) {
		var fn = $D.Grammar.formats(fx);
		return function(s) {
			var r = null;
			try {
				r = fn.call({}, s);
			} catch (e) {
				return null;
			}
			return ((r[1].length === 0) ? r[0] : null);
		};
	};
	$D.parseExact = function(s, fx) {
		return $D.getParseFunction(fx)(s);
	};
}());






/**
 * Remove diacritics (accent and other marks) on characters, and dissociate double characters.
 * Based on the character map of http://lehelk.com/2011/05/06/script-to-remove-diacritics/
 * but per-character walk (improved performance).
 * 
 * Licensed under WTFPL v2 http://sam.zoy.org/wtfpl/COPYING
 */

var removeDiacritics = (function() {
	var diacritics = {"\u24B6":"A","\uFF21":"A","\u00C0":"A","\u00C1":"A","\u00C2":"A","\u1EA6":"A","\u1EA4":"A","\u1EAA":"A","\u1EA8":"A","\u00C3":"A","\u0100":"A","\u0102":"A","\u1EB0":"A","\u1EAE":"A","\u1EB4":"A","\u1EB2":"A","\u0226":"A","\u01E0":"A","\u00C4":"A","\u01DE":"A","\u1EA2":"A","\u00C5":"A","\u01FA":"A","\u01CD":"A","\u0200":"A","\u0202":"A","\u1EA0":"A","\u1EAC":"A","\u1EB6":"A","\u1E00":"A","\u0104":"A","\u023A":"A","\u2C6F":"A","\uA732":"AA","\u00C6":"AE","\u01FC":"AE","\u01E2":"AE","\uA734":"AO","\uA736":"AU","\uA738":"AV","\uA73A":"AV","\uA73C":"AY","\u24B7":"B","\uFF22":"B","\u1E02":"B","\u1E04":"B","\u1E06":"B","\u0243":"B","\u0182":"B","\u0181":"B","\u24B8":"C","\uFF23":"C","\u0106":"C","\u0108":"C","\u010A":"C","\u010C":"C","\u00C7":"C","\u1E08":"C","\u0187":"C","\u023B":"C","\uA73E":"C","\u24B9":"D","\uFF24":"D","\u1E0A":"D","\u010E":"D","\u1E0C":"D","\u1E10":"D","\u1E12":"D","\u1E0E":"D","\u0110":"D","\u018B":"D","\u018A":"D","\u0189":"D","\uA779":"D","\u01F1":"DZ","\u01C4":"DZ","\u01F2":"Dz","\u01C5":"Dz","\u24BA":"E","\uFF25":"E","\u00C8":"E","\u00C9":"E","\u00CA":"E","\u1EC0":"E","\u1EBE":"E","\u1EC4":"E","\u1EC2":"E","\u1EBC":"E","\u0112":"E","\u1E14":"E","\u1E16":"E","\u0114":"E","\u0116":"E","\u00CB":"E","\u1EBA":"E","\u011A":"E","\u0204":"E","\u0206":"E","\u1EB8":"E","\u1EC6":"E","\u0228":"E","\u1E1C":"E","\u0118":"E","\u1E18":"E","\u1E1A":"E","\u0190":"E","\u018E":"E","\u24BB":"F","\uFF26":"F","\u1E1E":"F","\u0191":"F","\uA77B":"F","\u24BC":"G","\uFF27":"G","\u01F4":"G","\u011C":"G","\u1E20":"G","\u011E":"G","\u0120":"G","\u01E6":"G","\u0122":"G","\u01E4":"G","\u0193":"G","\uA7A0":"G","\uA77D":"G","\uA77E":"G","\u24BD":"H","\uFF28":"H","\u0124":"H","\u1E22":"H","\u1E26":"H","\u021E":"H","\u1E24":"H","\u1E28":"H","\u1E2A":"H","\u0126":"H","\u2C67":"H","\u2C75":"H","\uA78D":"H","\u24BE":"I","\uFF29":"I","\u00CC":"I","\u00CD":"I","\u00CE":"I","\u0128":"I","\u012A":"I","\u012C":"I","\u0130":"I","\u00CF":"I","\u1E2E":"I","\u1EC8":"I","\u01CF":"I","\u0208":"I","\u020A":"I","\u1ECA":"I","\u012E":"I","\u1E2C":"I","\u0197":"I","\u24BF":"J","\uFF2A":"J","\u0134":"J","\u0248":"J","\u24C0":"K","\uFF2B":"K","\u1E30":"K","\u01E8":"K","\u1E32":"K","\u0136":"K","\u1E34":"K","\u0198":"K","\u2C69":"K","\uA740":"K","\uA742":"K","\uA744":"K","\uA7A2":"K","\u24C1":"L","\uFF2C":"L","\u013F":"L","\u0139":"L","\u013D":"L","\u1E36":"L","\u1E38":"L","\u013B":"L","\u1E3C":"L","\u1E3A":"L","\u0141":"L","\u023D":"L","\u2C62":"L","\u2C60":"L","\uA748":"L","\uA746":"L","\uA780":"L","\u01C7":"LJ","\u01C8":"Lj","\u24C2":"M","\uFF2D":"M","\u1E3E":"M","\u1E40":"M","\u1E42":"M","\u2C6E":"M","\u019C":"M","\u24C3":"N","\uFF2E":"N","\u01F8":"N","\u0143":"N","\u00D1":"N","\u1E44":"N","\u0147":"N","\u1E46":"N","\u0145":"N","\u1E4A":"N","\u1E48":"N","\u0220":"N","\u019D":"N","\uA790":"N","\uA7A4":"N","\u01CA":"NJ","\u01CB":"Nj","\u24C4":"O","\uFF2F":"O","\u00D2":"O","\u00D3":"O","\u00D4":"O","\u1ED2":"O","\u1ED0":"O","\u1ED6":"O","\u1ED4":"O","\u00D5":"O","\u1E4C":"O","\u022C":"O","\u1E4E":"O","\u014C":"O","\u1E50":"O","\u1E52":"O","\u014E":"O","\u022E":"O","\u0230":"O","\u00D6":"O","\u022A":"O","\u1ECE":"O","\u0150":"O","\u01D1":"O","\u020C":"O","\u020E":"O","\u01A0":"O","\u1EDC":"O","\u1EDA":"O","\u1EE0":"O","\u1EDE":"O","\u1EE2":"O","\u1ECC":"O","\u1ED8":"O","\u01EA":"O","\u01EC":"O","\u00D8":"O","\u01FE":"O","\u0186":"O","\u019F":"O","\uA74A":"O","\uA74C":"O","\u0152":"OE","\u01A2":"OI","\uA74E":"OO","\u0222":"OU","\u24C5":"P","\uFF30":"P","\u1E54":"P","\u1E56":"P","\u01A4":"P","\u2C63":"P","\uA750":"P","\uA752":"P","\uA754":"P","\u24C6":"Q","\uFF31":"Q","\uA756":"Q","\uA758":"Q","\u024A":"Q","\u24C7":"R","\uFF32":"R","\u0154":"R","\u1E58":"R","\u0158":"R","\u0210":"R","\u0212":"R","\u1E5A":"R","\u1E5C":"R","\u0156":"R","\u1E5E":"R","\u024C":"R","\u2C64":"R","\uA75A":"R","\uA7A6":"R","\uA782":"R","\u24C8":"S","\uFF33":"S","\u015A":"S","\u1E64":"S","\u015C":"S","\u1E60":"S","\u0160":"S","\u1E66":"S","\u1E62":"S","\u1E68":"S","\u0218":"S","\u015E":"S","\u2C7E":"S","\uA7A8":"S","\uA784":"S","\u1E9E":"SS","\u24C9":"T","\uFF34":"T","\u1E6A":"T","\u0164":"T","\u1E6C":"T","\u021A":"T","\u0162":"T","\u1E70":"T","\u1E6E":"T","\u0166":"T","\u01AC":"T","\u01AE":"T","\u023E":"T","\uA786":"T","\uA728":"TZ","\u24CA":"U","\uFF35":"U","\u00D9":"U","\u00DA":"U","\u00DB":"U","\u0168":"U","\u1E78":"U","\u016A":"U","\u1E7A":"U","\u016C":"U","\u00DC":"U","\u01DB":"U","\u01D7":"U","\u01D5":"U","\u01D9":"U","\u1EE6":"U","\u016E":"U","\u0170":"U","\u01D3":"U","\u0214":"U","\u0216":"U","\u01AF":"U","\u1EEA":"U","\u1EE8":"U","\u1EEE":"U","\u1EEC":"U","\u1EF0":"U","\u1EE4":"U","\u1E72":"U","\u0172":"U","\u1E76":"U","\u1E74":"U","\u0244":"U","\u24CB":"V","\uFF36":"V","\u1E7C":"V","\u1E7E":"V","\u01B2":"V","\uA75E":"V","\u0245":"V","\uA760":"VY","\u24CC":"W","\uFF37":"W","\u1E80":"W","\u1E82":"W","\u0174":"W","\u1E86":"W","\u1E84":"W","\u1E88":"W","\u2C72":"W","\u24CD":"X","\uFF38":"X","\u1E8A":"X","\u1E8C":"X","\u24CE":"Y","\uFF39":"Y","\u1EF2":"Y","\u00DD":"Y","\u0176":"Y","\u1EF8":"Y","\u0232":"Y","\u1E8E":"Y","\u0178":"Y","\u1EF6":"Y","\u1EF4":"Y","\u01B3":"Y","\u024E":"Y","\u1EFE":"Y","\u24CF":"Z","\uFF3A":"Z","\u0179":"Z","\u1E90":"Z","\u017B":"Z","\u017D":"Z","\u1E92":"Z","\u1E94":"Z","\u01B5":"Z","\u0224":"Z","\u2C7F":"Z","\u2C6B":"Z","\uA762":"Z","\u24D0":"a","\uFF41":"a","\u1E9A":"a","\u00E0":"a","\u00E1":"a","\u00E2":"a","\u1EA7":"a","\u1EA5":"a","\u1EAB":"a","\u1EA9":"a","\u00E3":"a","\u0101":"a","\u0103":"a","\u1EB1":"a","\u1EAF":"a","\u1EB5":"a","\u1EB3":"a","\u0227":"a","\u01E1":"a","\u00E4":"a","\u01DF":"a","\u1EA3":"a","\u00E5":"a","\u01FB":"a","\u01CE":"a","\u0201":"a","\u0203":"a","\u1EA1":"a","\u1EAD":"a","\u1EB7":"a","\u1E01":"a","\u0105":"a","\u2C65":"a","\u0250":"a","\uA733":"aa","\u00E6":"ae","\u01FD":"ae","\u01E3":"ae","\uA735":"ao","\uA737":"au","\uA739":"av","\uA73B":"av","\uA73D":"ay","\u24D1":"b","\uFF42":"b","\u1E03":"b","\u1E05":"b","\u1E07":"b","\u0180":"b","\u0183":"b","\u0253":"b","\u24D2":"c","\uFF43":"c","\u0107":"c","\u0109":"c","\u010B":"c","\u010D":"c","\u00E7":"c","\u1E09":"c","\u0188":"c","\u023C":"c","\uA73F":"c","\u2184":"c","\u24D3":"d","\uFF44":"d","\u1E0B":"d","\u010F":"d","\u1E0D":"d","\u1E11":"d","\u1E13":"d","\u1E0F":"d","\u0111":"d","\u018C":"d","\u0256":"d","\u0257":"d","\uA77A":"d","\u01F3":"dz","\u01C6":"dz","\u24D4":"e","\uFF45":"e","\u00E8":"e","\u00E9":"e","\u00EA":"e","\u1EC1":"e","\u1EBF":"e","\u1EC5":"e","\u1EC3":"e","\u1EBD":"e","\u0113":"e","\u1E15":"e","\u1E17":"e","\u0115":"e","\u0117":"e","\u00EB":"e","\u1EBB":"e","\u011B":"e","\u0205":"e","\u0207":"e","\u1EB9":"e","\u1EC7":"e","\u0229":"e","\u1E1D":"e","\u0119":"e","\u1E19":"e","\u1E1B":"e","\u0247":"e","\u025B":"e","\u01DD":"e","\u24D5":"f","\uFF46":"f","\u1E1F":"f","\u0192":"f","\uA77C":"f","\u24D6":"g","\uFF47":"g","\u01F5":"g","\u011D":"g","\u1E21":"g","\u011F":"g","\u0121":"g","\u01E7":"g","\u0123":"g","\u01E5":"g","\u0260":"g","\uA7A1":"g","\u1D79":"g","\uA77F":"g","\u24D7":"h","\uFF48":"h","\u0125":"h","\u1E23":"h","\u1E27":"h","\u021F":"h","\u1E25":"h","\u1E29":"h","\u1E2B":"h","\u1E96":"h","\u0127":"h","\u2C68":"h","\u2C76":"h","\u0265":"h","\u0195":"hv","\u24D8":"i","\uFF49":"i","\u00EC":"i","\u00ED":"i","\u00EE":"i","\u0129":"i","\u012B":"i","\u012D":"i","\u00EF":"i","\u1E2F":"i","\u1EC9":"i","\u01D0":"i","\u0209":"i","\u020B":"i","\u1ECB":"i","\u012F":"i","\u1E2D":"i","\u0268":"i","\u0131":"i","\u24D9":"j","\uFF4A":"j","\u0135":"j","\u01F0":"j","\u0249":"j","\u24DA":"k","\uFF4B":"k","\u1E31":"k","\u01E9":"k","\u1E33":"k","\u0137":"k","\u1E35":"k","\u0199":"k","\u2C6A":"k","\uA741":"k","\uA743":"k","\uA745":"k","\uA7A3":"k","\u24DB":"l","\uFF4C":"l","\u0140":"l","\u013A":"l","\u013E":"l","\u1E37":"l","\u1E39":"l","\u013C":"l","\u1E3D":"l","\u1E3B":"l","\u0142":"l","\u019A":"l","\u026B":"l","\u2C61":"l","\uA749":"l","\uA781":"l","\uA747":"l","\u01C9":"lj","\u24DC":"m","\uFF4D":"m","\u1E3F":"m","\u1E41":"m","\u1E43":"m","\u0271":"m","\u026F":"m","\u24DD":"n","\uFF4E":"n","\u01F9":"n","\u0144":"n","\u00F1":"n","\u1E45":"n","\u0148":"n","\u1E47":"n","\u0146":"n","\u1E4B":"n","\u1E49":"n","\u019E":"n","\u0272":"n","\u0149":"n","\uA791":"n","\uA7A5":"n","\u01CC":"nj","\u24DE":"o","\uFF4F":"o","\u00F2":"o","\u00F3":"o","\u00F4":"o","\u1ED3":"o","\u1ED1":"o","\u1ED7":"o","\u1ED5":"o","\u00F5":"o","\u1E4D":"o","\u022D":"o","\u1E4F":"o","\u014D":"o","\u1E51":"o","\u1E53":"o","\u014F":"o","\u022F":"o","\u0231":"o","\u00F6":"o","\u022B":"o","\u1ECF":"o","\u0151":"o","\u01D2":"o","\u020D":"o","\u020F":"o","\u01A1":"o","\u1EDD":"o","\u1EDB":"o","\u1EE1":"o","\u1EDF":"o","\u1EE3":"o","\u1ECD":"o","\u1ED9":"o","\u01EB":"o","\u01ED":"o","\u00F8":"o","\u01FF":"o","\u0254":"o","\uA74B":"o","\uA74D":"o","\u0275":"o","\u0153":"oe","\u0276":"oe","\u01A3":"oi","\u0223":"ou","\uA74F":"oo","\u24DF":"p","\uFF50":"p","\u1E55":"p","\u1E57":"p","\u01A5":"p","\u1D7D":"p","\uA751":"p","\uA753":"p","\uA755":"p","\u24E0":"q","\uFF51":"q","\u024B":"q","\uA757":"q","\uA759":"q","\u24E1":"r","\uFF52":"r","\u0155":"r","\u1E59":"r","\u0159":"r","\u0211":"r","\u0213":"r","\u1E5B":"r","\u1E5D":"r","\u0157":"r","\u1E5F":"r","\u024D":"r","\u027D":"r","\uA75B":"r","\uA7A7":"r","\uA783":"r","\u24E2":"s","\uFF53":"s","\u015B":"s","\u1E65":"s","\u015D":"s","\u1E61":"s","\u0161":"s","\u1E67":"s","\u1E63":"s","\u1E69":"s","\u0219":"s","\u015F":"s","\u023F":"s","\uA7A9":"s","\uA785":"s","\u017F":"s","\u1E9B":"s","\u00DF":"ss","\u24E3":"t","\uFF54":"t","\u1E6B":"t","\u1E97":"t","\u0165":"t","\u1E6D":"t","\u021B":"t","\u0163":"t","\u1E71":"t","\u1E6F":"t","\u0167":"t","\u01AD":"t","\u0288":"t","\u2C66":"t","\uA787":"t","\uA729":"tz","\u24E4":"u","\uFF55":"u","\u00F9":"u","\u00FA":"u","\u00FB":"u","\u0169":"u","\u1E79":"u","\u016B":"u","\u1E7B":"u","\u016D":"u","\u00FC":"u","\u01DC":"u","\u01D8":"u","\u01D6":"u","\u01DA":"u","\u1EE7":"u","\u016F":"u","\u0171":"u","\u01D4":"u","\u0215":"u","\u0217":"u","\u01B0":"u","\u1EEB":"u","\u1EE9":"u","\u1EEF":"u","\u1EED":"u","\u1EF1":"u","\u1EE5":"u","\u1E73":"u","\u0173":"u","\u1E77":"u","\u1E75":"u","\u0289":"u","\u24E5":"v","\uFF56":"v","\u1E7D":"v","\u1E7F":"v","\u028B":"v","\uA75F":"v","\u028C":"v","\uA761":"vy","\u24E6":"w","\uFF57":"w","\u1E81":"w","\u1E83":"w","\u0175":"w","\u1E87":"w","\u1E85":"w","\u1E98":"w","\u1E89":"w","\u2C73":"w","\u24E7":"x","\uFF58":"x","\u1E8B":"x","\u1E8D":"x","\u24E8":"y","\uFF59":"y","\u1EF3":"y","\u00FD":"y","\u0177":"y","\u1EF9":"y","\u0233":"y","\u1E8F":"y","\u00FF":"y","\u1EF7":"y","\u1E99":"y","\u1EF5":"y","\u01B4":"y","\u024F":"y","\u1EFF":"y","\u24E9":"z","\uFF5A":"z","\u017A":"z","\u1E91":"z","\u017C":"z","\u017E":"z","\u1E93":"z","\u1E95":"z","\u01B6":"z","\u0225":"z","\u0240":"z","\u2C6C":"z","\uA763":"z","\uFF10":"0","\u2080":"0","\u24EA":"0","\u2070":"0", "\u00B9":"1","\u2474":"1","\u2081":"1","\u2776":"1","\u24F5":"1","\u2488":"1","\u2460":"1","\uFF11":"1", "\u00B2":"2","\u2777":"2","\u2475":"2","\uFF12":"2","\u2082":"2","\u24F6":"2","\u2461":"2","\u2489":"2", "\u00B3":"3","\uFF13":"3","\u248A":"3","\u2476":"3","\u2083":"3","\u2778":"3","\u24F7":"3","\u2462":"3", "\u24F8":"4","\u2463":"4","\u248B":"4","\uFF14":"4","\u2074":"4","\u2084":"4","\u2779":"4","\u2477":"4", "\u248C":"5","\u2085":"5","\u24F9":"5","\u2478":"5","\u277A":"5","\u2464":"5","\uFF15":"5","\u2075":"5", "\u2479":"6","\u2076":"6","\uFF16":"6","\u277B":"6","\u2086":"6","\u2465":"6","\u24FA":"6","\u248D":"6", "\uFF17":"7","\u2077":"7","\u277C":"7","\u24FB":"7","\u248E":"7","\u2087":"7","\u247A":"7","\u2466":"7", "\u2467":"8","\u248F":"8","\u24FC":"8","\u247B":"8","\u2078":"8","\uFF18":"8","\u277D":"8","\u2088":"8", "\u24FD":"9","\uFF19":"9","\u2490":"9","\u277E":"9","\u247C":"9","\u2089":"9","\u2468":"9","\u2079":"9"};
	return function (str) {
		var chars = str.split(''),
		    i = chars.length - 1,
		    alter = false,
		    ch;
		for (; i >= 0; i--) {
			ch = chars[i];
			if (diacritics.hasOwnProperty(ch)) {
				chars[i] =  diacritics[ch];
				alter = true;
			}
		}
		if (alter) {
			str = chars.join('');
		}
		return str;
	}
})();



/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  SHA-1 implementation in JavaScript | (c) Chris Veness 2002-2010 | www.movable-type.co.uk      */
/*   - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                             */
/*         http://csrc.nist.gov/groups/ST/toolkit/examples.html                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Sha1 = {};  // Sha1 namespace

/**
 * Generates SHA-1 hash of string
 *
 * @param {String} msg                String to be hashed
 * @param {Boolean} [utf8encode=true] Encode msg as UTF-8 before generating hash
 * @returns {String}                  Hash of msg as hex character string
 */
Sha1.hash = function(msg, utf8encode) {
  utf8encode =  (typeof utf8encode == 'undefined') ? true : utf8encode;
  
  // convert string to UTF-8, as SHA only deals with byte-streams
  if (utf8encode) msg = Utf8.encode(msg);
  
  // constants [§4.2.1]
  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  
  // PREPROCESSING 
  
  msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]
  
  // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
  var l = msg.length/4 + 2;  // length (in 32-bit integers) of msg + ‘1’ + appended length
  var N = Math.ceil(l/16);   // number of 16-integer-blocks required to hold 'l' ints
  var M = new Array(N);
  
  for (var i=0; i<N; i++) {
    M[i] = new Array(16);
    for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
      M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) | 
        (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
    } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
  }
  // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
  // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
  // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
  M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14])
  M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;
  
  // set initial hash value [§5.3.1]
  var H0 = 0x67452301;
  var H1 = 0xefcdab89;
  var H2 = 0x98badcfe;
  var H3 = 0x10325476;
  var H4 = 0xc3d2e1f0;
  
  // HASH COMPUTATION [§6.1.2]
  
  var W = new Array(80); var a, b, c, d, e;
  for (var i=0; i<N; i++) {
  
    // 1 - prepare message schedule 'W'
    for (var t=0;  t<16; t++) W[t] = M[i][t];
    for (var t=16; t<80; t++) W[t] = Sha1.ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);
    
    // 2 - initialise five working variables a, b, c, d, e with previous hash value
    a = H0; b = H1; c = H2; d = H3; e = H4;
    
    // 3 - main loop
    for (var t=0; t<80; t++) {
      var s = Math.floor(t/20); // seq for blocks of 'f' functions and 'K' constants
      var T = (Sha1.ROTL(a,5) + Sha1.f(s,b,c,d) + e + K[s] + W[t]) & 0xffffffff;
      e = d;
      d = c;
      c = Sha1.ROTL(b, 30);
      b = a;
      a = T;
    }
    
    // 4 - compute the new intermediate hash value
    H0 = (H0+a) & 0xffffffff;  // note 'addition modulo 2^32'
    H1 = (H1+b) & 0xffffffff; 
    H2 = (H2+c) & 0xffffffff; 
    H3 = (H3+d) & 0xffffffff; 
    H4 = (H4+e) & 0xffffffff;
  }

  return Sha1.toHexStr(H0) + Sha1.toHexStr(H1) + 
    Sha1.toHexStr(H2) + Sha1.toHexStr(H3) + Sha1.toHexStr(H4);
}

//
// function 'f' [§4.1.1]
//
Sha1.f = function(s, x, y, z)  {
  switch (s) {
  case 0: return (x & y) ^ (~x & z);           // Ch()
  case 1: return x ^ y ^ z;                    // Parity()
  case 2: return (x & y) ^ (x & z) ^ (y & z);  // Maj()
  case 3: return x ^ y ^ z;                    // Parity()
  }
}

//
// rotate left (circular left shift) value x by n positions [§3.2.5]
//
Sha1.ROTL = function(x, n) {
  return (x<<n) | (x>>>(32-n));
}

//
// hexadecimal representation of a number 
//   (note toString(16) is implementation-dependant, and  
//   in IE returns signed numbers when used on full words)
//
Sha1.toHexStr = function(n) {
  var s="", v;
  for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s += v.toString(16); }
  return s;
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Utf8 class: encode / decode between multi-byte Unicode characters and UTF-8 multiple          */
/*              single-byte character encoding (c) Chris Veness 2002-2010                         */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Utf8 = {};  // Utf8 namespace

/**
 * Encode multi-byte Unicode string into utf-8 multiple single-byte characters 
 * (BMP / basic multilingual plane only)
 *
 * Chars in range U+0080 - U+07FF are encoded in 2 chars, U+0800 - U+FFFF in 3 chars
 *
 * @param {String} strUni Unicode string to be encoded as UTF-8
 * @returns {String} encoded string
 */
Utf8.encode = function(strUni) {
  // use regular expressions & String.replace callback function for better efficiency 
  // than procedural approaches
  var strUtf = strUni.replace(
      /[\u0080-\u07ff]/g,  // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
      function(c) { 
        var cc = c.charCodeAt(0);
        return String.fromCharCode(0xc0 | cc>>6, 0x80 | cc&0x3f); }
    );
  strUtf = strUtf.replace(
      /[\u0800-\uffff]/g,  // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
      function(c) { 
        var cc = c.charCodeAt(0); 
        return String.fromCharCode(0xe0 | cc>>12, 0x80 | cc>>6&0x3F, 0x80 | cc&0x3f); }
    );
  return strUtf;
}

/**
 * Decode utf-8 encoded string back into multi-byte Unicode characters
 *
 * @param {String} strUtf UTF-8 string to be decoded back to Unicode
 * @returns {String} decoded string
 */
Utf8.decode = function(strUtf) {
	if( typeof strUtf === 'undefined' )
		return null; // wtf
  // note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
  var strUni = strUtf.replace(
      /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
      function(c) {  // (note parentheses for precence)
        var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | ( c.charCodeAt(2)&0x3f); 
        return String.fromCharCode(cc); }
    );
  strUni = strUni.replace(
      /[\u00c0-\u00df][\u0080-\u00bf]/g,                 // 2-byte chars
      function(c) {  // (note parentheses for precence)
        var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
        return String.fromCharCode(cc); }
    );
  return strUni;
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */





/**
 * PowerTip
 *
 * @fileoverview  jQuery plugin that creates hover tooltips.
 * @link          http://stevenbenner.github.com/jquery-powertip/
 * @author        Steven Benner (http://stevenbenner.com/)
 * @version       1.1.0
 * @requires      jQuery 1.7+
 *
 * @license jQuery PowerTip Plugin v1.1.0
 * http://stevenbenner.github.com/jquery-powertip/
 * Copyright 2012 Steven Benner (http://stevenbenner.com/)
 * Released under the MIT license.
 * <https://raw.github.com/stevenbenner/jquery-powertip/master/LICENSE.txt>
 */

(function($) {
	'use strict';

	// useful private variables
	var $document = $(document),
		$window = $(window),
		$body = $('body');

	/**
	 * Session data
	 * Private properties global to all powerTip instances
	 * @type Object
	 */
	var session = {
		isPopOpen: false,
		isFixedPopOpen: false,
		isClosing: false,
		popOpenImminent: false,
		activeHover: null,
		currentX: 0,
		currentY: 0,
		previousX: 0,
		previousY: 0,
		desyncTimeout: null,
		mouseTrackingActive: false
	};

	/**
	 * Display hover tooltips on the matched elements.
	 * @param {Object} opts The options object to use for the plugin.
	 * @return {Object} jQuery object for the matched selectors.
	 */
	$.fn.powerTip = function(opts) {

		// don't do any work if there were no matched elements
		if (!this.length) {
			return this;
		}

		// extend options
		var options = $.extend({}, $.fn.powerTip.defaults, opts),
			tipController = new TooltipController(options);

		// hook mouse tracking
		initMouseTracking();

		// setup the elements
		this.each(function() {
			var $this = $(this),
				dataPowertip = $this.data('powertip'),
				dataElem = $this.data('powertipjq'),
				dataTarget = $this.data('powertiptarget'),
				title = $this.attr('title');


			// attempt to use title attribute text if there is no data-powertip,
			// data-powertipjq or data-powertiptarget. If we do use the title
			// attribute, delete the attribute so the browser will not show it
			if (!dataPowertip && !dataTarget && !dataElem && title) {
				$this.data('powertip', title);
				$this.removeAttr('title');
			}

			// create hover controllers for each element
			$this.data(
				'displayController',
				new DisplayController($this, options, tipController)
			);
		});

		// attach hover events to all matched elements
		return this.on({
			// mouse events
			mouseenter: function(event) {
				trackMouse(event);
				session.previousX = event.pageX;
				session.previousY = event.pageY;
				$(this).data('displayController').show();
			},
			mouseleave: function() {
				$(this).data('displayController').hide();
			},

			// keyboard events
			focus: function() {
				var element = $(this);
				if (!isMouseOver(element)) {
					element.data('displayController').show(true);
				}
			},
			blur: function() {
				$(this).data('displayController').hide(true);
			}
		});

	};

	/**
	 * Default options for the powerTip plugin.
	 * @type Object
	 */
	$.fn.powerTip.defaults = {
		fadeInTime: 200,
		fadeOutTime: 100,
		followMouse: false,
		popupId: 'powerTip',
		intentSensitivity: 7,
		intentPollInterval: 100,
		closeDelay: 100,
		placement: 'n',
		smartPlacement: false,
		offset: 10,
		mouseOnToPopup: false
	};

	/**
	 * Default smart placement priority lists.
	 * The first item in the array is the highest priority, the last is the
	 * lowest. The last item is also the default, which will be used if all
	 * previous options do not fit.
	 * @type Object
	 */
	$.fn.powerTip.smartPlacementLists = {
		n: ['n', 'ne', 'nw', 's'],
		e: ['e', 'ne', 'se', 'w', 'nw', 'sw', 'n', 's', 'e'],
		s: ['s', 'se', 'sw', 'n'],
		w: ['w', 'nw', 'sw', 'e', 'ne', 'se', 'n', 's', 'w'],
		nw: ['nw', 'w', 'sw', 'n', 's', 'se', 'nw'],
		ne: ['ne', 'e', 'se', 'n', 's', 'sw', 'ne'],
		sw: ['sw', 'w', 'nw', 's', 'n', 'ne', 'sw'],
		se: ['se', 'e', 'ne', 's', 'n', 'nw', 'se']
	};

	/**
	 * Public API
	 * @type Object
	 */
	$.powerTip = {

		/**
		 * Attempts to show the tooltip for the specified element.
		 * @public
		 * @param {Object} element The element that the tooltip should for.
		 */
		showTip: function(element) {
			// close any open tooltip
			$.powerTip.closeTip();
			// grab only the first matched element and ask it to show its tip
			element = element.first();
			if (!isMouseOver(element)) {
				element.data('displayController').show(true, true);
			}
		},

		/**
		 * Attempts to close any open tooltips.
		 * @public
		 */
		closeTip: function() {
			$document.triggerHandler('closePowerTip');
		}

	};

	/**
	 * Creates a new tooltip display controller.
	 * @private
	 * @constructor
	 * @param {Object} element The element that this controller will handle.
	 * @param {Object} options Options object containing settings.
	 * @param {TooltipController} tipController The TooltipController for this instance.
	 */
	function DisplayController(element, options, tipController) {
		var hoverTimer = null;

		/**
		 * Begins the process of showing a tooltip.
		 * @private
		 * @param {Boolean=} immediate Skip intent testing (optional).
		 * @param {Boolean=} forceOpen Ignore cursor position and force tooltip to open (optional).
		 */
		function openTooltip(immediate, forceOpen) {
			cancelTimer();
			if (!element.data('hasActiveHover')) {
				if (!immediate) {
					session.popOpenImminent = true;
					hoverTimer = setTimeout(
						function() {
							hoverTimer = null;
							checkForIntent(element);
						},
						options.intentPollInterval
					);
				} else {
					if (forceOpen) {
						element.data('forcedOpen', true);
					}
					tipController.showTip(element);
				}
			}
		}

		/**
		 * Begins the process of closing a tooltip.
		 * @private
		 * @param {Boolean=} disableDelay Disable close delay (optional).
		 */
		function closeTooltip(disableDelay) {
			cancelTimer();
			if (element.data('hasActiveHover')) {
				session.popOpenImminent = false;
				element.data('forcedOpen', false);
				if (!disableDelay) {
					hoverTimer = setTimeout(
						function() {
							hoverTimer = null;
							tipController.hideTip(element);
						},
						options.closeDelay
					);
				} else {
					tipController.hideTip(element);
				}
			}
		}

		/**
		 * Checks mouse position to make sure that the user intended to hover
		 * on the specified element before showing the tooltip.
		 * @private
		 */
		function checkForIntent() {
			// calculate mouse position difference
			var xDifference = Math.abs(session.previousX - session.currentX),
				yDifference = Math.abs(session.previousY - session.currentY),
				totalDifference = xDifference + yDifference;

			// check if difference has passed the sensitivity threshold
			if (totalDifference < options.intentSensitivity) {
				tipController.showTip(element);
			} else {
				// try again
				session.previousX = session.currentX;
				session.previousY = session.currentY;
				openTooltip();
			}
		}

		/**
		 * Cancels active hover timer.
		 * @private
		 */
		function cancelTimer() {
			hoverTimer = clearTimeout(hoverTimer);
		}

		// expose the methods
		return {
			show: openTooltip,
			hide: closeTooltip,
			cancel: cancelTimer
		};
	}

	/**
	 * Creates a new tooltip controller.
	 * @private
	 * @constructor
	 * @param {Object} options Options object containing settings.
	 */
	function TooltipController(options) {

		// build and append popup div if it does not already exist
		var tipElement = $('#' + options.popupId);
		if (tipElement.length === 0) {
			tipElement = $('<div></div>', { id: options.popupId });
			// grab body element if it was not populated when the script loaded
			// this hack exists solely for jsfiddle support
			if ($body.length === 0) {
				$body = $('body');
			}
			$body.append(tipElement);
		}

		// hook mousemove for cursor follow tooltips
		if (options.followMouse) {
			// only one positionTipOnCursor hook per popup element, please
			if (!tipElement.data('hasMouseMove')) {
				$document.on({
					mousemove: positionTipOnCursor,
					scroll: positionTipOnCursor
				});
			}
			tipElement.data('hasMouseMove', true);
		}

		// if we want to be able to mouse onto the popup then we need to attach
		// hover events to the popup that will cancel a close request on hover
		// and start a new close request on mouseleave
		if (options.followMouse || options.mouseOnToPopup) {
			tipElement.on({
				mouseenter: function() {
					if (tipElement.data('followMouse') || tipElement.data('mouseOnToPopup')) {
						// check activeHover in case the mouse cursor entered
						// the tooltip during the fadeOut and close cycle
						if (session.activeHover) {
							session.activeHover.data('displayController').cancel();
						}
					}
				},
				mouseleave: function() {
					if (tipElement.data('mouseOnToPopup')) {
						// check activeHover in case the mouse cursor entered
						// the tooltip during the fadeOut and close cycle
						if (session.activeHover) {
							session.activeHover.data('displayController').hide();
						}
					}
				}
			});
		}

		/**
		 * Gives the specified element the active-hover state and queues up
		 * the showTip function.
		 * @private
		 * @param {Object} element The element that the tooltip should target.
		 */
		function beginShowTip(element) {
			element.data('hasActiveHover', true);
			// show popup, asap
			tipElement.queue(function(next) {
				showTip(element);
				next();
			});
		}

		/**
		 * Shows the tooltip popup, as soon as possible.
		 * @private
		 * @param {Object} element The element that the popup should target.
		 */
		function showTip(element) {
			// it is possible, especially with keyboard navigation, to move on
			// to another element with a tooltip during the queue to get to
			// this point in the code. if that happens then we need to not
			// proceed or we may have the fadeout callback for the last tooltip
			// execute immediately after this code runs, causing bugs.
			if (!element.data('hasActiveHover')) {
				return;
			}

			// if the popup is open and we got asked to open another one then
			// the old one is still in its fadeOut cycle, so wait and try again
			if (session.isPopOpen) {
				if (!session.isClosing) {
					hideTip(session.activeHover);
				}
				tipElement.delay(100).queue(function(next) {
					showTip(element);
					next();
				});
				return;
			}

			// trigger powerTipPreRender event
			element.trigger('powerTipPreRender');

			var tipText = element.data('powertip'),
				tipTarget = element.data('powertiptarget'),
				tipElem = element.data('powertipjq'),
				tipContent = tipTarget ? $('#' + tipTarget) : [];

			// set popup content
			if (tipText) {
				tipElement.html(tipText);
			} else if (tipElem && tipElem.length > 0) {
				tipElement.empty();
				tipElem.clone(true, true).appendTo(tipElement);
			} else if (tipContent && tipContent.length > 0) {
				tipElement.html($('#' + tipTarget).html());
			} else {
				// we have no content to display, give up
				return;
			}

			// trigger powerTipRender event
			element.trigger('powerTipRender');

			// hook close event for triggering from the api
			$document.on('closePowerTip', function() {
				element.data('displayController').hide(true);
			});

			session.activeHover = element;
			session.isPopOpen = true;

			tipElement.data('followMouse', options.followMouse);
			tipElement.data('mouseOnToPopup', options.mouseOnToPopup);

			// set popup position
			if (!options.followMouse) {
				positionTipOnElement(element);
				session.isFixedPopOpen = true;
			} else {
				positionTipOnCursor();
			}

			// fadein
			tipElement.fadeIn(options.fadeInTime, function() {
				// start desync polling
				if (!session.desyncTimeout) {
					session.desyncTimeout = setInterval(closeDesyncedTip, 500);
				}

				// trigger powerTipOpen event
				element.trigger('powerTipOpen');
			});
		}

		/**
		 * Hides the tooltip popup, immediately.
		 * @private
		 * @param {Object} element The element that the popup should target.
		 */
		function hideTip(element) {
			session.isClosing = true;
			element.data('hasActiveHover', false);
			element.data('forcedOpen', false);
			// reset session
			session.activeHover = null;
			session.isPopOpen = false;
			// stop desync polling
			session.desyncTimeout = clearInterval(session.desyncTimeout);
			// unhook close event api listener
			$document.off('closePowerTip');
			// fade out
			tipElement.fadeOut(options.fadeOutTime, function() {
				session.isClosing = false;
				session.isFixedPopOpen = false;
				tipElement.removeClass();
				// support mouse-follow and fixed position pops at the same
				// time by moving the popup to the last known cursor location
				// after it is hidden
				setTipPosition(
					session.currentX + options.offset,
					session.currentY + options.offset
				);

				// trigger powerTipClose event
				element.trigger('powerTipClose');
			});
		}

		/**
		 * Checks for a tooltip desync and closes the tooltip if one occurs.
		 * @private
		 */
		function closeDesyncedTip() {
			// It is possible for the mouse cursor to leave an element without
			// firing the mouseleave event. This seems to happen (in FF) if the
			// element is disabled under mouse cursor, the element is moved out
			// from under the mouse cursor (such as a slideDown() occurring
			// above it), or if the browser is resized by code moving the
			// element from under the mouse cursor. If this happens it will
			// result in a desynced tooltip because we wait for any exiting
			// open tooltips to close before opening a new one. So we should
			// periodically check for a desync situation and close the tip if
			// such a situation arises.
			if (session.isPopOpen && !session.isClosing) {
				var isDesynced = false;

				// case 1: user already moused onto another tip - easy test
				if (session.activeHover.data('hasActiveHover') === false) {
					isDesynced = true;
				} else {
					// case 2: hanging tip - have to test if mouse position is
					// not over the active hover and not over a tooltip set to
					// let the user interact with it.
					// for keyboard navigation, this only counts if the element
					// does not have focus.
					// for tooltips opened via the api we need to check if it
					// has the forcedOpen flag.
					if (!isMouseOver(session.activeHover) && !session.activeHover.is(":focus") && !session.activeHover.data('forcedOpen')) {
						if (tipElement.data('mouseOnToPopup')) {
							if (!isMouseOver(tipElement)) {
								isDesynced = true;
							}
						} else {
							isDesynced = true;
						}
					}
				}

				if (isDesynced) {
					// close the desynced tip
					hideTip(session.activeHover);
				}
			}
		}

		/**
		 * Moves the tooltip popup to the users mouse cursor.
		 * @private
		 */
		function positionTipOnCursor() {
			// to support having fixed powertips on the same page as cursor
			// powertips, where both instances are referencing the same popup
			// element, we need to keep track of the mouse position constantly,
			// but we should only set the pop location if a fixed pop is not
			// currently open, a pop open is imminent or active, and the popup
			// element in question does have a mouse-follow using it.
			if ((session.isPopOpen && !session.isFixedPopOpen) || (session.popOpenImminent && !session.isFixedPopOpen && tipElement.data('hasMouseMove'))) {
				// grab measurements
				var scrollTop = $window.scrollTop(),
					windowWidth = $window.width(),
					windowHeight = $window.height(),
					popWidth = tipElement.outerWidth(),
					popHeight = tipElement.outerHeight(),
					x = 0,
					y = 0;

				// constrain pop to browser viewport
				if ((popWidth + session.currentX + options.offset) < windowWidth) {
					x = session.currentX + options.offset;
				} else {
					x = windowWidth - popWidth;
				}
				if ((popHeight + session.currentY + options.offset) < (scrollTop + windowHeight)) {
					y = session.currentY + options.offset;
				} else {
					y = scrollTop + windowHeight - popHeight;
				}

				// position the tooltip
				setTipPosition(x, y);
			}
		}

		/**
		 * Sets the tooltip popup too the correct position relative to the
		 * specified target element. Based on options settings.
		 * @private
		 * @param {Object} element The element that the popup should target.
		 */
		function positionTipOnElement(element) {
			var tipWidth = tipElement.outerWidth(),
				tipHeight = tipElement.outerHeight(),
				priorityList,
				placementCoords,
				finalPlacement,
				collisions;

			// with smart placement we will try a series of placement
			// options and use the first one that does not collide with the
			// browser view port boundaries.
			if (options.smartPlacement) {

				// grab the placement priority list
				priorityList = $.fn.powerTip.smartPlacementLists[options.placement];

				// iterate over the priority list and use the first placement
				// option that does not collide with the viewport. if they all
				// collide then the last placement in the list will be used.
				$.each(priorityList, function(idx, pos) {
					// get placement coordinates
					placementCoords = computePlacementCoords(
						element,
						pos,
						tipWidth,
						tipHeight
					);
					finalPlacement = pos;

					// find collisions
					collisions = getViewportCollisions(
						placementCoords,
						tipWidth,
						tipHeight
					);

					// break if there were no collisions
					if (collisions.length === 0) {
						return false;
					}
				});

			} else {

				// if we're not going to use the smart placement feature then
				// just compute the coordinates and do it
				placementCoords = computePlacementCoords(
					element,
					options.placement,
					tipWidth,
					tipHeight
				);
				finalPlacement = options.placement;

			}

			// add placement as class for CSS arrows
			tipElement.addClass(finalPlacement);

			// position the tooltip
			setTipPosition(placementCoords.x, placementCoords.y);
		}

		/**
		 * Compute the top/left coordinates to display the tooltip at the
		 * specified placement relative to the specified element.
		 * @private
		 * @param {Object} element The element that the tooltip should target.
		 * @param {String} placement The placement for the tooltip.
		 * @param {Number} popWidth Width of the tooltip element in pixels.
		 * @param {Number} popHeight Height of the tooltip element in pixels.
		 * @retun {Object} An object with the x and y coordinates.
		 */
		function computePlacementCoords(element, placement, popWidth, popHeight) {
			// grab measurements
			var objectOffset = element.offset(),
				objectWidth = element.outerWidth(),
				objectHeight = element.outerHeight(),
				x = 0,
				y = 0;

			// calculate the appropriate x and y position in the document
			switch (placement) {
			case 'n':
				x = (objectOffset.left + (objectWidth / 2)) - (popWidth / 2);
				y = objectOffset.top - popHeight - options.offset;
				break;
			case 'e':
				x = objectOffset.left + objectWidth + options.offset;
				y = (objectOffset.top + (objectHeight / 2)) - (popHeight / 2);
				break;
			case 's':
				x = (objectOffset.left + (objectWidth / 2)) - (popWidth / 2);
				y = objectOffset.top + objectHeight + options.offset;
				break;
			case 'w':
				x = objectOffset.left - popWidth - options.offset;
				y = (objectOffset.top + (objectHeight / 2)) - (popHeight / 2);
				break;
			case 'nw':
				x = (objectOffset.left - popWidth) + 20;
				y = objectOffset.top - popHeight - options.offset;
				break;
			case 'ne':
				x = (objectOffset.left + objectWidth) - 20;
				y = objectOffset.top - popHeight - options.offset;
				break;
			case 'sw':
				x = (objectOffset.left - popWidth) + 20;
				y = objectOffset.top + objectHeight + options.offset;
				break;
			case 'se':
				x = (objectOffset.left + objectWidth) - 20;
				y = objectOffset.top + objectHeight + options.offset;
				break;
			}

			return {
				x: Math.round(x),
				y: Math.round(y)
			};
		}

		/**
		 * Sets the tooltip CSS position on the document.
		 * @private
		 * @param {Number} x Left position in pixels.
		 * @param {Number} y Top position in pixels.
		 */
		function setTipPosition(x, y) {
			tipElement.css('left', x + 'px');
			tipElement.css('top', y + 'px');
		}

		// expose methods
		return {
			showTip: beginShowTip,
			hideTip: hideTip
		};
	}

	/**
	 * Hooks mouse position tracking to mousemove and scroll events.
	 * Prevents attaching the events more than once.
	 * @private
	 */
	function initMouseTracking() {
		var lastScrollX = 0,
			lastScrollY = 0;

		if (!session.mouseTrackingActive) {
			session.mouseTrackingActive = true;

			// grab the current scroll position on load
			$(function() {
				lastScrollX = $document.scrollLeft();
				lastScrollY = $document.scrollTop();
			});

			// hook mouse position tracking
			$document.on({
				mousemove: trackMouse,
				scroll: function() {
					var x = $document.scrollLeft(),
						y = $document.scrollTop();
					if (x !== lastScrollX) {
						session.currentX += x - lastScrollX;
						lastScrollX = x;
					}
					if (y !== lastScrollY) {
						session.currentY += y - lastScrollY;
						lastScrollY = y;
					}
				}
			});
		}
	}

	/**
	 * Saves the current mouse coordinates to the powerTip session object.
	 * @private
	 * @param {Object} event The mousemove event for the document.
	 */
	function trackMouse(event) {
		session.currentX = event.pageX;
		session.currentY = event.pageY;
	}

	/**
	 * Tests if the mouse is currently over the specified element.
	 * @private
	 * @param {Object} element The element to check for hover.
	 * @return {Boolean}
	 */
	function isMouseOver(element) {
		var elementPosition = element.offset();
		return session.currentX >= elementPosition.left &&
			session.currentX <= elementPosition.left + element.outerWidth() &&
			session.currentY >= elementPosition.top &&
			session.currentY <= elementPosition.top + element.outerHeight();
	}

	/**
	 * Finds any viewport collisions that an element (the tooltip) would have
	 * if it were absolutely positioned at the specified coordinates.
	 * @private
	 * @param {Object} coords Coordinates for the element. (e.g. {x: 123, y: 123})
	 * @param {Number} elementWidth Width of the element in pixels.
	 * @param {Number} elementHeight Height of the element in pixels.
	 * @return {Array} Array of words representing directional collisions.
	 */
	function getViewportCollisions(coords, elementWidth, elementHeight) {
		var scrollLeft = $window.scrollLeft(),
			scrollTop = $window.scrollTop(),
			windowWidth = $window.width(),
			windowHeight = $window.height(),
			collisions = [];

		if (coords.y < scrollTop) {
			collisions.push('top');
		}
		if (coords.y + elementHeight > scrollTop + windowHeight) {
			collisions.push('bottom');
		}
		if (coords.x < scrollLeft) {
			collisions.push('left');
		}
		if (coords.x + elementWidth > scrollLeft + windowWidth) {
			collisions.push('right');
		}

		return collisions;
	}

}(jQuery));





/*
Canvas Identicon v0.1
http://defactocity.com/blog/html5-canvas-identicon-generator

Identicon place holder in this format:
<img class="identicon" src="/default.png" width="128" height="128" data-identicon="2fd4e1c67a2d28fced849ee1bb76e7391b93eb12">

src = fallback image
data-identicon = sha1 hash
*/

var Identicon = (function(){
	"use strict";
	// static configuration
	var rotationalSymmetry = true;

	// globals
	Math.PI2 = 0.5 * Math.PI;
	// Create canvas and context
	var c = document.createElement('canvas');
	if( !c.getContext )// canvas not supported;
		return function(self){self.src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';}; //1x1 gif

	var cx = c.getContext('2d');
	// hash extraction pattern
	var pat = [[4,256],[4,256],[4,256], [4,43],[3,2],[3,4], [4,43],[3,2],[3,4], [4,7],[4,4]];
	
	// private methods
	function draw_block( type, invert, angle, x, y, s16,s8,s4,s2,s1 )
	{
		cx.save();

		// Apply block rotation
		if(typeof angle === 'number')
		{
			cx.translate(s4*x + s2, s4*y + s2);
			cx.rotate(angle * Math.PI2);
		}

		switch(type)
		{
			//------------------------------
			// Symmetric shapes
			//------------------------------
			case 0: // Small square
				cx.fillRect(-s1, -s1, s2, s2);				
				break;
			case 1: // Small diamond
				fillPath([ [0, -s1], [s1, 0], [0, s1], [-s1, 0] ]);
				break;
			case 2: // Four point star
				fillPath([ [-s2, -s2], [0, -s1], [s2, -s2], [s1, 0], [s2, s2], [0, s1], [-s2, s2], [-s1, 0] ]);
				break;
			case 3: // Four point star SUBTRACT small diamond
				draw_block(2);
				cut();
				draw_block(1);
				break;
			case 4: // Large diamond
				fillPath([ [0, -s2], [s2, 0], [0, s2], [-s2, 0] ]);
				break;
			case 5: // Large diamond SUBTRACT small diamond
				draw_block(4);
				cut();
				draw_block(1);
				break;
			//------------------------------
			// Directional shapes
			//------------------------------
			case 6: // Ring clear small square
				draw_block(5);
				cx.clearRect(0, 0, s2, s2);
				break;

			case 7: // Scalene triangle series
				fillPath([ [-s2, -s2], [0, 0], [-s2, s2] ]);
				break;
			case 8:
				draw_block(7);
				fillPath([ [s2, -s2], [0,0], [s2, s2] ]);
				break;
			case 9: // Shift scalene
				fillPath([ [0, -s2], [s2, 0], [0, s2] ]);
				break;
			case 10: // Fast forward symbol
				draw_block(7);
				draw_block(9);
				break;
			case 11: // Large equal triangle
				fillPath([ [-s2, -s2], [s2, 0], [-s2, s2] ]);
				break;
			case 12: // Flying V
				draw_block(11);
				cut();
				draw_block(7);
				break;
			case 13: // Triforce
				draw_block(11);
				cut();
				fillPath([ [0, -s1], [-s2, 0], [0, s1] ]);
				break;
			case 14: // Tiny trinagle cutout
				draw_block(11);
				cut();
				fillPath([ [-s1, -s1], [0, 0], [-s1, s1] ]);
				break;

			case 15: // Large right-angle triangle series
				fillPath([ [-s2, -s2], [s2, -s2], [-s2, s2] ]);	
				break;
			case 16: // Flock of birds 2
				draw_block(15);
				cx.clearRect(-s2, -s2, s2, s2);				
				break;
			case 17: // Bird right corner
				fillPath([ [0, 0], [s2, 0], [0, s2] ]);		
				break;
			case 18: // Flock of birds 3
				draw_block(16);
				draw_block(17);
				break;
			case 19: // Small right-angle triangle
				fillPath([ [-s2, -s2], [0, -s2], [-s2, 0] ]);
				break;
			case 20: // Flock of birds 4
				draw_block(18);
				draw_block(19);
				break;
			case 21: // Opposite small right-angle triangles
				draw_block(19);
				fillPath([ [s2, s2], [0, s2], [s2, 0] ]);
				break;

			case 22: // Long right triangle series
				fillPath([ [-s2, -s2], [s2, -s2], [-s2, 0] ]);
				break;
			case 23: // 2 long right triangles
				draw_block(22);
				fillPath([ [-s2, 0], [s2, 0], [-s2, s2] ]);
				break;
			case 24: // One long, one short
				draw_block(22);
				fillPath([ [-s2, 0], [0, 0], [-s2, s2] ]);
				break;
			case 25: // Long right-angle triangle series
				draw_block(22);
				fillPath([ [s2, s2], [-s2, s2], [s2, 0] ]);
				break;

			case 26: // Lozenge series
				fillPath([ [0, -s2], [s2-s1, 0], [0, s2], [-s1, 0] ]);
				break;
			case 27: // Wedges
				fillPath([ [-s2, -s2], [-s1, 0], [-s2, s2] ]);
				fillPath([ [s2, -s2], [s1, 0], [s2, s2] ]);
				break;
			case 28: // Lozenge and wedges
				draw_block(26);
				draw_block(27);
				break;

			case 29: // Rectangle
				cx.fillRect(-s2, -s2, s4, s2);
				break;
			case 30: // Top quad
				cx.fillRect(-s2, -s2, s2, s2);
				break;
			case 31: // Checkerboard
				cx.fillRect(-s2, -s2, s2, s2);
				cx.fillRect(0, 0, s2, s2);
				break;

			case 32: // 1 Spike
				fillPath([ [s2, -s2], [-s2, s2], [-s2, 0] ]);
				break;
			case 33: // 2 Spikes
				draw_block(32);
				fillPath([ [-s2, -s2], [s2, s2], [s2, 0] ]);
				break;

			case 34: // Beam
				fillPath([ [-s2, -s2], [0, s2], [s2, 0] ]);
				break;
			case 35: // B
				draw_block(34);
				cx.fillRect(0, 0, s2, s2);
				break;

			// Singles
			case 36: // 2 tiny triangles
				fillPath([ [-s2, -s2], [-s1, 0], [0, -s2], [s1, 0], [s2, -s2] ]);
				break;
			case 37: // 2 tiny triangles
				fillPath([ [-s2, -s2], [-s1, 0], [0, -s2] ]);
				fillPath([ [s2, s2], [s1, 0], [0, s2] ]);
				break;
			case 38: // 2 tiny triangles
				fillPath([ [-s2, -s2], [-s1, 0], [0, -s2] ]);
				fillPath([ [s2, -s2], [s2, 0], [0, -s1] ]);
				break;
			case 39: // 3 tiny triangles
				draw_block(38);
				fillPath([ [-s2, s2], [0, s1], [-s2, 0] ]);
				break;

			case 40: // Tie
				fillPath([ [0, -s2], [s1, -s1], [-s1, s1], [0, s2], [s1, s1], [-s1, -s1] ]);
				break;
			case 41: // Other tie
				fillPath([ [-s2, -s2], [s2, s2], [0, s2], [-s1, s1], [s2-s1, -s1], [0, -s2]]);
				break;
			case 42: // Ugly indescribable blocks
				fillPath([ [-s2, -s2], [-s2, 0], [0, -s1], [0, -s2] ]);
				fillPath([ [s2, s2], [s2, 0], [0, s1], [0, s2] ]);
				break;
			default:
		}

		// Invert using XOR
		if(invert === 1)
		{
			cx.globalCompositeOperation = 'xor';
			cx.fillRect(-s2, -s2, s4, s4);
		}

		cx.restore();
	} // End draw block

	function cut()
	{
		cx.globalCompositeOperation = 'destination-out';
	}

	// Fillpath
	function fillPath(p)
	{
		cx.beginPath();
		cx.moveTo(p[0][0], p[0][1]);

		for(var i=1, l=p.length; i<l; i++)
		{
			cx.lineTo(p[i][0], p[i][1]);
		}

		cx.closePath();
		cx.fill();
	}

	// exports
	return function( self ) {

		// Extract hash from the DOM
		var hash = self.getAttribute('data-identicon');

		// Exit if invalid hash
		if(hash == null || hash.length != 40){ return; }

		self.removeAttribute('data-identicon');

		// Image should be square, but select smallest dimension
		var s16 = Math.min(self.width, self.height),
		s8 = s16 / 2,
		s4 = s8 / 2,
		s2 = s4 / 2,
		s1 = s2 / 2,
		s = []; // State of the identicon

		// Set canvas dimensions
		c.width = c.height = s16;

		// Extract hash.
		// Take n digits of the hash. Normalize value between 0-m
		for(var i=0, l=pat.length; i<l; i++)
		{
			var n = pat[i][0],
			m = pat[i][1];

			s.push(Math.floor( parseInt(hash.substr(0, n), 16) * (m / Math.pow(16, n))) );
			hash = hash.slice(n);	
		}

		// Set Block colour
		cx.fillStyle = 'rgb('+s[0]+','+s[1]+','+s[2]+')';
		if( !rotationalSymmetry ) {
			s16 *= 2;
			s8 *= 2;
			s4 *= 2;
			s2 *= 2;
			s1 *= 2;
		}
		draw_block( s[3],  s[4],  s[5], 0, 0, s16,s8,s4,s2,s1 ); // A block
		draw_block( s[6],  s[7],  s[8], 0, 1, s16,s8,s4,s2,s1 ); // B blocks
		draw_block( s[6],  s[7],  s[8], 1, 0, s16,s8,s4,s2,s1 );
		draw_block( s[9],  s[10], 0,    1, 1, s16,s8,s4,s2,s1 ); // C block - Rotationally symmetric blocks 0-7 only
		// Apply clockwise rotational symmetry
		if( rotationalSymmetry ) {
			cx.translate(s8, s8); // [1, , , ] Initial state with top-left block
			cx.rotate(Math.PI);
			cx.drawImage(c, -s8, -s8); // [1, , ,4] Rotate & copy to bottom-right
			cx.rotate(Math.PI2);
			cx.drawImage(c, -s8, -s8); // [1,2,3,4] Glyph complete
		}

		// Convert to PNG dataURL and set image src
		self.src = c.toDataURL();

		// ----- End -----
	}
})();





/*! Copyright (c) 2011 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.0.6
 * 
 * Requires: 1.2.2+
 */

(function($) {

var types = ['DOMMouseScroll', 'mousewheel'];

if ($.event.fixHooks) {
    for ( var i=types.length; i; ) {
        $.event.fixHooks[ types[--i] ] = $.event.mouseHooks;
    }
}

$.event.special.mousewheel = {
    setup: function() {
        if ( this.addEventListener ) {
            for ( var i=types.length; i; ) {
                this.addEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = handler;
        }
    },
    
    teardown: function() {
        if ( this.removeEventListener ) {
            for ( var i=types.length; i; ) {
                this.removeEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = null;
        }
    }
};

$.fn.extend({
    mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },
    
    unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
    }
});


function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";
    
    // Old school scrollwheel delta
    if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta/120; }
    if ( orgEvent.detail     ) { delta = -orgEvent.detail/3; }
    
    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;
    
    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
        deltaY = 0;
        deltaX = -1*delta;
    }
    
    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }
    
    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);
    
    return ($.event.dispatch || $.event.handle).apply(this, args);
}

})(jQuery);





/* 
== malihu jquery custom scrollbars plugin == 
version: 2.8 
author: malihu (http://manos.malihu.gr) 
plugin home: http://manos.malihu.gr/jquery-custom-content-scroller 
*/
(function($){
	/*plugin script*/
	var methods={
		init:function(options){
			var defaults={ 
				set_width:false, /*optional element width: boolean, pixels, percentage*/
				set_height:false, /*optional element height: boolean, pixels, percentage*/
				horizontalScroll:false, /*scroll horizontally: boolean*/
				scrollInertia:950, /*scrolling inertia: integer (milliseconds)*/
				mouseWheel:true, /*mousewheel support: boolean*/
				mouseWheelPixels:"auto", /*mousewheel pixels amount: integer, "auto"*/
				autoDraggerLength:true, /*auto-adjust scrollbar dragger length: boolean*/
				autoHideScrollbar:false, /*auto-hide scrollbar when idle*/
				scrollButtons:{ /*scroll buttons*/
					enable:false, /*scroll buttons support: boolean*/
					scrollType:"continuous", /*scroll buttons scrolling type: "continuous", "pixels"*/
					scrollSpeed:"auto", /*scroll buttons continuous scrolling speed: integer, "auto"*/
					scrollAmount:40 /*scroll buttons pixels scroll amount: integer (pixels)*/
				},
				advanced:{
					updateOnBrowserResize:true, /*update scrollbars on browser resize (for layouts based on percentages): boolean*/
					updateOnContentResize:false, /*auto-update scrollbars on content resize (for dynamic content): boolean*/
					autoExpandHorizontalScroll:false, /*auto-expand width for horizontal scrolling: boolean*/
					autoScrollOnFocus:true, /*auto-scroll on focused elements: boolean*/
					normalizeMouseWheelDelta:false /*normalize mouse-wheel delta (-1/1)*/
				},
				contentTouchScroll:true, /*scrolling by touch-swipe content: boolean*/
				callbacks:{
					onScrollStart:function(){}, /*user custom callback function on scroll start event*/
					onScroll:function(){}, /*user custom callback function on scroll event*/
					onTotalScroll:function(){}, /*user custom callback function on scroll end reached event*/
					onTotalScrollBack:function(){}, /*user custom callback function on scroll begin reached event*/
					onTotalScrollOffset:0, /*scroll end reached offset: integer (pixels)*/
					onTotalScrollBackOffset:0, /*scroll begin reached offset: integer (pixels)*/
					whileScrolling:function(){} /*user custom callback function on scrolling event*/
				},
				theme:"light" /*"light", "dark", "light-2", "dark-2", "light-thick", "dark-thick", "light-thin", "dark-thin"*/
			},
			options=$.extend(true,defaults,options);
			return this.each(function(){
				var $this=$(this);
				/*set element width/height, create markup for custom scrollbars, add classes*/
				if(options.set_width){
					$this.css("width",options.set_width);
				}
				if(options.set_height){
					$this.css("height",options.set_height);
				}
				if(!$(document).data("mCustomScrollbar-index")){
					$(document).data("mCustomScrollbar-index","1");
				}else{
					var mCustomScrollbarIndex=parseInt($(document).data("mCustomScrollbar-index"));
					$(document).data("mCustomScrollbar-index",mCustomScrollbarIndex+1);
				}
				$this.wrapInner("<div class='mCustomScrollBox"+" mCS-"+options.theme+"' id='mCSB_"+$(document).data("mCustomScrollbar-index")+"' style='position:relative; height:100%; overflow:hidden; max-width:100%;' />").addClass("mCustomScrollbar _mCS_"+$(document).data("mCustomScrollbar-index"));
				var mCustomScrollBox=$this.children(".mCustomScrollBox");
				if(options.horizontalScroll){
					mCustomScrollBox.addClass("mCSB_horizontal").wrapInner("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />");
					var mCSB_h_wrapper=mCustomScrollBox.children(".mCSB_h_wrapper");
					mCSB_h_wrapper.wrapInner("<div class='mCSB_container' style='position:absolute; left:0;' />").children(".mCSB_container").css({"width":mCSB_h_wrapper.children().outerWidth(),"position":"relative"}).unwrap();
				}else{
					mCustomScrollBox.wrapInner("<div class='mCSB_container' style='position:relative; top:0;' />");
				}
				var mCSB_container=mCustomScrollBox.children(".mCSB_container");
				if($.support.touch){
					mCSB_container.addClass("mCS_touch");
				}
				mCSB_container.after("<div class='mCSB_scrollTools' style='position:absolute;'><div class='mCSB_draggerContainer'><div class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' style='position:relative;'></div></div><div class='mCSB_draggerRail'></div></div></div>");
				var mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
					mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
					mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger");
				if(options.horizontalScroll){
					mCSB_dragger.data("minDraggerWidth",mCSB_dragger.width());
				}else{
					mCSB_dragger.data("minDraggerHeight",mCSB_dragger.height());
				}
				if(options.scrollButtons.enable){
					if(options.horizontalScroll){
						mCSB_scrollTools.prepend("<a class='mCSB_buttonLeft' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonRight' oncontextmenu='return false;'></a>");
					}else{
						mCSB_scrollTools.prepend("<a class='mCSB_buttonUp' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonDown' oncontextmenu='return false;'></a>");
					}
				}
				/*mCustomScrollBox scrollTop and scrollLeft is always 0 to prevent browser focus scrolling*/
				mCustomScrollBox.bind("scroll",function(){
					if(!$this.is(".mCS_disabled")){ /*native focus scrolling for disabled scrollbars*/
						mCustomScrollBox.scrollTop(0).scrollLeft(0);
					}
				});
				/*store options, global vars/states, intervals*/
				$this.data({
					/*init state*/
					"mCS_Init":true,
					/*instance index*/
					"mCustomScrollbarIndex":$(document).data("mCustomScrollbar-index"),
					/*option parameters*/
					"horizontalScroll":options.horizontalScroll,
					"scrollInertia":options.scrollInertia,
					"scrollEasing":"mcsEaseOut",
					"mouseWheel":options.mouseWheel,
					"mouseWheelPixels":options.mouseWheelPixels,
					"autoDraggerLength":options.autoDraggerLength,
					"autoHideScrollbar":options.autoHideScrollbar,
					"scrollButtons_enable":options.scrollButtons.enable,
					"scrollButtons_scrollType":options.scrollButtons.scrollType,
					"scrollButtons_scrollSpeed":options.scrollButtons.scrollSpeed,
					"scrollButtons_scrollAmount":options.scrollButtons.scrollAmount,
					"autoExpandHorizontalScroll":options.advanced.autoExpandHorizontalScroll,
					"autoScrollOnFocus":options.advanced.autoScrollOnFocus,
					"normalizeMouseWheelDelta":options.advanced.normalizeMouseWheelDelta,
					"contentTouchScroll":options.contentTouchScroll,
					"onScrollStart_Callback":options.callbacks.onScrollStart,
					"onScroll_Callback":options.callbacks.onScroll,
					"onTotalScroll_Callback":options.callbacks.onTotalScroll,
					"onTotalScrollBack_Callback":options.callbacks.onTotalScrollBack,
					"onTotalScroll_Offset":options.callbacks.onTotalScrollOffset,
					"onTotalScrollBack_Offset":options.callbacks.onTotalScrollBackOffset,
					"whileScrolling_Callback":options.callbacks.whileScrolling,
					/*events binding state*/
					"bindEvent_scrollbar_drag":false,
					"bindEvent_content_touch":false,
					"bindEvent_scrollbar_click":false,
					"bindEvent_mousewheel":false,
					"bindEvent_buttonsContinuous_y":false,
					"bindEvent_buttonsContinuous_x":false,
					"bindEvent_buttonsPixels_y":false,
					"bindEvent_buttonsPixels_x":false,
					"bindEvent_focusin":false,
					"bindEvent_autoHideScrollbar":false,
					/*buttons intervals*/
					"mCSB_buttonScrollRight":false,
					"mCSB_buttonScrollLeft":false,
					"mCSB_buttonScrollDown":false,
					"mCSB_buttonScrollUp":false
				});
				/*max-width/max-height*/
				if(options.horizontalScroll){
					if($this.css("max-width")!=="none"){
						if(!options.advanced.updateOnContentResize){ /*needs updateOnContentResize*/
							options.advanced.updateOnContentResize=true;
						}
					}
				}else{
					if($this.css("max-height")!=="none"){
						var percentage=false,maxHeight=parseInt($this.css("max-height"));
						if($this.css("max-height").indexOf("%")>=0){
							percentage=maxHeight,
							maxHeight=$this.parent().height()*percentage/100;
						}
						$this.css("overflow","hidden");
						mCustomScrollBox.css("max-height",maxHeight);
					}
				}
				$this.mCustomScrollbar("update");
				/*window resize fn (for layouts based on percentages)*/
				if(options.advanced.updateOnBrowserResize){
					var mCSB_resizeTimeout,currWinWidth=$(window).width(),currWinHeight=$(window).height();
					$(window).bind("resize."+$this.data("mCustomScrollbarIndex"),function(){
						if(mCSB_resizeTimeout){
							clearTimeout(mCSB_resizeTimeout);
						}
						mCSB_resizeTimeout=setTimeout(function(){
							if(!$this.is(".mCS_disabled") && !$this.is(".mCS_destroyed")){
								var winWidth=$(window).width(),winHeight=$(window).height();
								if(currWinWidth!==winWidth || currWinHeight!==winHeight){ /*ie8 fix*/
									if($this.css("max-height")!=="none" && percentage){
										mCustomScrollBox.css("max-height",$this.parent().height()*percentage/100);
									}
									$this.mCustomScrollbar("update");
									currWinWidth=winWidth; currWinHeight=winHeight;
								}
							}
						},150);
					});
				}
				/*content resize fn (for dynamically generated content)*/
				if(options.advanced.updateOnContentResize){
					var mCSB_onContentResize;
					if(options.horizontalScroll){
						var mCSB_containerOldSize=mCSB_container.outerWidth();
					}else{
						var mCSB_containerOldSize=mCSB_container.outerHeight();
					}
					mCSB_onContentResize=setInterval(function(){
						if(options.horizontalScroll){
							if(options.advanced.autoExpandHorizontalScroll){
								mCSB_container.css({"position":"absolute","width":"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({"width":mCSB_container.outerWidth(),"position":"relative"}).unwrap();
							}
							var mCSB_containerNewSize=mCSB_container.outerWidth();
						}else{
							var mCSB_containerNewSize=mCSB_container.outerHeight();
						}
						if(mCSB_containerNewSize!=mCSB_containerOldSize){
							$this.mCustomScrollbar("update");
							mCSB_containerOldSize=mCSB_containerNewSize;
						}
					},300);
				}
			});
		},
		update:function(){
			var $this=$(this),
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container");
			mCSB_container.removeClass("mCS_no_scrollbar");
			$this.removeClass("mCS_disabled mCS_destroyed");
			mCustomScrollBox.scrollTop(0).scrollLeft(0); /*reset scrollTop/scrollLeft to prevent browser focus scrolling*/
			var mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
				mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger");
			if($this.data("horizontalScroll")){
				var mCSB_buttonLeft=mCSB_scrollTools.children(".mCSB_buttonLeft"),
					mCSB_buttonRight=mCSB_scrollTools.children(".mCSB_buttonRight"),
					mCustomScrollBoxW=mCustomScrollBox.width();
				if($this.data("autoExpandHorizontalScroll")){
					mCSB_container.css({"position":"absolute","width":"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({"width":mCSB_container.outerWidth(),"position":"relative"}).unwrap();
				}
				var mCSB_containerW=mCSB_container.outerWidth();
			}else{
				var mCSB_buttonUp=mCSB_scrollTools.children(".mCSB_buttonUp"),
					mCSB_buttonDown=mCSB_scrollTools.children(".mCSB_buttonDown"),
					mCustomScrollBoxH=mCustomScrollBox.height(),
					mCSB_containerH=mCSB_container.outerHeight();
			}
			if(mCSB_containerH>mCustomScrollBoxH && !$this.data("horizontalScroll")){ /*content needs vertical scrolling*/
				mCSB_scrollTools.css("display","block");
				var mCSB_draggerContainerH=mCSB_draggerContainer.height();
				/*auto adjust scrollbar dragger length analogous to content*/
				if($this.data("autoDraggerLength")){
					var draggerH=Math.round(mCustomScrollBoxH/mCSB_containerH*mCSB_draggerContainerH),
						minDraggerH=mCSB_dragger.data("minDraggerHeight");
					if(draggerH<=minDraggerH){ /*min dragger height*/
						mCSB_dragger.css({"height":minDraggerH});
					}else if(draggerH>=mCSB_draggerContainerH-10){ /*max dragger height*/
						var mCSB_draggerContainerMaxH=mCSB_draggerContainerH-10;
						mCSB_dragger.css({"height":mCSB_draggerContainerMaxH});
					}else{
						mCSB_dragger.css({"height":draggerH});
					}
					mCSB_dragger.children(".mCSB_dragger_bar").css({"line-height":mCSB_dragger.height()+"px"});
				}
				var mCSB_draggerH=mCSB_dragger.height(),
				/*calculate and store scroll amount, add scrolling*/
					scrollAmount=(mCSB_containerH-mCustomScrollBoxH)/(mCSB_draggerContainerH-mCSB_draggerH);
				$this.data("scrollAmount",scrollAmount).mCustomScrollbar("scrolling",mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight);
				/*scroll*/
				var mCSB_containerP=Math.abs(mCSB_container.position().top);
				$this.mCustomScrollbar("scrollTo",mCSB_containerP,{scrollInertia:0});
			}else if(mCSB_containerW>mCustomScrollBoxW && $this.data("horizontalScroll")){ /*content needs horizontal scrolling*/
				mCSB_scrollTools.css("display","block");
				var mCSB_draggerContainerW=mCSB_draggerContainer.width();
				/*auto adjust scrollbar dragger length analogous to content*/
				if($this.data("autoDraggerLength")){
					var draggerW=Math.round(mCustomScrollBoxW/mCSB_containerW*mCSB_draggerContainerW),
						minDraggerW=mCSB_dragger.data("minDraggerWidth");
					if(draggerW<=minDraggerW){ /*min dragger height*/
						mCSB_dragger.css({"width":minDraggerW});
					}else if(draggerW>=mCSB_draggerContainerW-10){ /*max dragger height*/
						var mCSB_draggerContainerMaxW=mCSB_draggerContainerW-10;
						mCSB_dragger.css({"width":mCSB_draggerContainerMaxW});
					}else{
						mCSB_dragger.css({"width":draggerW});
					}
				}
				var mCSB_draggerW=mCSB_dragger.width(),
				/*calculate and store scroll amount, add scrolling*/
					scrollAmount=(mCSB_containerW-mCustomScrollBoxW)/(mCSB_draggerContainerW-mCSB_draggerW);
				$this.data("scrollAmount",scrollAmount).mCustomScrollbar("scrolling",mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight);
				/*scroll*/
				var mCSB_containerP=Math.abs(mCSB_container.position().left);
				$this.mCustomScrollbar("scrollTo",mCSB_containerP,{scrollInertia:0});
			}else{ /*content does not need scrolling*/
				/*unbind events, reset content position, hide scrollbars, remove classes*/
				mCustomScrollBox.unbind("mousewheel focusin");
				if($this.data("horizontalScroll")){
					mCSB_dragger.add(mCSB_container).css("left",0);
				}else{
					mCSB_dragger.add(mCSB_container).css("top",0);
				}
				mCSB_scrollTools.css("display","none");
				mCSB_container.addClass("mCS_no_scrollbar");
				$this.data({"bindEvent_mousewheel":false,"bindEvent_focusin":false});
			}
		},
		scrolling:function(mCustomScrollBox,mCSB_container,mCSB_draggerContainer,mCSB_dragger,mCSB_buttonUp,mCSB_buttonDown,mCSB_buttonLeft,mCSB_buttonRight){
			var $this=$(this);
			/*scrollbar drag scrolling*/
			if(!$this.data("bindEvent_scrollbar_drag")){
				var mCSB_draggerDragY,mCSB_draggerDragX;
				if($.support.msPointer){ /*MSPointer*/
					mCSB_dragger.bind("MSPointerDown",function(e){
						e.preventDefault();
						$this.data({"on_drag":true}); mCSB_dragger.addClass("mCSB_dragger_onDrag");
						var elem=$(this),
							elemOffset=elem.offset(),
							x=e.originalEvent.pageX-elemOffset.left,
							y=e.originalEvent.pageY-elemOffset.top;
						if(x<elem.width() && x>0 && y<elem.height() && y>0){
							mCSB_draggerDragY=y;
							mCSB_draggerDragX=x;
						}
					});
					$(document).bind("MSPointerMove."+$this.data("mCustomScrollbarIndex"),function(e){
						e.preventDefault();
						if($this.data("on_drag")){
							var elem=mCSB_dragger,
								elemOffset=elem.offset(),
								x=e.originalEvent.pageX-elemOffset.left,
								y=e.originalEvent.pageY-elemOffset.top;
							scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
						}
					}).bind("MSPointerUp."+$this.data("mCustomScrollbarIndex"),function(e){
						e.preventDefault();
						$this.data({"on_drag":false}); mCSB_dragger.removeClass("mCSB_dragger_onDrag");
					});
				}else{ /*mouse/touch*/
					mCSB_dragger.bind("mousedown touchstart",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						var	elem=$(this),elemOffset=elem.offset(),x,y;
						if(e.type==="touchstart"){
							var touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
							x=touch.pageX-elemOffset.left; y=touch.pageY-elemOffset.top;
						}else{
							$this.data({"on_drag":true}); mCSB_dragger.addClass("mCSB_dragger_onDrag");
							x=e.pageX-elemOffset.left; y=e.pageY-elemOffset.top;
						}
						if(x<elem.width() && x>0 && y<elem.height() && y>0){
							mCSB_draggerDragY=y; mCSB_draggerDragX=x;
						}
					}).bind("touchmove",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						var touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
							elem=$(this),
							elemOffset=elem.offset(),
							x=touch.pageX-elemOffset.left,
							y=touch.pageY-elemOffset.top;
						scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
					});
					$(document).bind("mousemove."+$this.data("mCustomScrollbarIndex"),function(e){
						e.preventDefault();
						if($this.data("on_drag")){
							var elem=mCSB_dragger,
								elemOffset=elem.offset(),
								x=e.pageX-elemOffset.left,
								y=e.pageY-elemOffset.top;
							scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x);
						}
					}).bind("mouseup."+$this.data("mCustomScrollbarIndex"),function(e){
						e.preventDefault();
						$this.data({"on_drag":false}); mCSB_dragger.removeClass("mCSB_dragger_onDrag");
					});
				}
				$this.data({"bindEvent_scrollbar_drag":true});
			}
			function scrollbarDrag(mCSB_draggerDragY,mCSB_draggerDragX,y,x){
				if($this.data("horizontalScroll")){
					$this.mCustomScrollbar("scrollTo",(mCSB_dragger.position().left-(mCSB_draggerDragX))+x,{moveDragger:true,trigger:"internal"});
				}else{
					$this.mCustomScrollbar("scrollTo",(mCSB_dragger.position().top-(mCSB_draggerDragY))+y,{moveDragger:true,trigger:"internal"});
				}
			}
			/*content touch-drag*/
			if($.support.touch && $this.data("contentTouchScroll")){
				if(!$this.data("bindEvent_content_touch")){
					var touch,
						elem,elemOffset,y,x,mCSB_containerTouchY,mCSB_containerTouchX;
					mCSB_container.bind("touchstart",function(e){
						e.stopImmediatePropagation();
						touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
						elem=$(this);
						elemOffset=elem.offset();
						x=touch.pageX-elemOffset.left;
						y=touch.pageY-elemOffset.top;
						mCSB_containerTouchY=y;
						mCSB_containerTouchX=x;
					});
					mCSB_container.bind("touchmove",function(e){
						e.preventDefault(); e.stopImmediatePropagation();
						touch=e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
						elem=$(this).parent();
						elemOffset=elem.offset();
						x=touch.pageX-elemOffset.left;
						y=touch.pageY-elemOffset.top;
						if($this.data("horizontalScroll")){
							$this.mCustomScrollbar("scrollTo",mCSB_containerTouchX-x,{trigger:"internal"});
						}else{
							$this.mCustomScrollbar("scrollTo",mCSB_containerTouchY-y,{trigger:"internal"});
						}
					});
				}
			}
			/*dragger rail click scrolling*/
			if(!$this.data("bindEvent_scrollbar_click")){
				mCSB_draggerContainer.bind("click",function(e){
					var scrollToPos=(e.pageY-mCSB_draggerContainer.offset().top)*$this.data("scrollAmount"),target=$(e.target);
					if($this.data("horizontalScroll")){
						scrollToPos=(e.pageX-mCSB_draggerContainer.offset().left)*$this.data("scrollAmount");
					}
					if(target.hasClass("mCSB_draggerContainer") || target.hasClass("mCSB_draggerRail")){
						$this.mCustomScrollbar("scrollTo",scrollToPos,{trigger:"internal",scrollEasing:"draggerRailEase"});
					}
				});
				$this.data({"bindEvent_scrollbar_click":true});
			}
			/*mousewheel scrolling*/
			if($this.data("mouseWheel")){
				if(!$this.data("bindEvent_mousewheel")){
					mCustomScrollBox.bind("mousewheel",function(e,delta){
						var scrollTo,mouseWheelPixels=$this.data("mouseWheelPixels"),absPos=Math.abs(mCSB_container.position().top),
							draggerPos=mCSB_dragger.position().top,limit=mCSB_draggerContainer.height()-mCSB_dragger.height();
						if($this.data("normalizeMouseWheelDelta")){
							if(delta<0){delta=-1;}else{delta=1;}
						}
						if(mouseWheelPixels==="auto"){
							mouseWheelPixels=100+Math.round($this.data("scrollAmount")/2);
						}
						if($this.data("horizontalScroll")){
							draggerPos=mCSB_dragger.position().left; 
							limit=mCSB_draggerContainer.width()-mCSB_dragger.width();
							absPos=Math.abs(mCSB_container.position().left);
						}
						if((delta>0 && draggerPos!==0) || (delta<0 && draggerPos!==limit)){e.preventDefault(); e.stopImmediatePropagation();}
						scrollTo=absPos-(delta*mouseWheelPixels);
						$this.mCustomScrollbar("scrollTo",scrollTo,{trigger:"internal"});
					});
					$this.data({"bindEvent_mousewheel":true});
				}
			}
			/*buttons scrolling*/
			if($this.data("scrollButtons_enable")){
				if($this.data("scrollButtons_scrollType")==="pixels"){ /*scroll by pixels*/
					if($this.data("horizontalScroll")){
						mCSB_buttonRight.add(mCSB_buttonLeft).unbind("mousedown touchstart MSPointerDown mouseup MSPointerUp mouseout MSPointerOut touchend",mCSB_buttonRight_stop,mCSB_buttonLeft_stop);
						$this.data({"bindEvent_buttonsContinuous_x":false});
						if(!$this.data("bindEvent_buttonsPixels_x")){
							/*scroll right*/
							mCSB_buttonRight.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().left)+$this.data("scrollButtons_scrollAmount"));
							});
							/*scroll left*/
							mCSB_buttonLeft.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().left)-$this.data("scrollButtons_scrollAmount"));
							});
							$this.data({"bindEvent_buttonsPixels_x":true});
						}
					}else{
						mCSB_buttonDown.add(mCSB_buttonUp).unbind("mousedown touchstart MSPointerDown mouseup MSPointerUp mouseout MSPointerOut touchend",mCSB_buttonRight_stop,mCSB_buttonLeft_stop);
						$this.data({"bindEvent_buttonsContinuous_y":false});
						if(!$this.data("bindEvent_buttonsPixels_y")){
							/*scroll down*/
							mCSB_buttonDown.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().top)+$this.data("scrollButtons_scrollAmount"));
							});
							/*scroll up*/
							mCSB_buttonUp.bind("click",function(e){
								e.preventDefault();
								PixelsScrollTo(Math.abs(mCSB_container.position().top)-$this.data("scrollButtons_scrollAmount"));
							});
							$this.data({"bindEvent_buttonsPixels_y":true});
						}
					}
					function PixelsScrollTo(to){
						if(!mCSB_dragger.data("preventAction")){
							mCSB_dragger.data("preventAction",true);
							$this.mCustomScrollbar("scrollTo",to,{trigger:"internal"});
						}
					}
				}else{ /*continuous scrolling*/
					if($this.data("horizontalScroll")){
						mCSB_buttonRight.add(mCSB_buttonLeft).unbind("click");
						$this.data({"bindEvent_buttonsPixels_x":false});
						if(!$this.data("bindEvent_buttonsContinuous_x")){
							/*scroll right*/
							mCSB_buttonRight.bind("mousedown touchstart MSPointerDown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollRight":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().left)+scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});
							var mCSB_buttonRight_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollRight"));
							}
							mCSB_buttonRight.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",mCSB_buttonRight_stop);
							/*scroll left*/
							mCSB_buttonLeft.bind("mousedown touchstart MSPointerDown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollLeft":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().left)-scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});	
							var mCSB_buttonLeft_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollLeft"));
							}
							mCSB_buttonLeft.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",mCSB_buttonLeft_stop);
							$this.data({"bindEvent_buttonsContinuous_x":true});
						}
					}else{
						mCSB_buttonDown.add(mCSB_buttonUp).unbind("click");
						$this.data({"bindEvent_buttonsPixels_y":false});
						if(!$this.data("bindEvent_buttonsContinuous_y")){
							/*scroll down*/
							mCSB_buttonDown.bind("mousedown touchstart MSPointerDown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollDown":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().top)+scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});
							var mCSB_buttonDown_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollDown"));
							}
							mCSB_buttonDown.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",mCSB_buttonDown_stop);
							/*scroll up*/
							mCSB_buttonUp.bind("mousedown touchstart MSPointerDown",function(e){
								e.preventDefault();
								var scrollButtonsSpeed=ScrollButtonsSpeed();
								$this.data({"mCSB_buttonScrollUp":setInterval(function(){
									$this.mCustomScrollbar("scrollTo",Math.abs(mCSB_container.position().top)-scrollButtonsSpeed,{trigger:"internal",scrollEasing:"easeOutCirc"});
								},17)});
							});	
							var mCSB_buttonUp_stop=function(e){
								e.preventDefault(); clearInterval($this.data("mCSB_buttonScrollUp"));
							}
							mCSB_buttonUp.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",mCSB_buttonUp_stop);
							$this.data({"bindEvent_buttonsContinuous_y":true});
						}
					}
					function ScrollButtonsSpeed(){
						var speed=$this.data("scrollButtons_scrollSpeed");
						if($this.data("scrollButtons_scrollSpeed")==="auto"){
							speed=Math.round(($this.data("scrollInertia")+100)/40);
						}
						return speed;
					}
				}
			}
			/*scrolling on element focus (e.g. via TAB key)*/
			if($this.data("autoScrollOnFocus")){
				if(!$this.data("bindEvent_focusin")){
					mCustomScrollBox.bind("focusin",function(){
						mCustomScrollBox.scrollTop(0).scrollLeft(0);
						var focusedElem=$(document.activeElement);
						if(focusedElem.is("input,textarea,select,button,a[tabindex],area,object")){
							var mCSB_containerPos=mCSB_container.position().top,
								focusedElemPos=focusedElem.position().top,
								visibleLimit=mCustomScrollBox.height()-focusedElem.outerHeight();
							if($this.data("horizontalScroll")){
								mCSB_containerPos=mCSB_container.position().left;
								focusedElemPos=focusedElem.position().left;
								visibleLimit=mCustomScrollBox.width()-focusedElem.outerWidth();
							}
							if(mCSB_containerPos+focusedElemPos<0 || mCSB_containerPos+focusedElemPos>visibleLimit){
								$this.mCustomScrollbar("scrollTo",focusedElemPos,{trigger:"internal"});
							}
						}
					});
					$this.data({"bindEvent_focusin":true});
				}
			}
			/*auto-hide scrollbar*/
			if($this.data("autoHideScrollbar")){
				if(!$this.data("bindEvent_autoHideScrollbar")){
					mCustomScrollBox.bind("mouseenter",function(e){
						mCustomScrollBox.addClass("mCS-mouse-over");
						functions.showScrollbar.call(mCustomScrollBox.children(".mCSB_scrollTools"));
					}).bind("mouseleave touchend",function(e){
						mCustomScrollBox.removeClass("mCS-mouse-over");
						if(e.type==="mouseleave"){functions.hideScrollbar.call(mCustomScrollBox.children(".mCSB_scrollTools"));}
					});
					$this.data({"bindEvent_autoHideScrollbar":true});
				}
			}
		},
		scrollTo:function(scrollTo,options){
			var $this=$(this),
				defaults={
					moveDragger:false,
					trigger:"external",
					callbacks:true,
					scrollInertia:$this.data("scrollInertia"),
					scrollEasing:$this.data("scrollEasing")
				},
				options=$.extend(defaults,options),
				draggerScrollTo,
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container"),
				mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_draggerContainer=mCSB_scrollTools.children(".mCSB_draggerContainer"),
				mCSB_dragger=mCSB_draggerContainer.children(".mCSB_dragger"),
				contentSpeed=draggerSpeed=options.scrollInertia,
				scrollBeginning,scrollBeginningOffset,totalScroll,totalScrollOffset;
			$this.data({"mCS_trigger":options.trigger});
			if($this.data("mCS_Init")){options.callbacks=false;}
			if(scrollTo || scrollTo===0){
				if(typeof(scrollTo)==="number"){ /*if integer, scroll by number of pixels*/
					if(options.moveDragger){ /*scroll dragger*/
						draggerScrollTo=scrollTo;
						if($this.data("horizontalScroll")){
							scrollTo=mCSB_dragger.position().left*$this.data("scrollAmount");
						}else{
							scrollTo=mCSB_dragger.position().top*$this.data("scrollAmount");
						}
						draggerSpeed=0;
					}else{ /*scroll content by default*/
						draggerScrollTo=scrollTo/$this.data("scrollAmount");
					}
				}else if(typeof(scrollTo)==="string"){ /*if string, scroll by element position*/
					var target;
					if(scrollTo==="top"){ /*scroll to top*/
						target=0;
					}else if(scrollTo==="bottom" && !$this.data("horizontalScroll")){ /*scroll to bottom*/
						target=mCSB_container.outerHeight()-mCustomScrollBox.height();
					}else if(scrollTo==="left"){ /*scroll to left*/
						target=0;
					}else if(scrollTo==="right" && $this.data("horizontalScroll")){ /*scroll to right*/
						target=mCSB_container.outerWidth()-mCustomScrollBox.width();
					}else if(scrollTo==="first"){ /*scroll to first element position*/
						target=$this.find(".mCSB_container").find(":first");
					}else if(scrollTo==="last"){ /*scroll to last element position*/
						target=$this.find(".mCSB_container").find(":last");
					}else{ /*scroll to element position*/
						target=$this.find(scrollTo);
					}
					if(target.length===1){ /*if such unique element exists, scroll to it*/
						if($this.data("horizontalScroll")){
							scrollTo=target.position().left;
						}else{
							scrollTo=target.position().top;
						}
						draggerScrollTo=scrollTo/$this.data("scrollAmount");
					}else{
						draggerScrollTo=scrollTo=target;
					}
				}
				/*scroll to*/
				if($this.data("horizontalScroll")){
					if($this.data("onTotalScrollBack_Offset")){ /*scroll beginning offset*/
						scrollBeginningOffset=-$this.data("onTotalScrollBack_Offset");
					}
					if($this.data("onTotalScroll_Offset")){ /*total scroll offset*/
						totalScrollOffset=mCustomScrollBox.width()-mCSB_container.outerWidth()+$this.data("onTotalScroll_Offset");
					}
					if(draggerScrollTo<0){ /*scroll start position*/
						draggerScrollTo=scrollTo=0; clearInterval($this.data("mCSB_buttonScrollLeft"));
						if(!scrollBeginningOffset){scrollBeginning=true;}
					}else if(draggerScrollTo>=mCSB_draggerContainer.width()-mCSB_dragger.width()){ /*scroll end position*/
						draggerScrollTo=mCSB_draggerContainer.width()-mCSB_dragger.width();
						scrollTo=mCustomScrollBox.width()-mCSB_container.outerWidth(); clearInterval($this.data("mCSB_buttonScrollRight"));
						if(!totalScrollOffset){totalScroll=true;}
					}else{scrollTo=-scrollTo;}
					/*scrolling animation*/
					functions.mTweenAxis.call(this,mCSB_dragger[0],"left",Math.round(draggerScrollTo),draggerSpeed,options.scrollEasing);
					functions.mTweenAxis.call(this,mCSB_container[0],"left",Math.round(scrollTo),contentSpeed,options.scrollEasing,{
						onStart:function(){
							if(options.callbacks && !$this.data("mCS_tweenRunning")){callbacks("onScrollStart");}
							if($this.data("autoHideScrollbar")){functions.showScrollbar.call(mCSB_scrollTools);}
						},
						onUpdate:function(){
							if(options.callbacks){callbacks("whileScrolling");}
						},
						onComplete:function(){
							if(options.callbacks){
								callbacks("onScroll");
								if(scrollBeginning || (scrollBeginningOffset && mCSB_container.position().left>=scrollBeginningOffset)){callbacks("onTotalScrollBack");}
								if(totalScroll || (totalScrollOffset && mCSB_container.position().left<=totalScrollOffset)){callbacks("onTotalScroll");}
							}
							mCSB_dragger.data("preventAction",false); $this.data("mCS_tweenRunning",false);
							if($this.data("autoHideScrollbar")){if(!mCustomScrollBox.hasClass("mCS-mouse-over")){functions.hideScrollbar.call(mCSB_scrollTools);}}
						},
					});
				}else{
					if($this.data("onTotalScrollBack_Offset")){ /*scroll beginning offset*/
						scrollBeginningOffset=-$this.data("onTotalScrollBack_Offset");
					}
					if($this.data("onTotalScroll_Offset")){ /*total scroll offset*/
						totalScrollOffset=mCustomScrollBox.height()-mCSB_container.outerHeight()+$this.data("onTotalScroll_Offset");
					}
					if(draggerScrollTo<0){ /*scroll start position*/
						draggerScrollTo=scrollTo=0; clearInterval($this.data("mCSB_buttonScrollUp"));
						if(!scrollBeginningOffset){scrollBeginning=true;}
					}else if(draggerScrollTo>=mCSB_draggerContainer.height()-mCSB_dragger.height()){ /*scroll end position*/
						draggerScrollTo=mCSB_draggerContainer.height()-mCSB_dragger.height();
						scrollTo=mCustomScrollBox.height()-mCSB_container.outerHeight(); clearInterval($this.data("mCSB_buttonScrollDown"));
						if(!totalScrollOffset){totalScroll=true;}
					}else{scrollTo=-scrollTo;}
					/*scrolling animation*/
					functions.mTweenAxis.call(this,mCSB_dragger[0],"top",Math.round(draggerScrollTo),draggerSpeed,options.scrollEasing);
					functions.mTweenAxis.call(this,mCSB_container[0],"top",Math.round(scrollTo),contentSpeed,options.scrollEasing,{
						onStart:function(){
							if(options.callbacks && !$this.data("mCS_tweenRunning")){callbacks("onScrollStart");}
							if($this.data("autoHideScrollbar")){functions.showScrollbar.call(mCSB_scrollTools);}
						},
						onUpdate:function(){
							if(options.callbacks){callbacks("whileScrolling");}
						},
						onComplete:function(){
							if(options.callbacks){
								callbacks("onScroll");
								if(scrollBeginning || (scrollBeginningOffset && mCSB_container.position().top>=scrollBeginningOffset)){callbacks("onTotalScrollBack");}
								if(totalScroll || (totalScrollOffset && mCSB_container.position().top<=totalScrollOffset)){callbacks("onTotalScroll");}
							}
							mCSB_dragger.data("preventAction",false); $this.data("mCS_tweenRunning",false);
							if($this.data("autoHideScrollbar")){if(!mCustomScrollBox.hasClass("mCS-mouse-over")){functions.hideScrollbar.call(mCSB_scrollTools);}}
						},
					});
				}
				if($this.data("mCS_Init")){$this.data({"mCS_Init":false});}
			}
			/*callbacks*/
			function callbacks(cb){
				this.mcs={
					top:mCSB_container.position().top,left:mCSB_container.position().left,
					draggerTop:mCSB_dragger.position().top,draggerLeft:mCSB_dragger.position().left,
					topPct:Math.round((100*Math.abs(mCSB_container.position().top))/Math.abs(mCSB_container.outerHeight()-mCustomScrollBox.height())),
					leftPct:Math.round((100*Math.abs(mCSB_container.position().left))/Math.abs(mCSB_container.outerWidth()-mCustomScrollBox.width()))
				};
				switch(cb){
					/*start scrolling callback*/
					case "onScrollStart":
						$this.data("mCS_tweenRunning",true).data("onScrollStart_Callback").call($this,this.mcs);
						break;
					case "whileScrolling":
						$this.data("whileScrolling_Callback").call($this,this.mcs);
						break;
					case "onScroll":
						$this.data("onScroll_Callback").call($this,this.mcs);
						break;
					case "onTotalScrollBack":
						$this.data("onTotalScrollBack_Callback").call($this,this.mcs);
						break;
					case "onTotalScroll":
						$this.data("onTotalScroll_Callback").call($this,this.mcs);
						break;
				}
			}
		},
		stop:function(){
			var $this=$(this),
				mCSB_container=$this.children().children(".mCSB_container"),
				mCSB_dragger=$this.children().children().children().children(".mCSB_dragger");
			functions.mTweenAxisStop.call(this,mCSB_container[0]);
			functions.mTweenAxisStop.call(this,mCSB_dragger[0]);
		},
		disable:function(resetScroll){
			var $this=$(this),
				mCustomScrollBox=$this.children(".mCustomScrollBox"),
				mCSB_container=mCustomScrollBox.children(".mCSB_container"),
				mCSB_scrollTools=mCustomScrollBox.children(".mCSB_scrollTools"),
				mCSB_dragger=mCSB_scrollTools.children().children(".mCSB_dragger");
			mCustomScrollBox.unbind("mousewheel focusin mouseenter mouseleave touchend");
			mCSB_container.unbind("touchstart touchmove")
			if(resetScroll){
				if($this.data("horizontalScroll")){
					mCSB_dragger.add(mCSB_container).css("left",0);
				}else{
					mCSB_dragger.add(mCSB_container).css("top",0);
				}
			}
			mCSB_scrollTools.css("display","none");
			mCSB_container.addClass("mCS_no_scrollbar");
			$this.data({"bindEvent_mousewheel":false,"bindEvent_focusin":false,"bindEvent_content_touch":false,"bindEvent_autoHideScrollbar":false}).addClass("mCS_disabled");
		},
		destroy:function(){
			var $this=$(this);
			$this.removeClass("mCustomScrollbar _mCS_"+$this.data("mCustomScrollbarIndex")).addClass("mCS_destroyed").children().children(".mCSB_container").unwrap().children().unwrap().siblings(".mCSB_scrollTools").remove();
			$(document).unbind("mousemove."+$this.data("mCustomScrollbarIndex")+" mouseup."+$this.data("mCustomScrollbarIndex")+" MSPointerMove."+$this.data("mCustomScrollbarIndex")+" MSPointerUp."+$this.data("mCustomScrollbarIndex"));
			$(window).unbind("resize."+$this.data("mCustomScrollbarIndex"));
		}
	},
	functions={
		/*hide/show scrollbar*/
		showScrollbar:function(){
			this.stop().animate({opacity:1},"fast");
		},
		hideScrollbar:function(){
			this.stop().animate({opacity:0},"fast");
		},
		/*js animation tween*/
		mTweenAxis:function(el,prop,to,duration,easing,callbacks){
			var callbacks=callbacks || {},
				onStart=callbacks.onStart || function(){},onUpdate=callbacks.onUpdate || function(){},onComplete=callbacks.onComplete || function(){};
			var startTime=_getTime(),_delay,progress=0,from=el.offsetTop,elStyle=el.style;
			if(prop==="left"){from=el.offsetLeft;}
			var diff=to-from;
			_cancelTween();
			_startTween();
			function _getTime(){
				if(window.performance && window.performance.now){
					return window.performance.now();
				}else{
					if(window.performance && window.performance.webkitNow){
						return window.performance.webkitNow();
					}else{
						if(Date.now){return Date.now();}else{return new Date().getTime();}
					}
				}
			}
			function _step(){
				if(!progress){onStart.call();}
				progress=_getTime()-startTime;
				_tween();
				if(progress>=el._time){
					el._time=(progress>el._time) ? progress+_delay-(progress- el._time) : progress+_delay-1;
					if(el._time<progress+1){el._time=progress+1;}
				}
				if(el._time<duration){el._id=_request(_step);}else{onComplete.call();}
			}
			function _tween(){
				if(duration>0){
					el.currVal=_ease(el._time,from,diff,duration,easing);
					elStyle[prop]=Math.round(el.currVal)+"px";
				}else{
					elStyle[prop]=to+"px";
				}
				onUpdate.call();
			}
			function _startTween(){
				_delay=1000/60;
				el._time=progress+_delay;
				_request=(!window.requestAnimationFrame) ? function(f){_tween(); return setTimeout(f,0.01);} : window.requestAnimationFrame;
				el._id=_request(_step);
			}
			function _cancelTween(){
				if(el._id==null){return;}
				if(!window.requestAnimationFrame){clearTimeout(el._id);
				}else{window.cancelAnimationFrame(el._id);}
				el._id=null;
			}
			function _ease(t,b,c,d,type){
				switch(type){
					case "linear":
						return c*t/d + b;
						break;
					case "easeOutQuad":
						t /= d; return -c * t*(t-2) + b;
						break;
					case "easeInOutQuad":
						t /= d/2;
						if (t < 1) return c/2*t*t + b;
						t--;
						return -c/2 * (t*(t-2) - 1) + b;
						break;
					case "easeOutCubic":
						t /= d; t--; return c*(t*t*t + 1) + b;
						break;
					case "easeOutQuart":
						t /= d; t--; return -c * (t*t*t*t - 1) + b;
						break;
					case "easeOutQuint":
						t /= d; t--; return c*(t*t*t*t*t + 1) + b;
						break;
					case "easeOutCirc":
						t /= d; t--; return c * Math.sqrt(1 - t*t) + b;
						break;
					case "easeOutSine":
						return c * Math.sin(t/d * (Math.PI/2)) + b;
						break;
					case "easeOutExpo":
						return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
						break;
					case "mcsEaseOut":
						var ts=(t/=d)*t,tc=ts*t;
						return b+c*(0.499999999999997*tc*ts + -2.5*ts*ts + 5.5*tc + -6.5*ts + 4*t);
						break;
					case "draggerRailEase":
						t /= d/2;
						if (t < 1) return c/2*t*t*t + b;
						t -= 2;
						return c/2*(t*t*t + 2) + b;
						break;
				}
			}
		},
		/*stop js animation tweens*/
		mTweenAxisStop:function(el){
			if(el._id==null){return;}
			if(!window.requestAnimationFrame){clearTimeout(el._id);
			}else{window.cancelAnimationFrame(el._id);}
			el._id=null;
		},
		/*detect requestAnimationFrame and polyfill*/
		rafPolyfill:function(){
			var pfx=["ms","moz","webkit","o"],i=pfx.length;
			while(--i > -1 && !window.requestAnimationFrame){
				window.requestAnimationFrame=window[pfx[i]+"RequestAnimationFrame"];
				window.cancelAnimationFrame=window[pfx[i]+"CancelAnimationFrame"] || window[pfx[i]+"CancelRequestAnimationFrame"];
			}
		}
	}
	/*detect features*/
	functions.rafPolyfill.call(); /*requestAnimationFrame*/
	$.support.touch=!!('ontouchstart' in window); /*touch*/
	$.support.msPointer=window.navigator.msPointerEnabled; /*MSPointer support*/
	/*plugin dependencies*/
	var _dlp=("https:"==document.location.protocol) ? "https:" : "http:";
	$.event.special.mousewheel || document.write('<script src="'+_dlp+'//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.0.6/jquery.mousewheel.min.js"><\/script>');
	/*plugin fn*/
	$.fn.mCustomScrollbar=function(method){
		if(methods[method]){
			return methods[method].apply(this,Array.prototype.slice.call(arguments,1));
		}else if(typeof method==="object" || !method){
			return methods.init.apply(this,arguments);
		}else{
			$.error("Method "+method+" does not exist");
		}
	};
})(jQuery);





