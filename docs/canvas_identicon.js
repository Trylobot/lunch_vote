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
	var c = document.createElement('canvas'),
	cx = c.getContext('2d'),
	// hash extraction pattern
	pat = [[4,256],[4,256],[4,256], [4,43],[3,2],[3,4], [4,43],[3,2],[3,4], [4,7],[4,4]];
	
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
